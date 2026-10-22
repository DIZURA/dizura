import type { CreditPack, GenerationRequest } from "@/types";

/** Granted once when a user confirms their email (DB trigger in migration 0003 — keep in sync). */
export const WELCOME_CREDITS = 10;

/** Single source of truth for credit packs. Prices are server-side only — never trust client amounts. */
export const CREDIT_PACKS: Record<CreditPack["id"], CreditPack> = {
  starter: { id: "starter", credits: 100, price: 5, currency: "KWD" },
  pro: { id: "pro", credits: 500, price: 20, currency: "KWD" },
  studio: { id: "studio", credits: 2000, price: 65, currency: "KWD" },
};

/** Credit cost of a generation, computed server-side. */
export function generationCost(req: Pick<GenerationRequest, "workspace" | "kind" | "durationSec">): number {
  if (req.kind === "image") return req.workspace === "ai-influencer" ? 8 : 5;
  const seconds = Math.max(1, Math.min(req.durationSec ?? 5, 15));
  const perSecond = req.workspace === "wan-prime" ? 12 : 8;
  return seconds * perSecond;
}
