import "server-only";
import { z } from "zod";
import type { GenerationJob, GenerationRequest, JobStatus } from "@/types";
import { env, NotConfiguredError } from "@/lib/env";
import { providerFetch } from "@/lib/http";

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
  return { model: MODELS.image, body: { prompt: req.prompt, aspect_ratio: req.aspectRatio } };
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
