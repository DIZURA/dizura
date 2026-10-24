import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/**
 * Target of Supabase email links (signup confirmation, password recovery).
 * Supports both the PKCE `?code=` flow and `?token_hash=&type=` email templates.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = withoutAuthParams(safeNext(url.searchParams.get("next")));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type && OTP_TYPES.has(type)
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : { error: new Error("missing params") };
    if (!error) return redirectHere(next);
    console.warn("[auth-callback] verification failed:", error.message);
  } catch (err) {
    console.error("[auth-callback]", err);
  }
  return redirectHere("/login?error=link");
}

/** Drops leftover one-time auth params (e.g. a stale `code`) from the post-login path. */
function withoutAuthParams(path: string) {
  const u = new URL(path, "http://x");
  for (const k of ["code", "token_hash", "type", "next", "error", "error_code", "error_description"]) u.searchParams.delete(k);
  return `${u.pathname}${u.search}`;
}

/**
 * Relative redirect: the browser stays on the host it called the callback on — the host the session
 * cookie was just set for. (On Netlify `nextUrl.origin` is the deploy's own address and request headers
 * don't reliably carry the public host, so any absolute URL built here can land on a cookie-less host.)
 * `path` is always a same-site path from safeNext() or a constant.
 */
function redirectHere(path: string) {
  return new NextResponse(null, { status: 303, headers: { location: path, "cache-control": "no-store" } });
}
