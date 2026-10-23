"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { GROUPS, groupVisible, TABS, TIERS, toggle, visibleOptions, type GroupId, type Selection, type Tab, type Tier } from "./traits";

/**
 * Character builder: character type (Average / Bold / Extreme) + 18 trait groups in
 * Builder · Face · Body · Style tabs. With a Soul ID the identity groups are hidden.
 */
export function CharacterBuilder({
  tier,
  onTier,
  selection,
  onSelection,
  soulLocked,
}: {
  tier: Tier;
  onTier: (tier: Tier) => void;
  selection: Selection;
  onSelection: (next: Selection) => void;
  soulLocked: boolean;
}) {
  const { t, locale } = useI18n();
  const b = t.builder;
  const nf = new Intl.NumberFormat(locale);
  const baseId = useId();
  const [tab, setTab] = useState<Tab>("builder");

  const groups = GROUPS.filter((g) => g.tab === tab && !(soulLocked && "identity" in g) && groupVisible(g.id, selection));

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const step = (e.key === "ArrowRight") !== rtl ? 1 : -1;
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length]!;
    setTab(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  }

  return (
    <div>
      <p className="mb-2.5 text-sm font-semibold text-ink-100">{b.tiersLabel}</p>
      <div role="radiogroup" aria-label={b.tiersLabel} className="grid grid-cols-3 gap-2">
        {TIERS.map((key, i) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={tier === key}
            onClick={() => onTier(key)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 text-start transition",
              tier === key ? "border-mint-500 bg-mint-500/10 shadow-[0_0_22px_-8px_var(--color-mint-500)]" : "border-ink-700/70 hover:border-ink-500",
            )}
          >
            <span aria-hidden className="mb-2 flex gap-0.5">
              {TIERS.map((_, dot) => (
                <span key={dot} className={cn("h-1 w-4 rounded-full", dot <= i ? "bg-mint-500" : "bg-ink-700")} />
              ))}
            </span>
            <span className={cn("block text-sm font-semibold", tier === key ? "text-mint-300" : "text-ink-100")}>{b.tiers[key]}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">{b.tierHints[key]}</span>
          </button>
        ))}
      </div>

      <div role="tablist" aria-label={b.tiersLabel} className="mt-6 flex gap-1 rounded-xl border border-ink-700 bg-ink-950/50 p-1">
        {TABS.map((key) => (
          <button
            key={key}
            id={`${baseId}-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={onTabKey}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition sm:text-sm",
              tab === key ? "bg-mint-500/15 text-mint-300" : "text-ink-300 hover:text-ink-100",
            )}
          >
            {b.tabs[key]}
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="mt-5 grid gap-5">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-mint-500/30 p-4 text-sm text-ink-300">{b.soulLocked}</p>
        ) : (
          groups.map((g) => {
            const multi = g.max > 1;
            const picked = selection[g.id] as string[];
            return (
              <div key={g.id} role={multi ? "group" : "radiogroup"} aria-label={b.groups[g.id]}>
                <p className="mb-2 flex items-baseline gap-2 text-xs font-medium text-ink-300">
                  {b.groups[g.id]}
                  {multi && <span className="text-[11px] text-ink-500">{b.upTo.replace("{n}", nf.format(g.max))}</span>}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {visibleOptions(g.id, tier, selection).map((o) => {
                    const on = picked.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role={multi ? undefined : "radio"}
                        aria-checked={multi ? undefined : on}
                        aria-pressed={multi ? on : undefined}
                        onClick={() => onSelection(toggle(selection, g.id as GroupId, o.id, tier))}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          on
                            ? "border-mint-500/70 bg-mint-500/10 text-mint-300 shadow-[0_0_14px_-4px_var(--color-mint-500)]"
                            : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100",
                          o.bold && "border-dashed",
                        )}
                      >
                        {(b.opts[g.id] as Record<string, string>)[o.id]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
