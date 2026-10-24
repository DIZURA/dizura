import "server-only";
import { z } from "zod";
import { PLAN_CURRENCIES, PLAN_IDS, type PlanCurrency, type PlanId } from "@/lib/credits/pricing";
import { assertIds, restRows, serviceRest } from "@/lib/supabase/rest";
import { devSingleton } from "@/lib/dev-singleton";

/**
 * Monthly subscriptions (ADR 51). Rows are written only by the server (service role). Every state
 * change is a conditional PATCH, so the webhook, the return page and the hourly renewal job can
 * race without double-activating, double-advancing or double-charging a period.
 */
export type SubscriptionStatus = "pending" | "active" | "past_due" | "canceled";
export type Subscription = {
  id: string;
  userId: string;
  plan: PlanId;
  currency: PlanCurrency;
  status: SubscriptionStatus;
  customerId: string | null;
  cardId: string | null;
  agreementId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Set while a renewal charge for the current period is in flight (`<periodEnd ms>`). */
  renewalClaim: string | null;
  claimedAt: string | null;
  failedAttempts: number;
  nextRetryAt: string | null;
  createdAt: string;
};

const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  plan: z.enum(PLAN_IDS),
  currency: z.enum(PLAN_CURRENCIES),
  status: z.enum(["pending", "active", "past_due", "canceled"]),
  tap_customer_id: z.string().nullable(),
  tap_card_id: z.string().nullable(),
  tap_agreement_id: z.string().nullable(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  cancel_at_period_end: z.boolean(),
  renewal_claim: z.string().nullable(),
  claimed_at: z.string().nullable(),
  failed_attempts: z.number(),
  next_retry_at: z.string().nullable(),
  created_at: z.string(),
});
const fromRow = (r: z.infer<typeof rowSchema>): Subscription => ({
  id: r.id,
  userId: r.user_id,
  plan: r.plan,
  currency: r.currency,
  status: r.status,
  customerId: r.tap_customer_id,
  cardId: r.tap_card_id,
  agreementId: r.tap_agreement_id,
  periodStart: r.current_period_start,
  periodEnd: r.current_period_end,
  cancelAtPeriodEnd: r.cancel_at_period_end,
  renewalClaim: r.renewal_claim,
  claimedAt: r.claimed_at,
  failedAttempts: r.failed_attempts,
  nextRetryAt: r.next_retry_at,
  createdAt: r.created_at,
});

/** One calendar month later (end-of-month safe: Jan 31 → Feb 28/29). */
export function addMonth(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

export const claimFor = (s: Pick<Subscription, "periodEnd">) => String(Date.parse(s.periodEnd ?? "") || 0);

type Activation = { customerId?: string; cardId?: string; agreementId?: string; chargeId: string };

export interface SubscriptionStore {
  create(s: { userId: string; plan: PlanId; currency: PlanCurrency }): Promise<Subscription>;
  get(id: string, userId: string): Promise<Subscription | null>;
  /** The user's live (active / past_due) subscription, if any. */
  current(userId: string): Promise<Subscription | null>;
  /** pending → active with the saved-card ids and the first period. True only for the call that activated it. */
  activate(id: string, userId: string, a: Activation): Promise<boolean>;
  /** Claims the current period for a renewal charge (only one caller wins). */
  claim(id: string, claim: string): Promise<boolean>;
  /** Paid renewal: next period, clears the claim and failures. True only for the call that advanced it. */
  advance(id: string, userId: string, claim: string, chargeId: string): Promise<boolean>;
  /** Declined renewal: past_due, retry in 24 h; canceled after `maxAttempts`. */
  fail(id: string, claim: string, maxAttempts: number): Promise<void>;
  setCancelAtPeriodEnd(id: string, userId: string, cancel: boolean): Promise<Subscription | null>;
  end(id: string): Promise<void>;
  /** Live subscriptions whose period has ended (or whose retry is due), plus stale claims. */
  due(nowIso: string, limit: number): Promise<Subscription[]>;
}

const nowIso = () => new Date().toISOString();
const later = (ms: number) => new Date(Date.now() + ms).toISOString();
const RETRY_MS = 24 * 60 * 60_000;
export const STALE_CLAIM_MS = 6 * 60 * 60_000;

class SupabaseSubscriptionStore implements SubscriptionStore {
  constructor(private conn: { url: string; key: string }) {}
  private rows(path: string, init?: RequestInit) {
    return restRows(this.conn, path, rowSchema, init, "subscriptions");
  }
  private patch(filter: string, body: Record<string, unknown>) {
    return this.rows(`subscriptions?${filter}`, { method: "PATCH", body: JSON.stringify({ ...body, updated_at: nowIso() }) });
  }
  async create(s: { userId: string; plan: PlanId; currency: PlanCurrency }) {
    assertIds(s.userId);
    const [row] = await this.rows("subscriptions", { method: "POST", body: JSON.stringify({ user_id: s.userId, plan: s.plan, currency: s.currency }) });
    return fromRow(row!);
  }
  async get(id: string, userId: string) {
    assertIds(id, userId);
    const [row] = await this.rows(`subscriptions?id=eq.${id}&user_id=eq.${userId}&limit=1`);
    return row ? fromRow(row) : null;
  }
  async current(userId: string) {
    assertIds(userId);
    const [row] = await this.rows(`subscriptions?user_id=eq.${userId}&status=in.(active,past_due)&order=created_at.desc&limit=1`);
    return row ? fromRow(row) : null;
  }
  async activate(id: string, userId: string, a: Activation) {
    assertIds(id, userId);
    const start = nowIso();
    const rows = await this.patch(`id=eq.${id}&user_id=eq.${userId}&status=eq.pending`, {
      status: "active",
      tap_customer_id: a.customerId ?? null,
      tap_card_id: a.cardId ?? null,
      tap_agreement_id: a.agreementId ?? null,
      current_period_start: start,
      current_period_end: addMonth(start),
      last_charge_id: a.chargeId,
    });
    return rows.length > 0;
  }
  async claim(id: string, claim: string) {
    assertIds(id);
    const rows = await this.patch(`id=eq.${id}&renewal_claim=is.null&status=in.(active,past_due)`, { renewal_claim: claim, claimed_at: nowIso() });
    return rows.length > 0;
  }
  async advance(id: string, userId: string, claim: string, chargeId: string) {
    assertIds(id, userId);
    const sub = await this.get(id, userId);
    if (!sub?.periodEnd || claimFor(sub) !== claim) return false;
    const rows = await this.patch(`id=eq.${id}&user_id=eq.${userId}&current_period_end=eq.${encodeURIComponent(sub.periodEnd)}`, {
      status: "active",
      current_period_start: sub.periodEnd,
      current_period_end: addMonth(sub.periodEnd),
      renewal_claim: null,
      claimed_at: null,
      failed_attempts: 0,
      next_retry_at: null,
      last_charge_id: chargeId,
    });
    return rows.length > 0;
  }
  async fail(id: string, claim: string, maxAttempts: number) {
    assertIds(id);
    const [row] = await this.rows(`subscriptions?id=eq.${id}&renewal_claim=eq.${claim}&limit=1`);
    if (!row) return;
    const attempts = row.failed_attempts + 1;
    await this.patch(`id=eq.${id}&renewal_claim=eq.${claim}`, {
      status: attempts >= maxAttempts ? "canceled" : "past_due",
      failed_attempts: attempts,
      next_retry_at: attempts >= maxAttempts ? null : later(RETRY_MS),
      renewal_claim: null,
      claimed_at: null,
    });
  }
  async setCancelAtPeriodEnd(id: string, userId: string, cancel: boolean) {
    assertIds(id, userId);
    const [row] = await this.patch(`id=eq.${id}&user_id=eq.${userId}&status=in.(active,past_due)`, { cancel_at_period_end: cancel });
    return row ? fromRow(row) : null;
  }
  async end(id: string) {
    assertIds(id);
    await this.patch(`id=eq.${id}&status=in.(active,past_due)`, { status: "canceled", renewal_claim: null, claimed_at: null });
  }
  async due(now: string, limit: number) {
    const t = encodeURIComponent(now);
    const stale = encodeURIComponent(new Date(Date.now() - STALE_CLAIM_MS).toISOString());
    const filter =
      `status=in.(active,past_due)&current_period_end=lte.${t}` +
      `&or=(and(renewal_claim.is.null,or(next_retry_at.is.null,next_retry_at.lte.${t})),claimed_at.lte.${stale})`;
    return (await this.rows(`subscriptions?${filter}&order=current_period_end.asc&limit=${limit}`)).map(fromRow);
  }
}

/** Development-only store (never used in production — see subscriptions()). */
class MemorySubscriptionStore implements SubscriptionStore {
  private rows = new Map<string, Subscription & { lastChargeId?: string }>();
  async create(s: { userId: string; plan: PlanId; currency: PlanCurrency }) {
    const row: Subscription = {
      id: crypto.randomUUID(), userId: s.userId, plan: s.plan, currency: s.currency, status: "pending",
      customerId: null, cardId: null, agreementId: null, periodStart: null, periodEnd: null, cancelAtPeriodEnd: false,
      renewalClaim: null, claimedAt: null, failedAttempts: 0, nextRetryAt: null, createdAt: nowIso(),
    };
    this.rows.set(row.id, row);
    return row;
  }
  async get(id: string, userId: string) {
    const r = this.rows.get(id);
    return r && r.userId === userId ? r : null;
  }
  async current(userId: string) {
    return [...this.rows.values()].filter((r) => r.userId === userId && (r.status === "active" || r.status === "past_due")).at(-1) ?? null;
  }
  async activate(id: string, userId: string, a: Activation) {
    const r = await this.get(id, userId);
    if (!r || r.status !== "pending") return false;
    const start = nowIso();
    Object.assign(r, { status: "active", customerId: a.customerId ?? null, cardId: a.cardId ?? null, agreementId: a.agreementId ?? null, periodStart: start, periodEnd: addMonth(start), lastChargeId: a.chargeId });
    return true;
  }
  async claim(id: string, claim: string) {
    const r = this.rows.get(id);
    if (!r || r.renewalClaim !== null || !(r.status === "active" || r.status === "past_due")) return false;
    Object.assign(r, { renewalClaim: claim, claimedAt: nowIso() });
    return true;
  }
  async advance(id: string, userId: string, claim: string, chargeId: string) {
    const r = await this.get(id, userId);
    if (!r?.periodEnd || claimFor(r) !== claim) return false;
    Object.assign(r, { status: "active", periodStart: r.periodEnd, periodEnd: addMonth(r.periodEnd), renewalClaim: null, claimedAt: null, failedAttempts: 0, nextRetryAt: null, lastChargeId: chargeId });
    return true;
  }
  async fail(id: string, claim: string, maxAttempts: number) {
    const r = this.rows.get(id);
    if (!r || r.renewalClaim !== claim) return;
    const attempts = r.failedAttempts + 1;
    Object.assign(r, { status: attempts >= maxAttempts ? "canceled" : "past_due", failedAttempts: attempts, nextRetryAt: attempts >= maxAttempts ? null : later(RETRY_MS), renewalClaim: null, claimedAt: null });
  }
  async setCancelAtPeriodEnd(id: string, userId: string, cancel: boolean) {
    const r = await this.get(id, userId);
    if (!r || !(r.status === "active" || r.status === "past_due")) return null;
    r.cancelAtPeriodEnd = cancel;
    return r;
  }
  async end(id: string) {
    const r = this.rows.get(id);
    if (r && (r.status === "active" || r.status === "past_due")) Object.assign(r, { status: "canceled", renewalClaim: null, claimedAt: null });
  }
  async due(now: string, limit: number) {
    const stale = Date.now() - STALE_CLAIM_MS;
    return [...this.rows.values()]
      .filter((r) => (r.status === "active" || r.status === "past_due") && r.periodEnd !== null && r.periodEnd <= now)
      .filter((r) => (r.renewalClaim === null && (!r.nextRetryAt || r.nextRetryAt <= now)) || (r.claimedAt !== null && Date.parse(r.claimedAt) <= stale))
      .slice(0, limit);
  }
}

let store: SubscriptionStore | undefined;
export function subscriptions(): SubscriptionStore {
  if (store) return store;
  const conn = serviceRest();
  store = conn ? new SupabaseSubscriptionStore(conn) : devSingleton("subscriptions", () => new MemorySubscriptionStore());
  return store;
}
