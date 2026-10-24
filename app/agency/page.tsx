import type { Metadata } from "next";
import { AgencyServices } from "@/components/agency/AgencyServices";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.agency, description: t.agency.subtitle };
}

/** Public DIZURA Agency page: four done-for-you services at a fixed price (ordering needs sign-in). */
export default async function AgencyPage() {
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const a = t.agency;
  return (
    <>
      <TopBar brand={t.brand} nav />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-5 sm:pt-16">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">{a.eyebrow}</p>
          <h1 className="mt-3 text-balance text-4xl font-black sm:text-5xl">{a.title}</h1>
          <p className="mt-4 text-pretty text-ink-300">{a.subtitle}</p>
        </header>
        <AgencyServices signedIn={user !== null} />
      </main>
      <SiteFooter />
    </>
  );
}
