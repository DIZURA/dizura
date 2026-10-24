/**
 * Gross margin per action (ADR 51). Credits are derived from provider cost with the 60% rule in
 * lib/credits/pricing.ts; this prints what each action earns at every plan's credit price.
 *
 *   npm run margins            # baseline costs (BASE_COST_USD)
 *   npm run margins -- --live  # also asks Higgsfield POST /estimate/{model} for our exact settings
 *
 * --live reads HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET from .env.local (owner's machine only).
 * In production the same refresh runs hourly by itself (/api/cron/hourly → provider_costs).
 */
import { BASE_COST_USD as COST, CHEAPEST_CREDIT_USD, PAYMENT_FEE, PLANS, TARGET_MARGIN, USD_PER_SAR, priceList } from "../lib/credits/pricing.ts";

const prices = priceList(COST);
const perCredit = Object.entries(PLANS).flatMap(([id, p]) => [
  [`${id} USD`, p.prices.USD / p.credits],
  [`${id} SAR`, (p.prices.SAR * USD_PER_SAR) / p.credits],
]);
console.log("Revenue per credit (USD): " + perCredit.map(([k, v]) => `${k} $${v.toFixed(3)}`).join(" · "));
console.log(`Cheapest: $${CHEAPEST_CREDIT_USD.toFixed(4)} · fee ${PAYMENT_FEE * 100}% · target margin ${TARGET_MARGIN * 100}%\n`);

const rows = [
  ["Character image", prices.image, COST.characterImage],
  ["Character from a photo", prices.photoCharacter, COST.photoCharacter],
  ["DIZURA ID training", prices.soulId, COST.soulId],
  ["Motion 480p (per second)", prices.motion["480p"], COST.motion480p],
  ["Motion 720p (per second)", prices.motion["720p"], COST.motion720p],
  ["Motion 1080p (per second)", prices.motion["1080p"], COST.motion1080p],
  ["Ad standard", prices.ad.standard, COST.adStandard],
  ["Ad high", prices.ad.high, COST.adHigh],
  ["Ad ultra", prices.ad.ultra, COST.adUltra],
  ["Strategist message", prices.chat, COST.strategyChat],
  ["Strategy file", prices.blueprint, COST.blueprint],
  ["Voice (per 100 chars)", prices.voicePer100, COST.voicePer100Chars],
];
console.log("Action".padEnd(28), "Credits".padStart(7), "Cost $".padStart(8), "Margin @cheapest".padStart(17), "Margin @Pro USD".padStart(16));
const pro = PLANS.pro.prices.USD / PLANS.pro.credits;
let bad = 0;
for (const [name, credits, usd] of rows) {
  const m = (rate) => 1 - usd / (credits * rate * (1 - PAYMENT_FEE));
  if (m(CHEAPEST_CREDIT_USD) < TARGET_MARGIN - 1e-9) bad++;
  console.log(name.padEnd(28), String(credits).padStart(7), usd.toFixed(4).padStart(8), `${(m(CHEAPEST_CREDIT_USD) * 100).toFixed(1)}%`.padStart(17), `${(m(pro) * 100).toFixed(1)}%`.padStart(16));
}
console.log(bad ? `\n⚠ ${bad} action(s) below target.` : `\n✓ Every action ≥ ${TARGET_MARGIN * 100}% at the cheapest credit.`);

if (process.argv.includes("--live")) {
  const key = process.env.HIGGSFIELD_API_KEY ?? "", secret = process.env.HIGGSFIELD_API_SECRET ?? "";
  const cred = key && secret ? `${key}:${secret}` : key.includes(":") ? key : "";
  if (!cred) { console.error("\nSet HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET in .env.local for --live."); process.exit(1); }
  const base = (process.env.HIGGSFIELD_API_BASE_URL || "https://api.higgsfield.ai").replace(/\/$/, "");
  const headers = { authorization: `Key ${cred}`, "content-type": "application/json", accept: "application/json" };
  const probes = [
    ["higgsfield-ai/soul/v2/standard", { prompt: "estimate", aspect_ratio: "9:16", resolution: "720p", batch_size: 1 }],
    ["marketing-studio/image", { prompt: "estimate", image_urls: [], aspect_ratio: "1:1", resolution: "1k", quality: "medium" }],
    ["marketing-studio/image", { prompt: "estimate", image_urls: [], aspect_ratio: "1:1", resolution: "4k", quality: "high" }],
    ["higgsfield/genjutsu/motion-transfer/v1.0", { prompt: "", image_urls: [], resolution: "720p", duration: 10 }],
  ];
  console.log("\nLive estimates (raw):");
  for (const [model, body] of probes) {
    const res = await fetch(`${base}/estimate/${model}`, { method: "POST", headers, body: JSON.stringify(body) }).catch((e) => ({ ok: false, status: e.message }));
    const text = res.ok ? await res.text() : `HTTP ${res.status}`;
    console.log(`- ${model} ${JSON.stringify(body)} → ${text}`);
  }
}
