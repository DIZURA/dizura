import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { ideasFor } from "@/components/studio/ideas";
import { ToolHero } from "@/components/studio/ToolHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Ads Studio" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const ideas = ideasFor("adsStudio", locale);
  return (
    <>
      <ToolHero eyebrow={t.heroes.adsStudio.eyebrow} title={t.heroes.adsStudio.title} description={t.workspaces.adsStudio} model={t.heroes.adsStudio.model} />
      <Studio workspace="ads-studio" kinds={["image", "video"]} ideas={ideas} />
    </>
  );
}
