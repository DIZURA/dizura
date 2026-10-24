"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PRICES, type PriceList } from "@/lib/credits/pricing";

/** Live credit prices (ADR 51), resolved on the server per request; the server re-prices every charge. */
const PricesContext = createContext<PriceList>(DEFAULT_PRICES);

export function PricesProvider({ value, children }: { value: PriceList; children: ReactNode }) {
  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}

export const usePrices = () => useContext(PricesContext);
