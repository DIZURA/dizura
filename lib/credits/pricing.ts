import type { CreditPack, GenerationRequest } from "@/types";

/** Granted once when a user confirms their email (DB trigger, migrations 0003/0004 — keep in sync). */
export const WELCOME_CREDITS = 30;

/** Single source of truth for credit packs. Prices are server-side only — never trust client amounts. */
export const CREDIT_PACKS: Record<CreditPack["id"], CreditPack> = {
  starter: { id: "starter", credits: 100, price: 5, currency: "KWD" },
  pro: { id: "pro", credits: 500, price: 20, currency: "KWD" },
  studio: { id: "studio", credits: 2000, price: 65, currency: "KWD" },
};

/** Credit cost of a generation, computed server-side. */
export const VIDEO_CREDITS_PER_SECOND = 8; // every video runs on WAN 3.0 Prime
export const VIDEO_DURATION = { min: 3, max: 15, default: 3 } as const; // 3 s = 24 credits, fits the welcome bonus

export function generationCost(req: Pick<GenerationRequest, "workspace" | "kind" | "durationSec">): number {
  if (req.kind === "image") return req.workspace === "ai-influencer" ? 8 : 5;
  const seconds = Math.max(VIDEO_DURATION.min, Math.min(req.durationSec ?? VIDEO_DURATION.default, VIDEO_DURATION.max));
  return seconds * VIDEO_CREDITS_PER_SECOND;
}
