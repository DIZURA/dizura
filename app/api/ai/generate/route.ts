import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { poll, providerFor, submit } from "@/lib/ai";
import { requireUser } from "@/lib/auth/session";
import { characters } from "@/lib/characters/store";
import { generationCost, SOUL_ID, VIDEO_DURATION } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal, unseal } from "@/lib/security/signed-token";
import type { JobHandle } from "../jobs/[token]/route";

export const runtime = "nodejs";

const body = z
  .object({
    workspace: z.enum(["ai-influencer", "motion", "image", "video", "ads-studio"]),
    prompt: z.string().trim().min(3).max(2000),
    kind: z.enum(["image", "video"]),
    aspectRatio: z.enum(["1:1", "9:16", "16:9", "3:4"]).default("9:16"),
    durationSec: z.number().int().min(VIDEO_DURATION.min).max(VIDEO_DURATION.max).optional(),
    /** Signed handle of the caller's own completed image job, to animate it (image-to-video). */
    sourceJob: z.string().min(10).max(2048).optional(),
    /** One of the caller's trained Soul ID characters (images only). */
    characterId: z.uuid().optional(),
    characterStrength: z.number().min(0.1).max(1).optional(),
  })
  .refine((b) => !b.characterId || b.kind === "image", { message: "Characters are used for images; animate the image afterwards." })
  .refine((b) => !b.sourceJob || b.kind === "video", { message: "Only videos can start from an image." })
  .refine((b) => !["video", "motion"].includes(b.workspace) || b.kind === "video", { message: "This studio generates video only." })
  .refine((b) => b.workspace !== "image" || b.kind === "image", { message: "This studio generates images only." });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`gen:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body);
  // Fail before reserving credits if the job handle can't be signed.
  assertSigningConfigured();
  const sourceImageUrl = input.sourceJob ? await resolveSourceImage(input.sourceJob, user.id) : undefined;
  const soulReference = input.characterId ? await resolveCharacter(input.characterId, user.id, input.characterStrength) : undefined;

  const cost = generationCost(input);
  const referenceId = randomUUID();
  // Reserve credits first; refund if the provider rejects the job.
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });

  let submitted: Awaited<ReturnType<typeof submit>>;
  try {
    submitted = await submit({ ...input, sourceImageUrl, soulReference }, referenceId);
  } catch (err) {
    await credits().apply({ userId: user.id, delta: cost, reason: "refund", referenceId });
    throw err;
  }

  const provider = providerFor();
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

/**
 * Turns a signed job handle into the image URL to animate. The URL always comes from the
 * provider's own result for a job the caller owns — never from client input.
 */
async function resolveSourceImage(token: string, userId: string): Promise<string> {
  const handle = unseal<JobHandle>("job", token);
  if (!handle || handle.u !== userId) throw new ApiError("not_found", "Source image not found.");
  const source = await poll(handle.p, handle.j);
  const image = source.status === "completed" ? source.outputs.find((o) => o.kind === "image") : undefined;
  if (!image || !image.url.startsWith("https://")) throw new ApiError("bad_request", "That image isn't ready to animate yet.");
  return image.url;
}

/** Maps the caller's own trained character to its provider reference (never exposed to the client). */
async function resolveCharacter(id: string, userId: string, strength: number = SOUL_ID.defaultStrength) {
  const c = await characters().get(id, userId);
  if (!c) throw new ApiError("not_found", "Character not found.");
  if (c.status !== "completed" || !c.providerReferenceId) throw new ApiError("bad_request", "This character is still training.");
  return { providerId: c.providerReferenceId, strength };
}
