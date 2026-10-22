import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Compact HMAC-signed tokens (payload.sig, base64url). Used to hand the client an opaque,
 * tamper-proof job handle without a DB round-trip. Not encrypted — don't put secrets inside.
 */
function sign(data: string, purpose: string) {
  return createHmac("sha256", env.APP_SECRET).update(`${purpose}.${data}`).digest("base64url");
}

export function seal<T extends object>(purpose: string, payload: T, ttlSec = 60 * 60 * 24): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `${data}.${sign(data, purpose)}`;
}

export function unseal<T extends object>(purpose: string, token: string): T | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data, purpose));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString()) as T & { exp: number };
    return parsed.exp > Date.now() / 1000 ? parsed : null;
  } catch {
    return null;
  }
}
