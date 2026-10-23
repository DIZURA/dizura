import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { providerFor, submitMotionTransfer } from "@/lib/ai";
import { resolveJobImage, resolveUploadImage } from "@/lib/ai/resolve";
import { requireUser } from "@/lib/auth/session";
import { GENJUTSU, genjutsuCost } from "@/lib/credits/pricing";
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
  })
  .refine((b) => b.characters.length + b.photos.length >= 1, { message: "Pick at least one character image." })
  .refine((b) => b.characters.length + b.photos.length <= GENJUTSU.maxImages, { message: `Use up to ${GENJUTSU.maxImages} images.` });

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
  ];
  const store = referenceVideos();
  const info = await store.inspect(video.path);
  const cost = genjutsuCost(info.durationSec, input.resolution);
  const videoUrl = await store.signedUrl(video.path, 6 * 60 * 60);

  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });
  let submitted: Awaited<ReturnType<typeof submitMotionTransfer>>;
  try {
    submitted = await submitMotionTransfer({ prompt: input.prompt, videoUrl, imageUrls, resolution: input.resolution }, referenceId);
  } catch (err) {
    await credits().apply({ userId: user.id, delta: cost, reason: "refund", referenceId });
    throw err;
  }

  const provider = providerFor();
  const job: GenerationJob = {
    id: seal<JobHandle>("job", { u: user.id, p: provider, j: submitted.providerJobId, c: cost, r: referenceId }),
    provider,
    providerJobId: submitted.providerJobId,
    workspace: "ai-influencer",
    status: submitted.status,
    creditsCharged: cost,
    outputs: [],
    error: null,
    createdAt: new Date().toISOString(),
  };
  return ok(job, { status: 202 });
});
