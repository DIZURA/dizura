import "server-only";
import { z } from "zod";
import { BASE_COST_USD, DEFAULT_PRICES, priceList, type CostKey, type Costs, type PriceList } from "@/lib/credits/pricing";
import { estimateCostUsd, MODELS } from "@/lib/higgsfield/client";
import { restRows, serviceRest } from "@/lib/supabase/rest";
import { devSingleton } from "@/lib/dev-singleton";

/**
 * Live provider costs (ADR 51). Prices are never hard-coded: every credit price is derived from
 * this table with the 60% margin formula in pricing.ts, and the table updates itself:
 *  - Higgsfield: `POST /estimate/{model}` with our exact settings (hourly cron, at most daily per key);
 *  - Claude / ElevenLabs: the measured cost of every real call (tokens / characters), as a moving average.
 * A value outside GUARD × baseline is rejected and logged (a provider bug must never make actions free).
 */

const COST_KEYS = Object.keys(BASE_COST_USD) as CostKey[];
/**
 * Accepted range vs the baseline. Increases are taken up to 20× (never under-charge); automatic
 * decreases stop at 50% (a probe the provider misreads must not sell an action below cost).
 */
const GUARD = { min: 0.5, max: 20 };
/** Tiers that must stay in ascending cost order; if a refresh breaks the order, the whole family is skipped. */
const ORDERED: CostKey[][] = [
  ["motion480p", "motion720p", "motion1080p"],
  ["adStandard", "adHigh", "adUltra"],
  ["adVideo480p", "adVideo720p", "adVideo1080p"],
];
const EMA_WEIGHT = 0.2; // each measured call moves the average 20% towards it
const CACHE_MS = 5 * 60_000;
const ESTIMATE_EVERY_MS = 24 * 60 * 60_000;

type Source = "estimate" | "usage" | "manual";
type Entry = { usd: number; source: Source; samples: number; updatedAt: string };

const rowSchema = z.object({
  key: z.string(),
  usd: z.coerce.number(),
  source: z.enum(["estimate", "usage", "manual"]),
  samples: z.number(),
  updated_at: z.string(),
});

const isKey = (k: string): k is CostKey => k in BASE_COST_USD;

function sane(key: CostKey, usd: number): boolean {
  const base = BASE_COST_USD[key];
  const okay = Number.isFinite(usd) && usd >= base * GUARD.min && usd <= base * GUARD.max;
  if (!okay) console.error("[pricing] rejected cost outside guard", { key, usd, base });
  return okay;
}

// --- storage (Supabase `provider_costs` in production, memory in dev) ---------------------------

const memory = devSingleton("provider-costs", () => new Map<CostKey, Entry>());

async function readAll(): Promise<Map<CostKey, Entry>> {
  const conn = serviceRest();
  if (!conn) return new Map(memory);
  const rows = await restRows(conn, "provider_costs?select=key,usd,source,samples,updated_at", rowSchema, {}, "provider-costs");
  const out = new Map<CostKey, Entry>();
  for (const r of rows) if (isKey(r.key)) out.set(r.key, { usd: r.usd, source: r.source, samples: r.samples, updatedAt: r.updated_at });
  return out;
}

async function write(key: CostKey, e: Entry) {
  const conn = serviceRest();
  if (!conn) return void memory.set(key, e);
  await restRows(conn, "provider_costs?on_conflict=key", rowSchema, {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ key, usd: Number(e.usd.toFixed(6)), source: e.source, samples: e.samples, updated_at: e.updatedAt }),
  }, "provider-costs");
}

// --- reading -------------------------------------------------------------------------------------

const state = devSingleton("provider-costs-cache", () => ({ cache: null as { at: number; costs: Costs } | null }));

/** Current provider cost per action (live table over the baseline). */
export async function currentCosts(): Promise<Costs> {
  if (state.cache && Date.now() - state.cache.at < CACHE_MS) return state.cache.costs;
  const costs: Costs = { ...BASE_COST_USD };
  for (const [key, e] of await readAll()) if (sane(key, e.usd)) costs[key] = e.usd;
  state.cache = { at: Date.now(), costs };
  return costs;
}

/** Credits per action right now. Falls back to the baseline list if the table can't be read. */
export async function getPrices(): Promise<PriceList> {
  try {
    return priceList(await currentCosts());
  } catch (err) {
    // Baseline prices for the next minute (don't retry the table on every render while it's down).
    state.cache = { at: Date.now() - CACHE_MS + 60_000, costs: { ...BASE_COST_USD } };
    console.error("[pricing] live costs unavailable, using baseline:", err instanceof Error ? err.message : err);
    return DEFAULT_PRICES;
  }
}

// --- automatic updates ---------------------------------------------------------------------------

/** Folds one measured call into the moving average (Claude tokens, ElevenLabs characters). */
export async function recordUsage(key: CostKey, sampleUsd: number): Promise<void> {
  if (!sane(key, sampleUsd)) return;
  try {
    const prev = (await readAll()).get(key);
    const from = prev && prev.source !== "estimate" ? prev.usd : BASE_COST_USD[key];
    const usd = from * (1 - EMA_WEIGHT) + sampleUsd * EMA_WEIGHT;
    await write(key, { usd, source: "usage", samples: (prev?.samples ?? 0) + 1, updatedAt: new Date().toISOString() });
    state.cache = null;
  } catch (err) {
    console.error("[pricing] usage not recorded", key, err);
  }
}

/** Placeholder media for quotes: /estimate requires video_url / image_url in the body but prices by settings. */
const PROBE_IMAGE = "https://example.com/dizura-estimate.jpg";
const PROBE_VIDEO = "https://example.com/dizura-estimate.mp4";

/** Higgsfield probes with our exact request settings. Genjutsu is quoted for 10 s and divided. */
const PROBES: { key: CostKey; model: string; body: Record<string, unknown>; per?: number }[] = [
  { key: "characterImage", model: MODELS.image, body: { prompt: "estimate", aspect_ratio: "9:16", resolution: "720p", batch_size: 1 } },
  { key: "photoCharacter", model: MODELS.adImage, body: { prompt: "estimate", image_urls: [], aspect_ratio: "9:16", resolution: "2k", quality: "medium" } },
  { key: "adStandard", model: MODELS.adImage, body: { prompt: "estimate", image_urls: [], aspect_ratio: "1:1", resolution: "1k", quality: "medium" } },
  { key: "adHigh", model: MODELS.adImage, body: { prompt: "estimate", image_urls: [], aspect_ratio: "1:1", resolution: "2k", quality: "high" } },
  { key: "adUltra", model: MODELS.adImage, body: { prompt: "estimate", image_urls: [], aspect_ratio: "1:1", resolution: "4k", quality: "high" } },
  { key: "motion480p", model: MODELS.motionTransfer, body: { prompt: "", video_url: PROBE_VIDEO, image_urls: [PROBE_IMAGE], resolution: "480p", duration: 10 }, per: 10 },
  { key: "motion720p", model: MODELS.motionTransfer, body: { prompt: "", video_url: PROBE_VIDEO, image_urls: [PROBE_IMAGE], resolution: "720p", duration: 10 }, per: 10 },
  { key: "motion1080p", model: MODELS.motionTransfer, body: { prompt: "", video_url: PROBE_VIDEO, image_urls: [PROBE_IMAGE], resolution: "1080p", duration: 10 }, per: 10 },
  { key: "adVideo480p", model: MODELS.imageToVideo, body: { prompt: "estimate", image_url: PROBE_IMAGE, aspect_ratio: "9:16", resolution: "480p", duration: 10 }, per: 10 },
  { key: "adVideo720p", model: MODELS.imageToVideo, body: { prompt: "estimate", image_url: PROBE_IMAGE, aspect_ratio: "9:16", resolution: "720p", duration: 10 }, per: 10 },
  { key: "adVideo1080p", model: MODELS.imageToVideo, body: { prompt: "estimate", image_url: PROBE_IMAGE, aspect_ratio: "9:16", resolution: "1080p", duration: 10 }, per: 10 },
];

/** Refreshes Higgsfield prices (each key at most once a day unless forced). Returns what changed. */
export async function refreshProviderCosts(force = false): Promise<{ key: CostKey; from: number; to: number }[]> {
  const known = await readAll();
  const quotes = new Map<CostKey, number>();
  for (const probe of PROBES) {
    const prev = known.get(probe.key);
    if (!force && prev?.source === "estimate" && Date.now() - Date.parse(prev.updatedAt) < ESTIMATE_EVERY_MS) continue;
    try {
      const total = await estimateCostUsd(probe.model, probe.body);
      if (total !== null && sane(probe.key, total / (probe.per ?? 1))) quotes.set(probe.key, total / (probe.per ?? 1));
    } catch (err) {
      console.error("[pricing] estimate failed", probe.key, err instanceof Error ? err.message : err);
    }
  }
  // A tier family must stay strictly ascending (e.g. a quote that ignores resolution would flatten it).
  for (const family of ORDERED) {
    const values = family.map((k) => quotes.get(k) ?? known.get(k)?.usd ?? BASE_COST_USD[k]);
    if (values.some((v, i) => i > 0 && v <= values[i - 1]!)) {
      console.error("[pricing] tier order broken — keeping previous costs", Object.fromEntries(family.map((k, i) => [k, values[i]])));
      family.forEach((k) => quotes.delete(k));
    }
  }
  const changes: { key: CostKey; from: number; to: number }[] = [];
  for (const [key, usd] of quotes) {
    const prev = known.get(key);
    await write(key, { usd, source: "estimate", samples: (prev?.samples ?? 0) + 1, updatedAt: new Date().toISOString() });
    const from = prev?.usd ?? BASE_COST_USD[key];
    if (Math.abs(usd - from) / from > 0.005) changes.push({ key, from, to: usd });
  }
  if (changes.length) console.info("[pricing] provider costs changed", changes);
  state.cache = null;
  return changes;
}

export const ALL_COST_KEYS = COST_KEYS;
