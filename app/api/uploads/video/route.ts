import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { GENJUTSU } from "@/lib/credits/pricing";
import { ok, parseJson, route } from "@/lib/http";
import { referenceVideos, VIDEO_TYPES } from "@/lib/media/reference-videos";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";

export const runtime = "nodejs";

/** Signed handle to the caller's uploaded reference video (path inside the private bucket). */
export type VideoHandle = { u: string; path: string };

const body = z.object({
  type: z.enum(VIDEO_TYPES),
  size: z.number().int().positive().max(GENJUTSU.maxVideoBytes),
});

/**
 * POST { type, size } → { uploadUrl, headers, token }. The browser PUTs the file to `uploadUrl`
 * (single-use, scoped to one new path under the caller's folder) and later sends `token`.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`video-upload:${user.id}`, 20, 10 * 60_000);
  assertSigningConfigured();
  const input = await parseJson(req, body);
  const upload = await referenceVideos().createUpload(user.id, input.type);
  return ok(
    { uploadUrl: upload.uploadUrl, headers: upload.headers, token: seal<VideoHandle>("video", { u: user.id, path: upload.path }, 2 * 60 * 60) },
    { status: 201 },
  );
});
