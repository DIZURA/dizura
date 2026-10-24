import "server-only";
import { z } from "zod";
import { env, NotConfiguredError } from "@/lib/env";
import { ApiError } from "@/lib/http";

/**
 * Service-role PostgREST access for server-only stores. Returns null outside production when
 * Supabase isn't configured (stores then use their in-memory dev fallback); production without
 * it fails closed with `not_configured`.
 */
export function serviceRest(): { url: string; key: string } | null {
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return { url: env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY };
  }
  if (env.NODE_ENV !== "production") return null;
  throw new NotConfiguredError(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
}

const uuid = z.uuid();
/** Validates ids before they are interpolated into PostgREST filters. */
export const assertIds = (...values: string[]) => values.forEach((v) => uuid.parse(v));

export async function restRows<T>(
  conn: { url: string; key: string },
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  label = "store",
): Promise<T[]> {
  const res = await fetch(`${conn.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: conn.key,
      authorization: `Bearer ${conn.key}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...init.headers,
    },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[${label}] supabase`, res.status, (await res.text()).slice(0, 300));
    throw new ApiError("internal", "Storage unavailable.");
  }
  return res.status === 204 ? [] : z.array(schema).parse(await res.json());
}
