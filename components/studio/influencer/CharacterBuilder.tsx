"use client";

import { useId, useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { OPTION_PHOTOS } from "./option-photos";
import type { ReferencePhotoState } from "./ReferencePhoto";
import { StyleReference } from "./StyleReference";
import {
  GLYPHS, GROUP_ICONS, GROUP_ORDER, groupMax, groupVisible, PHOTO_GROUPS, SWATCHES, TIERS, toggle, visibleOptions,
  type GroupId, type IdentityMode, type Selection, type Tier,
} from "./traits";

/** Groups whose placeholder art shows a full body rather than a face. */
const BODY_GROUPS: ReadonlySet<GroupId> = new Set<GroupId>(["build", "style", "gender"]);
/** Picked-settings chips shown before "Show more". */
const CHIPS_COLLAPSED = 8;

/** Selected tile: violet ring with a mint glow (the DIZURA duo), clearly different from every other tile. */
const ON = "ring-[3px] ring-violet-400 shadow-[0_0_26px_-6px_var(--color-mint-500)]";
const OFF = "ring-1 ring-ink-700/70 hover:ring-ink-500";

/**
 * Character builder as one accordion: character type, then every trait group (icon · name · count,
 * with the current pick in the header). Visual groups are white photo tiles, colours are swatches,
 * fine details are text tiles. A "Picked settings" bar keeps every choice visible.
 */
export function CharacterBuilder({
  tier,
  onTier,
  selection,
  onSelection,
  mode,
  styleRef,
  onStyleRef,
  onReset,
}: {
  tier: Tier;
  onTier: (tier: Tier) => void;
  selection: Selection;
  onSelection: (next: Selection) => void;
  mode: IdentityMode;
  /** Outfit photo for the Style group (not with a DIZURA ID). */
  styleRef: ReferencePhotoState | null;
  onStyleRef: (next: ReferencePhotoState | null) => void;
  onReset: () => void;
}) {
  const { t, locale } = useI18n();
  const b = t.builder;
  const nf = new Intl.NumberFormat(locale);
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(["tier"]));
  const [allChips, setAllChips] = useState(false);

  const groups = GROUP_ORDER.filter((id) => groupVisible(id, selection, mode));
  const label = (g: GroupId, id: string) => (b.opts[g] as Record<string, string>)[id] ?? id;
  const flip = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function reveal(key: string) {
    setOpen((prev) => new Set(prev).add(key));
    requestAnimationFrame(() => document.getElementById(`${baseId}-${key}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  const chips = [
    { key: "tier", text: b.tiers[tier] },
    ...groups
      .filter((g) => !(g === "style" && styleRef?.token))
      .flatMap((g) => (selection[g] as string[]).filter((id) => label(g, id)).map((id) => ({ key: g, text: label(g, id) }))),
    ...(styleRef?.token ? [{ key: "style", text: b.styleRef.active }] : []),
  ];
  const shownChips = allChips ? chips : chips.slice(0, CHIPS_COLLAPSED);

  return (
    <div className="grid gap-2">
      <Section
        id={`${baseId}-tier`}
        icon="🎭"
        title={b.tiersLabel}
        count={nf.format(TIERS.length)}
        summary={b.tiers[tier]}
        open={open.has("tier")}
        onToggle={() => flip("tier")}
      >
        <div role="radiogroup" aria-label={b.tiersLabel} className="grid grid-cols-3 gap-2.5">
          {TIERS.map((key) => {
            const on = tier === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={on} onClick={() => onTier(key)} className={tile(on, "bg-paper")}>
                <TileArt group="tier" id={key} index={TIERS.indexOf(key)} />
                <span className="block px-1.5 pb-2 pt-1 text-center">
                  <span className={cn("block text-sm font-semibold", on ? "text-violet-700" : "text-ink-950")}>{b.tiers[key]}</span>
                  <span className="hidden text-[11px] leading-snug text-ink-500 sm:block">{b.tierHints[key]}</span>
                </span>
                {on && <Check />}
              </button>
            );
          })}
        </div>
      </Section>

      {groups.length === 0 && <p className="rounded-xl border border-dashed border-violet-400/30 p-4 text-sm text-ink-300">{b.soulLocked}</p>}

      {groups.map((g) => {
        const options = visibleOptions(g, tier, selection, mode);
        const picked = selection[g] as string[];
        const max = groupMax(g);
        const multi = max > 1;
        const swatches = SWATCHES[g];
        const photo = PHOTO_GROUPS.has(g);
        const pick = (id: string) => onSelection(toggle(selection, g, id, tier, mode));
        const state = (on: boolean) => (multi ? { "aria-pressed": on } : { role: "radio" as const, "aria-checked": on });
        const withStyleRef = g === "style" && mode !== "soul";
        const summary =
          g === "style" && styleRef?.token ? b.styleRef.active : picked.map((id) => label(g, id)).filter(Boolean).join(" · ");
        return (
          <Section
            key={g}
            id={`${baseId}-${g}`}
            icon={GROUP_ICONS[g]}
            title={b.groups[g]}
            count={nf.format(options.length)}
            hint={multi ? b.upTo.replace("{n}", nf.format(max)) : undefined}
            summary={summary}
            open={open.has(g)}
            onToggle={() => flip(g)}
          >
            <div role={multi ? "group" : "radiogroup"} aria-label={b.groups[g]} className="grid grid-cols-3 gap-2.5">
              {withStyleRef && <StyleReference value={styleRef} onChange={onStyleRef} />}
              {options.map((o, i) => {
                const on = picked.includes(o.id) && !(g === "style" && styleRef?.token);
                const name = label(g, o.id);
                if (swatches) {
                  return (
                    <button
                      key={o.id}
                      type="button"
                      {...state(on)}
                      onClick={() => pick(o.id)}
                      className={cn("rounded-2xl p-2 text-center transition", on ? cn(ON, "bg-violet-500/15") : "hover:bg-ink-800")}
                    >
                      <span aria-hidden className="relative grid h-14 place-items-center rounded-xl" style={{ background: swatches[o.id] }}>
                        {on && <span className="grid size-6 place-items-center rounded-full bg-mint-500 text-xs font-bold text-ink-950 ring-2 ring-ink-950">✓</span>}
                      </span>
                      <span className={cn("mt-1.5 block truncate text-xs font-medium", on ? "text-violet-200" : "text-ink-100")}>{name}</span>
                    </button>
                  );
                }
                if (photo || GLYPHS[g]?.[o.id]) {
                  return (
                    <button
                      key={o.id}
                      type="button"
                      {...state(on)}
                      onClick={() => pick(o.id)}
                      title={name}
                      aria-label={name}
                      className={tile(on, hasPhoto(g, o.id) ? "bg-paper" : "bg-ink-850")}
                    >
                      <TileArt group={g} id={o.id} index={i} body={BODY_GROUPS.has(g)} glyph={GLYPHS[g]?.[o.id]} />
                      <span
                        className={cn(
                          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 via-ink-950/50 to-transparent px-2 pb-1.5 pt-8 text-start text-xs font-semibold leading-tight transition",
                          on ? "text-violet-200 opacity-100" : "text-ink-100 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
                          !hasPhoto(g, o.id) && "opacity-100",
                        )}
                      >
                        {name}
                      </span>
                      {on && <Check />}
                    </button>
                  );
                }
                return (
                  <button
                    key={o.id}
                    type="button"
                    {...state(on)}
                    onClick={() => pick(o.id)}
                    className={cn(
                      "min-h-12 rounded-2xl px-2.5 py-2 text-start text-sm font-medium transition",
                      on ? cn(ON, "bg-violet-500/15 text-violet-100") : cn(OFF, "text-ink-300 hover:text-ink-100"),
                      o.bold && !on && "border border-dashed border-ink-600",
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </Section>
        );
      })}

      <div className="sticky bottom-0 z-10 -mx-1 mt-2 rounded-2xl border border-ink-700/70 bg-ink-900 px-3 pb-3 pt-2.5 shadow-[0_-12px_24px_-12px_var(--color-ink-950)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink-300">{b.picked}</p>
          <button type="button" onClick={onReset} className="text-xs text-ink-500 transition hover:text-ink-100">
            {b.resetAll}
          </button>
        </div>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {shownChips.map((c, i) => (
            <li key={`${c.key}-${i}`}>
              <button
                type="button"
                onClick={() => reveal(c.key)}
                className="rounded-full border border-ink-700 bg-ink-850 px-2.5 py-1 text-xs text-ink-100 transition hover:border-violet-400/70"
              >
                {c.text}
              </button>
            </li>
          ))}
          {chips.length > CHIPS_COLLAPSED && (
            <li>
              <button
                type="button"
                onClick={() => setAllChips((v) => !v)}
                className="rounded-full px-2.5 py-1 text-xs font-semibold text-violet-300 hover:text-violet-200"
              >
                {allChips ? b.showLess : b.showMore}
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  count,
  hint,
  summary,
  open,
  onToggle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  count: string;
  hint?: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("rounded-[1.4rem] border transition", open ? "border-ink-700 bg-ink-900/80" : "border-transparent bg-ink-850/70 hover:bg-ink-800/80")}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-start">
          <span aria-hidden className="grid size-6 shrink-0 place-items-center text-base grayscale-[0.3]">{icon}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-1.5 text-[15px] font-semibold text-ink-100">
              {title}
              <span className="text-ink-500">•</span>
              <span className="font-medium text-ink-500">{count}</span>
              {hint && <span className="ms-1 text-[11px] font-normal text-ink-500">{hint}</span>}
            </span>
            {summary && !open && <span className="mt-0.5 block truncate text-xs text-violet-300">{summary}</span>}
          </span>
          <svg aria-hidden viewBox="0 0 20 20" className={cn("size-4 shrink-0 text-ink-500 transition-transform motion-reduce:transition-none", open && "rotate-180")}>
            <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      {open && (
        <div id={`${id}-body`} className="px-3 pb-3">
          <div className="rounded-2xl bg-ink-950/50 p-2.5">{children}</div>
        </div>
      )}
    </section>
  );
}

const hasPhoto = (group: string, id: string) => OPTION_PHOTOS.has(`${group}/${id}`);

/** Square option tile (white "paper" behind generated photos, see docs/design/option-photos.md). */
const tile = (on: boolean, bg: string) =>
  cn(
    "group relative flex flex-col overflow-hidden rounded-2xl text-start transition duration-200 motion-reduce:transition-none",
    bg,
    on ? cn(ON, "scale-[1.02]") : OFF,
  );

function Check() {
  return (
    <span aria-hidden className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-mint-500 text-xs font-bold text-ink-950 shadow-[0_2px_8px_var(--color-ink-950)]">
      ✓
    </span>
  );
}

/** Option photo when generated (see option-photos.ts), else a glyph or DIZURA placeholder art. */
function TileArt({ group, id, index, body, glyph }: { group: string; id: string; index: number; body?: boolean; glyph?: string }) {
  if (OPTION_PHOTOS.has(`${group}/${id}`)) {
    return (
      <span className="relative block aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static thumbnails */}
        <img src={`/influencer/options/${group}/${id}.webp`} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none" />
      </span>
    );
  }
  if (glyph) {
    return (
      <span aria-hidden className="relative grid aspect-square place-items-center pb-5 text-4xl sm:text-5xl" style={{ background: `var(--art-${index % 6})` }}>
        <span className="drop-shadow-[0_6px_14px_var(--color-ink-950)] transition duration-300 group-hover:scale-110 motion-reduce:transition-none">{glyph}</span>
      </span>
    );
  }
  return (
    <span aria-hidden className="relative block aspect-square overflow-hidden" style={{ background: `var(--art-${index % 6})` }}>
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
