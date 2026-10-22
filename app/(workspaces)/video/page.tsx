import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { ideasFor } from "@/components/studio/ideas";
import { ToolHero } from "@/components/studio/ToolHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Video" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const ideas = ideasFor("video", locale);
  return (
    <>
      <ToolHero eyebrow={t.heroes.video.eyebrow} title={t.heroes.video.title} description={t.workspaces.video} model={t.heroes.video.model} />
      <Studio workspace="video" kinds={["video"]} ideas={ideas} />
    </>
  );
}
