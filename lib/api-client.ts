import type { ApiResult } from "@/types";

/** Browser-side fetch for our own API routes. Never holds secrets. */
export class ClientApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!json) throw new ClientApiError("internal", `HTTP ${res.status}`);
  if (!json.ok) throw new ClientApiError(json.error.code, json.error.message);
  return json.data;
}
