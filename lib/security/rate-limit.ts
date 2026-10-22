import "server-only";
import { ApiError } from "@/lib/http";

/**
 * Fixed-window in-memory limiter. Good for a single instance / dev.
 * ROADMAP: swap for a shared store (Upstash Redis / Supabase) before horizontal scaling.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    throw new ApiError("rate_limited", "Too many requests. Please slow down.", { "Retry-After": String(retryAfter) });
  }
}
