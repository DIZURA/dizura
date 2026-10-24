import type { SupportedCurrency } from "./credits";

/** Subset of Tap's Charge object we rely on. https://developers.tap.company/reference/charges */
export type TapChargeStatus =
  | "INITIATED"
  | "IN_PROGRESS"
  | "ABANDONED"
  | "CANCELLED"
  | "FAILED"
  | "DECLINED"
  | "RESTRICTED"
  | "CAPTURED"
  | "VOID"
  | "TIMEDOUT"
  | "UNKNOWN";

export interface TapCharge {
  id: string;
  status: TapChargeStatus;
  amount: number;
  currency: SupportedCurrency;
  reference?: { transaction?: string; order?: string; payment?: string; gateway?: string };
  gateway?: { reference?: string };
  transaction?: { created?: string; url?: string };
  metadata?: Record<string, string>;
  /** Present when the card was saved (`save_card: true`) — used for subscription renewals. */
  card?: { id?: string };
  customer?: { id?: string };
  payment_agreement?: { id?: string };
}

export interface SubscribeRequest {
  plan: "starter" | "pro" | "agency";
  currency: "SAR" | "USD";
}

export interface CheckoutResponse {
  /** Tap hosted payment page — redirect the browser here. */
  redirectUrl: string;
  chargeId: string;
}
