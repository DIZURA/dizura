/**
 * Ads Creative Studio formats → English prompts for Higgsfield Marketing Studio Image
 * (models follow English best). The product photo is always the first reference image.
 */
const KEEP_PRODUCT =
  "Use the provided product photo as the hero: keep the product's exact shape, colours, materials, label and text unchanged. Photorealistic commercial advertising photography, sharp focus, high detail";

export const AD_FORMATS = {
  studio: "Premium studio product shot on a seamless neutral backdrop with soft key light, subtle reflection and gentle shadow",
  lifestyle: "Aspirational lifestyle scene placing the product naturally in a modern Gulf home or café setting, warm natural daylight",
  luxury: "Luxury campaign visual with rich deep tones, gold accents, dramatic rim light and an elegant editorial composition",
  ramadan: "Festive Ramadan and Eid campaign visual with glowing lanterns, crescent moon motifs, dates and a warm evening glow",
  social: "Bold, colourful scroll-stopping social media ad with vibrant gradient background and dynamic composition",
  marketplace: "Clean e-commerce marketplace listing image on a pure white background, centred, evenly lit, no props",
  poster: "Graphic advertising poster with a strong layout and generous empty space at the top for a headline, modern design",
} as const;
export type AdFormat = keyof typeof AD_FORMATS;
export const AD_FORMAT_IDS = Object.keys(AD_FORMATS) as AdFormat[];

export function composeAdPrompt(format: AdFormat, notes: string): string {
  return [AD_FORMATS[format], notes.trim(), KEEP_PRODUCT].filter(Boolean).join(". ");
}
