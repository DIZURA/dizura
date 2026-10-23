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
  if (req.kind === "image") return 5; // a character (5) + shortest video (24) fits the 30 welcome credits
  const seconds = Math.max(VIDEO_DURATION.min, Math.min(req.durationSec ?? VIDEO_DURATION.default, VIDEO_DURATION.max));
  return seconds * VIDEO_CREDITS_PER_SECOND;
}

/**
 * Soul ID (consistent character) training. Higgsfield lists it at ~$2.50/request; at pack prices a
 * credit is ~$0.16, so 40 credits (~$6.50) covers provider cost + margin. Owner can tune here.
 */
export const SOUL_ID = {
  trainingCredits: 40,
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
  creditsPerSecond: { "480p": 4, "720p": 8, "1080p": 16 },
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
 * TODO(owner): confirm provider cost per tier with `POST /estimate/marketing-studio/image` on the
 * live account and adjust; prices stay server-side only.
 */
export const AD_IMAGE = {
  standard: { credits: 3, resolution: "1k", quality: "medium" },
  high: { credits: 6, resolution: "2k", quality: "high" },
  ultra: { credits: 10, resolution: "4k", quality: "high" },
} as const;
export type AdQuality = keyof typeof AD_IMAGE;
export const AD_RATIOS = ["1:1", "3:4", "9:16", "16:9"] as const;
