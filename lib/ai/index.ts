import "server-only";
import type { GenerationJob, GenerationRequest, JobStatus } from "@/types";
import * as higgsfield from "@/lib/higgsfield/client";

/** Single provider today (Higgsfield hosts WAN 3.0 Prime too). Workspaces never import providers directly. */
export function providerFor(): GenerationJob["provider"] {
  return "higgsfield";
}

export async function submit(req: GenerationRequest, idempotencyKey: string): Promise<{ providerJobId: string; status: JobStatus }> {
  return higgsfield.submitGeneration(req, idempotencyKey);
}

export async function poll(_provider: GenerationJob["provider"], providerJobId: string) {
  return higgsfield.getJob(providerJobId);
}

export async function submitMotionTransfer(...args: Parameters<typeof higgsfield.submitMotionTransfer>) {
  return higgsfield.submitMotionTransfer(...args);
}

export async function submitAdImage(...args: Parameters<typeof higgsfield.submitAdImage>) {
  return higgsfield.submitAdImage(...args);
}

export async function submitAdVideo(...args: Parameters<typeof higgsfield.submitAdVideo>) {
  return higgsfield.submitAdVideo(...args);
}
