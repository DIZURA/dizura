"use client";

import { useEffect, useState } from "react";
import { BuyCreditsModal } from "@/components/billing/BuyCreditsModal";
import { openBuyCredits } from "@/components/billing/events";
import { useI18n } from "@/components/i18n/I18nProvider";
import { api } from "@/lib/api-client";

export const CREDITS_CHANGED = "dizura:credits-changed";

/** Balance chip for signed-in users; clicking it opens the Buy-credits modal. */
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
    <>
      <button
        type="button"
        onClick={() => openBuyCredits()}
        title={t.pricing.topUp}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 py-1 ps-2.5 pe-1 text-sm transition hover:border-mint-500 sm:gap-2 sm:ps-3"
      >
        <span aria-hidden className="size-2 rounded-full bg-ember-500" />
        <span className="sr-only text-ink-300 sm:not-sr-only">{t.common.credits}</span>
        <span className="font-semibold tabular-nums text-ink-100">{balance === null ? "—" : balance.toLocaleString(locale)}</span>
        <span aria-hidden className="grid size-6 place-items-center rounded-full bg-mint-500 text-base font-bold leading-none text-ink-950">+</span>
        <span className="sr-only">{t.pricing.topUp}</span>
      </button>
      <BuyCreditsModal />
    </>
  );
}
