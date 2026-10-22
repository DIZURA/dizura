import "server-only";
import { z } from "zod";
import type { GenerationJob, GenerationRequest, JobStatus } from "@/types";
import { requireEnv } from "@/lib/env";
import { providerFetch } from "@/lib/http";

/**
 * Higgsfield platform wrapper (Ads Studio, AI Influencer).
 * All calls are server-side; the API key/secret never reach the browser.
 * VERIFY: endpoint paths & auth header against Higgsfield's current API docs before launch
 * (kept isolated here so only this file changes).
 */
const jobSchema = z.object({
  id: z.string(),
  status: z.string(),
  results: z
    .array(z.object({ url: z.url(), type: z.enum(["image", "video"]).optional() }))
    .optional()
    .default([]),
  error: z.string().nullish(),
});

function auth() {
  const { HIGGSFIELD_API_KEY, HIGGSFIELD_API_SECRET, HIGGSFIELD_API_BASE_URL } = requireEnv(
    "HIGGSFIELD_API_KEY",
    "HIGGSFIELD_API_SECRET",
    "HIGGSFIELD_API_BASE_URL",
  );
  return {
    base: HIGGSFIELD_API_BASE_URL.replace(/\/$/, ""),
    headers: {
      authorization: `Key ${HIGGSFIELD_API_KEY}:${HIGGSFIELD_API_SECRET}`,
      "content-type": "application/json",
      accept: "application/json",
    },
  };
}

export function mapStatus(s: string): JobStatus {
  switch (s.toLowerCase()) {
    case "queued":
    case "pending":
      return "queued";
    case "in_progress":
    case "processing":
    case "running":
      return "processing";
    case "completed":
    case "succeeded":
    case "success":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "failed";
  }
}

export async function submitGeneration(req: GenerationRequest): Promise<{ providerJobId: string; status: JobStatus }> {
  const { base, headers } = auth();
  const path = req.kind === "video" ? "/v1/video/generations" : "/v1/image/generations";
  const res = await providerFetch("Higgsfield", `${base}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio,
      duration: req.kind === "video" ? req.durationSec : undefined,
      input_images: req.referenceUrls,
      metadata: { workspace: req.workspace },
    }),
  });
  const job = jobSchema.parse(await res.json());
  return { providerJobId: job.id, status: mapStatus(job.status) };
}

export async function getJob(providerJobId: string): Promise<Pick<GenerationJob, "status" | "outputs" | "error">> {
  const { base, headers } = auth();
  const res = await providerFetch("Higgsfield", `${base}/v1/jobs/${encodeURIComponent(providerJobId)}`, { headers });
  const job = jobSchema.parse(await res.json());
  return {
    status: mapStatus(job.status),
    outputs: job.results.map((r) => ({ url: r.url, kind: r.type ?? "image" })),
    error: job.error ?? null,
  };
}
