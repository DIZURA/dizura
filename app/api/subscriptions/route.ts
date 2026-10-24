import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { PLAN_CURRENCIES, PLAN_IDS, PLANS } from "@/lib/credits/pricing";
import { ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { startSubscription } from "@/lib/subscriptions/billing";
import { subscriptions } from "@/lib/subscriptions/store";

export const runtime = "nodejs";

export type SubscriptionView = {
  plan: (typeof PLAN_IDS)[number];
  status: "active" | "past_due";
  currency: (typeof PLAN_CURRENCIES)[number];
  amount: number;
  creditsPerMonth: number;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

/** GET → the caller's live plan (or null). Saved-card / Tap ids never leave the server. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`sub:get:${user.id}`, 60, 60_000);
  const sub = await subscriptions().current(user.id);
  if (!sub || (sub.status !== "active" && sub.status !== "past_due")) return ok<SubscriptionView | null>(null);
  return ok<SubscriptionView>({
    plan: sub.plan,
    status: sub.status,
    currency: sub.currency,
    amount: PLANS[sub.plan].prices[sub.currency],
    creditsPerMonth: PLANS[sub.plan].credits,
    periodEnd: sub.periodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  });
});

const body = z.object({ plan: z.enum(PLAN_IDS), currency: z.enum(PLAN_CURRENCIES) });

/** POST { plan, currency } → Tap hosted page for the first month (card saved for renewals). Price from PLANS only. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`sub:start:${user.id}`, 5, 60_000);
  const input = await parseJson(req, body, 1024);
  const { redirectUrl, chargeId } = await startSubscription(user, input.plan, input.currency);
  return ok({ redirectUrl, chargeId });
});
