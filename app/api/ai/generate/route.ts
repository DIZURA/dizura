import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { providerFor, submit } from "@/lib/ai";
import { requireUser } from "@/lib/auth/session";
import { generationCost } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";
import type { JobHandle } from "../jobs/[token]/route";

export const runtime = "nodejs";

const body = z
  .object({
    workspace: z.enum(["ads-studio", "ai-influencer", "wan-prime"]),
    prompt: z.string().trim().min(3).max(2000),
    kind: z.enum(["image", "video"]),
    aspectRatio: z.enum(["1:1", "9:16", "16:9", "4:5"]).default("9:16"),
    durationSec: z.number().int().min(1).max(15).optional(),
    referenceUrls: z.array(z.url({ protocol: /^https$/ })).max(4).optional(),
  })
  .refine((b) => b.workspace !== "wan-prime" || b.kind === "video", { message: "WAN 3.0 Prime generates video only." });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`gen:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body);
  // Fail before reserving credits if the job handle can't be signed.
  assertSigningConfigured();

  const cost = generationCost(input);
  const referenceId = randomUUID();
  // Reserve credits first; refund if the provider rejects the job.
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });

  let submitted: Awaited<ReturnType<typeof submit>>;
  try {
    submitted = await submit(input);
  } catch (err) {
    await credits().apply({ userId: user.id, delta: cost, reason: "refund", referenceId });
    throw err;
  }

  const provider = providerFor(input);
  const job: GenerationJob = {
    id: seal<JobHandle>("job", { u: user.id, p: provider, j: submitted.providerJobId, c: cost, r: referenceId }),
    provider,
    providerJobId: submitted.providerJobId,
    workspace: input.workspace,
    status: submitted.status,
    creditsCharged: cost,
    outputs: [],
    error: null,
    createdAt: new Date().toISOString(),
  };
  return ok(job, { status: 202 });
});
