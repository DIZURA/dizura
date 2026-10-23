import type { Metadata } from "next";
import { LegalDocument } from "@/components/layout/LegalDocument";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.legal.privacy.title };
}

export default async function Page() {
  const { t } = await getI18n();
  return <LegalDocument doc={t.legal.privacy} />;
}
