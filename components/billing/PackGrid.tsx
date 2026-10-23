"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import { AD_IMAGE, CREDIT_PACKS, generationCost, GENJUTSU } from "@/lib/credits/pricing";
import type { CheckoutResponse, CreditPack } from "@/types";

const POPULAR: CreditPack["id"] = "pro";
const IMAGE_CREDITS = generationCost({ workspace: "visual-character", kind: "image" });

/** Credit packs (display only — the server prices the charge from its own table). */
export function PackGrid({ signedIn, compact = false }: { signedIn: boolean; compact?: boolean }) {
  const { t, locale } = useI18n();
  const p = t.pricing;
  const [busy, setBusy] = useState<CreditPack["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const num = (n: number) => n.toLocaleString(locale);
  const money = (amount: number, currency: string, digits = 3) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);

  async function buy(id: CreditPack["id"]) {
    setBusy(id);
    setError(null);
    try {
      const { redirectUrl } = await api<CheckoutResponse>("/api/payments/checkout", { method: "POST", body: JSON.stringify({ packId: id }) });
      if (!redirectUrl.startsWith("https://")) throw new ClientApiError("provider_error", "bad checkout url");
      window.location.assign(redirectUrl);
    } catch (err) {
      setError(err instanceof ClientApiError && err.code === "not_configured" ? p.unavailable : p.error);
      setBusy(null);
    }
  }

  const packs = Object.values(CREDIT_PACKS);
  return (
    <div>
      <ul className={cn("grid gap-3", compact ? "grid-cols-1" : "gap-4 md:grid-cols-3")}>
        {packs.map((pack) => {
          const popular = pack.id === POPULAR;
          const action = signedIn ? (
            <button
              type="button"
              onClick={() => buy(pack.id)}
              disabled={busy !== null}
              aria-busy={busy === pack.id}
              className={buttonClass(popular ? "primary" : "secondary", compact ? "shrink-0 px-4 py-2" : "mt-6 w-full")}
            >
              {busy === pack.id ? p.redirecting : compact ? money(pack.price, pack.currency) : p.buy}
            </button>
          ) : (
            <Link href="/login?next=/pricing" className={buttonClass(popular ? "primary" : "secondary", compact ? "shrink-0 px-4 py-2" : "mt-6 w-full")}>
              {p.signInToBuy}
            </Link>
          );

          if (compact) {
            return (
              <li key={pack.id} className={cn("flex items-center gap-3 rounded-xl border p-3", popular ? "border-mint-500/60 bg-mint-500/5" : "border-ink-700 bg-ink-850")}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-100">
                    {p.packs[pack.id]}
                    {popular && <span className="ms-2 rounded bg-mint-500/15 px-1.5 py-px text-[10px] font-semibold uppercase text-mint-300">{p.popular}</span>}
                  </p>
                  <p className="text-sm text-ink-300">{p.credits.replace("{n}", num(pack.credits))}</p>
                </div>
                {action}
              </li>
            );
          }

          return (
            <li
              key={pack.id}
              className={cn(
                "relative flex flex-col rounded-[var(--radius-card)] border p-6",
                popular ? "glass border-mint-500/60 shadow-[0_0_40px_-12px_var(--color-mint-500)]" : "border-ink-700/70 bg-ink-900",
              )}
            >
              {popular && (
                <span className="absolute -top-3 start-6 rounded-full bg-mint-500 px-3 py-0.5 text-xs font-bold text-ink-950">{p.popular}</span>
              )}
              <h2 className="text-lg font-bold text-ink-100">{p.packs[pack.id]}</h2>
              <p className="mt-4 text-4xl font-black tabular-nums text-ink-100">{money(pack.price, pack.currency)}</p>
              <p className="mt-1 text-sm text-ink-500">{p.perCredit.replace("{p}", money(pack.price / pack.credits, pack.currency))}</p>
              <p className="mt-5 inline-flex items-center gap-2 text-lg font-semibold text-ember-300">
                <span aria-hidden className="size-2 rounded-full bg-ember-500" />
                {p.credits.replace("{n}", num(pack.credits))}
              </p>
              <p className="mt-5 text-sm text-ink-500">{p.makes}</p>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-300">
                <li>✓ {p.examples.ads.replace("{n}", num(Math.floor(pack.credits / AD_IMAGE.standard.credits)))}</li>
                <li>✓ {p.examples.characters.replace("{n}", num(Math.floor(pack.credits / IMAGE_CREDITS)))}</li>
                <li>✓ {p.examples.motion.replace("{n}", num(Math.floor(pack.credits / GENJUTSU.creditsPerSecond["720p"])))}</li>
              </ul>
              <div className="mt-auto">{action}</div>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
