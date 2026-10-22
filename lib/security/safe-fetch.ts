import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ApiError } from "@/lib/http";

/**
 * SSRF-hardened fetch for user-supplied URLs (GEO audit).
 * - http/https only, standard ports only
 * - every hop's hostname is DNS-resolved and rejected if any address is private/loopback/link-local
 * - manual redirect following (max 3), timeout, and response size cap
 * Residual risk: DNS rebinding between lookup and connect. For stronger isolation, run the
 * fetch from an egress-restricted worker.
 */
export async function safeFetchText(
  rawUrl: string,
  { maxBytes = 2_000_000, timeoutMs = 10_000, maxRedirects = 3 } = {},
): Promise<{ url: string; status: number; headers: Headers; body: string }> {
  let url = parsePublicUrl(rawUrl);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHost(url.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "DizuraGeoAudit/1.0 (+https://dizura.com/geo-audit)", accept: "text/html,text/plain,*/*;q=0.5" },
      cache: "no-store",
    }).catch(() => {
      throw new ApiError("bad_request", "Could not reach that URL.");
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = parsePublicUrl(new URL(loc, url).toString());
      continue;
    }
    return { url: url.toString(), status: res.status, headers: res.headers, body: await readCapped(res, maxBytes) };
  }
  throw new ApiError("bad_request", "Too many redirects.");
}

export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new ApiError("bad_request", "Invalid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new ApiError("bad_request", "Only http(s) URLs are allowed.");
  if (url.username || url.password) throw new ApiError("bad_request", "URLs with credentials are not allowed.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new ApiError("bad_request", "Non-standard ports are not allowed.");
  return url;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new ApiError("bad_request", "That host is not allowed.");
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new ApiError("bad_request", "Could not resolve that host.");
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new ApiError("bad_request", "That host is not allowed.");
}

export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a = 0, b = 0] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const lower = ip.toLowerCase();
  return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff");
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
