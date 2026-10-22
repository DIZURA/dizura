import "server-only";
import type { GenerationJob, GenerationRequest, JobStatus } from "@/types";
import * as higgsfield from "@/lib/higgsfield/client";
import * as wan from "@/lib/wan/client";

/** Routes a normalised request to the right provider. Workspaces never import providers directly. */
export function providerFor(req: Pick<GenerationRequest, "workspace">): GenerationJob["provider"] {
  return req.workspace === "wan-prime" ? "wan" : "higgsfield";
}

export async function submit(req: GenerationRequest): Promise<{ providerJobId: string; status: JobStatus }> {
  return providerFor(req) === "wan" ? wan.submitWanVideo(req) : higgsfield.submitGeneration(req);
}

export async function poll(provider: GenerationJob["provider"], providerJobId: string) {
  return provider === "wan" ? wan.getWanJob(providerJobId) : higgsfield.getJob(providerJobId);
}
