"use client";

import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { GROUPS, type Traits } from "./traits";

type OptionKey = keyof ReturnType<typeof useI18n>["t"]["influencer"]["options"];
type Field = { key: keyof Traits; options: readonly string[] };

const FIELDS: readonly Field[] = (GROUPS as readonly { fields: readonly Field[] }[]).flatMap((group) => group.fields);

/** Compact trait chips, grouped Identity → Look → Style → Scene. */
export function TraitBuilder({ traits, onChange }: { traits: Traits; onChange: (key: keyof Traits, value: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {FIELDS.map((field) => {
        if (field.key === "hairColor" && traits.hair === "hijab") return null;
        return (
          <div key={field.key} role="radiogroup" aria-label={t.influencer[field.key]} className={cn(field.key === "origin" && "sm:col-span-2")}>
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
                      onClick={() => onChange(field.key, o)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        selected
                          ? "border-mint-500/70 bg-mint-500/10 text-mint-300 shadow-[0_0_14px_-4px_var(--color-mint-500)]"
                          : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100",
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
  );
}
