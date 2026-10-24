import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { providerFor, submitAdVideo } from "@/lib/ai";
import { resolveUploadImage } from "@/lib/ai/resolve";
import { composeVideoAdPrompt, VIDEO_AD_MOTION_IDS, type VideoAdMotion } from "@/lib/ads/formats";
import { requireUser } from "@/lib/auth/session";
import { getPrices } from "@/lib/credits/costs";
import { AD_RATIOS, MOTION_RESOLUTIONS, VIDEO_AD, videoAdCost } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";
import type { JobHandle } from "../jobs/[token]/route";

export const runtime = "nodejs";

const body = z.object({
  /** Signed handle from /api/uploads/image (the caller's own product photo = first frame). */
  product: z.string().min(10).max(2048),
  motion: z.enum(VIDEO_AD_MOTION_IDS as [VideoAdMotion, ...VideoAdMotion[]]),
  aspectRatio: z.enum(AD_RATIOS).default("9:16"),
  seconds: z.union(VIDEO_AD.seconds.map((n) => z.literal(n)) as [z.ZodLiteral<3>, z.ZodLiteral<5>, z.ZodLiteral<8>, z.ZodLiteral<10>]).default(VIDEO_AD.defaultSeconds),
  resolution: z.enum(MOTION_RESOLUTIONS).default(VIDEO_AD.defaultResolution),
  notes: z.string().trim().max(500).default(""),
});

/** POST → video ad from the caller's product photo (WAN 3.0 Prime image-to-video). Priced per second server-side. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`gen:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body);
  assertSigningConfigured();

  const productUrl = resolveUploadImage(input.product, user.id);
  const cost = videoAdCost(input.seconds, input.resolution, await getPrices());
  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });
  let submitted: Awaited<ReturnType<typeof submitAdVideo>>;
  try {
    submitted = await submitAdVideo(
      {
        prompt: composeVideoAdPrompt(input.motion, input.notes),
        imageUrl: productUrl,
        aspectRatio: input.aspectRatio,
        duration: input.seconds,
        resolution: input.resolution,
      },
      referenceId,
    );
  } catch (err) {
    await credits().apply({ userId: user.id, delta: cost, reason: "refund", referenceId });
    throw err;
  }

  const provider = providerFor();
  const job: GenerationJob = {
    id: seal<JobHandle>("job", { u: user.id, p: provider, j: submitted.providerJobId, c: cost, r: referenceId }),
    provider,
    providerJobId: submitted.providerJobId,
    workspace: "ads-studio",
    status: submitted.status,
    creditsCharged: cost,
    outputs: [],
    error: null,
    createdAt: new Date().toISOString(),
  };
  return ok(job, { status: 202 });
});
