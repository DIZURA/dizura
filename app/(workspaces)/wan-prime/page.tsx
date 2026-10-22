import type { Metadata } from "next";
import { GenerationPanel } from "@/components/workspace/GenerationPanel";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "WAN 3.0 Prime" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <WorkspaceHeader title={t.nav.wanPrime} description={t.workspaces.wanPrime} />
      <GenerationPanel workspace="wan-prime" kinds={["video"]} />
    </>
  );
}
