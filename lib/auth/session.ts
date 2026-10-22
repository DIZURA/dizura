import "server-only";
import { cache } from "react";
import { z } from "zod";
import type { SessionUser } from "@/types";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.string().optional(),
  is_anonymous: z.boolean().optional(),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
});

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function toSessionUser(raw: unknown): SessionUser | null {
  const parsed = claimsSchema.safeParse(raw);
  if (!parsed.success || parsed.data.is_anonymous) return null;
  const c = parsed.data;
  const meta = c.user_metadata ?? {}; // display-only — never used for authorization
  return {
    id: c.sub,
    email: c.email ?? "",
    name: typeof meta.full_name === "string" ? meta.full_name.slice(0, 80) : null,
    plan: "free", // ROADMAP: read from profiles / app_metadata
    locale: meta.locale === "en" ? "en" : "ar",
  };
}

/**
 * Current user for Server Components / Server Actions, or null. Deduplicated per request.
 * getClaims() verifies the JWT signature (JWKS) — never trust getSession() on the server.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return toSessionUser(data.claims);
});

/**
 * Resolves the caller for API routes.
 * - `Authorization: Bearer <access token>` (API clients) — verified via getClaims(token).
 * - Otherwise the session cookie. Cookie-authenticated state-changing requests must be
 *   same-origin (CSRF defence in depth on top of SameSite=Lax cookies).
 */
export async function requireUser(req: Request): Promise<SessionUser> {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new ApiError("not_configured", "Authentication is not configured.");
  }
  const supabase = await createSupabaseServerClient();
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!bearer && !SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    throw new ApiError("forbidden", "Cross-origin request blocked.");
  }

  const { data, error } = bearer ? await supabase.auth.getClaims(bearer) : await supabase.auth.getClaims();
  const user = !error && data ? toSessionUser(data.claims) : null;
  if (!user) throw new ApiError("unauthorized", "Sign in required.");
  return user;
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
