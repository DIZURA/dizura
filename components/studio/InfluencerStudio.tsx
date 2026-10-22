"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { Studio, type Idea } from "./Studio";

type OptionKey = keyof ReturnType<typeof useI18n>["t"]["influencer"]["options"];

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

type Traits = { gender: "female" | "male"; age: string; origin: string; hair: string; hairColor: string; outfit: string; setting: string };

export function composeInfluencerPrompt(t: Traits): string {
  const person = t.gender === "female" ? "woman" : "man";
  const hair = t.hair === "hijab" ? "wearing an elegant hijab" : `${HAIR[t.hair]} ${t.hairColor} hair`;
  const outfit = GENDERED_OUTFIT[t.outfit]?.[t.gender] ?? OUTFIT[t.outfit];
  return `Photorealistic ${t.age}-year-old ${ORIGIN[t.origin]} ${person}, social media influencer, ${hair}, wearing ${outfit}, ${SETTING[t.setting]}. Consistent character, natural skin texture, sharp focus, 85mm lens`;
}

const GROUPS = [
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

export function InfluencerStudio({ ideas }: { ideas: Idea[] }) {
  const { t } = useI18n();
  const [traits, setTraits] = useState<Traits>({
    gender: "female", age: "25-34", origin: "gulf", hair: "hijab", hairColor: "black", outfit: "modest", setting: "studio",
  });

  const set = (key: keyof Traits, value: string) =>
    setTraits((prev) => {
      const next = { ...prev, [key]: value } as Traits;
      if (next.gender === "male" && next.hair === "hijab") next.hair = "short";
      return next;
    });

  const prompt = composeInfluencerPrompt(traits);

  const aside = (
    <div className="flex flex-col divide-y divide-ink-700/60">
      {GROUPS.map((group, gi) => (
        <fieldset key={group.section} className="p-5">
          <legend className="sr-only">{t.influencer[group.section]}</legend>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-100">
            <span className="grid size-5 place-items-center rounded-full bg-ember-500/15 text-[11px] text-ember-300">{gi + 1}</span>
            {t.influencer[group.section]}
          </p>
          <div className="flex flex-col gap-3">
            {group.fields.map((field) => {
              const hidden = field.key === "hairColor" && traits.hair === "hijab";
              if (hidden) return null;
              return (
                <div key={field.key} role="radiogroup" aria-label={t.influencer[field.key]}>
                  <p className="mb-1.5 text-xs text-ink-500">{t.influencer[field.key]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {field.options
                      .filter((o) => !(o === "hijab" && traits.gender === "male"))
                      .map((o) => {
                        const selected = traits[field.key] === o;
                        return (
                          <button
                            key={o}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => set(field.key, o)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs transition",
                              selected ? "border-ember-500 bg-ember-500/10 text-ember-300" : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100",
                            )}
                          >
                            {t.influencer.options[o as OptionKey]}
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <details className="group p-5">
        <summary className="cursor-pointer list-none text-xs font-semibold text-ink-300 hover:text-ink-100">
          {t.influencer.preview} <span aria-hidden className="inline-block transition group-open:rotate-90 rtl:-scale-x-100">›</span>
        </summary>
        <p dir="ltr" className="mt-2 rounded-xl bg-ink-850 p-3 text-xs leading-relaxed text-ink-300">{prompt}</p>
      </details>
    </div>
  );

  return <Studio workspace="ai-influencer" kinds={["image", "video"]} basePrompt={prompt} promptOptional ideas={ideas} aside={aside} />;
}
