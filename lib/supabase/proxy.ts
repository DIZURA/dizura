import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export type SessionRefresh = {
  userId: string | null;
  /** Cookies + anti-caching headers that must be applied to whatever response the proxy returns. */
  apply: (res: Response & { cookies: { set: (name: string, value: string, options?: object) => unknown } }) => void;
};

/**
 * Refreshes the Supabase session in Proxy (Server Components can't write cookies).
 * Refreshed tokens are written to the incoming request (so Server Components see them)
 * and to the outgoing response (so the browser stores them).
 * Note: page-level checks here are UX only — every Server Action / API route re-verifies.
 */
export async function refreshSession(req: NextRequest): Promise<SessionRefresh> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { userId: null, apply: () => {} };

  let pending: { name: string; value: string; options?: object }[] = [];
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet, headers) => {
        for (const { name, value } of toSet) req.cookies.set(name, value);
        pending = toSet;
        cacheHeaders = headers ?? {};
      },
    },
  });

  // Do not insert code between client creation and getClaims() (Supabase guidance).
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  return {
    userId,
    apply: (res) => {
      for (const { name, value, options } of pending) res.cookies.set(name, value, options);
      for (const [k, v] of Object.entries(cacheHeaders)) res.headers.set(k, v);
    },
  };
}
