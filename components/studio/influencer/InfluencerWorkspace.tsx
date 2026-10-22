"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { generationCost, VIDEO_DURATION } from "@/lib/credits/pricing";
import type { AspectRatio } from "@/types";
import type { Idea } from "../Studio";
import { isBusy, useGenerator, type Creation } from "../useGenerator";
import { TraitBuilder } from "./TraitBuilder";
import { ANIMATIONS, composeInfluencerPrompt, DEFAULT_TRAITS, STYLES, withTrait, type AnimationKey, type StyleKey, type Traits } from "./traits";

const RATIOS: AspectRatio[] = ["9:16", "3:4", "1:1", "16:9"];
const RATIO_CLASS: Record<AspectRatio, string> = { "9:16": "aspect-[9/16]", "1:1": "aspect-square", "3:4": "aspect-[3/4]", "16:9": "aspect-video" };

/**
 * AI Influencer Studio: Step 1 creates a character (Soul 2), Step 2 animates a chosen
 * character into video (WAN 3.0 Prime image-to-video), workspace panel lists everything.
 */
export function InfluencerWorkspace({ templates }: { templates: Idea[] }) {
  const { t, locale } = useI18n();
  const s = t.influencerStudio;
  const nf = new Intl.NumberFormat(locale);
  const { creations, error, generate, busy } = useGenerator("ai-influencer");
  const [errorAt, setErrorAt] = useState<"create" | "animate">("create");

  // Step 1 state
  const [style, setStyle] = useState<StyleKey>("editorial");
  const [traits, setTraits] = useState<Traits>(DEFAULT_TRAITS);
  const [details, setDetails] = useState("");
  const [ratio, setRatio] = useState<AspectRatio>("9:16");
  const characterPrompt = [composeInfluencerPrompt(traits), STYLES[style], details.trim()].filter(Boolean).join(". ");
  const imageCost = generationCost({ workspace: "ai-influencer", kind: "image" });

  // Step 2 state
  const step2 = useRef<HTMLElement>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [animation, setAnimation] = useState<AnimationKey>("subtle");
  const [duration, setDuration] = useState<number>(VIDEO_DURATION.default);
  const videoCost = generationCost({ workspace: "ai-influencer", kind: "video", durationSec: duration });

  const characters = useMemo(() => creations.filter((c) => c.kind === "image" && c.status !== "failed"), [creations]);
  const ready = characters.filter((c) => c.status === "completed" && c.outputs[0]);
  const selected = ready.find((c) => c.key === selectedKey) ?? ready[0];

  function createCharacter(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErrorAt("create");
    void generate({ prompt: characterPrompt, kind: "image", ratio, cost: imageCost });
  }

  function animate() {
    if (!selected || busy) return;
    setErrorAt("animate");
    void generate({ prompt: `${selected.prompt}. ${ANIMATIONS[animation]}`, kind: "video", ratio: selected.ratio, durationSec: duration, cost: videoCost, source: selected });
  }

  function animateFromGallery(c: Creation) {
    setSelectedKey(c.key);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    step2.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  return (
    <div id="create" className="grid scroll-mt-24 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* ---------------- Step 1 ---------------- */}
        <section aria-labelledby="step1-title" className="glass rounded-[var(--radius-card)] p-5 sm:p-7">
          <StepHeader badge={s.step1.badge} id="step1-title" title={s.step1.title} subtitle={s.step1.subtitle} model="Soul 2" cost={`${nf.format(imageCost)}`} creditsLabel={t.gen.credits} />

          <Label>{s.step1.styles}</Label>
          <div role="radiogroup" aria-label={s.step1.styles} className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(Object.keys(STYLES) as StyleKey[]).map((key, i) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={style === key}
                onClick={() => setStyle(key)}
                className={cn(
                  "group relative aspect-[4/5] overflow-hidden rounded-xl border text-start transition",
                  style === key ? "border-mint-500 shadow-[0_0_22px_-6px_var(--color-mint-500)]" : "border-ink-700/70 hover:border-ink-500",
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-80 transition group-hover:opacity-100"
                  style={{ background: `linear-gradient(${140 + i * 38}deg, var(--color-mint-900), var(--color-ink-850) 55%, var(--color-ink-950))` }}
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent p-2 pt-6 text-xs font-medium text-ink-100">
                  {s.styles[key]}
                </span>
              </button>
            ))}
          </div>

          <details open className="group mt-6">
            <summary className="mb-3 flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink-100">
              {s.step1.traits}
              <span aria-hidden className="text-ink-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <TraitBuilder traits={traits} onChange={(k, v) => setTraits((prev) => withTrait(prev, k, v))} />
          </details>

          {templates.length > 0 && (
            <>
              <Label className="mt-6">{s.step1.templates}</Label>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => setDetails(tpl.prompt)}
                    aria-pressed={details === tpl.prompt}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs transition",
                      details === tpl.prompt ? "border-mint-500/60 bg-mint-500/10 text-mint-300" : "border-ink-700 text-ink-300 hover:text-ink-100",
                    )}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Prompt bar */}
          <form onSubmit={createCharacter} className="mt-6 rounded-2xl border border-mint-500/25 bg-ink-950/60 p-3 shadow-[0_0_40px_-24px_var(--color-mint-500)]">
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
              }}
              rows={2}
              maxLength={800}
              dir="auto"
              aria-label={s.step1.placeholder}
              placeholder={s.step1.placeholder}
              className="w-full resize-none bg-transparent px-1 text-ink-100 placeholder:text-ink-500 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Chips label={t.gen.aspect} value={ratio} onChange={setRatio} options={RATIOS.map((r) => ({ value: r, label: r }))} ltr />
              <span className="ms-auto">
                <Cost value={nf.format(imageCost)} label={t.gen.credits} />
              </span>
              <Button type="submit" disabled={busy} className="px-6">
                {busy ? t.gen.generating : s.step1.create}
              </Button>
            </div>
          </form>
          {error && errorAt === "create" && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </section>

        {/* ---------------- Step 2 ---------------- */}
        <section ref={step2} aria-labelledby="step2-title" className="glass scroll-mt-24 rounded-[var(--radius-card)] p-5 sm:p-7">
          <StepHeader badge={s.step2.badge} id="step2-title" title={s.step2.title} subtitle={s.step2.subtitle} model="WAN 3.0 Prime" cost={nf.format(videoCost)} creditsLabel={t.gen.credits} />

          <Label>{s.step2.pick}</Label>
          {ready.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-700 p-5 text-center text-sm text-ink-500">
              {characters.some(isBusy) ? s.step2.waiting : s.step2.empty}
            </p>
          ) : (
            <div role="radiogroup" aria-label={s.step2.pick} className="flex gap-3 overflow-x-auto pb-1">
              {ready.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={selected?.key === c.key}
                  onClick={() => setSelectedKey(c.key)}
                  className={cn(
                    "w-24 shrink-0 overflow-hidden rounded-xl border-2 transition sm:w-28",
                    RATIO_CLASS[c.ratio],
                    selected?.key === c.key ? "border-mint-500 shadow-[0_0_22px_-4px_var(--color-mint-500)]" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- provider CDN URL */}
                  <img src={c.outputs[0]!.url} alt={s.gallery.character} className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <Label className="mt-6">{s.step2.motion}</Label>
          <div role="radiogroup" aria-label={s.step2.motion} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(ANIMATIONS) as AnimationKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={animation === key}
                onClick={() => setAnimation(key)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-start text-sm transition",
                  animation === key ? "border-mint-500/70 bg-mint-500/10 text-mint-300" : "border-ink-700 text-ink-300 hover:text-ink-100",
                )}
              >
                {s.motions[key]}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300">
              {t.gen.duration}
              <input
                type="range"
                min={VIDEO_DURATION.min}
                max={VIDEO_DURATION.max}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-24 accent-mint-500"
              />
              <span className="w-5 tabular-nums text-ink-100">{nf.format(duration)}</span>
            </label>
            <span className="ms-auto">
              <Cost value={nf.format(videoCost)} label={t.gen.credits} />
            </span>
            <Button type="button" onClick={animate} disabled={!selected || busy} className="px-6">
              {busy ? t.gen.generating : s.step2.animate}
            </Button>
          </div>
          {error && errorAt === "animate" && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </section>
      </div>

      {/* ---------------- Workspace panel ---------------- */}
      <aside aria-labelledby="workspace-title" className="glass rounded-[var(--radius-card)] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-mint-500/15 bg-ink-900/80 px-5 py-3.5 backdrop-blur">
          <h2 id="workspace-title" className="text-sm font-semibold">{s.gallery.title}</h2>
          {creations.length > 0 && <span className="text-xs tabular-nums text-ink-500">{nf.format(creations.length)}</span>}
        </header>
        {creations.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-500">{s.gallery.empty}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-1" aria-live="polite">
            {creations.map((c) => (
              <GalleryItem key={c.key} creation={c} onAnimate={animateFromGallery} />
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function GalleryItem({ creation: c, onAnimate }: { creation: Creation; onAnimate: (c: Creation) => void }) {
  const { t, locale } = useI18n();
  const s = t.influencerStudio.gallery;
  const media = c.outputs[0];
  return (
    <li className="overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-950/50">
      <div className={cn("relative bg-ink-850", RATIO_CLASS[c.ratio], "lg:max-h-[26rem] lg:w-full")}>
        {media ? (
          media.kind === "video" ? (
            <video src={media.url} controls playsInline loop className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- provider CDN URL
            <img src={media.url} alt={c.prompt} className="size-full object-cover" />
          )
        ) : (
          <div className="grid size-full place-items-center p-3 text-center">
            {c.status === "failed" ? (
              <p className="text-xs text-danger">{c.error}</p>
            ) : (
              <span className="flex flex-col items-center gap-2 text-xs text-ink-300">
                <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-ink-700 border-t-mint-500" />
                {c.status === "queued" || c.status === "submitting" ? t.gen.queued : t.gen.generating}
              </span>
            )}
          </div>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300 backdrop-blur">
          {c.kind === "video" ? (c.animatedFrom ? s.fromCharacter : s.video) : s.character}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <Cost value={new Intl.NumberFormat(locale).format(c.cost)} label={t.gen.credits} />
        {media && (
          <span className="ms-auto flex gap-1.5">
            {c.kind === "image" && (
              <button type="button" onClick={() => onAnimate(c)} className="rounded-lg bg-mint-500/15 px-2.5 py-1 text-xs font-semibold text-mint-300 hover:bg-mint-500/25">
                {s.animate}
              </button>
            )}
            <a href={media.url} target="_blank" rel="noopener noreferrer" download className="rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-300 hover:text-ink-100">
              {s.download}
            </a>
          </span>
        )}
      </div>
    </li>
  );
}

function StepHeader({ badge, id, title, subtitle, model, cost, creditsLabel }: { badge: string; id: string; title: string; subtitle: string; model: string; cost: string; creditsLabel: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-400">{badge}</p>
        <h2 id={id} className="mt-1 text-xl font-bold sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-ink-300">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span dir="ltr" className="rounded-full border border-mint-500/30 bg-mint-500/5 px-2.5 py-1 text-xs text-mint-300">{model}</span>
        <Cost value={cost} label={creditsLabel} />
      </div>
    </header>
  );
}

function Cost({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-xs font-semibold text-ember-300">
      <span aria-hidden>⚡</span>
      <span className="tabular-nums">{value}</span>
      <span className="font-normal">{label}</span>
    </span>
  );
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mb-2.5 text-sm font-semibold text-ink-100", className)}>{children}</p>;
}

function Chips<T extends string>({ label, value, onChange, options, ltr }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ltr?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} dir={ltr ? "ltr" : undefined} className="flex rounded-lg border border-ink-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("rounded-md px-2.5 py-1 text-xs transition", value === o.value ? "bg-ink-700 text-ink-100" : "text-ink-300 hover:text-ink-100")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
