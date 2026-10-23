import "server-only";
import { z } from "zod";
import type { GenerationJob, GenerationRequest, JobStatus } from "@/types";
import { env, NotConfiguredError } from "@/lib/env";
import { ApiError, providerFetch } from "@/lib/http";

/**
 * Higgsfield API client (all AI workspaces, incl. WAN 3.0 Prime which Higgsfield hosts).
 * Server-side only. Per https://docs.higgsfield.ai :
 *   POST {base}/{model-id}                 body = model params (top level), header Idempotency-Key
 *     -> { request_id, status, status_url, cancel_url }
 *   GET  {base}/requests/{request_id}/status
 *     -> { status: queued|in_progress|completed|failed|nsfw|canceled, images?: [{url}], video?: {url} }
 *   Auth: `Authorization: Key KEY_ID:KEY_SECRET`. Billing only on successful completion.
 */

/** Model per workspace + output kind. Video for every workspace runs on WAN 3.0 Prime. */
export const MODELS = {
  image: "higgsfield-ai/soul/v2/standard",
  video: "alibaba/wan-3.0-prime/text-to-video",
  /** prompt + image_url (first frame); same duration/resolution/aspect options. */
  imageToVideo: "alibaba/wan-3.0-prime/image-to-video",
  /** Genjutsu: character image(s) perform a reference video (video2video, keeps its motion). */
  motionTransfer: "higgsfield/genjutsu/motion-transfer/v1.0",
  /** Marketing Studio Image: product photo (+ prompt) → ad creative. */
  adImage: "marketing-studio/image",
} as const;

const submitSchema = z.object({ request_id: z.string().min(1), status: z.string() });

const statusSchema = z.object({
  status: z.string(),
  images: z.array(z.object({ url: z.url() })).nullish(),
  video: z.object({ url: z.url() }).nullish(),
  error: z.unknown().optional(),
});

function auth() {
  const key = env.HIGGSFIELD_API_KEY;
  const secret = env.HIGGSFIELD_API_SECRET;
  // Accept either KEY_ID + KEY_SECRET, or the combined "KEY_ID:KEY_SECRET" credential in HIGGSFIELD_API_KEY.
  const credential = key && secret ? `${key}:${secret}` : key?.includes(":") ? key : null;
  if (!credential) throw new NotConfiguredError(["HIGGSFIELD_API_KEY", "HIGGSFIELD_API_SECRET"]);
  return {
    base: env.HIGGSFIELD_API_BASE_URL.replace(/\/$/, ""),
    headers: { authorization: `Key ${credential}`, "content-type": "application/json", accept: "application/json" },
  };
}

export function mapStatus(s: string): JobStatus {
  switch (s.toLowerCase()) {
    case "queued":
      return "queued";
    case "in_progress":
      return "processing";
    case "completed":
      return "completed";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default: // failed, nsfw, unknown
      return "failed";
  }
}

/** Builds the model + body for a request. Exported for tests. */
export function buildSubmission(req: GenerationRequest): { model: string; body: Record<string, unknown> } {
  if (req.kind === "video" && req.sourceImageUrl) {
    return {
      model: MODELS.imageToVideo,
      body: {
        prompt: req.prompt,
        image_url: req.sourceImageUrl,
        aspect_ratio: req.aspectRatio,
        duration: req.durationSec ?? 5,
        resolution: "1080p",
      },
    };
  }
  if (req.kind === "video") {
    return {
      model: MODELS.video,
      body: { prompt: req.prompt, aspect_ratio: req.aspectRatio, duration: req.durationSec ?? 5, resolution: "1080p" },
    };
  }
  const body: Record<string, unknown> = { prompt: req.prompt, aspect_ratio: req.aspectRatio };
  if (req.soulReference) {
    body.custom_reference_id = req.soulReference.providerId;
    // Must be > 0 with a character reference (0 is accepted by the schema but fails at runtime).
    body.custom_reference_strength = Math.min(1, Math.max(0.1, req.soulReference.strength));
  }
  return { model: MODELS.image, body };
}

/**
 * Submits a generation. `idempotencyKey` (our credit reservation id) makes retries safe:
 * Higgsfield returns the original request instead of creating — and billing — a second one.
 */
export async function submitGeneration(
  req: GenerationRequest,
  idempotencyKey: string,
): Promise<{ providerJobId: string; status: JobStatus }> {
  const { base, headers } = auth();
  const { model, body } = buildSubmission(req);
  const res = await providerFetch("Higgsfield", `${base}/${model}`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": idempotencyKey },
    body: JSON.stringify(body),
  });
  const job = submitSchema.parse(await res.json());
  return { providerJobId: job.request_id, status: mapStatus(job.status) };
}

/** Genjutsu motion transfer: 1–8 character images act out the reference video (≥ 4 s, trimmed to 30 s). */
export async function submitMotionTransfer(
  input: { prompt: string; videoUrl: string; imageUrls: string[]; resolution: "480p" | "720p" | "1080p" },
  idempotencyKey: string,
): Promise<{ providerJobId: string; status: JobStatus }> {
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}/${MODELS.motionTransfer}`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": idempotencyKey },
    body: JSON.stringify({ prompt: input.prompt, video_url: input.videoUrl, image_urls: input.imageUrls, resolution: input.resolution }),
  });
  const job = submitSchema.parse(await res.json());
  return { providerJobId: job.request_id, status: mapStatus(job.status) };
}

/**
 * Marketing Studio Image ad from the caller's product photo. `enhance_prompt: false` = our own
 * prompt (no preset); body per docs.higgsfield.ai/docs/models/marketing-studio-image.
 */
export async function submitAdImage(
  input: { prompt: string; imageUrls: string[]; aspectRatio: string; resolution: "1k" | "2k" | "4k"; quality: "low" | "medium" | "high" },
  idempotencyKey: string,
): Promise<{ providerJobId: string; status: JobStatus }> {
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}/${MODELS.adImage}`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": idempotencyKey },
    body: JSON.stringify({
      prompt: input.prompt.slice(0, 5000),
      image_urls: input.imageUrls,
      aspect_ratio: input.aspectRatio,
      resolution: input.resolution,
      quality: input.quality,
      enhance_prompt: false,
    }),
  });
  const job = submitSchema.parse(await res.json());
  return { providerJobId: job.request_id, status: mapStatus(job.status) };
}

export async function getJob(providerJobId: string): Promise<Pick<GenerationJob, "status" | "outputs" | "error">> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(providerJobId)) throw new Error("Invalid Higgsfield request id");
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}/requests/${providerJobId}/status`, { headers });
  const job = statusSchema.parse(await res.json());
  const outputs: GenerationJob["outputs"] = [
    ...(job.images ?? []).map((i) => ({ url: i.url, kind: "image" as const })),
    ...(job.video ? [{ url: job.video.url, kind: "video" as const }] : []),
  ];
  const raw = job.status.toLowerCase();
  return {
    status: mapStatus(raw),
    outputs,
    error: raw === "nsfw" ? "nsfw" : raw === "failed" ? "failed" : null,
  };
}

/* ------------------------------------------------------------------------------------------
 * File uploads + Soul ID (custom references) — docs.higgsfield.ai/docs/concepts/file-uploads,
 * open.higgsfield.ai/models/soul-id/api-reference
 * ---------------------------------------------------------------------------------------- */

export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

const uploadUrlSchema = z.object({
  upload_url: z.url({ protocol: /^https$/ }),
  public_url: z.url({ protocol: /^https$/ }),
  upload_headers: z.record(z.string(), z.string()).optional().default({}),
});

/**
 * Uploads bytes to Higgsfield storage and returns the public https URL.
 * The signed upload URL is never logged; our API key is NOT sent to the storage host.
 */
export async function uploadMedia(bytes: Uint8Array<ArrayBuffer>, contentType: UploadType): Promise<string> {
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}/files/generate-upload-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content_type: contentType }),
  });
  const target = uploadUrlSchema.parse(await res.json());
  const put = await fetch(target.upload_url, {
    method: "PUT",
    // Send the provider's signed headers exactly; add Content-Type only if they don't include it
    // (duplicates would be merged into "a, b" and break the storage signature).
    headers: Object.keys(target.upload_headers).some((k) => k.toLowerCase() === "content-type")
      ? target.upload_headers
      : { ...target.upload_headers, "content-type": contentType },
    body: bytes,
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  }).catch(() => null);
  if (!put?.ok) {
    console.error("[Higgsfield] storage upload failed", put?.status ?? "network");
    throw new ApiError("provider_error", "Upload failed. Please try again.");
  }
  return target.public_url;
}

export type ReferenceStatus = "not_ready" | "queued" | "in_progress" | "completed" | "failed";

const referenceSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["not_ready", "queued", "in_progress", "completed", "failed"]),
  thumbnail_url: z.string().nullish(),
  fail_reason: z.string().nullish(),
});
export type SoulReference = z.infer<typeof referenceSchema>;

const refPath = (id: string) => {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("Invalid reference id");
  return `/v1/custom-references/${id}`;
};

/** Starts Soul ID training from 1–100 public https image URLs. */
export async function createSoulReference(name: string, imageUrls: string[], idempotencyKey: string): Promise<SoulReference> {
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}/v1/custom-references`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": idempotencyKey },
    body: JSON.stringify({
      name: name.slice(0, 100),
      model_version: "v2", // must match the Soul 2 family we generate with
      input_images: imageUrls.map((url) => ({ type: "image_url", image_url: url })),
    }),
  });
  return referenceSchema.parse(await res.json());
}

export async function getSoulReference(id: string): Promise<SoulReference> {
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}${refPath(id)}`, { headers });
  return referenceSchema.parse(await res.json());
}

export async function deleteSoulReference(id: string): Promise<void> {
  const { base, headers } = auth();
  await providerFetch("Higgsfield", `${base}${refPath(id)}`, { method: "DELETE", headers });
}
