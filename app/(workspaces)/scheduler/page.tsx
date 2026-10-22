import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Scheduler" };

function nextSevenDays(): Date[] {
  const start = new Date();
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default async function Page() {
  const { t, locale } = await getI18n();
  const days = nextSevenDays();
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" });
  return (
    <>
      <WorkspaceHeader title={t.nav.scheduler} description={t.workspaces.scheduler} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => (
          <Card key={d.toDateString()} className="min-h-40 p-4">
            <p className="text-sm font-semibold text-ink-300">{fmt.format(d)}</p>
            <p className="mt-6 text-xs text-ink-500">{t.scheduler.empty}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-500">{t.scheduler.soon}</p>
    </>
  );
}
