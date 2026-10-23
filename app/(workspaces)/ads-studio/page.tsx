import type { Metadata } from "next";
import { AdsStudio } from "@/components/studio/ads/AdsStudio";
import { StudioHero } from "@/components/studio/StudioHero";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Ads Creative Studio" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <StudioHero {...t.adsStudio.hero} />
      <AdsStudio />
    </>
  );
}
