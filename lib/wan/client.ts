import "server-only";
import { z } from "zod";
import type { GenerationJob, GenerationRequest, JobStatus } from "@/types";
import { env, requireEnv } from "@/lib/env";
import { providerFetch } from "@/lib/http";
import { mapStatus } from "@/lib/higgsfield/client";

/**
 * WAN 3.0 Prime video wrapper. Provider-agnostic: point WAN_API_BASE_URL at whichever
 * host serves WAN 3.0 (self-hosted, Higgsfield, or a model gateway).
 * VERIFY: request/response shape against the chosen host before launch.
 */
const taskSchema = z.object({
  id: z.string(),
  status: z.string(),
  output: z.object({ video_url: z.url().optional(), urls: z.array(z.url()).optional() }).nullish(),
  error: z.string().nullish(),
});

function auth() {
  const { WAN_API_BASE_URL, WAN_API_KEY } = requireEnv("WAN_API_BASE_URL", "WAN_API_KEY");
  return {
    base: WAN_API_BASE_URL.replace(/\/$/, ""),
    headers: { authorization: `Bearer ${WAN_API_KEY}`, "content-type": "application/json" },
  };
}

export async function submitWanVideo(req: GenerationRequest): Promise<{ providerJobId: string; status: JobStatus }> {
  const { base, headers } = auth();
  const res = await providerFetch("WAN", `${base}/v1/videos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: env.WAN_MODEL,
      prompt: req.prompt,
      aspect_ratio: req.aspectRatio,
      duration: req.durationSec ?? 5,
      image_url: req.referenceUrls?.[0],
    }),
  });
  const task = taskSchema.parse(await res.json());
  return { providerJobId: task.id, status: mapStatus(task.status) };
}

export async function getWanJob(providerJobId: string): Promise<Pick<GenerationJob, "status" | "outputs" | "error">> {
  const { base, headers } = auth();
  const res = await providerFetch("WAN", `${base}/v1/videos/${encodeURIComponent(providerJobId)}`, { headers });
  const task = taskSchema.parse(await res.json());
  const urls = [task.output?.video_url, ...(task.output?.urls ?? [])].filter((u): u is string => !!u);
  return {
    status: mapStatus(task.status),
    outputs: [...new Set(urls)].map((url) => ({ url, kind: "video" as const })),
    error: task.error ?? null,
  };
}
