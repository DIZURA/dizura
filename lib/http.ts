import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiErrorCode, ApiResult } from "@/types";
import { NotConfiguredError } from "./env";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  insufficient_credits: 402,
  rate_limited: 429,
  provider_error: 502,
  not_configured: 503,
  internal: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, init);
}

export function fail(code: ApiErrorCode, message: string, headers?: Record<string, string>) {
  return NextResponse.json<ApiResult<never>>(
    { ok: false, error: { code, message } },
    { status: STATUS[code], headers },
  );
}

/** Maps any thrown value to a safe JSON error. Internal details are logged, never returned. */
export function handleError(err: unknown) {
  if (err instanceof ApiError) return fail(err.code, err.message, err.headers);
  if (err instanceof z.ZodError) {
    return fail("bad_request", err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
  }
  if (err instanceof NotConfiguredError) {
    console.error("[config]", err.message);
    return fail("not_configured", "This feature is not configured yet.");
  }
  console.error("[api] unhandled error", err);
  return fail("internal", "Something went wrong.");
}

/** Wraps a route handler with uniform error handling. */
export function route<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      return handleError(err);
    }
  };
}

/** Parses a JSON body against a schema with a size cap (default 64 KB). */
export async function parseJson<S extends z.ZodType>(req: Request, schema: S, maxBytes = 64 * 1024): Promise<z.infer<S>> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ApiError("bad_request", "Request body too large.");
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError("bad_request", "Request body too large.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError("bad_request", "Invalid JSON body.");
  }
  return schema.parse(json);
}

/** Server-to-provider fetch with timeout and a typed provider error. */
export async function providerFetch(provider: string, url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 30_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch (err) {
    console.error(`[${provider}] network error`, err);
    throw new ApiError("provider_error", `${provider} is unreachable.`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[${provider}] ${res.status} ${url}`, body.slice(0, 500));
    throw new ApiError("provider_error", `${provider} request failed (${res.status}).`);
  }
  return res;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
