import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext, trustedOrigin } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

/**
 * Target of Supabase email links (signup confirmation, password recovery).
 * Supports both the PKCE `?code=` flow and `?token_hash=&type=` email templates.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  // Not url.origin: on Netlify that is the deploy's own address, where the session cookie doesn't exist.
  const origin = trustedOrigin(process.env.NEXT_PUBLIC_APP_URL ?? url.origin, req.headers.get("x-forwarded-host"), req.headers.get("host"));
  const next = safeNext(url.searchParams.get("next"));
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
    if (!error) return NextResponse.redirect(new URL(next, origin));
    console.warn("[auth-callback] verification failed:", error.message);
  } catch (err) {
    console.error("[auth-callback]", err);
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
