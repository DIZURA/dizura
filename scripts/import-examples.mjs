#!/usr/bin/env node
/**
 * Imports the example pictures designed in Lovable (src/assets/examples/*.jpg in the Lovable
 * project) into DIZURA:
 *   - option cards  → public/influencer/options/<group>/<option>.webp (256 px wide)
 *   - guides/ads/landing → public/examples/<name>.webp (1280 px wide)
 * and rewrites both manifests (option-photos.ts, examples.ts) from what is on disk.
 *
 *   node scripts/import-examples.mjs <folder-with-lovable-jpgs>
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2];
if (!SRC || !existsSync(SRC)) {
  console.error("Usage: node scripts/import-examples.mjs <folder-with-lovable-jpgs>");
  process.exit(1);
}

/** Lovable file prefix → our trait group, plus option ids that are spelled differently. */
const GROUPS = { emotion: "expression", origin: "ethnicity", age: "age", build: "build", hair: "hair", style: "style", tier: "tier" };
const RENAME = {
  "ethnicity/levantine": "levant",
  "ethnicity/north-african": "northAfrica",
  "ethnicity/south-asian": "southAsian",
  "ethnicity/east-asian": "eastAsian",
};

const { default: sharp } = await import("sharp"); // ships with Next.js
let options = 0;
let examples = 0;
for (const file of readdirSync(SRC)) {
  if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
  const name = basename(file, extname(file));
  const [prefix, ...rest] = name.split("-");
  const group = GROUPS[prefix];
  if (group) {
    const raw = rest.join("-");
    const id = RENAME[`${group}/${raw}`] ?? raw;
    const out = join(ROOT, "public/influencer/options", group, `${id}.webp`);
    mkdirSync(dirname(out), { recursive: true });
    await sharp(join(SRC, file)).resize({ width: 256, height: 341, fit: "cover" }).webp({ quality: 74 }).toFile(out);
    options++;
  } else {
    const out = join(ROOT, "public/examples", `${name}.webp`);
    mkdirSync(dirname(out), { recursive: true });
    await sharp(join(SRC, file)).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 76 }).toFile(out);
    examples++;
  }
}

const list = (dir, nested) =>
  existsSync(dir)
    ? (nested
        ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap((d) => readdirSync(join(dir, d.name)).map((f) => `${d.name}/${f}`))
        : readdirSync(dir)
      )
        .filter((f) => f.endsWith(".webp"))
        .map((f) => f.slice(0, -5))
        .sort()
    : [];

writeFileSync(
  join(ROOT, "components/studio/influencer/option-photos.ts"),
  `/**
 * Option photos available under /public/influencer/options/<group>/<option>.webp ("<group>/<option>").
 * Regenerate with \`npm run photos:options\` or import Lovable's with scripts/import-examples.mjs;
 * options without a photo fall back to DIZURA placeholder art.
 */
export const OPTION_PHOTOS: ReadonlySet<string> = new Set<string>(${JSON.stringify(list(join(ROOT, "public/influencer/options"), true), null, 2)});
`,
);
writeFileSync(
  join(ROOT, "components/studio/examples.ts"),
  `/**
 * Example pictures (How-it-works steps, ad formats, landing showcase) under /public/examples/<name>.webp.
 * Names listed here exist on disk (import with scripts/import-examples.mjs); anything else falls back
 * to DIZURA placeholder art.
 */
export const EXAMPLE_IMAGES: ReadonlySet<string> = new Set<string>(${JSON.stringify(list(join(ROOT, "public/examples"), false), null, 2)});

export const exampleSrc = (name: string): string | null => (EXAMPLE_IMAGES.has(name) ? \`/examples/\${name}.webp\` : null);
`,
);
console.log(`Imported ${options} option photos and ${examples} example images.`);
