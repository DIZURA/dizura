"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { OPTION_PHOTOS } from "./option-photos";
import {
  GROUPS, groupVisible, PHOTO_GROUPS, SWATCHES, TABS, TIERS, toggle, visibleOptions,
  type GroupId, type Selection, type Tab, type Tier,
} from "./traits";

/** Groups whose placeholder art shows a full body rather than a face. */
const BODY_GROUPS: ReadonlySet<GroupId> = new Set<GroupId>(["build", "style", "gender"]);

/**
 * Character builder: character type (Average / Bold / Extreme) + trait groups in
 * Builder · Face · Body · Style tabs. Visual groups are photo cards, colours are swatches,
 * fine details are chips. With a Soul ID the identity groups are hidden.
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
              "group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border text-start transition sm:aspect-[5/4]",
              tier === key ? "border-mint-500 shadow-[0_0_26px_-8px_var(--color-mint-500)]" : "border-ink-700/70 hover:border-ink-500",
            )}
          >
            <OptionArt group="tier" id={key} index={i} body />
            <span className="relative bg-gradient-to-t from-ink-950/95 via-ink-950/70 to-transparent p-2.5 pt-8">
              <span aria-hidden className="mb-1.5 flex gap-0.5">
                {TIERS.map((_, dot) => (
                  <span key={dot} className={cn("h-1 w-4 rounded-full", dot <= i ? "bg-mint-500" : "bg-ink-700")} />
                ))}
              </span>
              <span className={cn("block text-sm font-semibold", tier === key ? "text-mint-300" : "text-ink-100")}>{b.tiers[key]}</span>
              <span className="mt-0.5 hidden text-[11px] leading-snug text-ink-300 sm:block">{b.tierHints[key]}</span>
            </span>
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
              tab === key ? "bg-mint-500 text-ink-950" : "text-ink-300 hover:text-ink-100",
            )}
          >
            {b.tabs[key]}
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="mt-5 grid gap-6">
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-mint-500/30 p-4 text-sm text-ink-300">{b.soulLocked}</p>
        ) : (
          groups.map((g) => {
            const multi = g.max > 1;
            const picked = selection[g.id] as string[];
            const labels = b.opts[g.id] as Record<string, string>;
            const swatches = SWATCHES[g.id];
            const photo = PHOTO_GROUPS.has(g.id);
            const options = visibleOptions(g.id, tier, selection);
            const pick = (id: string) => onSelection(toggle(selection, g.id as GroupId, id, tier));
            const state = (on: boolean) =>
              multi ? { "aria-pressed": on } : { role: "radio" as const, "aria-checked": on };
            return (
              <div key={g.id} role={multi ? "group" : "radiogroup"} aria-label={b.groups[g.id]}>
                <p className="mb-2 flex items-baseline gap-2 text-xs font-medium text-ink-300">
                  {b.groups[g.id]}
                  {multi && <span className="text-[11px] text-ink-500">{b.upTo.replace("{n}", nf.format(g.max))}</span>}
                </p>
                {photo ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {options.map((o, i) => {
                      const on = picked.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          {...state(on)}
                          onClick={() => pick(o.id)}
                          className={cn(
                            "group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl border-2 text-start transition",
                            on ? "border-mint-500 shadow-[0_0_20px_-6px_var(--color-mint-500)]" : "border-transparent hover:border-ink-500",
                            o.bold && !on && "border-dashed border-ink-500",
                          )}
                        >
                          <OptionArt group={g.id} id={o.id} index={i} body={BODY_GROUPS.has(g.id)} />
                          {on && (
                            <span aria-hidden className="absolute end-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-mint-500 text-[11px] font-bold text-ink-950">✓</span>
                          )}
                          <span className="relative bg-gradient-to-t from-ink-950/95 to-transparent px-1.5 pb-1.5 pt-5 text-[11px] font-medium leading-tight text-ink-100">
                            {labels[o.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : swatches ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-2.5">
                    {options.map((o) => {
                      const on = picked.includes(o.id);
                      return (
                        <button key={o.id} type="button" {...state(on)} onClick={() => pick(o.id)} className="flex w-14 flex-col items-center gap-1 text-[11px] text-ink-300">
                          <span
                            aria-hidden
                            className={cn(
                              "size-9 rounded-full border border-ink-950/40 transition",
                              on ? "ring-2 ring-mint-500 ring-offset-2 ring-offset-ink-900" : "hover:scale-105",
                            )}
                            style={{ background: swatches[o.id] }}
                          />
                          <span className={cn("text-center leading-tight", on && "text-mint-300")}>{labels[o.id]}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((o) => {
                      const on = picked.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          {...state(on)}
                          onClick={() => pick(o.id)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition",
                            on
                              ? "border-mint-500/70 bg-mint-500/10 text-mint-300 shadow-[0_0_14px_-4px_var(--color-mint-500)]"
                              : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100",
                            o.bold && "border-dashed",
                          )}
                        >
                          {labels[o.id]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Option photo when generated (see option-photos.ts), else DIZURA placeholder art. */
function OptionArt({ group, id, index, body }: { group: string; id: string; index: number; body?: boolean }) {
  if (OPTION_PHOTOS.has(`${group}/${id}`)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small static thumbnails
      <img src={`/influencer/options/${group}/${id}.webp`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none" />
    );
  }
  return (
    <span aria-hidden className="absolute inset-0 overflow-hidden" style={{ background: `var(--art-${index % 6})` }}>
      <svg
        viewBox={body ? "0 0 60 160" : "0 0 100 120"}
        className={cn("absolute bottom-0 start-1/2 -translate-x-1/2 text-ink-950/35 rtl:translate-x-1/2", body ? "h-[88%]" : "h-[78%]")}
        fill="currentColor"
      >
        {body ? (
          <>
            <circle cx="30" cy="16" r="11" />
            <path d="M17 32h26c5 0 8 4 9 9l5 40-7 2-6-34v34l4 72h-9l-8-62-8 62h-9l4-72V49l-6 34-7-2 5-40c1-5 4-9 9-9z" />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="48" rx="24" ry="30" />
            <path d="M38 74h24v10c18 4 30 14 34 36H4c4-22 16-32 34-36z" />
          </>
        )}
      </svg>
    </span>
  );
}
