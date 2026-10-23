#!/usr/bin/env node
/**
 * Prints DIZURA's gross margin per action (ADR 49) from lib/credits/pricing.ts.
 *
 *   npm run margins            # table from PROVIDER_COST_USD (offline)
 *   npm run margins -- --live  # also asks Higgsfield POST /estimate/{model} for our exact settings
 *
 * --live reads HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET from .env.local (owner's machine only;
 * never in the browser, never committed) and prints the raw estimate next to our assumption.
 */
import {
  AD_IMAGE, CREDIT_PACKS, GENJUTSU, PAYMENT_FEE, PROVIDER_COST_USD as COST, SOUL_ID, TARGET_MARGIN, USD_PER_KWD, generationCost,
} from "../lib/credits/pricing.ts";

const perCredit = Object.values(CREDIT_PACKS).map((p) => ({ id: p.id, usd: (p.price * USD_PER_KWD) / p.credits }));
const cheapest = Math.min(...perCredit.map((p) => p.usd));
const image = generationCost({ workspace: "visual-character", kind: "image" });

const rows = [
  ["Character image", image, COST.characterImage.usd, COST.characterImage.estimate],
  ["Character from a photo", image, COST.photoCharacter.usd, COST.photoCharacter.estimate],
  ["DIZURA ID training", SOUL_ID.trainingCredits, COST.soulId.usd, COST.soulId.estimate],
  ...Object.entries(GENJUTSU.creditsPerSecond).map(([r, c]) => [`Motion ${r} (per second)`, c, COST.genjutsu[r], false]),
  ...Object.entries(AD_IMAGE).map(([q, t]) => [`Ad ${q} (${t.resolution}/${t.quality})`, t.credits, COST.adImage[q], q !== "ultra"]),
];

console.log(`Credit value: ${perCredit.map((p) => `${p.id} $${p.usd.toFixed(3)}`).join(" · ")}  (cheapest $${cheapest.toFixed(3)}, fee ${PAYMENT_FEE * 100}%)\n`);
console.log("Action".padEnd(30), "Credits".padStart(7), "Cost $".padStart(8), "Rev $ (cheapest)".padStart(17), "Margin".padStart(7), "Min credits");
let bad = 0;
for (const [name, credits, usd, est] of rows) {
  const rev = credits * cheapest * (1 - PAYMENT_FEE);
  const margin = 1 - usd / rev;
  const min = Math.ceil(usd / (cheapest * (1 - PAYMENT_FEE)) / (1 - TARGET_MARGIN));
  if (margin < TARGET_MARGIN - 0.02) bad++;
  console.log(name.padEnd(30), String(credits).padStart(7), usd.toFixed(4).padStart(8), rev.toFixed(3).padStart(17), `${Math.round(margin * 100)}%`.padStart(7), String(min).padStart(5), est ? " (cost estimated)" : "");
}
if (bad) console.log(`\n⚠ ${bad} action(s) below the ${TARGET_MARGIN * 100}% target.`);

if (process.argv.includes("--live")) {
  const key = process.env.HIGGSFIELD_API_KEY ?? "", secret = process.env.HIGGSFIELD_API_SECRET ?? "";
  const cred = key && secret ? `${key}:${secret}` : key.includes(":") ? key : "";
  if (!cred) { console.error("\nSet HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET in .env.local for --live."); process.exit(1); }
  const base = (process.env.HIGGSFIELD_API_BASE_URL || "https://api.higgsfield.ai").replace(/\/$/, "");
  const headers = { authorization: `Key ${cred}`, "content-type": "application/json", accept: "application/json" };
  const probes = [
    ["higgsfield-ai/soul/v2/standard", { prompt: "estimate", aspect_ratio: "9:16", resolution: "720p", batch_size: 1 }],
    ...Object.entries(AD_IMAGE).map(([, t]) => ["marketing-studio/image", { prompt: "estimate", image_urls: [], aspect_ratio: "1:1", resolution: t.resolution, quality: t.quality }]),
    ["marketing-studio/image", { prompt: "estimate", image_urls: [], aspect_ratio: "16:9", resolution: "2k", quality: "medium" }],
    ...Object.keys(GENJUTSU.creditsPerSecond).map((r) => ["higgsfield/genjutsu/motion-transfer/v1.0", { prompt: "", resolution: r, duration: 1 }]),
  ];
  console.log("\nLive estimates (raw):");
  for (const [model, body] of probes) {
    const res = await fetch(`${base}/estimate/${model}`, { method: "POST", headers, body: JSON.stringify(body) }).catch((e) => ({ ok: false, status: e.message }));
    const text = res.ok ? await res.text() : `HTTP ${res.status}`;
    console.log(`- ${model} ${JSON.stringify(body)} → ${text}`);
  }
}
