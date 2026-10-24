"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api-client";
import type { PlanId } from "@/lib/credits/pricing";
import { BUY_CREDITS, type BuyCreditsReason } from "./events";
import { PlanGrid } from "./PlanGrid";

/** "Choose a plan" modal for signed-in users; opened by the credits badge or an `insufficient_credits` error. */
export function BuyCreditsModal() {
  const { t } = useI18n();
  const [reason, setReason] = useState<BuyCreditsReason | null>(null);
  const [plan, setPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    const open = (e: Event) => {
      setReason((e as CustomEvent<BuyCreditsReason>).detail ?? "topup");
      api<{ plan: PlanId } | null>("/api/subscriptions").then((s) => setPlan(s?.plan ?? null)).catch(() => setPlan(null));
    };
    window.addEventListener(BUY_CREDITS, open);
    return () => window.removeEventListener(BUY_CREDITS, open);
  }, []);

  const p = t.pricing;
  return (
    <Modal open={reason !== null} onClose={() => setReason(null)} title={reason === "insufficient" ? p.outOfCredits : p.topUpTitle}>
      {reason === "insufficient" && <p className="-mt-1 mb-4 text-sm text-ink-300">{p.outOfCreditsBody}</p>}
      <PlanGrid signedIn compact currentPlan={plan} />
      <Link href="/pricing" onClick={() => setReason(null)} className="mt-4 inline-block text-sm text-mint-300 hover:text-mint-200">
        {p.allPricing}
      </Link>
    </Modal>
  );
}
