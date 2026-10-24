"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import { currencyFor, PLAN_IDS, PLANS, type PlanId } from "@/lib/credits/pricing";
import { usePrices } from "./PricesProvider";

/**
 * Monthly plans (ADR 51). Display only: the server prices the charge from PLANS and the user's
 * currency (SAR in Arabic, USD in English); the client sends just the plan id + currency.
 */
export function PlanGrid({ signedIn, currentPlan = null, compact = false }: { signedIn: boolean; currentPlan?: PlanId | null; compact?: boolean }) {
  const { t, locale } = useI18n();
  const p = t.pricing;
  const prices = usePrices();
  const currency = currencyFor(locale);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const num = (n: number) => n.toLocaleString(locale);
  const money = (amount: number, digits = 0) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);

  async function subscribe(plan: PlanId) {
    setBusy(plan);
    setError(null);
    try {
      const { redirectUrl } = await api<{ redirectUrl: string }>("/api/subscriptions", { method: "POST", body: JSON.stringify({ plan, currency }) });
      if (!redirectUrl.startsWith("https://")) throw new ClientApiError("provider_error", "bad checkout url");
      window.location.assign(redirectUrl);
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "internal";
      setError(code === "not_configured" ? p.unavailable : code === "bad_request" ? p.alreadySubscribed : p.error);
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className={cn("grid gap-3", compact ? "grid-cols-1" : "gap-5 md:grid-cols-3")}>
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          const price = plan.prices[currency];
          const popular = !!plan.popular;
          const isCurrent = currentPlan === id;
          const btn = cn(compact ? "shrink-0 px-4 py-2" : "mt-6 w-full");
          const action = isCurrent ? (
            <Link href="/billing" className={buttonClass("secondary", btn)}>{p.manage}</Link>
          ) : signedIn ? (
            <button
              type="button"
              onClick={() => void subscribe(id)}
              disabled={busy !== null || currentPlan !== null}
              aria-busy={busy === id}
              className={buttonClass(popular ? "primary" : "secondary", btn)}
            >
              {busy === id ? p.redirecting : compact ? `${money(price)} ${p.perMonth}` : p.subscribe}
            </button>
          ) : (
            <Link href="/login?next=/pricing" className={buttonClass(popular ? "primary" : "secondary", btn)}>{p.signInToSubscribe}</Link>
          );

          if (compact) {
            return (
              <li key={id} className={cn("flex items-center gap-3 rounded-xl border p-3", popular ? "border-mint-500/60 bg-mint-500/5" : "border-ink-700 bg-ink-850")}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-100">
                    {p.plans[id]}
                    {popular && <span className="ms-2 rounded bg-mint-500/15 px-1.5 py-px text-[10px] font-semibold uppercase text-mint-300">{p.popular}</span>}
                  </p>
                  <p className="text-sm text-ink-300">{p.creditsPerMonth.replace("{n}", num(plan.credits))}</p>
                </div>
                {action}
              </li>
            );
          }

          return (
            <li
              key={id}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border p-6",
                popular ? "glass border-mint-500/60 shadow-[0_0_40px_-12px_var(--color-mint-500)]" : "border-ink-700/70 bg-ink-900",
                isCurrent && "ring-2 ring-mint-500/60",
              )}
            >
              {(popular || isCurrent) && (
                <span className="absolute -top-3 start-6 rounded-full bg-mint-500 px-3 py-0.5 text-xs font-bold text-ink-950">{isCurrent ? p.current : p.popular}</span>
              )}
              <h2 className="text-lg font-bold text-ink-100">{p.plans[id]}</h2>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-4xl font-black tabular-nums text-ink-100">{money(price)}</span>
                <span className="text-sm text-ink-500">{p.perMonth}</span>
              </p>
              <p className="mt-1 text-sm text-ink-500">{p.perCredit.replace("{p}", money(price / plan.credits, 2))}</p>
              <p className="mt-5 inline-flex items-center gap-2 text-lg font-semibold text-ember-300">
                <span aria-hidden className="size-2 rounded-full bg-ember-500" />
                {p.creditsPerMonth.replace("{n}", num(plan.credits))}
              </p>
              <p className="mt-5 text-sm text-ink-500">{p.makes}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-300">
                <li>✓ {p.examples.characters.replace("{n}", num(Math.floor(plan.credits / prices.image)))}</li>
                <li>✓ {p.examples.ads.replace("{n}", num(Math.floor(plan.credits / prices.ad.standard)))}</li>
                <li>✓ {p.examples.motion.replace("{n}", num(Math.floor(plan.credits / prices.motion["720p"])))}</li>
              </ul>
              <div className="mt-auto">{action}</div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
