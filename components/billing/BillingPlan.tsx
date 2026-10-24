"use client";

import Link from "next/link";
import { useState } from "react";
import type { SubscriptionView } from "@/app/api/subscriptions/route";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button, buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api-client";

/** Current plan card with cancel (at period end) / resume. The server is the source of truth. */
export function BillingPlan({ plan: initial, balance }: { plan: SubscriptionView | null; balance: number | null }) {
  const { t, locale } = useI18n();
  const b = t.billing.page;
  const [plan, setPlan] = useState(initial);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const num = (n: number) => n.toLocaleString(locale);
  const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso)) : "—");

  if (!plan) {
    return (
      <section className="glass rounded-[var(--radius-card)] p-8 text-center">
        <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-2xl bg-mint-500/15 text-2xl text-mint-300">✦</span>
        <h2 className="mt-4 text-xl font-bold">{b.emptyTitle}</h2>
        <p className="mt-2 text-sm text-ink-300">{b.emptyBody}</p>
        {balance !== null && <p className="mt-4 text-sm text-ember-300">⚡ {b.balance}: {num(balance)}</p>}
        <Link href="/pricing" className={buttonClass("primary", "mt-6 px-8")}>{b.choosePlan}</Link>
      </section>
    );
  }

  async function setCancel(cancel: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ cancelAtPeriodEnd: boolean }>("/api/subscriptions/cancel", { method: "POST", body: JSON.stringify({ cancel }) });
      setPlan((p) => (p ? { ...p, cancelAtPeriodEnd: res.cancelAtPeriodEnd } : p));
      setConfirm(false);
    } catch {
      setError(b.error);
    } finally {
      setBusy(false);
    }
  }

  const status = plan.status === "past_due" ? "past_due" : plan.cancelAtPeriodEnd ? "canceling" : "active";
  const pill = {
    active: "border-mint-500/40 bg-mint-500/10 text-mint-300",
    past_due: "border-danger/50 bg-danger/10 text-danger",
    canceling: "border-ember-500/40 bg-ember-500/10 text-ember-300",
  }[status];
  const price = new Intl.NumberFormat(locale, { style: "currency", currency: plan.currency, maximumFractionDigits: 0 }).format(plan.amount);

  return (
    <section className="glass rounded-[var(--radius-card)] p-6 sm:p-8">
      {plan.status === "past_due" && <p role="alert" className="mb-5 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-ink-100">{b.pastDue}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{t.pricing.plans[plan.plan]}</h2>
        <span className={cn("rounded-full border px-3 py-0.5 text-xs font-semibold", pill)}>
          {status === "canceling" ? b.status.canceling.replace("{d}", date(plan.periodEnd)) : b.status[status]}
        </span>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          [plan.cancelAtPeriodEnd ? b.endsOn : b.nextRenewal, date(plan.periodEnd)],
          [b.amount, `${price} ${t.pricing.perMonth}`],
          [b.creditsPerMonth, num(plan.creditsPerMonth)],
          [b.balance, balance === null ? "—" : num(balance)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-ink-700 bg-ink-950/50 p-4">
            <dt className="text-xs text-ink-500">{k}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/pricing" className={buttonClass("secondary")}>{b.changePlan}</Link>
        {plan.cancelAtPeriodEnd ? (
          <Button type="button" onClick={() => void setCancel(false)} disabled={busy}>{b.resume}</Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirm(true)} disabled={busy} className="text-danger hover:text-danger">{b.cancel}</Button>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-500">{b.changeHint}</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

      <Modal open={confirm} onClose={() => !busy && setConfirm(false)} title={b.cancelTitle}>
        <p className="text-sm text-ink-300">{b.cancelBody.replace("{d}", date(plan.periodEnd))}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirm(false)} disabled={busy}>{b.keep}</Button>
          <Button type="button" onClick={() => void setCancel(true)} disabled={busy} className="bg-danger text-ink-950 shadow-none hover:bg-danger/90">{b.confirmCancel}</Button>
        </div>
      </Modal>
    </section>
  );
}
