/**
 * Example pictures (How-it-works steps, ad formats, landing showcase) under /public/examples/<name>.webp.
 * Names listed here exist on disk (import with scripts/import-examples.mjs); anything else falls back
 * to DIZURA placeholder art.
 */
export const EXAMPLE_IMAGES: ReadonlySet<string> = new Set<string>([
  "ad-lifestyle",
  "ad-luxury",
  "ad-marketplace",
  "ad-poster",
  "ad-ramadan",
  "ad-social",
  "ad-studio",
  "how-ads-1",
  "how-ads-2",
  "how-ads-3",
  "how-ads-4",
  "how-ads-5",
  "how-vc-1",
  "how-vc-2",
  "how-vc-3",
  "how-vc-4",
  "how-vc-5",
  "landing-ads",
  "landing-vc",
  "motion-dance",
  "motion-talk",
  "motion-unboxing",
  "motion-walk",
  "motion-workout"
]);

export const exampleSrc = (name: string): string | null => (EXAMPLE_IMAGES.has(name) ? `/examples/${name}.webp` : null);
