import type { Metadata } from "next";
import Link from "next/link";
import { Hero3D } from "@/components/landing/Hero3D";
import { InfluencerWorkspace } from "@/components/studio/influencer/InfluencerWorkspace";
import { SectionHeading } from "@/components/studio/influencer/SectionHeading";
import { buttonClass } from "@/components/ui/Button";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "AI Influencer Studio" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const h = t.influencerStudio.hero;
  const p = t.influencerPage;
  const nf = new Intl.NumberFormat(locale);
  return (
    <>
      <section className="relative my-5 overflow-hidden rounded-[var(--radius-card)] border border-mint-500/15 bg-ink-950 px-6 py-10 sm:px-10 lg:py-6">
        <div aria-hidden className="pointer-events-none absolute -top-40 start-1/3 size-[34rem] rounded-full bg-mint-500/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-mint-500)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-mint-500)_6%,transparent)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-mint-500/30 bg-mint-500/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-mint-300">
              <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-mint-500" />
              {h.eyebrow}
            </p>
            <h1 className="mt-4 text-balance text-4xl font-black leading-[1.1] sm:text-5xl xl:text-6xl">{h.title}</h1>
            <p className="mt-4 max-w-xl text-pretty text-ink-300 sm:text-lg">{h.body}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="#create" className={buttonClass("primary", "px-6")}>{h.cta}</Link>
              <Link href="#how" className={buttonClass("secondary", "px-5")}>{h.secondary}</Link>
              <span dir="ltr" className="text-xs text-ink-500">Soul 2 → WAN 3.0 Prime</span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[22rem] lg:max-w-[26rem]">
            <Hero3D />
          </div>
        </div>
      </section>
      <InfluencerWorkspace />

      <section id="how" aria-labelledby="how-title" className="mt-20 scroll-mt-24">
        <SectionHeading eyebrow={p.how.eyebrow} id="how-title" title={p.how.title} />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {p.how.steps.map((step, i) => (
            <li key={step.title} className="glass relative overflow-hidden rounded-[var(--radius-card)] p-6">
              <span aria-hidden className="absolute -top-4 end-3 text-8xl font-black text-mint-500/10">{nf.format(i + 1)}</span>
              <span className="grid size-9 place-items-center rounded-full border border-mint-500/40 text-sm font-bold text-mint-300">{nf.format(i + 1)}</span>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-300">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-title" className="mt-20">
        <SectionHeading eyebrow={p.features.eyebrow} id="features-title" title={p.features.title} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {p.features.items.map((f) => (
            <li key={f.title} className="rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900/50 p-6 transition hover:border-mint-500/40">
              <span aria-hidden className="block h-1 w-10 rounded-full bg-mint-500" />
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-300">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto mt-20 max-w-3xl">
        <SectionHeading eyebrow="FAQ" id="faq-title" title={p.faq.title} />
        <div className="mt-8 divide-y divide-ink-700/70 rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900/40">
          {p.faq.items.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {item.q}
                <span aria-hidden className="text-mint-400 transition group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-ink-300">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative my-20 overflow-hidden rounded-[var(--radius-card)] border border-mint-500/25 bg-ink-950 px-6 py-12 text-center sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 start-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-mint-500/15 blur-3xl rtl:translate-x-1/2" />
        <div className="relative">
          <h2 className="text-balance text-3xl font-black sm:text-4xl">{p.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">{p.cta.body}</p>
          <Link href="#create" className={buttonClass("primary", "mt-7 px-7")}>{p.cta.button}</Link>
        </div>
      </section>
    </>
  );
}
