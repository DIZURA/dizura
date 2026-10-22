/**
 * Resolves the app's public origin at BUILD time (imported by next.config.ts, which inlines it).
 * Priority:
 *   1. NEXT_PUBLIC_APP_URL, if set (owner sets this for Production only).
 *   2. On Netlify: production -> URL (primary domain); deploy previews / branch deploys -> DEPLOY_PRIME_URL.
 *   3. http://localhost:3000.
 * Deliberately NOT derived from the request Host header: auth emails and Tap redirects built from a
 * spoofable header would let an attacker point password-reset links at their own domain.
 */
type Env = Record<string, string | undefined>;

const LOCAL = "http://localhost:3000";

export function resolveAppUrl(env: Env): string {
  const explicit = env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return toOrigin(explicit, "NEXT_PUBLIC_APP_URL", env);

  if (env.NETLIFY === "true") {
    const fromNetlify = env.CONTEXT === "production" ? env.URL : (env.DEPLOY_PRIME_URL ?? env.DEPLOY_URL ?? env.URL);
    if (fromNetlify?.trim()) return toOrigin(fromNetlify.trim(), env.CONTEXT === "production" ? "URL" : "DEPLOY_PRIME_URL", env);
    throw new Error("[app-url] Netlify build without URL/DEPLOY_PRIME_URL — cannot determine the app URL.");
  }
  return LOCAL;
}

function toOrigin(raw: string, source: string, env: Env): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`[app-url] ${source} is not a valid URL.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(`[app-url] ${source} must be http(s).`);
  // Deployed builds must be https (Netlify serves every site over https, even if URL says http).
  if (env.NETLIFY === "true" && url.protocol === "http:" && url.hostname !== "localhost") url.protocol = "https:";
  return url.origin;
}
