import type { Metadata } from "next";
import { PackGrid } from "@/components/billing/PackGrid";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUser } from "@/lib/auth/session";
import { AD_IMAGE, generationCost, GENJUTSU, SOUL_ID, WELCOME_CREDITS } from "@/lib/credits/pricing";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.pricing, description: t.pricing.subtitle };
}

/** Public pricing: credit packs (checkout needs sign-in) + what each generation costs. */
export default async function PricingPage() {
  const [{ t, locale }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const p = t.pricing;
  const n = (v: number) => v.toLocaleString(locale);
  const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w)\}/g, (_, k: string) => n(v[k] ?? 0));
  const rate = GENJUTSU.creditsPerSecond;
  const costs = [
    { ...p.costs.character, value: fill(p.costs.character.value, { n: generationCost({ workspace: "visual-character", kind: "image" }) }) },
    { ...p.costs.identity, value: fill(p.costs.identity.value, { n: SOUL_ID.trainingCredits }) },
    { ...p.costs.motion, value: fill(p.costs.motion.value, { a: rate["480p"], b: rate["720p"], c: rate["1080p"] }) },
    { ...p.costs.ad, value: fill(p.costs.ad.value, { a: AD_IMAGE.standard.credits, b: AD_IMAGE.high.credits, c: AD_IMAGE.ultra.credits }) },
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
        </header>

        <div className="mt-12">
          <PackGrid signedIn={user !== null} />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900 p-6">
            <h2 className="text-lg font-bold">{p.costsTitle}</h2>
            <dl className="mt-4 divide-y divide-ink-700/60">
              {costs.map((c) => (
                <div key={c.name} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-sm">
                  <dt className="text-ink-100">{c.name}</dt>
                  <dd className="text-ink-300">{c.value}</dd>
                </div>
              ))}
            </dl>
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
