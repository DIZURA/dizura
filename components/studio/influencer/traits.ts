/**
 * AI Influencer character builder: trait catalogue, selection rules and prompt composer.
 * Pure + client-safe. Labels live in the i18n dictionary (`builder.opts`); the English
 * phrases here are what the model receives (models follow English prompts most reliably).
 */
import type { Dictionary } from "@/lib/i18n/dictionaries";

export type Tier = "average" | "bold" | "extreme";
export const TIERS: readonly Tier[] = ["average", "bold", "extreme"];

export type Tab = "builder" | "face" | "body" | "style";

/** What the character is. "original" exists only in photo mode ("as in the photo"). */
export type Kind = "original" | "human" | "animal" | "alien" | "robot" | "fantasy";
/**
 * Where the identity comes from: the builder ("new"), a trained DIZURA ID ("soul") or one
 * uploaded reference photo ("photo"). Soul/photo modes hide the identity groups.
 */
export type IdentityMode = "new" | "soul" | "photo";
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
  /** Only offered in photo mode (e.g. "As in photo", "Keep outfit from photo"). */
  photoOnly?: true;
};
type Group = {
  id: string;
  tab: Tab;
  max: number;
  /** Group describes identity and is taken from the Soul ID / photo instead when one is used. */
  identity?: true;
  /** Picks what the character is (kind + its variants): hidden for a DIZURA ID. */
  transform?: true;
  /** Only for these kinds (default: every kind). */
  kinds?: readonly Kind[];
  only?: "female" | "male";
  options: readonly Option[];
};

export const GROUPS = [
  // ---- Builder -------------------------------------------------------------
  { id: "kind", tab: "builder", max: 1, transform: true, options: [
    { id: "original", en: "", photoOnly: true }, { id: "human", en: "" }, { id: "animal", en: "" },
    { id: "alien", en: "" }, { id: "robot", en: "" }, { id: "fantasy", en: "" },
  ] },
  { id: "animal", tab: "builder", max: 1, transform: true, kinds: ["animal"], options: [
    { id: "cat", en: "cat" }, { id: "dog", en: "dog" }, { id: "lion", en: "majestic lion" }, { id: "tiger", en: "tiger" },
    { id: "falcon", en: "falcon" }, { id: "camel", en: "camel" }, { id: "horse", en: "Arabian horse" }, { id: "fox", en: "red fox" },
    { id: "wolf", en: "wolf" }, { id: "panda", en: "panda" }, { id: "owl", en: "owl" }, { id: "rabbit", en: "rabbit" },
  ] },
  { id: "animalForm", tab: "builder", max: 1, transform: true, kinds: ["animal"], options: [
    { id: "anthro", en: "anthropomorphic" }, { id: "natural", en: "natural" },
  ] },
  { id: "alien", tab: "builder", max: 1, transform: true, kinds: ["alien"], options: [
    { id: "cosmic", en: "an elegant humanoid alien with softly glowing iridescent skin and luminous eyes" },
    { id: "grey", en: "a classic grey alien with a large head and big black almond eyes" },
    { id: "reptilian", en: "a reptilian alien with fine iridescent scales" },
    { id: "crystal", en: "a crystalline alien whose body is made of translucent faceted crystal" },
    { id: "insectoid", en: "an insectoid alien with a glossy exoskeleton and compound eyes" },
    { id: "aquatic", en: "an aquatic alien with translucent fins and bioluminescent markings" },
  ] },
  { id: "robot", tab: "builder", max: 1, transform: true, kinds: ["robot"], options: [
    { id: "android", en: "a sleek humanoid android with a polished white and chrome body" },
    { id: "retro", en: "a charming retro tin robot with rivets and dials" },
    { id: "mech", en: "a heavy armoured battle mech robot" },
    { id: "cyborg", en: "a cyborg, half human and half machine, with visible mechanical parts" },
    { id: "companion", en: "a cute rounded companion robot with an expressive screen face" },
  ] },
  { id: "fantasy", tab: "builder", max: 1, transform: true, kinds: ["fantasy"], options: [
    { id: "elf", en: "elf with pointed ears and ethereal features" }, { id: "fairy", en: "fairy with delicate translucent wings" },
    { id: "mermaid", en: "merperson with a shimmering fish tail" }, { id: "vampire", en: "vampire with pale skin and an elegant gothic air" },
    { id: "genie", en: "genie with glowing magical aura" }, { id: "dragonkin", en: "dragon-born humanoid with horns and patches of scales" },
  ] },
  { id: "look", tab: "builder", max: 1, options: [
    { id: "photoreal", en: "" }, { id: "film3d", en: "" }, { id: "anime", en: "" }, { id: "clay", en: "" }, { id: "comic", en: "" },
  ] },
  { id: "gender", tab: "builder", max: 1, identity: true, kinds: ["human", "fantasy"], options: [
    { id: "female", en: "woman" }, { id: "male", en: "man" },
  ] },
  { id: "expression", tab: "builder", max: 1, options: [
    { id: "neutral", en: "a calm, neutral expression" }, { id: "smile", en: "a warm, natural smile" },
    { id: "laugh", en: "laughing joyfully" }, { id: "confident", en: "a confident, self-assured look" },
    { id: "serious", en: "a serious, intense gaze" }, { id: "playful", en: "a playful, cheeky grin" },
    { id: "surprised", en: "a surprised, wide-eyed expression" }, { id: "dreamy", en: "a soft, dreamy gaze" },
  ] },
  { id: "ethnicity", tab: "builder", max: 1, identity: true, kinds: ["human"], options: [
    { id: "gulf", en: "Gulf Arab" }, { id: "levant", en: "Levantine Arab" }, { id: "northAfrica", en: "North African" },
    { id: "african", en: "African" }, { id: "southAsian", en: "South Asian" }, { id: "eastAsian", en: "East Asian" },
    { id: "european", en: "European" }, { id: "mixed", en: "mixed-heritage" },
  ] },
  { id: "age", tab: "builder", max: 1, identity: true, kinds: ["human", "fantasy"], options: [
    { id: "young", en: "in their early twenties" }, { id: "adult", en: "in their thirties" },
    { id: "mature", en: "in their late forties" }, { id: "senior", en: "in their late sixties" },
  ] },
  { id: "skin", tab: "builder", max: 1, identity: true, kinds: ["human"], options: [
    { id: "porcelain", en: "porcelain" }, { id: "fair", en: "fair" }, { id: "light", en: "light" }, { id: "olive", en: "olive" },
    { id: "tan", en: "warm tan" }, { id: "brown", en: "brown" }, { id: "deep", en: "deep brown" }, { id: "ebony", en: "ebony" },
  ] },
  // ---- Face ----------------------------------------------------------------
  { id: "head", tab: "face", max: 1, identity: true, kinds: ["human"], options: [
    { id: "oval", en: "oval" }, { id: "long", en: "long" }, { id: "round", en: "round" }, { id: "square", en: "square-jawed" },
    { id: "heart", en: "heart-shaped" }, { id: "tiny", en: "unusually small", bold: true }, { id: "forehead", en: "high-foreheaded", bold: true },
  ] },
  { id: "eyeShape", tab: "face", max: 1, identity: true, kinds: ["human"], options: [
    { id: "almond", en: "almond-shaped" }, { id: "round", en: "round" }, { id: "monolid", en: "monolid" }, { id: "large", en: "large" },
    { id: "hooded", en: "hooded" }, { id: "upturned", en: "upturned" }, { id: "downturned", en: "downturned" },
    { id: "close", en: "close-set", bold: true }, { id: "wide", en: "wide-set", bold: true }, { id: "huge", en: "huge doll-like", bold: true },
  ] },
  { id: "eyeColor", tab: "face", max: 1, identity: true, options: [
    { id: "black", en: "black" }, { id: "brown", en: "brown" }, { id: "hazel", en: "hazel" }, { id: "green", en: "green" },
    { id: "blue", en: "blue" }, { id: "iceBlue", en: "ice-blue" }, { id: "amber", en: "amber" }, { id: "grey", en: "grey" },
  ] },
  { id: "features", tab: "face", max: 4, identity: true, kinds: ["human"], options: [
    { id: "freckles", en: "freckles", slot: "marks" }, { id: "dimples", en: "dimples", slot: "cheeks" },
    { id: "cheekbones", en: "high cheekbones", slot: "cheeks" }, { id: "fullLips", en: "full lips", slot: "lips" },
    { id: "thickBrows", en: "thick brows", slot: "brows" }, { id: "beautyMark", en: "a beauty mark", slot: "marks" },
    { id: "tinyNose", en: "a tiny nose", slot: "nose" }, { id: "wideMouth", en: "a wide mouth", slot: "lips" },
    { id: "pointyChin", en: "a pointy chin", slot: "chin" }, { id: "eyeBags", en: "heavy under-eye bags", slot: "eyes" },
    { id: "buttonNose", en: "a button nose", slot: "nose", bold: true }, { id: "unibrow", en: "a unibrow", slot: "brows", bold: true },
    { id: "gapTeeth", en: "a gap between the front teeth", slot: "teeth", bold: true }, { id: "jugEars", en: "jug ears", slot: "ears", bold: true },
    { id: "bigForehead", en: "a big forehead", slot: "forehead", bold: true },
  ] },
  { id: "facialHair", tab: "face", max: 1, identity: true, kinds: ["human"], only: "male", options: [
    { id: "clean", en: "clean-shaven" }, { id: "stubble", en: "light stubble" }, { id: "beard", en: "a full groomed beard" },
    { id: "goatee", en: "a goatee" }, { id: "moustache", en: "a moustache" }, { id: "pushBroom", en: "a thick push-broom moustache", bold: true },
  ] },
  { id: "distinctive", tab: "face", max: 2, identity: true, kinds: ["human"], options: [
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
  { id: "proportions", tab: "body", max: 2, kinds: ["human"], options: [
    { id: "longLimbs", en: "long limbs" }, { id: "shortLegs", en: "short legs" }, { id: "shoulders", en: "broad shoulders" },
    { id: "waist", en: "a tiny waist" }, { id: "egg", en: "a round egg-shaped body", bold: true },
  ] },
  { id: "neck", tab: "body", max: 1, identity: true, kinds: ["human"], options: [
    { id: "standard", en: "" }, { id: "short", en: "a short neck" }, { id: "long", en: "an extremely long neck", bold: true },
    { id: "column", en: "a thick column neck", bold: true },
  ] },
  // ---- Style ---------------------------------------------------------------
  { id: "hair", tab: "style", max: 1, kinds: ["human", "fantasy"], options: [
    { id: "hijab", en: "hijab", only: "female" }, { id: "long", en: "long flowing hair" }, { id: "short", en: "short hair" },
    { id: "braids", en: "braided hair" }, { id: "afro", en: "an afro" }, { id: "buzz", en: "a buzz cut" }, { id: "bald", en: "a bald head" },
    { id: "bowl", en: "a bowl cut" }, { id: "mullet", en: "a mullet" }, { id: "pigtails", en: "pigtails" }, { id: "mohawk", en: "a mohawk" },
    { id: "bob", en: "a sharp bob", bold: true }, { id: "beehive", en: "a towering beehive", bold: true }, { id: "perm", en: "a tight dome perm", bold: true },
    { id: "hairHorns", en: "hair sculpted into two horns", bold: true }, { id: "curlSphere", en: "hair shaped into a perfect curl sphere", bold: true },
  ] },
  { id: "hairColor", tab: "style", max: 1, kinds: ["human", "fantasy"], options: [
    { id: "black", en: "jet-black" }, { id: "darkBrown", en: "dark brown" }, { id: "chestnut", en: "chestnut" }, { id: "ginger", en: "ginger" },
    { id: "red", en: "red" }, { id: "blonde", en: "blonde" }, { id: "platinum", en: "platinum" }, { id: "grey", en: "grey" },
    { id: "white", en: "white" }, { id: "pink", en: "pastel pink" }, { id: "lilac", en: "lilac" }, { id: "blue", en: "blue" }, { id: "green", en: "green" },
  ] },
  { id: "style", tab: "style", max: 1, options: [
    { id: "asPhoto", en: "", photoOnly: true }, { id: "modest", en: "" }, { id: "khaleeji", en: "" }, { id: "luxury", en: "luxury designer fashion" },
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
  kind: ["human"], animal: ["cat"], animalForm: ["anthro"], alien: ["cosmic"], robot: ["android"], fantasy: ["elf"], look: ["photoreal"],
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

/** The kind that drives visibility/prompting (a DIZURA ID is always a person). */
export function kindOf(sel: Selection, mode: IdentityMode = "new"): Kind {
  return mode === "soul" ? "human" : (sel.kind[0] ?? "human");
}

/** Options shown for a group given the character type, gender and identity mode. */
export function visibleOptions(groupId: GroupId, tier: Tier, sel: Selection, mode: IdentityMode = "new"): readonly AnyOption[] {
  const gender = genderOf(sel);
  return groupById(groupId).options.filter(
    (o: AnyOption) => (tier !== "average" || !o.bold) && (!o.only || o.only === gender) && (!o.photoOnly || mode === "photo"),
  );
}

/**
 * Whether a group applies at all: identity groups are hidden for a DIZURA ID / photo, groups
 * are limited to their kinds, facial hair only for men, hair colour hidden under a hijab.
 */
export function groupVisible(groupId: GroupId, sel: Selection, mode: IdentityMode = "new"): boolean {
  const g = groupById(groupId);
  const kind = kindOf(sel, mode);
  if (mode !== "new" && g.identity) return false;
  if (mode === "soul" && g.transform) return false;
  if (mode === "photo" && (groupId === "hair" || groupId === "hairColor")) return false;
  if (g.kinds && !(g.kinds as readonly Kind[]).includes(kind)) return false;
  if (kind === "animal" && sel.animalForm[0] === "natural" && (groupId === "style" || groupId === "height")) return false;
  if (g.only && g.only !== genderOf(sel)) return false;
  if (groupId === "hairColor" && (sel.hair[0] === "hijab" || sel.hair[0] === "bald")) return false;
  return true;
}

/** Drops options that are no longer allowed (tier/gender/mode changes) and refills single-choice groups. */
export function normalize(sel: Selection, tier: Tier, mode: IdentityMode = "new"): Selection {
  const next = { ...sel } as Record<GroupId, string[]>;
  for (const g of GROUPS) {
    const allowed = new Set(visibleOptions(g.id, tier, next as Selection, mode).map((o) => o.id));
    let picked = next[g.id].filter((id) => allowed.has(id));
    if (g.max === 1 && picked.length === 0) {
      const fallback = (DEFAULT_SELECTION[g.id] as string[])[0];
      picked = [fallback && allowed.has(fallback) ? fallback : [...allowed][0]!];
    }
    next[g.id] = picked;
  }
  return next as Selection;
}

/** Photo mode starts from "as in the photo": same subject, same outfit, nothing added. */
export function photoDefaults(sel: Selection, tier: Tier): Selection {
  return normalize({ ...sel, kind: ["original"], style: ["asPhoto"], accessories: ["none"] }, tier, "photo");
}

/** Toggle an option, enforcing max-per-group, one-per-slot and exclusive options. */
export function toggle(sel: Selection, groupId: GroupId, optionId: string, tier: Tier, mode: IdentityMode = "new"): Selection {
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
  return normalize({ ...sel, [groupId]: picked } as Selection, tier, mode);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Random coherent character for the given character type (keeps the chosen kind and look). */
export function randomize(tier: Tier, base: Selection = DEFAULT_SELECTION, mode: IdentityMode = "new"): Selection {
  let sel = { ...base } as Record<GroupId, string[]>;
  for (const g of GROUPS) {
    if (g.id === "kind" || g.id === "look") continue;
    const options = visibleOptions(g.id, tier, sel as Selection, mode).filter((o) => !o.exclusive && !o.photoOnly);
    if (g.max === 1) sel[g.id] = [pick(options).id];
    else {
      const count = Math.floor(Math.random() * Math.min(3, g.max + 1));
      sel = { ...sel, [g.id]: [] };
      for (let i = 0; i < count; i++) sel = toggle(sel as Selection, g.id, pick(options).id, tier, mode) as Record<GroupId, string[]>;
    }
  }
  return normalize(sel as Selection, tier, mode);
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
/** Character-type flavour for non-human characters. */
const TIER_DESIGN: Record<Tier, string> = {
  average: "appealing, believable character design",
  bold: "striking, distinctive character design",
  extreme: "exaggerated, surreal character design",
};

type LookId = OptionId<"look">;
/** Render style: how the image opens and the finishing quality line. */
const LOOKS: Record<LookId, { lead: string; finish: string }> = {
  photoreal: { lead: "Photorealistic photo", finish: "Hyper-realistic photo, lifelike textures, crisp detail, 85mm lens, sharp focus" },
  film3d: { lead: "3D animated feature-film character render", finish: "Stylised 3D animation look, expressive appealing proportions, soft global illumination, rich detail" },
  anime: { lead: "High-quality anime illustration", finish: "Anime art style, clean line art, cel shading, vibrant colours" },
  clay: { lead: "Claymation character photo", finish: "Handcrafted clay stop-motion look, visible clay texture, miniature set lighting" },
  comic: { lead: "Comic-book illustration", finish: "Bold comic-book style, confident ink outlines, halftone shading, dynamic colours" },
};
const lookOf = (sel: Selection) => LOOKS[(sel.look[0] ?? "photoreal") as LookId];

function phrase<G extends GroupId>(sel: Selection, groupId: G): string[] {
  const g = groupById(groupId);
  return (sel[groupId] as string[])
    .map((id) => (g.options.find((o: AnyOption) => o.id === id) as AnyOption | undefined)?.en ?? "")
    .filter(Boolean);
}
const one = <G extends GroupId>(sel: Selection, groupId: G) => phrase(sel, groupId)[0] ?? "";
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

function styling(sel: Selection, gender: "female" | "male" | "neutral", withHair: boolean): string {
  const style = sel.style[0];
  const outfit =
    style === "asPhoto" ? "the same outfit as in the reference photo"
    : style === "modest" || style === "khaleeji" ? GENDERED_STYLE[style][gender]
    : one(sel, "style");
  const hairId = sel.hair[0];
  const hair = !withHair
    ? ""
    : hairId === "hijab" ? "wearing an elegant hijab" : hairId === "bald" ? "with a bald head" : `with ${one(sel, "hair")} in ${one(sel, "hairColor")}`;
  const acc = phrase(sel, "accessories");
  return [hair, `dressed in ${outfit}`, acc.length ? `accessorised with ${list(acc)}` : ""].filter(Boolean).join(", ");
}

function framing(output: OutputKind, scene: SceneKey, expression: string): string {
  return output === "sheet"
    ? `Character reference sheet with two panels side by side: left a tight front-facing close-up portrait with the whole head in frame, right a full-body front-facing standing shot, ${expression}. Pure white seamless background, bright soft even light`
    : `Full-body portrait ${SCENES[scene]}, natural pose, looking at the camera with ${expression}`;
}

const FINISH = "Hyper-realistic photo, natural skin texture, crisp detail, 85mm lens, sharp focus";

/** Who/what the (non-human) character is. */
function subject(sel: Selection, kind: Kind): string {
  switch (kind) {
    case "animal":
      return sel.animalForm[0] === "natural"
        ? `a ${one(sel, "animal")}`
        : `an anthropomorphic ${one(sel, "animal")} character standing upright with human-like posture`;
    case "alien":
      return one(sel, "alien");
    case "robot":
      return one(sel, "robot");
    case "fantasy":
      return `a ${genderOf(sel)} ${one(sel, "fantasy")}, ${one(sel, "age")}`;
    default:
      return `a ${one(sel, "ethnicity")} ${one(sel, "gender")} ${one(sel, "age")} with ${one(sel, "skin")} skin`;
  }
}

/** Body + styling lines for a non-human character. */
function creatureDetails(sel: Selection, kind: Kind): string[] {
  const natural = kind === "animal" && sel.animalForm[0] === "natural";
  const acc = phrase(sel, "accessories");
  return [
    `Eyes: ${one(sel, "eyeColor")}`,
    natural ? `Body: ${one(sel, "build")} build` : `Body: ${one(sel, "height")}, ${one(sel, "build")} build`,
    natural
      ? acc.length ? `Wearing ${list(acc)}` : ""
      : `Styling: ${styling(sel, kind === "fantasy" ? genderOf(sel) : "neutral", kind === "fantasy")}`,
  ].filter(Boolean);
}

export function composeCharacterPrompt(sel: Selection, tier: Tier, output: OutputKind, scene: SceneKey): string {
  const kind = kindOf(sel);
  const look = lookOf(sel);
  const opening = framing(output, scene, one(sel, "expression"));
  if (kind !== "human") {
    return [`${opening}. ${look.lead} with an ${TIER_DESIGN[tier]}: ${subject(sel, kind)}`, ...creatureDetails(sel, kind), look.finish].join(". ");
  }
  const gender = genderOf(sel);
  const face = [
    `${one(sel, "head")} face shape`,
    `${one(sel, "eyeShape")} ${one(sel, "eyeColor")} eyes`,
    ...phrase(sel, "features"),
    ...(gender === "male" ? phrase(sel, "facialHair") : []),
    ...phrase(sel, "distinctive"),
  ];
  const body = [`${one(sel, "height")}, ${one(sel, "build")} build`, ...phrase(sel, "proportions"), ...phrase(sel, "neck")];
  return [
    `${opening}. ${look.lead} with a ${TIER_LOOK[tier]}: ${subject(sel, kind)}`,
    `Face: ${list(face)}`,
    `Body: ${list(body)}`,
    `Styling: ${styling(sel, gender, true)}`,
    sel.look[0] === "photoreal" ? FINISH : look.finish,
  ].join(". ");
}

/** Prompt for a trained Soul ID character: the reference supplies the identity, we add styling only. */
export function composeSoulIdPrompt(sel: Selection, output: OutputKind, scene: SceneKey): string {
  const look = lookOf(sel);
  const body = [`${one(sel, "height")}, ${one(sel, "build")} build`, ...phrase(sel, "proportions")];
  return [
    `${framing(output, scene, one(sel, "expression"))}. ${look.lead} of the character`,
    `Body: ${list(body)}`,
    `Styling: ${styling(sel, "neutral", true)}`,
    sel.look[0] === "photoreal" ? FINISH : look.finish,
  ].join(". ");
}

/**
 * Prompt for a character made from one reference photo (a person, pet, toy, mascot…): keep the
 * subject recognisable, either as photographed ("original") or reimagined as another kind.
 */
export function composePhotoPrompt(sel: Selection, tier: Tier, output: OutputKind, scene: SceneKey): string {
  const kind = kindOf(sel, "photo");
  const look = lookOf(sel);
  const opening = framing(output, scene, one(sel, "expression"));
  const keep = "Keep the subject from the reference photo clearly recognisable: same face, features, colouring and distinctive markings";
  if (kind === "original") {
    const acc = phrase(sel, "accessories");
    const extra = sel.style[0] !== "asPhoto" ? styling(sel, "neutral", false) : acc.length ? `accessorised with ${list(acc)}` : "";
    return [`${opening}. ${look.lead} of the exact same subject as in the reference photo`, keep, extra ? `Styling: ${extra}` : "", look.finish]
      .filter(Boolean)
      .join(". ");
  }
  const details = kind === "human" ? [`Body: ${one(sel, "height")}, ${one(sel, "build")} build`, `Styling: ${styling(sel, "neutral", false)}`] : creatureDetails(sel, kind);
  return [`${opening}. ${look.lead} with an ${TIER_DESIGN[tier]}: reimagine the subject of the reference photo as ${kind === "human" ? "a human" : subject(sel, kind)}`, keep, ...details, look.finish].join(". ");
}

// ---------------------------------------------------------------------------
// Visual pickers: photo cards for visual groups, colour swatches for colour groups
// ---------------------------------------------------------------------------

/** Groups shown as photo cards (photos in /public/influencer/options/<group>/<option>.webp, see option-photos.ts). */
export const PHOTO_GROUPS: ReadonlySet<GroupId> = new Set<GroupId>([
  "kind", "animal", "alien", "robot", "fantasy", "look", "gender", "expression", "ethnicity", "age", "facialHair", "distinctive", "build", "hair", "style", "accessories",
]);

/** Placeholder glyphs for option cards that have no photo yet (kinds, creatures, looks). */
export const GLYPHS: Partial<Record<GroupId, Record<string, string>>> = {
  kind: { original: "📷", human: "🧑", animal: "🦁", alien: "👽", robot: "🤖", fantasy: "🧝" },
  animal: { cat: "🐱", dog: "🐶", lion: "🦁", tiger: "🐯", falcon: "🦅", camel: "🐪", horse: "🐴", fox: "🦊", wolf: "🐺", panda: "🐼", owl: "🦉", rabbit: "🐰" },
  alien: { cosmic: "✨", grey: "👽", reptilian: "🦎", crystal: "💎", insectoid: "🪲", aquatic: "🐙" },
  robot: { android: "🤖", retro: "📻", mech: "🦾", cyborg: "⚙️", companion: "🫧" },
  fantasy: { elf: "🧝", fairy: "🧚", mermaid: "🧜", vampire: "🧛", genie: "🧞", dragonkin: "🐉" },
  look: { photoreal: "📷", film3d: "🎬", anime: "🌸", clay: "🧸", comic: "💥" },
  style: { asPhoto: "📷" },
};

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
