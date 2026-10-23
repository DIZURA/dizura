import { NextResponse, type NextRequest } from "next/server";
import { GUEST_ONLY, PROTECTED_PREFIXES, matchesPrefix } from "@/lib/auth/redirect";
import { refreshSession } from "@/lib/supabase/proxy";

/**
 * 1. Refresh the Supabase session cookie (Server Components can't write cookies).
 * 2. Redirect guests away from protected pages / signed-in users away from /login (UX only —
 *    Server Actions and API routes always re-verify the user themselves).
 * 3. Per-request nonce Content-Security-Policy.
 */
export async function proxy(req: NextRequest) {
  const session = await refreshSession(req);
  const path = req.nextUrl.pathname;

  if (!session.userId && matchesPrefix(path, PROTECTED_PREFIXES)) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", `${path}${req.nextUrl.search}`);
    const res = NextResponse.redirect(login);
    session.apply(res);
    return res;
  }
  if (session.userId && matchesPrefix(path, GUEST_ONLY)) {
    const res = NextResponse.redirect(new URL("/visual-character", req.url));
    session.apply(res);
    return res;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${supabase}${isDev ? " ws:" : ""}`.trim(),
    "frame-src https://*.tap.company",
    "form-action 'self' https://*.tap.company",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // req.headers already carries any refreshed session cookie (set by refreshSession).
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  session.apply(res);
  return res;
}

export const config = {
  // Skip API routes (they verify auth themselves), static assets and prefetches.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|ico|txt)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
