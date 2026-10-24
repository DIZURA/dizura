import type { GenerationRequest } from "@/types";

/** Granted once when a user confirms their email (DB trigger, migrations 0003/0004 — keep in sync). */
export const WELCOME_CREDITS = 30;

// ---------------------------------------------------------------------------
// Plans (ADR 51): monthly subscriptions, SAR in Arabic, USD in English
// ---------------------------------------------------------------------------

export const PLAN_IDS = ["starter", "pro", "agency"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export const PLAN_CURRENCIES = ["SAR", "USD"] as const;
export type PlanCurrency = (typeof PLAN_CURRENCIES)[number];

/** Single source of truth for subscription prices. Server-side checks always use this table. */
export const PLANS: Record<PlanId, { credits: number; prices: Record<PlanCurrency, number>; popular?: true }> = {
  starter: { credits: 150, prices: { USD: 29, SAR: 110 } },
  pro: { credits: 500, prices: { USD: 79, SAR: 295 }, popular: true },
  agency: { credits: 1500, prices: { USD: 210, SAR: 790 } },
};

/** Arabic UI bills in SAR, English in USD. */
export const currencyFor = (locale: string): PlanCurrency => (locale === "ar" ? "SAR" : "USD");

// ---------------------------------------------------------------------------
// Margin rule (ADR 51): credits = provider cost / (cheapest credit × (1 − fee)) / (1 − 60%)
// ---------------------------------------------------------------------------

export const USD_PER_SAR = 1 / 3.75; // SAR is pegged to USD
export const PAYMENT_FEE = 0.03;
export const TARGET_MARGIN = 0.6;

/** Lowest revenue per credit across every plan and currency (the Agency plan): margin is guaranteed even there. */
export const CHEAPEST_CREDIT_USD = Math.min(
  ...Object.values(PLANS).flatMap((p) => [p.prices.USD / p.credits, (p.prices.SAR * USD_PER_SAR) / p.credits]),
);

/** Credits that keep ≥ TARGET_MARGIN on a provider cost (whole credits, at least 1). */
export const creditsFor = (usd: number) => Math.max(1, Math.ceil(usd / (CHEAPEST_CREDIT_USD * (1 - PAYMENT_FEE)) / (1 - TARGET_MARGIN)));

/**
 * What one unit costs us at each provider, in USD. These are the fallback/baseline values: in
 * production the live table (`provider_costs`, lib/credits/costs.ts) replaces them automatically
 * from Higgsfield's /estimate endpoint and from the measured usage of every Claude/ElevenLabs call.
 */
export const BASE_COST_USD = {
  /** Soul 2 image (one developer measured ~$0.094 billed). */
  characterImage: 0.094,
  /** Marketing Studio Image 2k / medium ("From a photo"). */
  photoCharacter: 0.06,
  /** Soul ID training per character. */
  soulId: 2.5,
  /** Genjutsu motion transfer, per second of reference video. */
  motion480p: 0.318,
  motion720p: 0.681,
  motion1080p: 1.632,
  /** Marketing Studio Image per ad: 1k/medium, 2k/high, 4k/high. */
  adStandard: 0.05,
  adHigh: 0.3,
  adUltra: 0.7219,
  /** WAN 3.0 Prime image-to-video (video ads), per second — list price (temporary discounts ignored). */
  adVideo480p: 0.068,
  adVideo720p: 0.14,
  adVideo1080p: 0.28,
  /** One Strategist reply / "Write it for me" draft (Claude, low effort). */
  strategyChat: 0.045,
  /** A full blueprint (four sections). */
  blueprint: 0.3,
  /** ElevenLabs multilingual TTS per 100 characters. */
  voicePer100Chars: 0.03,
} as const;
export type CostKey = keyof typeof BASE_COST_USD;
export type Costs = Record<CostKey, number>;

export const MOTION_RESOLUTIONS = ["480p", "720p", "1080p"] as const;
export type GenjutsuResolution = (typeof MOTION_RESOLUTIONS)[number];
export const AD_QUALITIES = ["standard", "high", "ultra"] as const;
export type AdQuality = (typeof AD_QUALITIES)[number];

/** Credits per action, derived from the current provider costs. Sent to the browser for display. */
export type PriceList = {
  image: number;
  photoCharacter: number;
  soulId: number;
  /** Per second of reference video. */
  motion: Record<GenjutsuResolution, number>;
  ad: Record<AdQuality, number>;
  /** Video ad, per second of output. */
  adVideo: Record<GenjutsuResolution, number>;
  chat: number;
  blueprint: number;
  /** Per started 100 characters. */
  voicePer100: number;
};

export function priceList(c: Costs): PriceList {
  return {
    image: creditsFor(c.characterImage),
    photoCharacter: creditsFor(c.photoCharacter),
    soulId: creditsFor(c.soulId),
    motion: { "480p": creditsFor(c.motion480p), "720p": creditsFor(c.motion720p), "1080p": creditsFor(c.motion1080p) },
    ad: { standard: creditsFor(c.adStandard), high: creditsFor(c.adHigh), ultra: creditsFor(c.adUltra) },
    adVideo: { "480p": creditsFor(c.adVideo480p), "720p": creditsFor(c.adVideo720p), "1080p": creditsFor(c.adVideo1080p) },
    chat: creditsFor(c.strategyChat),
    blueprint: creditsFor(c.blueprint),
    voicePer100: creditsFor(c.voicePer100Chars),
  };
}

export const DEFAULT_PRICES: PriceList = priceList(BASE_COST_USD);

/** Approximate money value of `credits` at a plan's rate (for display only). */
export const creditValue = (credits: number, currency: PlanCurrency, plan: PlanId = "pro") =>
  (credits * PLANS[plan].prices[currency]) / PLANS[plan].credits;

// ---------------------------------------------------------------------------
// Limits and per-action helpers (prices always come from a PriceList)
// ---------------------------------------------------------------------------

/** DIZURA Strategist (ADR 50). */
export const STRATEGY = { maxChatTurns: 20, maxMessageChars: 2000 } as const;

/** DIZURA Voice (ADR 50). */
export const VOICE = { minCredits: 2, maxChars: 2500 } as const;
export const voiceCost = (chars: number, p: PriceList) => Math.max(VOICE.minCredits, Math.ceil(chars / 100) * p.voicePer100);

/** DIZURA Agency done-for-you services (ADR 50): fixed price per service, charged via Tap in SAR. */
export const AGENCY_SERVICES = {
  single_product: { price: 3000, currency: "SAR", deliveryDays: 7 },
  landing_page: { price: 3000, currency: "SAR", deliveryDays: 5 },
  pod: { price: 3000, currency: "SAR", deliveryDays: 7 },
  shopify: { price: 3000, currency: "SAR", deliveryDays: 10 },
} as const;
export type AgencyServiceId = keyof typeof AGENCY_SERVICES;

/** Legacy WAN 3.0 text/image-to-video via /api/ai/generate (not used by the UI): priced like 720p motion. */
export const VIDEO_DURATION = { min: 3, max: 15, default: 3 } as const;

/** Credit cost of a /api/ai/generate request, computed server-side. */
export function generationCost(req: Pick<GenerationRequest, "kind" | "durationSec">, p: PriceList, photo = false): number {
  if (req.kind === "image") return photo ? p.photoCharacter : p.image;
  const seconds = Math.max(VIDEO_DURATION.min, Math.min(req.durationSec ?? VIDEO_DURATION.default, VIDEO_DURATION.max));
  return seconds * p.motion["720p"];
}

/** Soul ID (consistent character) training limits; price is `PriceList.soulId`. */
export const SOUL_ID = {
  minPhotos: 5,
  maxPhotos: 30,
  maxCharacters: 5,
  defaultStrength: 0.8,
  /** Uploaded photo size cap (client downsizes to ~1.5 MB first; Netlify functions accept ≤ 6 MB). */
  maxUploadBytes: 5 * 1024 * 1024,
} as const;

/**
 * Genjutsu motion transfer limits. Billed per second of the uploaded reference video (duration read
 * server-side, rounded up, 4–30 s — the provider trims anything longer to 30 s).
 */
export const GENJUTSU = {
  defaultResolution: "720p" as GenjutsuResolution,
  minSeconds: 4,
  maxSeconds: 30,
  maxImages: 8,
  /** Direct-to-storage upload cap (matches the `reference-videos` bucket limit). */
  maxVideoBytes: 50 * 1024 * 1024,
} as const;

export function genjutsuCost(durationSec: number, resolution: GenjutsuResolution, p: PriceList): number {
  const seconds = Math.min(GENJUTSU.maxSeconds, Math.max(GENJUTSU.minSeconds, Math.ceil(durationSec)));
  return seconds * p.motion[resolution];
}

/** Ads Creative Studio output settings per quality tier; price is `PriceList.ad[quality]`. */
export const AD_IMAGE = {
  standard: { resolution: "1k", quality: "medium" },
  high: { resolution: "2k", quality: "high" },
  ultra: { resolution: "4k", quality: "high" },
} as const satisfies Record<AdQuality, unknown>;
export const AD_RATIOS = ["1:1", "3:4", "9:16", "16:9"] as const;

/** Video ads (WAN 3.0 Prime image-to-video): length options in seconds; price is `PriceList.adVideo[res]` per second. */
export const VIDEO_AD = { seconds: [3, 5, 8, 10] as const, defaultSeconds: 5, defaultResolution: "720p" as GenjutsuResolution } as const;
export const videoAdCost = (seconds: number, resolution: GenjutsuResolution, p: PriceList) => seconds * p.adVideo[resolution];
