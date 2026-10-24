import { CinematicHero } from "@/components/landing/CinematicHero";
import { StudioShowcase } from "@/components/landing/StudioShowcase";
import { NAV } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
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
      <CinematicHero t={t} />
      <main id="studios" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-16">
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
