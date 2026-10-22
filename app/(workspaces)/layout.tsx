import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { getI18n } from "@/lib/i18n/server";

export default async function WorkspacesLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <>
      <TopBar brand={t.brand} />
      <div className="mx-auto grid max-w-[90rem] lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-ink-700/60 lg:sticky lg:top-[57px] lg:h-[calc(100dvh-57px)] lg:border-b-0 lg:border-e">
          <Sidebar />
        </aside>
        <main className="min-w-0 p-5 lg:p-8">{children}</main>
      </div>
    </>
  );
}
