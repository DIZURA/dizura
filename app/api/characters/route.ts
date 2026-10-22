import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { characters, type Character } from "@/lib/characters/store";
import { SOUL_ID } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { createSoulReference, getSoulReference } from "@/lib/higgsfield/client";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, unseal } from "@/lib/security/signed-token";
import type { UploadHandle } from "../uploads/image/route";
import { isTerminal, toView } from "./view";

export const runtime = "nodejs";

const body = z.object({
  name: z.string().trim().min(1).max(60),
  uploads: z.array(z.string().min(10).max(2048)).min(SOUL_ID.minPhotos).max(SOUL_ID.maxPhotos),
  /** The user confirms they own the photos / have the person's consent. */
  consent: z.literal(true),
});

/** GET → the caller's characters, refreshing any still training. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`chars:list:${user.id}`, 60, 60_000);
  const list = await characters().list(user.id);
  const refreshed = await Promise.all(list.map((c) => (isTerminal(c) || !c.providerReferenceId ? c : refresh(c))));
  return ok(refreshed.map(toView));
});

/** POST { name, uploads[], consent } → start Soul ID training (charges SOUL_ID.trainingCredits). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`chars:create:${user.id}`, 5, 10 * 60_000);
  assertSigningConfigured();
  const input = await parseJson(req, body);

  // Only images this user uploaded in the last hour (signed handles) — never raw client URLs.
  const urls = input.uploads.map((t) => {
    const h = unseal<UploadHandle>("upload", t);
    if (!h || h.u !== user.id || !h.url.startsWith("https://")) throw new ApiError("bad_request", "An uploaded photo expired. Please upload it again.");
    return h.url;
  });
  if (new Set(urls).size !== urls.length) throw new ApiError("bad_request", "Each photo can only be used once.");

  const existing = (await characters().list(user.id)).filter((c) => c.status !== "failed");
  if (existing.length >= SOUL_ID.maxCharacters) throw new ApiError("forbidden", "Character limit reached. Delete one to train another.");

  const character = await characters().create({ userId: user.id, name: input.name, photoCount: urls.length, creditsCharged: SOUL_ID.trainingCredits });
  try {
    await credits().apply({ userId: user.id, delta: -SOUL_ID.trainingCredits, reason: "generation", referenceId: `soul:${character.id}` });
  } catch (err) {
    await characters().remove(character.id, user.id);
    throw err;
  }

  try {
    const ref = await createSoulReference(input.name, urls, character.id);
    await characters().update(character.id, user.id, { providerReferenceId: ref.id, status: ref.status, thumbnailUrl: ref.thumbnail_url ?? null, failReason: ref.fail_reason ?? null });
    return ok(toView({ ...character, providerReferenceId: ref.id, status: ref.status, thumbnailUrl: ref.thumbnail_url ?? null }), { status: 202 });
  } catch (err) {
    await credits().apply({ userId: user.id, delta: SOUL_ID.trainingCredits, reason: "refund", referenceId: `soul:${character.id}` });
    await characters().remove(character.id, user.id);
    throw err;
  }
});

/** Pulls the latest training status; refunds once if training failed. */
async function refresh(c: Character): Promise<Character> {
  try {
    const ref = await getSoulReference(c.providerReferenceId!);
    const next: Character = { ...c, status: ref.status, thumbnailUrl: ref.thumbnail_url ?? c.thumbnailUrl, failReason: ref.fail_reason ?? null };
    if (next.status !== c.status || next.thumbnailUrl !== c.thumbnailUrl) {
      await characters().update(c.id, c.userId, { status: next.status, thumbnailUrl: next.thumbnailUrl, failReason: next.failReason });
    }
    if (next.status === "failed") {
      // Idempotent on the character id — refunds at most once even if polled many times.
      await credits().apply({ userId: c.userId, delta: c.creditsCharged, reason: "refund", referenceId: `soul:${c.id}` });
    }
    return next;
  } catch (err) {
    console.warn("[characters] refresh failed", c.id, err instanceof Error ? err.message : err);
    return c;
  }
}
