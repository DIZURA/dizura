import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { providerFor, submitAdImage } from "@/lib/ai";
import { resolveUploadImage } from "@/lib/ai/resolve";
import { AD_FORMAT_IDS, composeAdPrompt } from "@/lib/ads/formats";
import { requireUser } from "@/lib/auth/session";
import { AD_IMAGE, AD_RATIOS, type AdQuality } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";
import type { JobHandle } from "../jobs/[token]/route";

export const runtime = "nodejs";

const body = z.object({
  /** Signed handle from /api/uploads/image (the caller's own product photo). */
  product: z.string().min(10).max(2048),
  format: z.enum(AD_FORMAT_IDS as [string, ...string[]]),
  aspectRatio: z.enum(AD_RATIOS).default("1:1"),
  quality: z.enum(Object.keys(AD_IMAGE) as [AdQuality, ...AdQuality[]]).default("standard"),
  notes: z.string().trim().max(500).default(""),
});

/** POST → Marketing Studio Image ad from the caller's product photo. Price by quality tier (server-side). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`gen:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body);
  assertSigningConfigured();

  const productUrl = resolveUploadImage(input.product, user.id);
  const tier = AD_IMAGE[input.quality as AdQuality];
  const cost = tier.credits;
  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });
  let submitted: Awaited<ReturnType<typeof submitAdImage>>;
  try {
    submitted = await submitAdImage(
      {
        prompt: composeAdPrompt(input.format as Parameters<typeof composeAdPrompt>[0], input.notes),
        imageUrls: [productUrl],
        aspectRatio: input.aspectRatio,
        resolution: tier.resolution,
        quality: tier.quality,
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
