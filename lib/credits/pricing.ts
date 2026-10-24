import type { CreditPack, GenerationRequest } from "@/types";

/** Granted once when a user confirms their email (DB trigger, migrations 0003/0004 — keep in sync). */
export const WELCOME_CREDITS = 30;

/**
 * Pricing rule (ADR 49): every action keeps ≥ ~60% gross margin even when paid with the cheapest
 * credit (Studio pack: 65 KWD / 2000 = 0.0325 KWD ≈ $0.106) after ~3% payment fees.
 * credits ≥ providerUSD / (CHEAPEST_CREDIT_USD × (1 − PAYMENT_FEE)) / (1 − TARGET_MARGIN).
 * `scripts/check-margins.mjs` prints the table; re-run it whenever a provider price changes.
 */
export const USD_PER_KWD = 3.25;
export const PAYMENT_FEE = 0.03;
export const TARGET_MARGIN = 0.6;

/**
 * Provider (Higgsfield API) cost per unit in USD, from open.higgsfield.ai model pages (2026-10-23).
 * `estimate: true` = not published for our exact settings; derived from neighbouring tiers with
 * headroom — confirm with `POST /estimate/{model}` (scripts/check-margins.mjs --live).
 */
export const PROVIDER_COST_USD = {
  /** Soul 2, per image (published $0.0032 @720p / $0.0057 @1080p; one developer measured ~$0.094 billed). */
  characterImage: { usd: 0.094, estimate: true },
  /** Marketing Studio Image 2k / medium (published: 2k low $0.0222). Used by "From a photo". */
  photoCharacter: { usd: 0.06, estimate: true },
  /** Soul ID training per character. */
  soulId: { usd: 2.5, estimate: false },
  /** Genjutsu motion transfer, per second of reference video. */
  genjutsu: { "480p": 0.318, "720p": 0.681, "1080p": 1.632 },
  /** Marketing Studio Image per ad: 1k/medium, 2k/high, 4k/high (published: 1k low $0.0162, 4k high $0.7219). */
  adImage: { standard: 0.05, high: 0.3, ultra: 0.7219 },
} as const;

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
  if (req.kind === "image") return 5; // ≥ 80% margin (PROVIDER_COST_USD.characterImage / photoCharacter)
  const seconds = Math.max(VIDEO_DURATION.min, Math.min(req.durationSec ?? VIDEO_DURATION.default, VIDEO_DURATION.max));
  return seconds * VIDEO_CREDITS_PER_SECOND;
}

/**
 * Soul ID (consistent character) training. Higgsfield lists it at ~$2.50/request; at pack prices a
 * credit is ~$0.16, so 40 credits (~$6.50) covers provider cost + margin. Owner can tune here.
 */
export const SOUL_ID = {
  trainingCredits: 65, // $2.50 provider → ~62% margin at the cheapest credit
  minPhotos: 5,
  maxPhotos: 30,
  maxCharacters: 5,
  defaultStrength: 0.8,
  /** Uploaded photo size cap (client downsizes to ~1.5 MB first; Netlify functions accept ≤ 6 MB). */
  maxUploadBytes: 5 * 1024 * 1024,
} as const;

/**
 * Genjutsu motion transfer (your character performs a reference video). Higgsfield bills per second
 * of input video: $0.318 (480p), $0.681 (720p), $1.632 (1080p). At ~$0.16 per credit these rates
 * keep a ~1.6–2× margin. Duration comes from the uploaded file (server-side), rounded up, 4–30 s
 * (the provider trims anything longer to 30 s).
 */
export const GENJUTSU = {
  // $0.318 / $0.681 / $1.632 per second → ~61% / ~61% / ~60% margin at the cheapest credit
  creditsPerSecond: { "480p": 8, "720p": 17, "1080p": 40 },
  defaultResolution: "720p",
  minSeconds: 4,
  maxSeconds: 30,
  maxImages: 8,
  /** Direct-to-storage upload cap (matches the `reference-videos` bucket limit). */
  maxVideoBytes: 50 * 1024 * 1024,
} as const;
export type GenjutsuResolution = keyof typeof GENJUTSU.creditsPerSecond;

export function genjutsuCost(durationSec: number, resolution: GenjutsuResolution): number {
  const seconds = Math.min(GENJUTSU.maxSeconds, Math.max(GENJUTSU.minSeconds, Math.ceil(durationSec)));
  return seconds * GENJUTSU.creditsPerSecond[resolution];
}

/**
 * Ads Creative Studio (Higgsfield Marketing Studio Image) — credits per ad by quality tier.
 * Provider cost per tier: PROVIDER_COST_USD.adImage (ultra published; standard/high estimated —
 * confirm with `scripts/check-margins.mjs --live`). Prices stay server-side only.
 */
export const AD_IMAGE = {
  standard: { credits: 3, resolution: "1k", quality: "medium" },
  high: { credits: 8, resolution: "2k", quality: "high" },
  ultra: { credits: 20, resolution: "4k", quality: "high" },
} as const;
export type AdQuality = keyof typeof AD_IMAGE;
export const AD_RATIOS = ["1:1", "3:4", "9:16", "16:9"] as const;
