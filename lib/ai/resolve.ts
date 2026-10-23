import "server-only";
import type { JobHandle } from "@/app/api/ai/jobs/[token]/route";
import type { UploadHandle } from "@/app/api/uploads/image/route";
import { ApiError } from "@/lib/http";
import { unseal } from "@/lib/security/signed-token";
import { poll } from "./index";

/**
 * Turns a signed job handle into the image URL of the caller's own completed image job.
 * URLs always come from the provider's result — never from client input.
 */
export async function resolveJobImage(token: string, userId: string): Promise<string> {
  const handle = unseal<JobHandle>("job", token);
  if (!handle || handle.u !== userId) throw new ApiError("not_found", "Image not found.");
  const source = await poll(handle.p, handle.j);
  const image = source.status === "completed" ? source.outputs.find((o) => o.kind === "image") : undefined;
  if (!image || !image.url.startsWith("https://")) throw new ApiError("bad_request", "That image isn't ready yet.");
  return image.url;
}

/** Resolves the caller's own (≤ 1 h old) photo upload token to its storage URL. */
export function resolveUploadImage(token: string, userId: string): string {
  const handle = unseal<UploadHandle>("upload", token);
  if (!handle || handle.u !== userId) throw new ApiError("bad_request", "A photo upload expired. Please add it again.");
  return handle.url;
}
