import { CinematicHero } from "@/components/landing/CinematicHero";
import { HomeSections } from "@/components/landing/HomeSections";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { getI18n } from "@/lib/i18n/server";

/** Home (ADR 52 hero + ADR 54 sections, design from Lovable "DIZURA — Display Your Aura"). */
export default async function LandingPage() {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} showCredits={false} nav />
      <main>
        <CinematicHero t={t} />
        <HomeSections />
      </main>
      <SiteFooter />
    </>
  );
}
