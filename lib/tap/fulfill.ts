import "server-only";
import { serviceOrders } from "@/lib/agency/store";
import { AGENCY_SERVICES, CREDIT_PACKS, type AgencyServiceId } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import type { TapCharge } from "@/types";
import { retrieveCharge } from "./client";

export type FulfillResult = { status: TapCharge["status"]; granted: boolean; credits: number; kind: "credits" | "service" };

/**
 * Fulfils a Tap charge: grants a credit pack, or marks a DIZURA Agency service order paid (ADR 50).
 * Safe to call any number of times from the webhook AND the redirect page: status/amount are
 * re-fetched from Tap, the ledger is idempotent on charge id, and only a pending order becomes paid.
 */
export async function fulfillCharge(chargeId: string): Promise<FulfillResult> {
  const charge = await retrieveCharge(chargeId);
  return charge.metadata?.kind === "service" ? fulfillService(charge) : fulfillCredits(charge);
}

async function fulfillCredits(charge: TapCharge): Promise<FulfillResult> {
  const pack = charge.metadata?.packId ? CREDIT_PACKS[charge.metadata.packId as keyof typeof CREDIT_PACKS] : undefined;
  const userId = charge.metadata?.userId;
  const none = { status: charge.status, granted: false, credits: 0, kind: "credits" } as const;

  if (charge.status !== "CAPTURED" || !pack || !userId) return none;
  // Defend against a tampered/mismatched charge: amount & currency must match the server-side pack.
  if (charge.currency !== pack.currency || Math.abs(charge.amount - pack.price) > 0.0005) {
    console.error("[tap] amount mismatch", { chargeId: charge.id, amount: charge.amount, currency: charge.currency, pack: pack.id });
    return none;
  }
  const granted = await credits().apply({ userId, delta: pack.credits, reason: "purchase", referenceId: charge.id });
  return { status: charge.status, granted, credits: pack.credits, kind: "credits" };
}

async function fulfillService(charge: TapCharge): Promise<FulfillResult> {
  const { userId, serviceOrderId, service } = charge.metadata ?? {};
  const none = { status: charge.status, granted: false, credits: 0, kind: "service" } as const;
  const price = service && service in AGENCY_SERVICES ? AGENCY_SERVICES[service as AgencyServiceId] : undefined;

  if (charge.status !== "CAPTURED" || !userId || !serviceOrderId || !price) return none;
  const order = await serviceOrders().get(serviceOrderId, userId);
  if (!order || order.service !== service) return none;
  if (charge.currency !== price.currency || Math.abs(charge.amount - price.price) > 0.0005 || Math.abs(order.amount - price.price) > 0.0005) {
    console.error("[tap] service amount mismatch", { chargeId: charge.id, amount: charge.amount, currency: charge.currency, service });
    return none;
  }
  const granted = await serviceOrders().markPaid(order.id, userId, charge.id);
  if (granted) console.info("[agency] new paid order", { orderId: order.id, service });
  return { status: charge.status, granted: granted || order.status !== "pending", credits: 0, kind: "service" };
}
