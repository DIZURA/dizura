/** Credit economy shared by every AI workspace. Amounts are integers (no fractional credits). */

export type CreditReason =
  | "purchase"
  | "generation"
  | "refund"
  | "promo"
  | "admin_adjustment";

export interface CreditBalance {
  userId: string;
  balance: number;
  updatedAt: string; // ISO 8601
}

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  /** Positive = credit added, negative = credit spent. */
  delta: number;
  reason: CreditReason;
  /** Idempotency key — e.g. Tap charge id or generation job id. Unique per (userId, reason). */
  referenceId: string;
  createdAt: string;
}

export type SupportedCurrency = "KWD" | "SAR" | "AED" | "BHD" | "QAR" | "OMR" | "USD";
