import "server-only";
import { PLANS, type PlanCurrency, type PlanId } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { ApiError } from "@/lib/http";
import { chargeSavedCard, createSubscriptionCharge } from "@/lib/tap/client";
import type { SessionUser, TapCharge } from "@/types";
import { claimFor, STALE_CLAIM_MS, subscriptions, type Subscription } from "./store";

/** Renewal attempts (one per day) before a subscription is canceled. */
export const MAX_RENEWAL_ATTEMPTS = 3;
const TERMINAL_FAIL = new Set(["DECLINED", "FAILED", "RESTRICTED", "CANCELLED", "VOID", "TIMEDOUT", "ABANDONED"]);

/** Starts a subscription: pending row + Tap hosted page that saves the card (ADR 51). */
export async function startSubscription(user: SessionUser, plan: PlanId, currency: PlanCurrency) {
  const store = subscriptions();
  if (await store.current(user.id)) throw new ApiError("bad_request", "You already have a plan. Cancel it first to switch plans.");
  const sub = await store.create({ userId: user.id, plan, currency });
  const p = PLANS[plan];
  const charge = await createSubscriptionCharge({ id: sub.id, plan, amount: p.prices[currency], currency, credits: p.credits }, user);
  if (!charge.transaction?.url) throw new ApiError("provider_error", "Payment page unavailable.");
  return { redirectUrl: charge.transaction.url, chargeId: charge.id, subscriptionId: sub.id };
}

/**
 * Applies a CAPTURED subscription charge (first payment or renewal). Called by the webhook, the
 * return page and the renewal job — any order, any number of times: the period moves once (conditional
 * update) and credits are granted once (ledger idempotent on the charge id).
 */
export async function fulfillSubscription(charge: TapCharge): Promise<{ granted: boolean; credits: number }> {
  const { userId, subscriptionId, plan, phase, claim } = charge.metadata ?? {};
  const none = { granted: false, credits: 0 };
  const p = plan && plan in PLANS ? PLANS[plan as PlanId] : undefined;
  if (charge.status !== "CAPTURED" || !userId || !subscriptionId || !p) return none;

  const sub = await subscriptions().get(subscriptionId, userId);
  if (!sub || sub.plan !== plan) return none;
  if (charge.currency !== sub.currency || Math.abs(charge.amount - p.prices[sub.currency]) > 0.0005) {
    console.error("[subscriptions] amount mismatch", { chargeId: charge.id, amount: charge.amount, currency: charge.currency, plan });
    return none;
  }

  if (phase === "start") {
    const activated = await subscriptions().activate(sub.id, userId, {
      customerId: charge.customer?.id, cardId: charge.card?.id, agreementId: charge.payment_agreement?.id, chargeId: charge.id,
    });
    if (activated && !(charge.card?.id && charge.customer?.id && charge.payment_agreement?.id)) {
      console.error("[subscriptions] card not saved — this plan can't auto-renew", { subscriptionId: sub.id, chargeId: charge.id });
    }
  } else if (phase === "renew" && claim) {
    await subscriptions().advance(sub.id, userId, claim, charge.id);
  } else {
    return none;
  }
  const granted = await credits().apply({ userId, delta: p.credits, reason: "purchase", referenceId: charge.id });
  if (granted) console.info("[subscriptions] credits granted", { subscriptionId: sub.id, phase, credits: p.credits });
  return { granted, credits: p.credits };
}

type RenewOutcome = { id: string; result: "renewed" | "pending" | "failed" | "ended" | "skipped" | "error" };

/** Charges every subscription whose period has ended (hourly cron). Stops early to stay under the function limit. */
export async function renewDue(budgetMs = 40_000, now = new Date()): Promise<RenewOutcome[]> {
  const started = Date.now();
  const store = subscriptions();
  const out: RenewOutcome[] = [];
  for (const sub of await store.due(now.toISOString(), 25)) {
    if (Date.now() - started > budgetMs) break;
    out.push({ id: sub.id, result: await renewOne(sub).catch((err) => (console.error("[subscriptions] renewal error", sub.id, err), "error" as const)) });
  }
  if (out.length) console.info("[subscriptions] renewals", out);
  return out;
}

async function renewOne(sub: Subscription): Promise<RenewOutcome["result"]> {
  const store = subscriptions();
  // A claim left from a renewal whose outcome we never learned (no webhook within 6 h) counts as a failed attempt.
  if (sub.renewalClaim && sub.claimedAt && Date.now() - Date.parse(sub.claimedAt) >= STALE_CLAIM_MS) {
    console.error("[subscriptions] renewal outcome unknown — counting as failed", { id: sub.id, claim: sub.renewalClaim });
    await store.fail(sub.id, sub.renewalClaim, MAX_RENEWAL_ATTEMPTS);
    return "failed";
  }
  if (sub.cancelAtPeriodEnd) {
    await store.end(sub.id);
    return "ended";
  }
  const claim = claimFor(sub);
  if (!(await store.claim(sub.id, claim))) return "skipped";
  if (!sub.cardId || !sub.customerId || !sub.agreementId) {
    await store.fail(sub.id, claim, MAX_RENEWAL_ATTEMPTS);
    return "failed";
  }

  const p = PLANS[sub.plan];
  let charge: TapCharge;
  try {
    charge = await chargeSavedCard({
      amount: p.prices[sub.currency],
      currency: sub.currency,
      description: `DIZURA ${sub.plan} plan — ${p.credits} credits / month`,
      customerId: sub.customerId,
      cardId: sub.cardId,
      agreementId: sub.agreementId,
      reference: `${sub.id.slice(0, 18)}-${claim}`,
      metadata: { userId: sub.userId, kind: "subscription", phase: "renew", subscriptionId: sub.id, plan: sub.plan, claim },
    });
  } catch (err) {
    // Outcome unknown (e.g. timeout after Tap captured): keep the claim so nothing is charged twice;
    // the webhook completes it, or it is counted as failed after STALE_CLAIM_MS.
    console.error("[subscriptions] renewal charge outcome unknown", sub.id, err);
    return "pending";
  }
  if (charge.status === "CAPTURED") {
    await fulfillSubscription(charge);
    return "renewed";
  }
  if (TERMINAL_FAIL.has(charge.status)) {
    console.warn("[subscriptions] renewal declined", { id: sub.id, status: charge.status });
    await store.fail(sub.id, claim, MAX_RENEWAL_ATTEMPTS);
    return "failed";
  }
  return "pending"; // INITIATED / IN_PROGRESS — the webhook finishes it
}
