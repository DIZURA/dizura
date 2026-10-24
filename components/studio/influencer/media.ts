import { api, ClientApiError } from "@/lib/api-client";
import { GENJUTSU } from "@/lib/credits/pricing";
import type { ApiResult } from "@/types";

/** Browser-side media helpers for the influencer studio. No secrets; every URL is server-issued. */

const MAX_EDGE = 1536;

/** Re-encodes to JPEG ≤ 1536 px: smaller uploads and strips EXIF (e.g. GPS) before anything leaves the device. */
export async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
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

/** Reads a local video's duration + size (display only — the server re-reads the duration from the uploaded file). */
export function videoMeta(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("metadata"));
    };
    v.src = url;
  });
}

export const VIDEO_ACCEPT = "video/mp4,video/quicktime";

/** Uploads a reference video straight to private storage (single-use signed URL) → signed token. */
export async function uploadVideo(file: File, onProgress?: (fraction: number) => void): Promise<string> {
  const type = file.type === "video/quicktime" ? "video/quicktime" : "video/mp4";
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
