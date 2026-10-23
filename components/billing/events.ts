/** Opens the Buy-credits modal from anywhere (studios dispatch it on `insufficient_credits`). */
export const BUY_CREDITS = "dizura:buy-credits";
export type BuyCreditsReason = "insufficient" | "topup";

export const openBuyCredits = (reason: BuyCreditsReason = "topup") =>
  window.dispatchEvent(new CustomEvent<BuyCreditsReason>(BUY_CREDITS, { detail: reason }));
