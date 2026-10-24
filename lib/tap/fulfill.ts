import "server-only";
import { serviceOrders } from "@/lib/agency/store";
import { AGENCY_SERVICES, type AgencyServiceId } from "@/lib/credits/pricing";
import { fulfillSubscription } from "@/lib/subscriptions/billing";
import type { TapCharge } from "@/types";
import { retrieveCharge } from "./client";

export type FulfillResult = { status: TapCharge["status"]; granted: boolean; credits: number; kind: "subscription" | "service" };

/**
 * Fulfils a Tap charge: a subscription payment (credits for the month, ADR 51) or a DIZURA Agency
 * service order (ADR 50).
 * Safe to call any number of times from the webhook AND the redirect page: status/amount are
 * re-fetched from Tap, the ledger is idempotent on charge id, and only a pending order becomes paid.
 */
export async function fulfillCharge(chargeId: string): Promise<FulfillResult> {
  const charge = await retrieveCharge(chargeId);
  if (charge.metadata?.kind === "service") return fulfillService(charge);
  if (charge.metadata?.kind === "subscription") return { status: charge.status, kind: "subscription", ...(await fulfillSubscription(charge)) };
  console.error("[tap] charge without a known kind", { chargeId: charge.id });
  return { status: charge.status, granted: false, credits: 0, kind: "subscription" };
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
