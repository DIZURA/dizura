import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GenerationJob } from "@/types";
import { providerFor, submit, submitAdImage } from "@/lib/ai";
import { resolveJobImage, resolveUploadImage } from "@/lib/ai/resolve";
import { requireUser } from "@/lib/auth/session";
import { characters } from "@/lib/characters/store";
import { generationCost, SOUL_ID, VIDEO_DURATION } from "@/lib/credits/pricing";
import { getPrices } from "@/lib/credits/costs";
import { credits } from "@/lib/credits/store";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";
import type { JobHandle } from "../jobs/[token]/route";

export const runtime = "nodejs";

const body = z
  .object({
    workspace: z.enum(["visual-character", "ads-studio"]),
    prompt: z.string().trim().min(3).max(2000),
    kind: z.enum(["image", "video"]),
    aspectRatio: z.enum(["1:1", "9:16", "16:9", "3:4"]).default("9:16"),
    durationSec: z.number().int().min(VIDEO_DURATION.min).max(VIDEO_DURATION.max).optional(),
    /** Signed handle of the caller's own completed image job, to animate it (image-to-video). */
    sourceJob: z.string().min(10).max(2048).optional(),
    /** One of the caller's trained Soul ID characters (images only). */
    characterId: z.uuid().optional(),
    characterStrength: z.number().min(0.1).max(1).optional(),
    /** Signed handle of the caller's own uploaded photo: the character is made from it (images only). */
    referencePhoto: z.string().min(10).max(2048).optional(),
    /** Signed handle of the caller's own outfit photo: the character wears its clothes (images only). */
    styleReference: z.string().min(10).max(2048).optional(),
  })
  .refine((b) => !b.characterId || b.kind === "image", { message: "Characters are used for images; animate the image afterwards." })
  .refine((b) => !b.sourceJob || b.kind === "video", { message: "Only videos can start from an image." })
  .refine((b) => !b.referencePhoto || (b.kind === "image" && !b.characterId), { message: "A reference photo makes an image, without a DIZURA ID." })
  .refine((b) => !b.styleReference || (b.kind === "image" && !b.characterId), { message: "A style reference makes an image, without a DIZURA ID." });

/** Appended server-side whenever a style reference is sent (it is always the last reference image). */
const STYLE_REFERENCE_DIRECTION =
  "Dress the character exactly in the clothing, accessories and styling shown in the last reference image, replacing any outfit described above. " +
  "Do not copy the face, body or identity of the person in that image";

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`gen:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body);
  // Fail before reserving credits if the job handle can't be signed.
  assertSigningConfigured();
  const sourceImageUrl = input.sourceJob ? await resolveJobImage(input.sourceJob, user.id) : undefined;
  const soulReference = input.characterId ? await resolveCharacter(input.characterId, user.id, input.characterStrength) : undefined;
  const photoUrl = input.referencePhoto ? resolveUploadImage(input.referencePhoto, user.id) : undefined;
  const styleUrl = input.styleReference ? resolveUploadImage(input.styleReference, user.id) : undefined;
  const imageUrls = [photoUrl, styleUrl].filter((u): u is string => !!u);
  const prompt = styleUrl ? `${input.prompt}. ${STYLE_REFERENCE_DIRECTION}` : input.prompt;

  const cost = generationCost(input, await getPrices(), imageUrls.length > 0);
  const referenceId = randomUUID();
  // Reserve credits first; refund if the provider rejects the job.
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });

  let submitted: Awaited<ReturnType<typeof submit>>;
  try {
    // Reference photos (subject and/or outfit) go to the reference-image model (same as Ads Studio), at 2k / medium.
    submitted = imageUrls.length
      ? await submitAdImage({ prompt, imageUrls, aspectRatio: input.aspectRatio, resolution: "2k", quality: "medium" }, referenceId)
      : await submit({ ...input, sourceImageUrl, soulReference }, referenceId);
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

/** Maps the caller's own trained character to its provider reference (never exposed to the client). */
async function resolveCharacter(id: string, userId: string, strength: number = SOUL_ID.defaultStrength) {
  const c = await characters().get(id, userId);
  if (!c) throw new ApiError("not_found", "Character not found.");
  if (c.status !== "completed" || !c.providerReferenceId) throw new ApiError("bad_request", "This character is still training.");
  return { providerId: c.providerReferenceId, strength };
}
