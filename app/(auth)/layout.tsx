import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} showCredits={false} showAccount={false} />
      {children}
    </>
  );
}
