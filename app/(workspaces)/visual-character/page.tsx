import type { Metadata } from "next";
import { InfluencerWorkspace } from "@/components/studio/influencer/InfluencerWorkspace";
import { StudioHero } from "@/components/studio/StudioHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Visual Character" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <StudioHero {...t.influencerStudio.hero} />
      <InfluencerWorkspace />
    </>
  );
}
