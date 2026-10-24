/** Only same-site relative paths are allowed as post-auth redirects (prevents open redirects). */
export function safeNext(next: unknown, fallback = "/visual-character"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  try {
    const url = new URL(next, "http://x");
    return url.host === "x" ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}

/** Pages that require a signed-in user (enforced in proxy.ts for UX; APIs re-check). */
export const PROTECTED_PREFIXES = ["/visual-character", "/ads-studio", "/blueprints", "/reset-password"] as const;
/** Pages a signed-in user shouldn't see. */
export const GUEST_ONLY = ["/login", "/forgot-password"] as const;

export const matchesPrefix = (path: string, prefixes: readonly string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));
