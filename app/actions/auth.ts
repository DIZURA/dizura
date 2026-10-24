"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { safeNext, trustedOrigin } from "@/lib/auth/redirect";
import { rateLimit } from "@/lib/security/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Error/notice codes are mapped to localized strings in the UI (dictionaries.auth.errors). */
export type AuthState =
  | { status: "idle" }
  /** `email` is echoed back so the form can keep it after React resets the form; passwords never are. */
  | { status: "error"; code: AuthErrorCode; email?: string }
  | { status: "notice"; code: "checkEmail" | "resetSent" };

export type AuthErrorCode =
  | "invalidInput"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "weakPassword"
  | "passwordMismatch"
  | "rateLimited"
  | "emailRateLimited"
  | "invalidEmail"
  | "googleUnavailable"
  | "notConfigured"
  | "generic";

const email = z.email().max(254).transform((v) => v.trim().toLowerCase());
const password = z.string().min(8).max(72); // bcrypt limit

async function guard(bucket: string, limit: number): Promise<AuthErrorCode | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  try {
    rateLimit(`auth:${bucket}:${ip}`, limit, 10 * 60_000);
    return null;
  } catch (err) {
    return err instanceof ApiError ? "rateLimited" : "generic";
  }
}

async function client() {
  try {
    return await createSupabaseServerClient();
  } catch (err) {
    // Usually missing NEXT_PUBLIC_SUPABASE_* env vars on the deploy; logged so it shows in function logs.
    console.error("[auth] Supabase client unavailable:", err instanceof Error ? err.message : "unknown");
    return null;
  }
}

function mapAuthError(code: string | undefined, status: number | undefined): AuthErrorCode {
  // Codes only — never emails or passwords.
  console.warn(`[auth] Supabase auth error: ${code ?? "unknown"} (${status ?? "?"})`);
  if (code === "over_email_send_rate_limit") return "emailRateLimited";
  if (status === 429 || code === "over_request_rate_limit") return "rateLimited";
  if (code === "email_address_invalid") return "invalidEmail";
  if (code === "email_not_confirmed") return "emailNotConfirmed";
  if (code === "weak_password") return "weakPassword";
  if (code === "invalid_credentials") return "invalidCredentials";
  return "generic";
}

const echo = (form: FormData) => {
  const v = form.get("email");
  return typeof v === "string" ? v.slice(0, 254) : undefined;
};

/**
 * Auth links must come back to the host the flow started on: the PKCE code verifier is a cookie
 * on that host. Only the app's own host or a Netlify alias of it (`<deploy-id>--<site host>`) is
 * honoured — anything else (e.g. a spoofed Host header) falls back to the configured app URL.
 */
async function callbackUrl(next: string) {
  const h = await headers();
  const origin = trustedOrigin(env.NEXT_PUBLIC_APP_URL, h.get("x-forwarded-host"), h.get("host"));
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1).max(72) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { status: "error", code: "invalidInput", email: echo(form) };
  const limited = await guard("signin", 10);
  if (limited) return { status: "error", code: limited, email: echo(form) };

  const supabase = await client();
  if (!supabase) return { status: "error", code: "notConfigured", email: echo(form) };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password — no account enumeration.
  if (error) return { status: "error", code: mapAuthError(error.code, error.status), email: echo(form) };
  redirect(safeNext(form.get("next")));
}

/**
 * "Continue with Google": PKCE OAuth via Supabase. The code verifier lives in an httpOnly cookie
 * and /auth/callback exchanges the code. Google accounts arrive email-verified, so the welcome
 * bonus trigger (ADR 25) grants credits on insert.
 */
export async function signInWithGoogle(_: AuthState, form: FormData): Promise<AuthState> {
  const limited = await guard("oauth", 20);
  if (limited) return { status: "error", code: limited };
  const supabase = await client();
  if (!supabase) return { status: "error", code: "notConfigured" };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(safeNext(form.get("next"))), skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.warn(`[auth] Google sign-in unavailable: ${error?.code ?? "no url"} (${error?.status ?? "?"})`);
    return { status: "error", code: "googleUnavailable" };
  }
  redirect(data.url);
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z
    .object({ email, password, confirm: z.string(), name: z.string().trim().max(80).optional(), locale: z.enum(["ar", "en"]) })
    .safeParse({
      email: form.get("email"),
      password: form.get("password"),
      confirm: form.get("confirm"),
      name: form.get("name") || undefined,
      locale: form.get("locale"),
    });
  if (!parsed.success) {
    const pwIssue = parsed.error.issues.some((i) => i.path[0] === "password");
    return { status: "error", code: pwIssue ? "weakPassword" : "invalidInput", email: echo(form) };
  }
  if (parsed.data.password !== parsed.data.confirm) return { status: "error", code: "passwordMismatch", email: echo(form) };
  const limited = await guard("signup", 5);
  if (limited) return { status: "error", code: limited, email: echo(form) };

  const supabase = await client();
  if (!supabase) return { status: "error", code: "notConfigured", email: echo(form) };
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: await callbackUrl(safeNext(form.get("next"))),
      // user_metadata is user-editable: display/preferences only, never authorization.
      data: { full_name: parsed.data.name ?? null, locale: parsed.data.locale },
    },
  });
  if (error) return { status: "error", code: mapAuthError(error.code, error.status), email: echo(form) };
  // If email confirmation is disabled in Supabase, a session is returned immediately.
  if (data.session) redirect(safeNext(form.get("next")));
  return { status: "notice", code: "checkEmail" };
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { status: "error", code: "invalidInput", email: echo(form) };
  const limited = await guard("reset", 5);
  if (limited) return { status: "error", code: limited, email: echo(form) };

  const supabase = await client();
  if (!supabase) return { status: "error", code: "notConfigured", email: echo(form) };
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: await callbackUrl("/reset-password") });
  // Supabase answers unknown emails with success (no enumeration), so any error here is real.
  if (error) return { status: "error", code: mapAuthError(error.code, error.status), email: echo(form) };
  return { status: "notice", code: "resetSent" };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = z.object({ password, confirm: z.string() }).safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { status: "error", code: "weakPassword" };
  if (parsed.data.password !== parsed.data.confirm) return { status: "error", code: "passwordMismatch" };

  const supabase = await client();
  if (!supabase) return { status: "error", code: "notConfigured" };
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?next=/reset-password");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", code: mapAuthError(error.code, error.status) };
  redirect("/visual-character");
}

export async function signOut(): Promise<void> {
  const supabase = await client();
  await supabase?.auth.signOut();
  redirect("/");
}
