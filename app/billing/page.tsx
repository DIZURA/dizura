import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingPlan } from "@/components/billing/BillingPlan";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUser } from "@/lib/auth/session";
import { PLANS } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { getI18n } from "@/lib/i18n/server";
import { subscriptions } from "@/lib/subscriptions/store";

export const metadata: Metadata = { title: "Billing", robots: { index: false } };

/** Billing & plan (ADR 51): current subscription, renewal, cancel/resume, balance. */
export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/billing");
  const [{ t }, sub, balance] = await Promise.all([
    getI18n(),
    subscriptions().current(user.id).catch(() => null),
    credits().getBalance(user.id).catch(() => null),
  ]);
  const b = t.billing.page;
  return (
    <>
      <TopBar brand={t.brand} nav />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">{b.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{b.title}</h1>
        <p className="mt-2 text-ink-300">{b.subtitle}</p>
        <div className="mt-8">
          <BillingPlan
            balance={balance}
            plan={
              sub
                ? {
                    plan: sub.plan,
                    status: sub.status === "past_due" ? "past_due" : "active",
                    currency: sub.currency,
                    amount: PLANS[sub.plan].prices[sub.currency],
                    creditsPerMonth: PLANS[sub.plan].credits,
                    periodEnd: sub.periodEnd,
                    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
                  }
                : null
            }
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
