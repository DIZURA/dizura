import type { Metadata } from "next";
import { PlanGrid } from "@/components/billing/PlanGrid";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrices } from "@/lib/credits/costs";
import { creditValue, currencyFor, VOICE, WELCOME_CREDITS } from "@/lib/credits/pricing";
import { getI18n } from "@/lib/i18n/server";
import { subscriptions } from "@/lib/subscriptions/store";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.pricing, description: t.pricing.subtitle };
}

/** Public pricing (ADR 51): monthly plans (subscribing needs sign-in) + live credit cost of every action. */
export default async function PricingPage() {
  const [{ t, locale }, user, prices] = await Promise.all([getI18n(), getCurrentUser(), getPrices()]);
  const current = user ? await subscriptions().current(user.id).catch(() => null) : null;
  const p = t.pricing;
  const currency = currencyFor(locale);
  const n = (v: number) => v.toLocaleString(locale);
  const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w)\}/g, (_, k: string) => n(v[k] ?? 0));
  const money = (credits: number) =>
    p.approx.replace("{p}", new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(creditValue(credits, currency)));
  const m = prices.motion;
  const costs = [
    { ...p.costs.character, value: fill(p.costs.character.value, { n: prices.image }), approx: money(prices.image) },
    { ...p.costs.identity, value: fill(p.costs.identity.value, { n: prices.soulId }), approx: money(prices.soulId) },
    { ...p.costs.motion, value: fill(p.costs.motion.value, { a: m["480p"], b: m["720p"], c: m["1080p"] }), approx: money(m["720p"]) },
    { ...p.costs.ad, value: fill(p.costs.ad.value, { a: prices.ad.standard, b: prices.ad.high, c: prices.ad.ultra }), approx: money(prices.ad.standard) },
    { ...p.costs.videoAd, value: fill(p.costs.videoAd.value, { a: prices.adVideo["480p"], b: prices.adVideo["720p"], c: prices.adVideo["1080p"] }), approx: money(prices.adVideo["720p"]) },
    { ...p.costs.chat, value: fill(p.costs.chat.value, { n: prices.chat }), approx: money(prices.chat) },
    { ...p.costs.blueprint, value: fill(p.costs.blueprint.value, { n: prices.blueprint }), approx: money(prices.blueprint) },
    { ...p.costs.voice, value: fill(p.costs.voice.value, { n: prices.voicePer100, m: VOICE.minCredits }), approx: money(prices.voicePer100) },
  ];

  return (
    <>
      <TopBar brand={t.brand} nav />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-5 sm:pt-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">{p.eyebrow}</p>
          <h1 className="mt-3 text-balance text-4xl font-black sm:text-5xl">{p.title}</h1>
          <p className="mt-4 text-pretty text-ink-300">{p.subtitle}</p>
          {!user && <p className="mt-3 text-sm text-ember-300">{fill(p.welcome, { n: WELCOME_CREDITS })}</p>}
          <p className="mt-2 text-xs text-ink-500">{p.currencyNote.replace("{c}", currency)}</p>
        </header>

        <div className="mt-12">
          <PlanGrid signedIn={user !== null} currentPlan={current?.plan ?? null} />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900 p-6">
            <h2 className="text-lg font-bold">{p.costsTitle}</h2>
            <dl className="mt-4 divide-y divide-ink-700/60">
              {costs.map((c) => (
                <div key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-sm">
                  <dt className="text-ink-100">{c.name}</dt>
                  <dd className="text-end text-ink-300">
                    {c.value}
                    <span className="ms-2 text-xs text-ink-500" dir="ltr">{c.approx}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <details className="mt-4 text-xs text-ink-500">
              <summary className="cursor-pointer select-none text-ink-300 hover:text-ink-100">ⓘ {p.autoNote}</summary>
              <p className="mt-2 leading-relaxed">{p.autoNoteHint}</p>
            </details>
          </section>
          <ul className="space-y-3 rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900 p-6 text-sm text-ink-300">
            {p.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden className="text-mint-300">✓</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
