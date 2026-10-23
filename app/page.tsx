import Link from "next/link";
import { BentoCard, BentoGrid } from "@/components/dashboard/BentoGrid";
import { Hero3D } from "@/components/landing/Hero3D";
import { NAV } from "@/components/layout/nav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { buttonClass } from "@/components/ui/Button";
import { getI18n } from "@/lib/i18n/server";

export default async function LandingPage() {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} showCredits={false} nav />
      <main className="mx-auto max-w-7xl px-5">
        <section className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="text-balance text-4xl font-black leading-tight sm:text-6xl">
              <span className="text-mint-500">{t.brand}</span>
              <br />
              {t.tagline}
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/ai-influencer" className={buttonClass("primary")}>{t.heroCta}</Link>
              <Link href="/geo-audit" className={buttonClass("secondary")}>{t.heroSecondary}</Link>
            </div>
          </div>
          <div className="flex justify-center">
            <Hero3D />
          </div>
        </section>

        <section className="pb-24">
          <BentoGrid>
            {NAV.map((item, i) => (
              <BentoCard
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={t.nav[item.key]}
                description={t.workspaces[item.key]}
                span={i === 0 ? "2" : i === 1 ? "tall" : "1"}
                accent={i === 0}
              />
            ))}
          </BentoGrid>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
