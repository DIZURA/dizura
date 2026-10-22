/** Influencer traits -> English prompt (models follow English most reliably). Pure, client-safe. */

/** Trait -> English phrase sent to the model (models follow English prompts most reliably). */
const ORIGIN: Record<string, string> = {
  gulf: "Gulf Arab", levant: "Levantine Arab", northAfrica: "North African", southAsia: "South Asian",
  eastAsia: "East Asian", europe: "European", africa: "African", latin: "Latin American",
};
const HAIR: Record<string, string> = { long: "long wavy", straight: "sleek straight", curly: "curly", short: "short", braids: "braided" };
const OUTFIT: Record<string, string> = {
  luxury: "luxury designer fashion", streetwear: "trendy streetwear", business: "a tailored business suit", sporty: "athleisure sportswear",
};
/** Outfits whose wording depends on gender. */
const GENDERED_OUTFIT: Record<string, { female: string; male: string }> = {
  modest: { female: "an elegant modest abaya", male: "an elegant modest kandura" },
  traditional: { female: "a traditional embroidered jalabiya", male: "a traditional white thobe and ghutra" },
};
const SETTING: Record<string, string> = {
  studio: "clean studio backdrop with soft key light", city: "on a modern city street at dusk", desert: "in the desert at golden hour",
  cafe: "in a stylish café", beach: "on a sunlit beach", interior: "in a luxury interior",
};

export type Traits = { gender: "female" | "male"; age: string; origin: string; hair: string; hairColor: string; outfit: string; setting: string };

export function composeInfluencerPrompt(t: Traits): string {
  const person = t.gender === "female" ? "woman" : "man";
  const hair = t.hair === "hijab" ? "in an elegant hijab" : `${HAIR[t.hair]} ${t.hairColor} hair`;
  const outfit = GENDERED_OUTFIT[t.outfit]?.[t.gender] ?? OUTFIT[t.outfit];
  return `Photorealistic ${t.age}-year-old ${ORIGIN[t.origin]} ${person}, social media influencer, ${hair}, wearing ${outfit}, ${SETTING[t.setting]}. Consistent character, natural skin texture, sharp focus, 85mm lens`;
}

export const GROUPS = [
  { section: "identity", fields: [
    { key: "gender", options: ["female", "male"] },
    { key: "age", options: ["18-24", "25-34", "35-44", "45+"] },
    { key: "origin", options: ["gulf", "levant", "northAfrica", "southAsia", "eastAsia", "europe", "africa", "latin"] },
  ] },
  { section: "look", fields: [
    { key: "hair", options: ["long", "straight", "curly", "short", "braids", "hijab"] },
    { key: "hairColor", options: ["black", "brown", "blonde", "red", "grey"] },
  ] },
  { section: "style", fields: [{ key: "outfit", options: ["modest", "luxury", "streetwear", "business", "sporty", "traditional"] }] },
  { section: "scene", fields: [{ key: "setting", options: ["studio", "city", "desert", "cafe", "beach", "interior"] }] },
] as const;

export const DEFAULT_TRAITS: Traits = {
  gender: "female", age: "25-34", origin: "gulf", hair: "hijab", hairColor: "black", outfit: "modest", setting: "studio",
};

/** Keeps trait combinations coherent (e.g. no hijab for men). */
export function withTrait(prev: Traits, key: keyof Traits, value: string): Traits {
  const next = { ...prev, [key]: value } as Traits;
  if (next.gender === "male" && next.hair === "hijab") next.hair = "short";
  return next;
}

export const STYLES = {
  editorial: "high-fashion editorial photography, magazine quality",
  street: "candid street-style photography, natural daylight",
  studio: "clean studio portrait, seamless backdrop",
  cinematic: "cinematic film still, anamorphic lighting, shallow depth of field",
  ugc: "casual smartphone selfie, authentic UGC style",
  luxury: "luxury campaign photography, rich warm tones, refined styling",
} as const;
export type StyleKey = keyof typeof STYLES;

/** Animation presets for image-to-video (WAN 3.0 Prime). */
export const ANIMATIONS = {
  subtle: "subtle natural idle motion, gentle breathing and blinking, seamless loop",
  talk: "speaking naturally to the camera with expressive hand gestures",
  smile: "turns head toward the camera and smiles warmly",
  walk: "walks confidently toward the camera",
  wind: "hair and clothes moving gently in the wind",
  orbit: "slow cinematic camera orbit around the subject",
} as const;
export type AnimationKey = keyof typeof ANIMATIONS;
