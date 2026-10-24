import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getI18n } from "@/lib/i18n/server";
import { fulfillCharge, type FulfillResult } from "@/lib/tap/fulfill";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

/**
 * Tap redirects here with ?tap_id=chg_... . We re-verify with Tap server-side and fulfil
 * idempotently (the webhook may have already done it — the ledger dedupes).
 */
export default async function BillingReturn({ searchParams }: { searchParams: Promise<{ tap_id?: string }> }) {
  const { t } = await getI18n();
  const { tap_id } = await searchParams;

  let result: FulfillResult | null = null;
  if (tap_id && /^chg_[A-Za-z0-9]+$/.test(tap_id)) {
    result = await fulfillCharge(tap_id).catch((err) => {
      console.error("[billing-return]", err);
      return null;
    });
  }

  const service = result?.kind === "service";
  const message =
    result?.status === "CAPTURED"
      ? service ? t.billing.serviceSuccess : t.billing.success
      : result && ["INITIATED", "IN_PROGRESS"].includes(result.status) ? t.billing.pending : t.billing.failed;

  return (
    <>
      <TopBar brand={t.brand} />
      <main className="mx-auto grid min-h-[70dvh] max-w-lg place-items-center p-5">
        <Card className="w-full text-center">
          <p role="status" className="text-lg font-semibold">{message}</p>
          <Link href={service ? "/agency" : "/ads-studio"} className={buttonClass("secondary", "mt-6")}>{service ? t.billing.backAgency : t.billing.back}</Link>
        </Card>
      </main>
    </>
  );
}
