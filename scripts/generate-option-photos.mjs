#!/usr/bin/env node
/**
 * Generates the AI Influencer builder's option photos with Soul 2 (Higgsfield) and writes
 * public/influencer/options/<group>/<option>.webp (256 px wide) + the manifest
 * components/studio/influencer/option-photos.ts.
 *
 *   npm run photos:options                     # generate missing photos (resumable)
 *   npm run photos:options -- --dry            # print prompts, no API calls
 *   npm run photos:options -- --force          # regenerate everything (new art direction)
 *   npm run photos:options -- --only=animal    # limit to some groups
 *
 * Art direction: docs/design/option-photos.md (white background, quirky casting, square).
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

/** Art direction: docs/design/option-photos.md. Bump VERSION when it changes (new idempotency keys). */
const VERSION = "v3";
const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null;

const STYLE =
  "Pure white seamless studio background, high-key soft even light, subject centered, crisp detail, " +
  "quirky characterful editorial casting with internet-meme humour, fictional character, no text, no logo";
/** `real` = photorealistic (everything except the stylised Look cards). */
const HEAD = (subject, real = true) => `${real ? "Photorealistic h" : "H"}ead-and-shoulders studio portrait of ${subject}. ${STYLE}`;
const BODY = (subject) => `Photorealistic full-body studio photo of ${subject}, standing straight facing the camera, whole body in frame with feet visible. ${STYLE}`;
/** One recurring model so Emotion / Look cards compare like for like. */
const MUSE = "a young woman with a glossy black blunt bob with heavy bangs and thin round gold glasses";

const TIER = {
  average: HEAD(`${MUSE}, small friendly smile, cream knit sweater`),
  bold: HEAD("a lanky man with a shaggy chestnut bowl cut and rectangular glasses, sticking his tongue out, mustard corduroy jacket"),
  extreme: HEAD("a surreal character with a towering glossy lime-green pompadour, round black glasses, a tiny pointed goatee and wide astonished eyes"),
};
const KIND = {
  human: HEAD("a stylish young Gulf Arab woman in a sleek black hijab and statement gold earrings, confident half smile"),
  animal: HEAD("a photoreal lion wearing a perfectly sculpted human pompadour hairstyle, mid playful roar"),
  alien: HEAD("a friendly humanoid alien with iridescent teal skin, huge luminous eyes and a sculpted silver quiff"),
  robot: HEAD("a sleek white-and-chrome humanoid robot with glowing mint LED eyes and a retro bowl-cut helmet"),
  fantasy: HEAD("a mischievous elf with long pointed ears, platinum hair in a blunt bob and an emerald velvet collar"),
};
/** Animals wear human hairstyles — the signature of the set. */
const ANIMAL_HAIR = {
  cat: "a fluffy auburn pompadour, hissing dramatically",
  dog: "a tall black flat-top haircut, tongue out",
  lion: "a slicked-back 1950s crooner hairstyle, proud stare",
  tiger: "a spiky punk mohawk, snarling playfully",
  falcon: "a tiny gold crown and aviator sunglasses, fierce look",
  camel: "a shaggy surfer fringe, chewing with a goofy grin",
  horse: "a glossy blonde salon blow-out, toothy grin",
  fox: "a bright orange mullet, smug smirk",
  wolf: "a silver shag wolf-cut, howling",
  panda: "a perfect black bowl cut, deadpan stare",
  owl: "round tortoiseshell reading glasses and a tweed bow tie, judging look",
  rabbit: "two pigtails tied with pink bows, wide-eyed surprise",
};
const LOOK_STYLE = {
  photoreal: `${MUSE}, photorealistic photo with natural skin texture`,
  film3d: `${MUSE}, rendered as a 3D animated feature-film character`,
  anime: `${MUSE}, drawn as a high-quality anime illustration with clean line art and cel shading`,
  clay: `${MUSE}, made as a handcrafted claymation figure with visible clay texture`,
  comic: `${MUSE}, drawn as a bold comic-book illustration with ink outlines and halftone shading`,
};
const BUILD = {
  slim: "a very slim, very tall young man in an oversized brown double-breasted suit",
  athletic: "an athletic young woman in a teal zip-up tracksuit and white socks with loafers",
  muscular: "a muscular man with a neat moustache in a striped polo shirt and beige pleated trousers",
  curvy: "a curvy woman with a towering beehive in a burgundy polka-dot wrap dress and kitten heels",
  heavy: "a heavy-set man with round glasses in a mustard sweater vest, red bow tie, brown shorts and knee socks",
  ultra: "a hyper-muscular bodybuilder with enormous arms squeezed into a too-tight tweed suit",
};
const STYLE_OUTFIT = {
  modest: "a young Gulf Arab woman in an elegant black abaya and hijab with gold trim",
  khaleeji: "a young Gulf Arab man in a crisp white thobe and red-checked ghutra",
  luxury: "a woman in a dramatic designer cream cape coat and oversized sunglasses",
  casual: "a man in a relaxed oversized hoodie, baggy jeans and chunky sneakers",
  streetstyle: "a teen in layered streetwear, a bucket hat and a puffer vest",
  suits: "a man in a sharp electric-blue tailored suit with a turtleneck",
  sporty: "a woman in matching lilac athleisure and a sweatband",
  retro: "a woman in a 1970s orange flared jumpsuit with a big afro",
  y2k: "a girl in a pink baby tee, low-rise jeans and tinted butterfly sunglasses",
  goth: "a pale person in a black lace Victorian gothic dress with a choker",
  theatre: "a performer in a dramatic sequinned theatre costume with a feathered cape",
};

/** Hairstyles: one memorable person per cut (owner's references, 2026-10-24). */
const HAIR = {
  long: "a pale gaunt man with very long straight jet-black hair to the waist, black turtleneck, deadpan",
  short: "a woman with a short platinum pixie crop, big gold hoop earrings, lilac shirt, deadpan",
  braids: "a woman with long box braids decorated with gold cuffs, dark green velvet jacket, cool stare",
  afro: "a man with a huge round afro, tiny round sunglasses, moustache, brown suede jacket",
  buzz: "a man with a neat buzz cut, mustard turtleneck and brown blazer, deadpan",
  bald: "a bald man with thick black glasses, white shirt and skinny black tie, deadpan",
  bowl: "a man with a glossy black bowl cut, round red glasses, yellow sweater vest, startled look",
  mullet: "a man with a curly ginger mullet and moustache, leopard-print shirt, side glance",
  pigtails: "a woman with two high pigtails and bangs, oversized round glasses, navy sailor collar, pouting",
  mohawk: "a pale punk with a spiky lime-green mohawk, safety-pin earrings, beige cardigan, deadpan",
  bob: "a man with a sleek copper-red blunt bob, purple velvet blazer and mustard shirt, deadpan",
  beehive: "a woman with a towering copper beehive, winged eyeliner, mustard turtleneck",
  perm: "a man with a tight curly dome perm, tinted aviator glasses, pastel windbreaker",
  hairHorns: "a young man with black hair sculpted into two devil horns, red satin shirt, deadpan",
  curlSphere: "a woman with dense ginger curls shaped into a perfect sphere, cream blouse, wide eyes",
};
/** Ethnicity: dignified, characterful casting — the humour is in the styling, never the heritage. */
const ETHNICITY = {
  gulf: "a young Gulf Arab man in a crisp white ghutra and thobe, neat beard, deadpan stare",
  middleEastern: "a Middle Eastern man with thick curly black hair, a strong moustache and bold brows, mint satin shirt, deadpan",
  levant: "a Levantine woman with glossy dark waves, red lipstick and a cream ruffled blouse, unimpressed look",
  northAfrica: "a North African woman with voluminous curly hair, gold hoop earrings and a mustard caftan collar, half smile",
  african: "a tall Black man with a sculpted high-top fade, round tortoiseshell glasses and a mustard turtleneck, deadpan",
  southAsian: "a South Asian woman with a high top-knot bun, oversized amber glasses and a teal paisley pussy-bow blouse, deadpan",
  eastAsian: "an East Asian woman with a jet-black blunt bob with micro bangs and a white ruffled collar, deadpan",
  european: "a pale lanky European man with a ginger side part, tweed jacket and brown knitted tie, deadpan",
  mixed: "a mixed-heritage woman with a big curly auburn puff, red cat-eye glasses and a striped retro top, deadpan",
};

/** One prompt per photo option (null = keep placeholder art, e.g. photo-mode-only options). */
function promptFor(group, option) {
  const en = option.en;
  if (option.photoOnly) return null;
  switch (group) {
    case "tier": return TIER[option.id];
    case "kind": return KIND[option.id] ?? null;
    case "animal": return HEAD(`a ${option.id === "dog" ? "pug dog" : en} with ${ANIMAL_HAIR[option.id]}`);
    case "alien":
    case "robot": return HEAD(`${en}, expressive quirky face`);
    case "fantasy": return HEAD(`a ${option.id === "genie" || option.id === "dragonkin" ? "man" : "woman"} ${en}, playful expression`);
    case "look": return HEAD(LOOK_STYLE[option.id], option.id === "photoreal");
    case "gender": return HEAD(option.id === "male"
      ? "a young Gulf Arab man with a neat beard and a white ghutra, raised eyebrow"
      : "a young Gulf Arab woman in a pastel hijab, warm grin");
    case "expression": return HEAD(`${MUSE}, ${en}`);
    case "ethnicity": return HEAD(ETHNICITY[option.id] ?? `a young ${en} person with a striking natural look and a bold-coloured top`);
    case "age": return HEAD(`a Gulf Arab man ${en} with a quirky moustache and patterned shirt, deadpan look`);
    case "facialHair": return HEAD(`a young man with ${en} and a slick side part, deadpan stare`);
    case "distinctive": return HEAD(`a young woman with ${en}, edgy styling`);
    case "build": return BODY(BUILD[option.id] ?? `a person with a ${en} build`);
    case "hair": return option.id === "hijab"
      ? HEAD("a young woman wearing an elegant emerald silk hijab, chic gold earrings")
      : HEAD(HAIR[option.id] ?? `a quirky character with ${en}, deadpan expression, colourful retro outfit`);
    case "style": return BODY(STYLE_OUTFIT[option.id] ?? `a person dressed in ${en}`);
    case "accessories": return option.id === "none"
      ? HEAD(`${MUSE} without glasses, no accessories, plain white tee`)
      : HEAD(`a young woman with a sleek low bun wearing ${en}, playful pose`);
    default: return null;
  }
}

const jobs = [
  ...TIERS.map((id) => ({ group: "tier", option: { id } })),
  ...GROUPS.filter((g) => PHOTO_GROUPS.has(g.id)).flatMap((g) => g.options.map((option) => ({ group: g.id, option }))),
]
  .map((j) => ({ ...j, prompt: promptFor(j.group, j.option), file: join(OUT, j.group, `${j.option.id}.webp`) }))
  .filter((j) => j.prompt && (!ONLY || ONLY.includes(j.group)));

const missing = jobs.filter((j) => FORCE || !existsSync(j.file));
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
  const idem = createHash("sha256").update(`dizura-option-photo:${VERSION}:${job.prompt}`).digest("hex").slice(0, 64);
  const res = await fetch(`${BASE}/higgsfield-ai/soul/v2/standard`, {
    method: "POST",
    headers: { ...headers, "idempotency-key": idem },
    body: JSON.stringify({ prompt: job.prompt, aspect_ratio: "1:1", resolution: "720p", batch_size: 1 }),
  });
  if (!res.ok) {
    // Higgsfield explains the failure in the body (401 bad keys, 403 out of credits, 422 validation…).
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
    const hint = { 401: "check HIGGSFIELD_API_KEY / HIGGSFIELD_API_SECRET", 403: "Higgsfield account has no API credits" }[res.status];
    throw new Error(`submit ${res.status}${hint ? ` (${hint})` : ""} ${detail}`.trim());
  }
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
      await sharp(bytes).resize({ width: 320, height: 320, fit: "cover" }).webp({ quality: 78 }).toFile(job.file);
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
