/**
 * Option photos available under /public/influencer/options/<group>/<option>.webp ("<group>/<option>").
 * Regenerate with `npm run photos:options` (scripts/generate-option-photos.mjs); options without a
 * photo fall back to DIZURA placeholder art.
 */
export const OPTION_PHOTOS: ReadonlySet<string> = new Set<string>([]);
