"use client";

import type { AuthState } from "@/app/actions/auth";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";

export function FormStatus({ state }: { state: AuthState | { status: "error"; code: "link" } }) {
  const { t } = useI18n();
  if (state.status === "idle") return null;
  const isError = state.status === "error";
  const message = isError ? t.auth.errors[state.code] : t.auth.notices[state.code];
  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm",
        isError ? "border-danger/40 bg-danger/10 text-danger" : "border-success/40 bg-success/10 text-success",
      )}
    >
      {message}
    </p>
  );
}
