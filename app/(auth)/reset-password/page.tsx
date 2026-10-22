import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "New password", robots: { index: false } };

/** Reached via the recovery email link (/auth/callback establishes the session). Protected in proxy.ts. */
export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  return (
    <AuthCard title={t.auth.resetTitle}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
