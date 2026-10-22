"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { useI18n } from "./I18nProvider";

/** Switches ar <-> en. The root layout re-renders with the new `lang`/`dir`. */
export function LanguageToggle() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
      disabled={pending}
      lang={next}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      className="rounded-full border border-ink-700 px-3 py-1.5 text-sm text-ink-300 transition hover:border-ember-500 hover:text-ink-100 disabled:opacity-50"
    >
      {t.common.language}
    </button>
  );
}
