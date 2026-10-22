import type { Metadata } from "next";
import { Studio } from "@/components/studio/Studio";
import { ideasFor } from "@/components/studio/ideas";
import { ToolHero } from "@/components/studio/ToolHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Image" };

export default async function Page() {
  const { t, locale } = await getI18n();
  const ideas = ideasFor("image", locale);
  return (
    <>
      <ToolHero eyebrow={t.heroes.image.eyebrow} title={t.heroes.image.title} description={t.workspaces.image} model={t.heroes.image.model} />
      <Studio workspace="image" kinds={["image"]} ideas={ideas} />
    </>
  );
}
