"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { SectionView } from "./SectionView";
import { GOAL_GLYPH, SECTIONS, type Blueprint, type BlueprintSection, type SectionState } from "./types";

/** One strategy file: title/tags, four tabs (each section generates independently, with retry). */
export function BlueprintDoc({
  bp,
  states,
  onRetry,
  onPatch,
  onDelete,
  onBack,
}: {
  bp: Blueprint;
  states: Record<BlueprintSection, SectionState>;
  onRetry: (s: BlueprintSection) => void;
  onPatch: (patch: { title?: string; tags?: string[] }) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const b = t.blueprints;
  const [tab, setTab] = useState<BlueprintSection>("strategy");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(bp.title);
  const [tag, setTag] = useState("");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(bp.createdAt));

  function rename(e: FormEvent) {
    e.preventDefault();
    if (title.trim()) onPatch({ title: title.trim() });
    setEditing(false);
  }

  function addTag(e: FormEvent) {
    e.preventDefault();
    const v = tag.trim().slice(0, 30);
    if (v && !bp.tags.includes(v) && bp.tags.length < 8) onPatch({ tags: [...bp.tags, v] });
    setTag("");
  }

  const state = states[tab];
  const content = bp.sections[tab];

  return (
    <section className="glass rounded-[var(--radius-card)] p-5 sm:p-7">
      <button type="button" onClick={onBack} className="mb-4 text-xs text-ink-300 hover:text-ink-100">
        <span aria-hidden className="flip-rtl inline-block">←</span> {b.title}
      </button>
      <header className="flex flex-wrap items-start gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint-500/15 text-lg text-mint-300">{GOAL_GLYPH[bp.goal]}</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form onSubmit={rename} className="flex gap-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} dir="auto" autoFocus aria-label={b.rename} className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-950/60 px-3 py-1.5 text-lg font-bold focus:border-mint-500/60 focus:outline-none" />
              <Button type="submit" className="px-4 py-1.5">{b.save}</Button>
            </form>
          ) : (
            <h1 className="break-words text-2xl font-bold" dir="auto">{bp.title}</h1>
          )}
          <p className="mt-1 text-xs text-ink-500">{b.goals[bp.goal].name} · {date}</p>
        </div>
        <div className="flex gap-1.5">
          {!editing && <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:text-ink-100">{b.rename}</button>}
          <button type="button" onClick={() => window.confirm(b.confirmDelete) && onDelete()} className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-danger hover:border-danger">{b.delete}</button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-500">{b.tags}:</span>
        {bp.tags.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-ink-800 py-0.5 pe-1 ps-2.5 text-xs" dir="auto">
            {x}
            <button type="button" onClick={() => onPatch({ tags: bp.tags.filter((y) => y !== x) })} aria-label={`${t.soulId.remove} ${x}`} className="grid size-4 place-items-center rounded-full text-ink-500 hover:text-ink-100">×</button>
          </span>
        ))}
        {bp.tags.length < 8 && (
          <form onSubmit={addTag}>
            <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={30} dir="auto" placeholder={`+ ${b.addTag}`} aria-label={b.addTag} className="w-28 rounded-full border border-dashed border-ink-700 bg-transparent px-2.5 py-0.5 text-xs placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none" />
          </form>
        )}
      </div>

      <div role="tablist" aria-label={b.title} className="mt-6 flex gap-1 overflow-x-auto border-b border-ink-700">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            id={`tab-${s}`}
            aria-selected={tab === s}
            aria-controls="bp-panel"
            onClick={() => setTab(s)}
            className={cn("-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition", tab === s ? "border-mint-500 font-semibold text-mint-300" : "border-transparent text-ink-300 hover:text-ink-100")}
          >
            {b.sections[s]}
            <StateDot state={states[s]} />
          </button>
        ))}
      </div>

      <div id="bp-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-5">
        {content !== undefined ? (
          <SectionView section={tab} content={content} />
        ) : state === "failed" ? (
          <div className="rounded-2xl border border-danger/40 p-6 text-center">
            <p className="text-sm text-danger">{b.sectionFailed}</p>
            <Button type="button" variant="secondary" onClick={() => onRetry(tab)} className="mt-3">{b.retry}</Button>
          </div>
        ) : (
          <div role="status" className="grid gap-3">
            <p className="text-sm text-ink-300">{b.generating}</p>
            {[0, 1, 2].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
          </div>
        )}
      </div>
    </section>
  );
}

function StateDot({ state }: { state: SectionState }) {
  if (state === "done") return <span aria-hidden className="text-mint-400">✓</span>;
  if (state === "failed") return <span aria-hidden className="text-danger">!</span>;
  return <span aria-hidden className="size-2.5 animate-spin rounded-full border border-ink-500 border-t-mint-500 motion-reduce:animate-none" />;
}
