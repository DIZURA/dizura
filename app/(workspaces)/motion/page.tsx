import type { Metadata } from "next";
import { MotionPreview, MotionStudio } from "@/components/studio/MotionStudio";
import { ideasFor } from "@/components/studio/ideas";
import { ToolHero } from "@/components/studio/ToolHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Motion" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const ideas = ideasFor("motion", locale);
  return (
    <>
      <ToolHero eyebrow={t.heroes.motion.eyebrow} title={t.heroes.motion.title} description={t.workspaces.motion} model={t.heroes.motion.model} visual={<MotionPreview motion="orbit" className="hidden aspect-video w-72 rounded-2xl border border-ink-700 md:block" />} />
      <MotionStudio ideas={ideas} />
    </>
  );
}
