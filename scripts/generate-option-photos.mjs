#!/usr/bin/env node
/**
 * Generates the AI Influencer builder's option photos with Soul 2 (Higgsfield) and writes
 * public/influencer/options/<group>/<option>.webp (256 px wide) + the manifest
 * components/studio/influencer/option-photos.ts.
 *
 *   npm run photos:options            # generate missing photos (resumable)
 *   npm run photos:options -- --dry   # print prompts, no API calls
 *
 * Runs locally with HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET from .env.local (never in the
 * browser, never committed). Costs one Soul 2 generation per missing photo.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { GROUPS, PHOTO_GROUPS, TIERS } from "../components/studio/influencer/traits.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/influencer/options");
const MANIFEST = join(ROOT, "components/studio/influencer/option-photos.ts");
const DRY = process.argv.includes("--dry");
const BASE = (process.env.HIGGSFIELD_API_BASE_URL || "https://api.higgsfield.ai").replace(/\/$/, "");
const KEY = process.env.HIGGSFIELD_API_KEY ?? "";
const SECRET = process.env.HIGGSFIELD_API_SECRET ?? "";
const CREDENTIAL = KEY && SECRET ? `${KEY}:${SECRET}` : KEY.includes(":") ? KEY : "";

const LOOK = "Photorealistic editorial photo, plain soft light-grey studio background, soft even light, centered, sharp focus, 85mm";
const WOMAN = "a young Gulf Arab woman with warm tan skin";
const MAN = "a young Gulf Arab man with olive skin";
const GENDERED_STYLE = {
  modest: "an elegant modest black abaya and hijab",
  khaleeji: "a traditional embroidered jalabiya",
};
const TIER_PROMPTS = {
  average: `Full-body photo of ${WOMAN}, natural everyday social-media creator look, casual outfit`,
  bold: "Full-body fashion-editorial casting photo of a striking model with a sharp platinum bob and bold Y2K outfit",
  extreme: "Full-body avant-garde casting photo of a surreal yet photoreal model with an extremely long neck and sculpted hair horns",
};

/** One prompt per photo option. */
function promptFor(group, option) {
  const en = option.en;
  switch (group) {
    case "tier": return TIER_PROMPTS[option.id];
    case "gender": return `Half-body portrait of ${option.id === "male" ? MAN : WOMAN}, friendly expression, simple neutral clothes`;
    case "expression": return `Close-up head-and-shoulders portrait of ${WOMAN} in a hijab, ${en}`;
    case "ethnicity": return `Head-and-shoulders portrait of a young ${en} woman, natural look, simple neutral top`;
    case "age": return `Head-and-shoulders portrait of a Gulf Arab woman ${en}, wearing a hijab, gentle smile`;
    case "facialHair": return `Close-up portrait of ${MAN} with ${en}, short black hair`;
    case "distinctive": return `Close-up portrait of a young woman with ${en}, natural hair`;
    case "build": return `Full-body photo of a person with a ${en} build, plain fitted athletic clothes, standing`;
    case "hair": return option.id === "hijab" ? `Head-and-shoulders portrait of ${WOMAN} wearing an elegant hijab` : `Head-and-shoulders portrait of a young woman with ${en}, dark brown hair colour`;
    case "style": return `Full-body photo of ${WOMAN}, dressed in ${GENDERED_STYLE[option.id] ?? en}`;
    case "accessories": return option.id === "none" ? `Head-and-shoulders portrait of ${WOMAN} in a hijab, no accessories` : `Head-and-shoulders portrait of ${WOMAN} in a hijab, with ${en}`;
    default: return null;
  }
}

const jobs = [
  ...TIERS.map((id) => ({ group: "tier", option: { id } })),
  ...GROUPS.filter((g) => PHOTO_GROUPS.has(g.id)).flatMap((g) => g.options.map((option) => ({ group: g.id, option }))),
].map((j) => ({ ...j, prompt: `${promptFor(j.group, j.option)}. ${LOOK}`, file: join(OUT, j.group, `${j.option.id}.webp`) }));

const missing = jobs.filter((j) => !existsSync(j.file));
console.log(`${jobs.length} option photos, ${missing.length} missing.`);
if (DRY) {
  for (const j of missing) console.log(`${j.group}/${j.option.id}: ${j.prompt}`);
  process.exit(0);
}
if (missing.length && !CREDENTIAL) {
  console.error("Set HIGGSFIELD_API_KEY and HIGGSFIELD_API_SECRET in .env.local first.");
  process.exit(1);
}

const headers = { authorization: `Key ${CREDENTIAL}`, "content-type": "application/json", accept: "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(job) {
  // Deterministic key: re-running after a crash never pays twice for the same photo.
  const idem = createHash("sha256").update(`dizura-option-photo:v1:${job.prompt}`).digest("hex").slice(0, 64);
  const res = await fetch(`${BASE}/higgsfield-ai/soul/v2/standard`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": idem },
    body: JSON.stringify({ prompt: job.prompt, aspect_ratio: "3:4", resolution: "720p", batch_size: 1 }),
  });
  if (!res.ok) throw new Error(`submit ${res.status}`);
  const { request_id } = await res.json();
  for (let i = 0; i < 90; i++) {
    await sleep(Math.min(10_000, 2_000 * 1.4 ** i));
    const s = await (await fetch(`${BASE}/requests/${request_id}/status`, { headers })).json();
    if (s.status === "completed" && s.images?.[0]?.url) return s.images[0].url;
    if (["failed", "nsfw", "canceled"].includes(s.status)) throw new Error(s.status);
  }
  throw new Error("timeout");
}

const { default: sharp } = await import("sharp"); // ships with Next.js
let done = 0;
async function worker(queue) {
  for (let job = queue.shift(); job; job = queue.shift()) {
    try {
      const url = await generate(job);
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      mkdirSync(dirname(job.file), { recursive: true });
      await sharp(bytes).resize({ width: 256, height: 341, fit: "cover" }).webp({ quality: 72 }).toFile(job.file);
      console.log(`✓ ${job.group}/${job.option.id} (${++done}/${missing.length})`);
    } catch (err) {
      console.error(`✗ ${job.group}/${job.option.id}: ${err.message}`);
    }
  }
}
const queue = [...missing];
await Promise.all([worker(queue), worker(queue), worker(queue)]);

// Manifest = every photo present on disk.
const present = existsSync(OUT)
  ? readdirSync(OUT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => readdirSync(join(OUT, d.name)).filter((f) => f.endsWith(".webp")).map((f) => `${d.name}/${f.slice(0, -5)}`))
      .sort()
  : [];
writeFileSync(
  MANIFEST,
  `/**
 * Option photos available under /public/influencer/options/<group>/<option>.webp ("<group>/<option>").
 * Regenerate with \`npm run photos:options\` (scripts/generate-option-photos.mjs); options without a
 * photo fall back to DIZURA placeholder art.
 */
export const OPTION_PHOTOS: ReadonlySet<string> = new Set<string>(${JSON.stringify(present, null, 2)});
`,
);
console.log(`Manifest: ${present.length} photos.`);
