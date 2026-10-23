import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TopBar } from "@/components/layout/TopBar";
import { getI18n } from "@/lib/i18n/server";

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} showCredits={false} nav />
      {children}
      <SiteFooter />
    </>
  );
}
