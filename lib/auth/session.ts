import "server-only";
import { z } from "zod";
import type { SessionUser } from "@/types";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";

const supabaseUser = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
});

const DEV_USER: SessionUser = { id: "dev-user", email: "dev@dizura.local", name: "Dev User", plan: "pro", locale: "ar" };

/**
 * Resolves the caller from `Authorization: Bearer <supabase access token>`.
 * The token is verified by Supabase Auth (server-to-server) — never trusted from the client.
 * Dev fallback (development only): a request with no bearer token gets a fixed dev user while
 * the credit ledger is still in-memory (no SUPABASE_SERVICE_ROLE_KEY). Never active in production.
 */
export async function requireUser(req: Request): Promise<SessionUser> {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token && env.NODE_ENV === "development" && !env.SUPABASE_SERVICE_ROLE_KEY) return DEV_USER;
  if (!supabaseUrl || !publishableKey) throw new ApiError("not_configured", "Authentication is not configured.");
  if (!token) throw new ApiError("unauthorized", "Sign in required.");

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: publishableKey },
    signal: AbortSignal.timeout(5_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) throw new ApiError("unauthorized", "Session expired. Please sign in again.");

  const user = supabaseUser.parse(await res.json());
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof meta.full_name === "string" ? meta.full_name : null,
    plan: "free", // ROADMAP: read from profiles table
    locale: meta.locale === "en" ? "en" : "ar",
  };
}
