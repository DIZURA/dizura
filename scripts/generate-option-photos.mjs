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
const KEY = (process.env.HIGGSFIELD_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");
const SECRET = (process.env.HIGGSFIELD_API_SECRET ?? "").trim().replace(/^["']|["']$/g, "");
const SDK = (process.env.HF_CREDENTIALS ?? "").trim().replace(/^["']|["']$/g, "");
// Same order as lib/higgsfield/client.ts: a combined KEY_ID:KEY_SECRET wins over a leftover secret.
// Newer Higgsfield keys can be a single value (no ":"), which is sent as-is.
const CREDENTIAL = KEY.includes(":") ? KEY : KEY && SECRET ? `${KEY}:${SECRET}` : KEY || SDK;

/** Art direction: docs/design/option-photos.md. Bump VERSION when it changes (new idempotency keys). */
const VERSION = "v4";
const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null;

const STYLE =
  "Pure white seamless studio background, high-key soft even light, subject centered, crisp detail, " +
  "quirky characterful editorial casting with internet-meme humour, fictional character, no text, no logo";
/** `real` = photorealistic (everything except the stylised Look cards). */
const HEAD = (subject, real = true) => `${real ? "Photorealistic h" : "H"}ead-and-shoulders studio portrait of ${subject}. ${STYLE}`;
const BODY = (subject) => `Photorealistic full-body studio photo of ${subject}, standing straight facing the camera, whole body in frame with feet visible. ${STYLE}`;
/** One recurring model so Emotion / Look cards compare like for like. */
const MUSE = "a young woman with a soft wavy chestnut lob and tortoiseshell cat-eye glasses";

const TIER = {
  average: HEAD(`${MUSE}, small friendly smile, sage-green cardigan`),
  bold: HEAD("a woman with a sharp silver asymmetric bob, bold red lipstick, one eyebrow raised high, cobalt blazer"),
  extreme: HEAD("a man with a towering magenta quiff sculpted like a wave, oversized star-shaped sunglasses, glitter on the cheekbones, open-mouth gasp"),
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
  cat: "a voluminous silver blow-dried bouffant, deeply unimpressed",
  dog: "long flowing ombré hair parted in the middle, aloof look",
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
  slim: "a very tall slim woman in a long camel trench coat and white sneakers",
  athletic: "an athletic man in a mint basketball jersey, shorts and high striped socks",
  muscular: "a muscular woman in a cropped lilac tracksuit, hands on hips",
  curvy: "a curvy woman in a flowing emerald maxi dress with gold embroidery and gold sandals",
  heavy: "a big cheerful man in an orange tropical-print shirt, cargo shorts and sandals",
  ultra: "a hyper-muscular bodybuilder squeezed into a tiny pink cardigan and pleated chinos",
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
  long: "a woman with ankle-length straight silver hair, black satin top, calm stare",
  short: "a man with a short curly bleached crop, green bomber jacket",
  braids: "a man with chunky two-strand twists tied up on top, cream knit sweater",
  afro: "a woman with a huge pastel-pink afro, white tee, playful smile",
  buzz: "a woman with a bleached buzz cut, gold earrings, cobalt shirt",
  bald: "a bald woman with a gold ear cuff, black turtleneck, serene",
  bowl: "an elderly man with a silver bowl cut, rectangular gold glasses, maroon cardigan",
  mullet: "a woman with a sleek black mullet, studded leather jacket, smirk",
  pigtails: "a man with two short spiky pigtails, tropical shirt, deadpan",
  mohawk: "a woman with a tall violet liberty-spike mohawk, denim jacket",
  bob: "a woman with a sharp platinum bob with blunt bangs, lime-green blouse",
  beehive: "a man with a towering grey beehive, tweed waistcoat, very serious",
  perm: "a woman with a big 80s blonde perm, neon windbreaker",
  hairHorns: "a woman with platinum hair sculpted into two curled ram horns, black dress",
  curlSphere: "a man with black curls shaped into a perfect sphere, mustard polo",
};
/** Ethnicity: dignified, characterful casting — the humour is in the styling, never the heritage. */
const ETHNICITY = {
  gulf: "a young Emirati woman in a black shayla with gold earrings, soft smile",
  middleEastern: "a Middle Eastern woman with long wavy dark hair, kohl-lined eyes, olive linen shirt, calm",
  levant: "a Levantine man with a salt-and-pepper beard, linen shirt, warm smile",
  northAfrica: "a Moroccan man with short curly hair and an embroidered djellaba collar, half smile",
  african: "a Black woman with a sleek shaved fade, bold geometric earrings, cobalt top",
  southAsian: "a South Asian man with neat side-parted hair, round wire glasses, cream kurta",
  eastAsian: "an East Asian man with a two-block haircut, oversized grey blazer, deadpan",
  european: "a European woman with a strawberry-blonde braided crown, freckles, green knit",
  mixed: "a mixed-heritage man with blond-tipped curls, a small silver hoop, denim jacket",
};

/** Facial hair and distinctive features: one original person each (never a reference person). */
const FACIAL_HAIR = {
  clean: "a young Gulf man, clean-shaven, neat short hair, white kandura collar, slight smile",
  stubble: "a man with light stubble and slicked-back grey hair, navy polo",
  beard: "a Gulf man with a long black groomed beard and a white ghutra",
  goatee: "a man with a neat chin goatee, mustard beanie, olive overshirt",
  moustache: "a man with a curled handlebar moustache, flat cap, striped shirt",
  pushBroom: "an older man with a thick grey push-broom moustache, corduroy jacket",
};
const DISTINCTIVE = {
  oddEyes: "a man with one green and one brown eye, wavy shoulder-length hair, white linen shirt",
  faceTattoo: "a woman with a tiny fine-line star tattoo under one eye, braided bun",
  piercing: "a man with a septum ring and bleached eyebrows, black hoodie",
  earPiercing: "a woman with many gold ear cuffs, slick high ponytail, coral top",
  browSlits: "a woman with one eyebrow slit, curly bangs, teal track jacket",
  goldGrill: "a woman flashing a gold grill smile, long nails near her face, pink tracksuit",
  braces: "a young man with metal braces and a buzz cut, yellow polo, huge grin",
  scar: "a woman with a small scar through one eyebrow, sleek ponytail, leather jacket",
  faceGems: "a man with silver face gems along the cheekbones, white tee",
  bigLashes: "a man with dramatic long lashes and glittery eyelids, black mesh shirt",
  elfEars: "a man with pointed elf ears and a long black braid, forest-green tunic",
};

/** One prompt per photo option (null = keep placeholder art, e.g. photo-mode-only options). */
function promptFor(group, option) {
  const en = option.en;
  if (option.photoOnly) return null;
  switch (group) {
    case "tier": return TIER[option.id];
    case "kind": return KIND[option.id] ?? null;
    case "animal": return HEAD(`a ${option.id === "dog" ? "saluki dog" : option.id === "cat" ? "fluffy Persian cat" : en} with ${ANIMAL_HAIR[option.id]}`);
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
    case "facialHair": return HEAD(FACIAL_HAIR[option.id] ?? `a man with ${en}`);
    case "distinctive": return HEAD(DISTINCTIVE[option.id] ?? `a person with ${en}`);
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
  console.error("Set HIGGSFIELD_API_KEY in .env.local first (your Higgsfield API key; KEY_ID:KEY_SECRET if it has two parts).");
  process.exit(1);
}
if (missing.length) {
  // Never print the key: only its shape, so a wrong paste is easy to spot.
  const [id, secret] = CREDENTIAL.split(":");
  console.log(
    secret === undefined
      ? `Using a single-value Higgsfield key (${id?.length ?? 0} chars).`
      : `Using a Higgsfield key: id ${id?.length ?? 0} chars, secret ${secret.length} chars.`,
  );
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
let fatal = null; // bad key / no credits: stop instead of failing every photo
async function worker(queue) {
  for (let job = fatal ? undefined : queue.shift(); job; job = fatal ? undefined : queue.shift()) {
    try {
      const url = await generate(job);
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      mkdirSync(dirname(job.file), { recursive: true });
      await sharp(bytes).resize({ width: 320, height: 320, fit: "cover" }).webp({ quality: 78 }).toFile(job.file);
      console.log(`✓ ${job.group}/${job.option.id} (${++done}/${missing.length})`);
    } catch (err) {
      console.error(`✗ ${job.group}/${job.option.id}: ${err.message}`);
      if (/^submit (401|403)/.test(err.message)) fatal ??= err.message;
    }
  }
}
const queue = [...missing];
await Promise.all([worker(queue), worker(queue), worker(queue)]);
if (fatal) {
  console.error(`\nStopped: ${fatal}`);
  process.exitCode = 1;
}

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
