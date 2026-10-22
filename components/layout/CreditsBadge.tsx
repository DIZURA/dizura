"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { api } from "@/lib/api-client";

export const CREDITS_CHANGED = "dizura:credits-changed";

export function CreditsBadge() {
  const { t, locale } = useI18n();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const load = () => api<{ balance: number }>("/api/credits").then((d) => setBalance(d.balance)).catch(() => setBalance(null));
    load();
    window.addEventListener(CREDITS_CHANGED, load);
    return () => window.removeEventListener(CREDITS_CHANGED, load);
  }, []);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1.5 text-sm">
      <span aria-hidden className="size-2 rounded-full bg-ember-500" />
      <span className="text-ink-300">{t.common.credits}</span>
      <span className="font-semibold tabular-nums text-ink-100">{balance === null ? "—" : balance.toLocaleString(locale)}</span>
    </span>
  );
}
