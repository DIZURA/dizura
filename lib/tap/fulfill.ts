import "server-only";
import { CREDIT_PACKS } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import type { TapCharge } from "@/types";
import { retrieveCharge } from "./client";

export type FulfillResult = { status: TapCharge["status"]; granted: boolean; credits: number };

/**
 * Grants credits for a Tap charge. Safe to call any number of times from the webhook
 * AND the redirect page: status/amount are re-fetched from Tap, and the ledger is idempotent on charge id.
 */
export async function fulfillCharge(chargeId: string): Promise<FulfillResult> {
  const charge = await retrieveCharge(chargeId);
  const pack = charge.metadata?.packId ? CREDIT_PACKS[charge.metadata.packId as keyof typeof CREDIT_PACKS] : undefined;
  const userId = charge.metadata?.userId;

  if (charge.status !== "CAPTURED" || !pack || !userId) {
    return { status: charge.status, granted: false, credits: 0 };
  }
  // Defend against a tampered/mismatched charge: amount & currency must match the server-side pack.
  if (charge.currency !== pack.currency || Math.abs(charge.amount - pack.price) > 0.0005) {
    console.error("[tap] amount mismatch", { chargeId, amount: charge.amount, currency: charge.currency, pack: pack.id });
    return { status: charge.status, granted: false, credits: 0 };
  }
  const granted = await credits().apply({ userId, delta: pack.credits, reason: "purchase", referenceId: charge.id });
  return { status: charge.status, granted, credits: pack.credits };
}
