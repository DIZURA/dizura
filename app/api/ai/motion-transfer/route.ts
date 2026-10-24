import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { providerFor, submitMotionTransfer } from "@/lib/ai";
import { resolveJobImage, resolveUploadImage } from "@/lib/ai/resolve";
import { requireUser } from "@/lib/auth/session";
import { GENJUTSU, genjutsuCost } from "@/lib/credits/pricing";
import { getPrices } from "@/lib/credits/costs";
import { credits } from "@/lib/credits/store";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { assertOwnPath, referenceVideos } from "@/lib/media/reference-videos";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal, unseal } from "@/lib/security/signed-token";
import type { JobHandle } from "../jobs/[token]/route";
import type { VideoHandle } from "../../uploads/video/route";

export const runtime = "nodejs";

const token = z.string().min(10).max(2048);
const body = z
  .object({
    /** Signed handle from /api/uploads/video. */
    video: token,
    /** The caller's own completed character images (signed job handles). */
    characters: z.array(token).max(GENJUTSU.maxImages).default([]),
    /** The caller's own uploaded photos (signed upload handles). */
    photos: z.array(token).max(GENJUTSU.maxImages).default([]),
    resolution: z.enum(["480p", "720p", "1080p"]).default(GENJUTSU.defaultResolution),
    prompt: z.string().trim().max(2000).default(""),
    /** "swap" (ADR 50): the character replaces the person AND `product` replaces the held product. */
    mode: z.enum(["standard", "swap"]).default("standard"),
    product: token.optional(),
  })
  .refine((b) => b.mode === "standard" || b.product, { message: "Add your product photo for swap mode." })
  .refine((b) => b.characters.length + b.photos.length + (b.mode === "swap" ? 1 : 0) <= GENJUTSU.maxImages, {
    message: `Use up to ${GENJUTSU.maxImages} images.`,
  })
  .refine((b) => b.characters.length + b.photos.length >= 1, { message: "Pick at least one character image." });

/** Swap mode: the last reference image is the product; the others are the character. */
const SWAP_DIRECTION =
  "Replace the person in the reference video with the character shown in the first reference image(s), and replace the " +
  "product they are holding or using with the product shown in the last reference image (same shape, colours, label and size). " +
  "Keep the exact camera movement, framing, pacing, gestures, hand placement and timing of the reference video.";

/**
 * POST → Genjutsu motion transfer: the chosen character performs the reference video.
 * Price = server-read video duration (rounded up, 4–30 s) × per-second rate for the resolution.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`gen:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body);
  assertSigningConfigured();

  const video = unseal<VideoHandle>("video", input.video);
  if (!video || video.u !== user.id) throw new ApiError("bad_request", "The video upload expired. Please upload it again.");
  assertOwnPath(video.path, user.id);

  // Everything the provider receives is resolved server-side from the caller's own media.
  const imageUrls = [
    ...(await Promise.all(input.characters.map((t) => resolveJobImage(t, user.id)))),
    ...input.photos.map((t) => resolveUploadImage(t, user.id)),
    ...(input.mode === "swap" && input.product ? [resolveUploadImage(input.product, user.id)] : []),
  ];
  const prompt = input.mode === "swap" ? `${SWAP_DIRECTION} ${input.prompt}`.trim() : input.prompt;
  const store = referenceVideos();
  const info = await store.inspect(video.path);
  const cost = genjutsuCost(info.durationSec, input.resolution, await getPrices());
  const videoUrl = await store.signedUrl(video.path, 6 * 60 * 60);

  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });
  let submitted: Awaited<ReturnType<typeof submitMotionTransfer>>;
  try {
    submitted = await submitMotionTransfer({ prompt, videoUrl, imageUrls, resolution: input.resolution }, referenceId);
  } catch (err) {
    await credits().apply({ userId: user.id, delta: cost, reason: "refund", referenceId });
    throw err;
  }

  const provider = providerFor();
  const job: GenerationJob = {
    id: seal<JobHandle>("job", { u: user.id, p: provider, j: submitted.providerJobId, c: cost, r: referenceId }),
    provider,
    providerJobId: submitted.providerJobId,
    workspace: "visual-character",
    status: submitted.status,
    creditsCharged: cost,
    outputs: [],
    error: null,
    createdAt: new Date().toISOString(),
  };
  return ok(job, { status: 202 });
});
