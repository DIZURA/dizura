import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "B2B" };

const FEATURES = {
  en: ["Team seats & roles", "Shared brand kits", "Pooled credits & invoicing", "REST API access", "Priority rendering", "Dedicated success manager"],
  ar: ["مقاعد وأدوار للفريق", "هويات علامة مشتركة", "رصيد مشترك وفواتير", "وصول عبر REST API", "أولوية في التوليد", "مدير نجاح مخصص"],
} as const;

export default async function Page() {
  const { t, locale } = await getI18n();
  return (
    <>
      <WorkspaceHeader title={t.b2b.title} description={t.workspaces.b2b} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES[locale].map((f) => (
          <Card key={f} className="flex items-center gap-3">
            <span aria-hidden className="text-ember-500">◆</span>
            {f}
          </Card>
        ))}
      </div>
      <a href="mailto:sales@dizura.com" className={buttonClass("primary", "mt-6")}>{t.b2b.contact}</a>
    </>
  );
}
