import type { Metadata } from "next";
import { GenerationPanel } from "@/components/workspace/GenerationPanel";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "AI Influencer" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <WorkspaceHeader title={t.nav.aiInfluencer} description={t.workspaces.aiInfluencer} />
      <GenerationPanel workspace="ai-influencer" kinds={["image", "video"]} />
    </>
  );
}
