import { requireUser } from "@/lib/auth/session";
import { SOUL_ID } from "@/lib/credits/pricing";
import { uploadMedia, type UploadType } from "@/lib/higgsfield/client";
import { ApiError, ok, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";

export const runtime = "nodejs";

/** Signed, short-lived handle to an uploaded image. The URL inside never comes from the client. */
export type UploadHandle = { u: string; url: string };

/** Detects the real image type from magic bytes (the browser-supplied MIME type is not trusted). */
function sniff(b: Uint8Array): UploadType | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** POST multipart/form-data { file } → { token } for one Soul ID training photo. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`upload:${user.id}`, 60, 10 * 60_000);
  assertSigningConfigured();
  if (Number(req.headers.get("content-length") ?? 0) > SOUL_ID.maxUploadBytes + 64 * 1024) {
    throw new ApiError("bad_request", "Image is too large.");
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError("bad_request", "No image received.");
  if (file.size > SOUL_ID.maxUploadBytes) throw new ApiError("bad_request", "Image is too large.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type) throw new ApiError("bad_request", "Only JPEG, PNG or WebP images are allowed.");

  const url = await uploadMedia(bytes, type);
  return ok({ token: seal<UploadHandle>("upload", { u: user.id, url }, 60 * 60) }, { status: 201 });
});
