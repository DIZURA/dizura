import { timingSafeEqual } from "node:crypto";
import { refreshProviderCosts } from "@/lib/credits/costs";
import { env } from "@/lib/env";
import { ApiError, ok, route } from "@/lib/http";
import { renewDue } from "@/lib/subscriptions/billing";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || secret.length < 32) throw new ApiError("not_configured", "Scheduled jobs are not configured.");
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/**
 * POST (Bearer CRON_SECRET, from netlify/functions/hourly.mts) → renew due subscriptions, then
 * refresh provider prices (each at most daily). ADR 51.
 */
export const POST = route(async (req: Request) => {
  if (!authorized(req)) throw new ApiError("unauthorized", "Unauthorized.");
  // Development only: `?now=<ISO>` simulates a later date to exercise renewals (ignored in production).
  const simulated = env.NODE_ENV !== "production" ? new URL(req.url).searchParams.get("now") : null;
  const now = simulated && !Number.isNaN(Date.parse(simulated)) ? new Date(simulated) : new Date();
  const renewals = await renewDue(40_000, now);
  const priceChanges = await refreshProviderCosts().catch((err) => {
    console.error("[cron] price refresh failed", err);
    return [];
  });
  return ok({ renewals, priceChanges });
});
