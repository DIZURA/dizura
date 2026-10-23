/**
 * AI Influencer character builder: trait catalogue, selection rules and prompt composer.
 * Pure + client-safe. Labels live in the i18n dictionary (`builder.opts`); the English
 * phrases here are what the model receives (models follow English prompts most reliably).
 */
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type Tier = "average" | "bold" | "extreme";
export const TIERS: readonly Tier[] = ["average", "bold", "extreme"];

export type Tab = "builder" | "face" | "body" | "style";
export const TABS: readonly Tab[] = ["builder", "face", "body", "style"];

type Option = {
  id: string;
  /** English phrase sent to the model. */
  en: string;
  /** Unlocked by the Bold / Extreme character types only. */
  bold?: true;
  only?: "female" | "male";
  /** Features: at most one option per slot (one nose, one mouth…). */
  slot?: string;
  /** Selecting it clears the rest of the group (e.g. "No accessories"). */
  exclusive?: true;
};
type Group = {
  id: string;
  tab: Tab;
  max: number;
  /** Group describes identity and is taken from the Soul ID instead when one is used. */
  identity?: true;
  only?: "female" | "male";
  options: readonly Option[];
};

export const GROUPS = [
  // ---- Builder -------------------------------------------------------------
  { id: "gender", tab: "builder", max: 1, identity: true, options: [
    { id: "female", en: "woman" }, { id: "male", en: "man" },
  ] },
  { id: "expression", tab: "builder", max: 1, options: [
    { id: "neutral", en: "a calm, neutral expression" }, { id: "smile", en: "a warm, natural smile" },
    { id: "laugh", en: "laughing joyfully" }, { id: "confident", en: "a confident, self-assured look" },
    { id: "serious", en: "a serious, intense gaze" }, { id: "playful", en: "a playful, cheeky grin" },
    { id: "surprised", en: "a surprised, wide-eyed expression" }, { id: "dreamy", en: "a soft, dreamy gaze" },
  ] },
  { id: "ethnicity", tab: "builder", max: 1, identity: true, options: [
    { id: "gulf", en: "Gulf Arab" }, { id: "levant", en: "Levantine Arab" }, { id: "northAfrica", en: "North African" },
    { id: "african", en: "African" }, { id: "southAsian", en: "South Asian" }, { id: "eastAsian", en: "East Asian" },
    { id: "european", en: "European" }, { id: "mixed", en: "mixed-heritage" },
  ] },
  { id: "age", tab: "builder", max: 1, identity: true, options: [
    { id: "young", en: "in their early twenties" }, { id: "adult", en: "in their thirties" },
    { id: "mature", en: "in their late forties" }, { id: "senior", en: "in their late sixties" },
  ] },
  { id: "skin", tab: "builder", max: 1, identity: true, options: [
    { id: "porcelain", en: "porcelain" }, { id: "fair", en: "fair" }, { id: "light", en: "light" }, { id: "olive", en: "olive" },
    { id: "tan", en: "warm tan" }, { id: "brown", en: "brown" }, { id: "deep", en: "deep brown" }, { id: "ebony", en: "ebony" },
  ] },
  // ---- Face ----------------------------------------------------------------
  { id: "head", tab: "face", max: 1, identity: true, options: [
    { id: "oval", en: "oval" }, { id: "long", en: "long" }, { id: "round", en: "round" }, { id: "square", en: "square-jawed" },
    { id: "heart", en: "heart-shaped" }, { id: "tiny", en: "unusually small", bold: true }, { id: "forehead", en: "high-foreheaded", bold: true },
  ] },
  { id: "eyeShape", tab: "face", max: 1, identity: true, options: [
    { id: "almond", en: "almond-shaped" }, { id: "round", en: "round" }, { id: "monolid", en: "monolid" }, { id: "large", en: "large" },
    { id: "hooded", en: "hooded" }, { id: "upturned", en: "upturned" }, { id: "downturned", en: "downturned" },
    { id: "close", en: "close-set", bold: true }, { id: "wide", en: "wide-set", bold: true }, { id: "huge", en: "huge doll-like", bold: true },
  ] },
  { id: "eyeColor", tab: "face", max: 1, identity: true, options: [
    { id: "black", en: "black" }, { id: "brown", en: "brown" }, { id: "hazel", en: "hazel" }, { id: "green", en: "green" },
    { id: "blue", en: "blue" }, { id: "iceBlue", en: "ice-blue" }, { id: "amber", en: "amber" }, { id: "grey", en: "grey" },
  ] },
  { id: "features", tab: "face", max: 4, identity: true, options: [
    { id: "freckles", en: "freckles", slot: "marks" }, { id: "dimples", en: "dimples", slot: "cheeks" },
    { id: "cheekbones", en: "high cheekbones", slot: "cheeks" }, { id: "fullLips", en: "full lips", slot: "lips" },
    { id: "thickBrows", en: "thick brows", slot: "brows" }, { id: "beautyMark", en: "a beauty mark", slot: "marks" },
    { id: "tinyNose", en: "a tiny nose", slot: "nose" }, { id: "wideMouth", en: "a wide mouth", slot: "lips" },
    { id: "pointyChin", en: "a pointy chin", slot: "chin" }, { id: "eyeBags", en: "heavy under-eye bags", slot: "eyes" },
    { id: "buttonNose", en: "a button nose", slot: "nose", bold: true }, { id: "unibrow", en: "a unibrow", slot: "brows", bold: true },
    { id: "gapTeeth", en: "a gap between the front teeth", slot: "teeth", bold: true }, { id: "jugEars", en: "jug ears", slot: "ears", bold: true },
    { id: "bigForehead", en: "a big forehead", slot: "forehead", bold: true },
  ] },
  { id: "facialHair", tab: "face", max: 1, identity: true, only: "male", options: [
    { id: "clean", en: "clean-shaven" }, { id: "stubble", en: "light stubble" }, { id: "beard", en: "a full groomed beard" },
    { id: "goatee", en: "a goatee" }, { id: "moustache", en: "a moustache" }, { id: "pushBroom", en: "a thick push-broom moustache", bold: true },
  ] },
  { id: "distinctive", tab: "face", max: 2, identity: true, options: [
    { id: "oddEyes", en: "heterochromia (two different eye colours)" }, { id: "faceTattoo", en: "a small face tattoo" },
    { id: "piercing", en: "a septum piercing" }, { id: "earPiercing", en: "multiple ear piercings" }, { id: "browSlits", en: "eyebrow slits" },
    { id: "goldGrill", en: "a gold grill" }, { id: "braces", en: "metal braces" }, { id: "scar", en: "a small scar through one eyebrow" },
    { id: "faceGems", en: "face gems" }, { id: "bigLashes", en: "dramatic long lashes" }, { id: "elfEars", en: "pointed elf ears", bold: true },
  ] },
  // ---- Body ----------------------------------------------------------------
  { id: "height", tab: "body", max: 1, options: [
    { id: "average", en: "average height" }, { id: "tall", en: "tall" }, { id: "veryTall", en: "very tall" },
  ] },
  { id: "build", tab: "body", max: 1, options: [
    { id: "slim", en: "slim" }, { id: "athletic", en: "athletic" }, { id: "muscular", en: "muscular" }, { id: "curvy", en: "curvy" },
    { id: "heavy", en: "heavy-set" }, { id: "ultra", en: "hyper-muscular bodybuilder" },
  ] },
  { id: "proportions", tab: "body", max: 2, options: [
    { id: "longLimbs", en: "long limbs" }, { id: "shortLegs", en: "short legs" }, { id: "shoulders", en: "broad shoulders" },
    { id: "waist", en: "a tiny waist" }, { id: "egg", en: "a round egg-shaped body", bold: true },
  ] },
  { id: "neck", tab: "body", max: 1, identity: true, options: [
    { id: "standard", en: "" }, { id: "short", en: "a short neck" }, { id: "long", en: "an extremely long neck", bold: true },
    { id: "column", en: "a thick column neck", bold: true },
  ] },
  // ---- Style ---------------------------------------------------------------
  { id: "hair", tab: "style", max: 1, options: [
    { id: "hijab", en: "hijab", only: "female" }, { id: "long", en: "long flowing hair" }, { id: "short", en: "short hair" },
    { id: "braids", en: "braided hair" }, { id: "afro", en: "an afro" }, { id: "buzz", en: "a buzz cut" }, { id: "bald", en: "a bald head" },
    { id: "bowl", en: "a bowl cut" }, { id: "mullet", en: "a mullet" }, { id: "pigtails", en: "pigtails" }, { id: "mohawk", en: "a mohawk" },
    { id: "bob", en: "a sharp bob", bold: true }, { id: "beehive", en: "a towering beehive", bold: true }, { id: "perm", en: "a tight dome perm", bold: true },
    { id: "hairHorns", en: "hair sculpted into two horns", bold: true }, { id: "curlSphere", en: "hair shaped into a perfect curl sphere", bold: true },
  ] },
  { id: "hairColor", tab: "style", max: 1, options: [
    { id: "black", en: "jet-black" }, { id: "darkBrown", en: "dark brown" }, { id: "chestnut", en: "chestnut" }, { id: "ginger", en: "ginger" },
    { id: "red", en: "red" }, { id: "blonde", en: "blonde" }, { id: "platinum", en: "platinum" }, { id: "grey", en: "grey" },
    { id: "white", en: "white" }, { id: "pink", en: "pastel pink" }, { id: "lilac", en: "lilac" }, { id: "blue", en: "blue" }, { id: "green", en: "green" },
  ] },
  { id: "style", tab: "style", max: 1, options: [
    { id: "modest", en: "" }, { id: "khaleeji", en: "" }, { id: "luxury", en: "luxury designer fashion" },
    { id: "casual", en: "relaxed casual clothes" }, { id: "streetstyle", en: "trendy streetwear" }, { id: "suits", en: "a sharp tailored suit" },
    { id: "sporty", en: "athleisure sportswear" }, { id: "retro", en: "retro vintage fashion" }, { id: "y2k", en: "playful Y2K fashion" },
    { id: "goth", en: "dark goth fashion" }, { id: "theatre", en: "a dramatic theatrical costume" },
  ] },
  { id: "accessories", tab: "style", max: 3, options: [
    { id: "none", en: "", exclusive: true }, { id: "glasses", en: "glasses" }, { id: "sunglasses", en: "sunglasses" },
    { id: "jewelry", en: "delicate gold jewelry" }, { id: "watch", en: "a luxury watch" }, { id: "headphones", en: "headphones" },
    { id: "hat", en: "a hat" }, { id: "bag", en: "a designer bag" },
  ] },
] as const satisfies readonly Group[];

export type GroupId = (typeof GROUPS)[number]["id"];
type GroupOf<G extends GroupId> = Extract<(typeof GROUPS)[number], { id: G }>;
export type OptionId<G extends GroupId> = GroupOf<G>["options"][number]["id"];
export type Selection = { [G in GroupId]: OptionId<G>[] };

// Compile-time guarantee: every catalogue option has a dictionary label (en; ar is typed against en).
type LabelsCoverCatalogue = Dictionary["builder"]["opts"] extends { [G in GroupId]: Record<OptionId<G>, string> } ? true : never;
const labelsCoverCatalogue: LabelsCoverCatalogue = true;
void labelsCoverCatalogue;

const GENDERED_STYLE: Record<"modest" | "khaleeji", { female: string; male: string; neutral: string }> = {
  modest: { female: "an elegant modest abaya", male: "an elegant modest kandura", neutral: "elegant modest attire" },
  khaleeji: { female: "a traditional embroidered jalabiya", male: "a traditional white thobe and ghutra", neutral: "traditional Gulf attire" },
};

export const DEFAULT_SELECTION: Selection = {
  gender: ["female"], expression: ["smile"], ethnicity: ["gulf"], age: ["young"], skin: ["tan"],
  head: ["oval"], eyeShape: ["almond"], eyeColor: ["brown"], features: ["cheekbones"], facialHair: ["clean"], distinctive: [],
  height: ["average"], build: ["slim"], proportions: [], neck: ["standard"],
  hair: ["hijab"], hairColor: ["black"], style: ["modest"], accessories: ["jewelry"],
};

type AnyOption = Option & { id: string };
const groupById = (id: GroupId) => GROUPS.find((g) => g.id === id) as Group;

function genderOf(sel: Selection): "female" | "male" {
  return sel.gender[0] === "male" ? "male" : "female";
}

/** Options shown for a group given the character type and gender. */
export function visibleOptions(groupId: GroupId, tier: Tier, sel: Selection): readonly AnyOption[] {
  const gender = genderOf(sel);
  return groupById(groupId).options.filter((o: AnyOption) => (tier !== "average" || !o.bold) && (!o.only || o.only === gender));
}

/** Whether a group applies at all (facial hair only for men, hair colour hidden under a hijab). */
export function groupVisible(groupId: GroupId, sel: Selection): boolean {
  const g = groupById(groupId);
  if (g.only && g.only !== genderOf(sel)) return false;
  if (groupId === "hairColor" && (sel.hair[0] === "hijab" || sel.hair[0] === "bald")) return false;
  return true;
}

/** Drops options that are no longer allowed (tier/gender changes) and refills single-choice groups. */
export function normalize(sel: Selection, tier: Tier): Selection {
  const next = { ...sel } as Record<GroupId, string[]>;
  for (const g of GROUPS) {
    const allowed = new Set(visibleOptions(g.id, tier, next as Selection).map((o) => o.id));
    let picked = next[g.id].filter((id) => allowed.has(id));
    if (g.max === 1 && picked.length === 0) {
      const fallback = (DEFAULT_SELECTION[g.id] as string[])[0];
      picked = [fallback && allowed.has(fallback) ? fallback : [...allowed][0]!];
    }
    next[g.id] = picked;
  }
  return next as Selection;
}

/** Toggle an option, enforcing max-per-group, one-per-slot and exclusive options. */
export function toggle(sel: Selection, groupId: GroupId, optionId: string, tier: Tier): Selection {
  const g = groupById(groupId);
  const current = sel[groupId] as string[];
  let picked: string[];
  if (g.max === 1) {
    picked = [optionId];
  } else if (current.includes(optionId)) {
    picked = current.filter((id) => id !== optionId);
  } else {
    const opt = g.options.find((o: AnyOption) => o.id === optionId) as AnyOption | undefined;
    picked = current.filter((id) => {
      const other = g.options.find((o: AnyOption) => o.id === id) as AnyOption | undefined;
      if (opt?.exclusive || other?.exclusive) return false;
      return !(opt?.slot && other?.slot === opt.slot);
    });
    picked = [...picked, optionId].slice(-g.max);
  }
  return normalize({ ...sel, [groupId]: picked } as Selection, tier);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Random coherent character for the given character type. */
export function randomize(tier: Tier, base: Selection = DEFAULT_SELECTION): Selection {
  let sel = { ...base } as Record<GroupId, string[]>;
  for (const g of GROUPS) {
    const options = visibleOptions(g.id, tier, sel as Selection).filter((o) => !o.exclusive);
    if (g.max === 1) sel[g.id] = [pick(options).id];
    else {
      const count = Math.floor(Math.random() * Math.min(3, g.max + 1));
      sel = { ...sel, [g.id]: [] };
      for (let i = 0; i < count; i++) sel = toggle(sel as Selection, g.id, pick(options).id, tier) as Record<GroupId, string[]>;
    }
  }
  return normalize(sel as Selection, tier);
}

// ---------------------------------------------------------------------------
// Prompt composition
// ---------------------------------------------------------------------------

export type OutputKind = "sheet" | "portrait";

export const SCENES = {
  studio: "in a clean photo studio with soft key light",
  city: "on a modern city street at dusk",
  desert: "in the desert dunes at golden hour",
  majlis: "in an elegant modern majlis",
  cafe: "in a stylish specialty café",
  beach: "on a sunlit beach",
  interior: "in a luxury penthouse interior",
} as const;
export type SceneKey = keyof typeof SCENES;

const TIER_LOOK: Record<Tier, string> = {
  average: "natural, believable everyday look of a social media creator",
  bold: "striking fashion-editorial casting look with distinctive yet photoreal features",
  extreme: "avant-garde casting look with exaggerated, surreal yet photoreal features and proportions",
};

function phrase<G extends GroupId>(sel: Selection, groupId: G): string[] {
  const g = groupById(groupId);
  return (sel[groupId] as string[])
    .map((id) => (g.options.find((o: AnyOption) => o.id === id) as AnyOption | undefined)?.en ?? "")
    .filter(Boolean);
}
const one = <G extends GroupId>(sel: Selection, groupId: G) => phrase(sel, groupId)[0] ?? "";
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

function styling(sel: Selection, gender: "female" | "male" | "neutral"): string {
  const style = sel.style[0];
  const outfit = style === "modest" || style === "khaleeji" ? GENDERED_STYLE[style][gender] : one(sel, "style");
  const hairId = sel.hair[0];
  const hair =
    hairId === "hijab" ? "wearing an elegant hijab" : hairId === "bald" ? "with a bald head" : `with ${one(sel, "hair")} in ${one(sel, "hairColor")}`;
  const acc = phrase(sel, "accessories");
  return [hair, `dressed in ${outfit}`, acc.length ? `accessorised with ${list(acc)}` : ""].filter(Boolean).join(", ");
}

function framing(output: OutputKind, scene: SceneKey, expression: string): string {
  return output === "sheet"
    ? `Character reference sheet with two panels side by side: left a tight front-facing close-up portrait with the whole head and hair in frame, right a full-body front-facing standing shot, arms relaxed, ${expression}. Pure white seamless background, bright soft even light`
    : `Full-body fashion portrait ${SCENES[scene]}, natural pose, looking at the camera with ${expression}`;
}

const FINISH = "Hyper-realistic photo, natural skin texture, crisp detail, 85mm lens, sharp focus";

export function composeCharacterPrompt(sel: Selection, tier: Tier, output: OutputKind, scene: SceneKey): string {
  const gender = genderOf(sel);
  const person = `${one(sel, "ethnicity")} ${one(sel, "gender")} ${one(sel, "age")} with ${one(sel, "skin")} skin`;
  const face = [
    `${one(sel, "head")} face shape`,
    `${one(sel, "eyeShape")} ${one(sel, "eyeColor")} eyes`,
    ...phrase(sel, "features"),
    ...(gender === "male" ? phrase(sel, "facialHair") : []),
    ...phrase(sel, "distinctive"),
  ];
  const body = [`${one(sel, "height")}, ${one(sel, "build")} build`, ...phrase(sel, "proportions"), ...phrase(sel, "neck")];
  return [
    `${framing(output, scene, one(sel, "expression"))}. Photorealistic photo with a ${TIER_LOOK[tier]}: a ${person}`,
    `Face: ${list(face)}`,
    `Body: ${list(body)}`,
    `Styling: ${styling(sel, gender)}`,
    FINISH,
  ].join(". ");
}

/** Prompt for a trained Soul ID character: the reference supplies the identity, we add styling only. */
export function composeSoulIdPrompt(sel: Selection, output: OutputKind, scene: SceneKey): string {
  const body = [`${one(sel, "height")}, ${one(sel, "build")} build`, ...phrase(sel, "proportions")];
  return [`${framing(output, scene, one(sel, "expression"))}. Photorealistic photo of the character`, `Body: ${list(body)}`, `Styling: ${styling(sel, "neutral")}`, FINISH].join(". ");
}

// ---------------------------------------------------------------------------
// Visual pickers: photo cards for visual groups, colour swatches for colour groups
// ---------------------------------------------------------------------------

/** Groups shown as photo cards (photos in /public/influencer/options/<group>/<option>.webp, see option-photos.ts). */
export const PHOTO_GROUPS: ReadonlySet<GroupId> = new Set<GroupId>([
  "gender", "expression", "ethnicity", "age", "facialHair", "distinctive", "build", "hair", "style", "accessories",
]);

/**
 * Swatch colours for colour groups. Data, not styling tokens (documented exception to the
 * no-raw-hex rule, like the three.js scene constants): they depict skin/eye/hair colours.
 */
export const SWATCHES: Partial<Record<GroupId, Record<string, string>>> = {
  skin: { porcelain: "#f6e3d7", fair: "#efd0b8", light: "#e2b48f", olive: "#c39a6b", tan: "#b07a4c", brown: "#8a5a36", deep: "#5e3b22", ebony: "#3a2416" },
  eyeColor: { black: "#1b1512", brown: "#5a3a1e", hazel: "#8a6a32", green: "#4f7a45", blue: "#3f6fb0", iceBlue: "#a9cfe8", amber: "#c78a2c", grey: "#8a9097" },
  hairColor: {
    black: "#141414", darkBrown: "#3b2619", chestnut: "#6b3b22", ginger: "#b5561f", red: "#9e1f1f", blonde: "#d9b56a", platinum: "#e9e4d6",
    grey: "#9a9a9a", white: "#f2f2f2", pink: "#f2a9c4", lilac: "#c3a5e0", blue: "#3d6fd1", green: "#3f9e6b",
  },
};
