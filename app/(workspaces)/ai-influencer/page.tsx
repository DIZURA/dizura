import type { Metadata } from "next";
import { InfluencerStudio } from "@/components/studio/InfluencerStudio";
import { ideasFor } from "@/components/studio/ideas";
import { ToolHero } from "@/components/studio/ToolHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "AI Influencer Studio" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const ideas = ideasFor("aiInfluencer", locale);
  return (
    <>
      <ToolHero eyebrow={t.heroes.aiInfluencer.eyebrow} title={t.heroes.aiInfluencer.title} description={t.workspaces.aiInfluencer} model={t.heroes.aiInfluencer.model} />
      <InfluencerStudio ideas={ideas} />
    </>
  );
}
