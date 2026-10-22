import type { Metadata } from "next";
import Link from "next/link";
import { Hero3D } from "@/components/landing/Hero3D";
import { ideasFor } from "@/components/studio/ideas";
import { InfluencerWorkspace } from "@/components/studio/influencer/InfluencerWorkspace";
import { buttonClass } from "@/components/ui/Button";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "AI Influencer Studio" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const h = t.influencerStudio.hero;
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
              <span dir="ltr" className="text-xs text-ink-500">Soul 2 → WAN 3.0 Prime</span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[22rem] lg:max-w-[26rem]">
            <Hero3D />
          </div>
        </div>
      </section>
      <InfluencerWorkspace templates={ideasFor("aiInfluencer", locale)} />
    </>
  );
}
