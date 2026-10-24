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

/**
 * Video ads (WAN 3.0 Prime image-to-video): the product photo is the first frame, so the product
 * stays exact; the prompt describes only camera and scene motion.
 */
const KEEP_PRODUCT_VIDEO =
  "The product from the first frame stays exactly the same shape, colours, label and text throughout. Smooth, stable, cinematic commercial video, no text overlays, no warping";

export const VIDEO_AD_MOTIONS = {
  push_in: "Slow cinematic dolly push-in towards the product with soft light shimmering across its surface",
  orbit: "Smooth 360-degree turntable orbit around the product on a clean pedestal, premium studio lighting",
  reveal: "A beam of light sweeps across the dark scene and reveals the product, subtle particles in the air",
  lifestyle: "A hand gently picks up the product in a bright modern Gulf home, natural daylight, shallow depth of field",
  unbox: "The product is lifted out of an elegant gift box, ribbon falling away, warm festive light",
  splash: "Dynamic splash of water and light particles bursting around the product in slow motion",
} as const;
export type VideoAdMotion = keyof typeof VIDEO_AD_MOTIONS;
export const VIDEO_AD_MOTION_IDS = Object.keys(VIDEO_AD_MOTIONS) as VideoAdMotion[];

export function composeVideoAdPrompt(motion: VideoAdMotion, notes: string): string {
  return [VIDEO_AD_MOTIONS[motion], notes.trim(), KEEP_PRODUCT_VIDEO].filter(Boolean).join(". ");
}
