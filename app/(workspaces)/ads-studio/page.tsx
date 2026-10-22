import type { Metadata } from "next";
import { GenerationPanel } from "@/components/workspace/GenerationPanel";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Ads Studio" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <WorkspaceHeader title={t.nav.adsStudio} description={t.workspaces.adsStudio} />
      <GenerationPanel workspace="ads-studio" kinds={["image", "video"]} />
    </>
  );
}
