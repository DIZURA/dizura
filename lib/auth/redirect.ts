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

/**
 * The origin auth redirects should use: the host the browser is actually on, if it is the app's own
 * host or a Netlify alias of it (`<deploy-id>--<site host>`), else the configured app URL. The public
 * host comes first from `x-forwarded-host` — on Netlify the function sees the deploy's own address in
 * `Host`, so trusting `Host`/`nextUrl.origin` sent signed-in users to a domain without their cookie.
 * Anything not on the allow-list (e.g. a spoofed header) falls back to the app URL.
 */
export function trustedOrigin(appUrl: string, ...hostHeaders: (string | null | undefined)[]): string {
  const app = new URL(appUrl);
  for (const raw of hostHeaders) {
    const host = raw?.split(",")[0]?.trim().toLowerCase();
    if (!host) continue;
    if (host === app.host) return app.origin;
    const prefix = host.endsWith(`--${app.host}`) ? host.slice(0, -(app.host.length + 2)) : "";
    if (prefix && /^[a-z0-9-]+$/.test(prefix) && app.protocol === "https:") return `${app.protocol}//${host}`;
  }
  return app.origin;
}
