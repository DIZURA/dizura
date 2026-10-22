import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { getI18n } from "@/lib/i18n/server";

export default async function WorkspacesLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} nav />
      <main className="mx-auto min-w-0 max-w-[96rem] px-4 pb-16 sm:px-5">{children}</main>
    </>
  );
}
