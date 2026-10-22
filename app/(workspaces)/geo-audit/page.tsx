import type { Metadata } from "next";
import { GeoAuditForm } from "@/components/geo/GeoAuditForm";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Free GEO Audit" };

export default async function Page() {
  const { t } = await getI18n();
  return (
    <>
      <WorkspaceHeader title={t.nav.geoAudit} description={t.workspaces.geoAudit} />
      <GeoAuditForm />
    </>
  );
}
