import { api, ClientApiError } from "@/lib/api-client";
import { GENJUTSU } from "@/lib/credits/pricing";
import { mp4DurationSeconds } from "@/lib/media/mp4";
import type { ApiResult } from "@/types";

/** Browser-side media helpers for the influencer studio. No secrets; every URL is server-issued. */

const MAX_EDGE = 1536;

/**
 * Decodes an image, upright. Older Safari (iOS ≤ 16) throws on the `imageOrientation` option and
 * some builds can't decode a File via createImageBitmap at all, so fall back step by step; an
 * <img> applies EXIF orientation itself.
 */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  for (const opts of [{ imageOrientation: "from-image" } as ImageBitmapOptions, undefined]) {
    try {
      const bmp = await createImageBitmap(file, opts);
      return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
    } catch {
      // try the next decoder
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}

/** Re-encodes to JPEG ≤ 1536 px: smaller uploads and strips EXIF (e.g. GPS) before anything leaves the device. */
export async function toJpeg(file: File): Promise<Blob> {
  const img = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img.source, 0, 0, canvas.width, canvas.height);
  img.done();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9));
}

/** Uploads one photo → signed 1 h upload token. */
export async function uploadPhoto(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  const res = await fetch("/api/uploads/image", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as ApiResult<{ token: string }> | null;
  if (!json?.ok) throw new ClientApiError(json && !json.ok ? json.error.code : "internal", "upload failed");
  return json.data.token;
}

/** Frame size via a hidden <video>; resolves null instead of hanging (iOS often never loads metadata). */
function videoSize(file: File, timeoutMs = 4000): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    const finish = (meta: { duration: number; width: number; height: number } | null) => {
      clearTimeout(timer);
      v.removeAttribute("src");
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => finish({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => finish(null);
    v.src = url;
  });
}

/**
 * Reads a local video's duration + frame size (display only — the server re-reads the duration
 * from the uploaded file). The duration comes from the MP4/MOV header itself, so it works for
 * every codec (e.g. iPhone HEVC) without the browser having to decode the video.
 */
export async function videoMeta(file: File): Promise<{ duration: number; width: number; height: number }> {
  const read = async (offset: number, length: number) => new Uint8Array(await file.slice(offset, offset + length).arrayBuffer());
  const [header, size] = await Promise.all([mp4DurationSeconds(read, file.size).catch(() => null), videoSize(file)]);
  const duration = header ?? (size && Number.isFinite(size.duration) ? size.duration : null);
  if (!duration) throw new Error("metadata");
  return { duration, width: size?.width ?? 0, height: size?.height ?? 0 };
}

export const VIDEO_ACCEPT = "video/mp4,video/quicktime";

/** Uploads a reference video straight to private storage (single-use signed URL) → signed token. */
export async function uploadVideo(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const type = file.type === "video/quicktime" || (!file.type && /\.(mov|qt)$/i.test(file.name)) ? "video/quicktime" : "video/mp4";
  if (file.size > GENJUTSU.maxVideoBytes) throw new ClientApiError("bad_request", "too large");
  const slot = await api<{ uploadUrl: string; headers: Record<string, string>; token: string }>("/api/uploads/video", {
    method: "POST",
    body: JSON.stringify({ type, size: file.size }),
  });
  // XHR (not fetch) for upload progress.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", slot.uploadUrl);
    for (const [k, v] of Object.entries(slot.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ClientApiError("provider_error", `upload ${xhr.status}`)));
    xhr.onerror = () => reject(new ClientApiError("provider_error", "upload network"));
    xhr.send(file);
  });
  return slot.token;
}

/** "unavailable" when the service itself can't take uploads right now (keys/account), else "failed". */
export const uploadErrorKind = (err: unknown): "unavailable" | "failed" =>
  err instanceof ClientApiError && err.code === "not_configured" ? "unavailable" : "failed";
