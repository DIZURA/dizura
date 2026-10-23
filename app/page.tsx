import Link from "next/link";
import { Hero3D } from "@/components/landing/Hero3D";
import { StudioShowcase } from "@/components/landing/StudioShowcase";
import { NAV } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { buttonClass } from "@/components/ui/Button";
import { getI18n } from "@/lib/i18n/server";

/** Example collages per studio (public/examples/*.webp; placeholder art until present). */
const SHOWCASE: Record<(typeof NAV)[number]["key"], readonly string[]> = {
  visualCharacter: ["landing-vc", "how-vc-4", "how-vc-2"],
  adsStudio: ["landing-ads", "ad-luxury", "ad-ramadan"],
};

export default async function LandingPage() {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} showCredits={false} nav />
      <main className="mx-auto max-w-7xl px-5">
        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mint-400">{t.brand}</p>
            <h1 className="text-gradient mt-3 text-balance text-4xl font-black leading-tight sm:text-6xl">{t.tagline}</h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/visual-character" className={buttonClass("primary", "px-6")}>{t.heroCta}</Link>
              <Link href="/ads-studio" className={buttonClass("secondary", "px-6")}>{t.heroSecondary}</Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[22rem]">
            <Hero3D />
          </div>
        </section>

        <section className="grid gap-5 pb-20 md:grid-cols-2">
          {NAV.map((item, i) => (
            <StudioShowcase
              key={item.href}
              href={item.href}
              title={t.nav[item.key]}
              body={t.workspaces[item.key]}
              cta={t.landing.open}
              images={SHOWCASE[item.key]}
              index={i}
            />
          ))}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
