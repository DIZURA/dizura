import type { Metadata } from "next";
import { Suspense } from "react";
import { BlueprintsApp } from "@/components/blueprints/BlueprintsApp";
import { StudioHero } from "@/components/studio/StudioHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Strategy files" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <StudioHero eyebrow={t.blueprints.eyebrow} title={t.blueprints.title} body={t.blueprints.subtitle} />
      <Suspense fallback={<div className="shimmer h-96 rounded-[var(--radius-card)]" />}>
        <BlueprintsApp />
      </Suspense>
    </>
  );
}
