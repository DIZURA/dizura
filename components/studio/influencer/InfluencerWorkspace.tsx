"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { GENJUTSU, generationCost, SOUL_ID } from "@/lib/credits/pricing";
import type { AspectRatio } from "@/types";
import { CanvasPanel } from "../CanvasPanel";
import { useGenerator, type Creation, type TransferInput } from "../useGenerator";
import { CharacterBuilder } from "./CharacterBuilder";
import { GenjutsuStep } from "./GenjutsuStep";
import { ReferencePhoto, type ReferencePhotoState } from "./ReferencePhoto";
import { SoulIdPanel } from "./SoulIdPanel";
import {
  composeCharacterPrompt, composePhotoPrompt, composeSoulIdPrompt, DEFAULT_SELECTION, normalize, photoDefaults, randomize, SCENES,
  type IdentityMode, type OutputKind, type SceneKey, type Selection, type Tier,
} from "./traits";
import { useCharacters } from "./useCharacters";

/** Character sheets are 16:9 (close-up + full body); portraits use the vertical ratios. */
const SHEET_RATIO: AspectRatio = "16:9";
const PORTRAIT_RATIOS: AspectRatio[] = ["9:16", "3:4", "1:1"];
const RATIO_CLASS: Record<AspectRatio, string> = { "9:16": "aspect-[9/16]", "1:1": "aspect-square", "3:4": "aspect-[3/4]", "16:9": "aspect-video" };
/** Example pictures for the How-it-works steps (public/examples/*.webp). */
const GUIDE_IMAGES = ["how-vc-1", "how-vc-2", "how-vc-3", "how-vc-4", "how-vc-5"] as const;
const isSheet = (c: Creation) => c.kind === "image" && c.ratio === SHEET_RATIO;

function smoothScroll(el: HTMLElement | null) {
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

/**
 * AI Influencer Studio: Step 1 builds a character (Soul 2), Step 2 makes it act out a reference
 * video (Genjutsu motion transfer) right under it; preview canvas + workspace beside them.
 */
export function InfluencerWorkspace() {
  const { t, locale } = useI18n();
  const s = t.influencerStudio;
  const b = t.builder;
  const nf = new Intl.NumberFormat(locale);
  const { creations, error, generate, transfer, busy } = useGenerator("visual-character");
  const [errorAt, setErrorAt] = useState<"create" | "video">("create");

  // Soul ID characters
  const soul = useCharacters();
  const readyCharacters = soul.list.filter((c) => c.state === "ready");
  const [identity, setIdentity] = useState<string>("new"); // "new" = builder traits, "photo" = reference photo, else a character id
  const soulCharacter = readyCharacters.find((c) => c.id === identity);
  const mode: IdentityMode = identity === "photo" ? "photo" : soulCharacter ? "soul" : "new";
  const [strength, setStrength] = useState<number>(SOUL_ID.defaultStrength);
  const [photo, setPhoto] = useState<ReferencePhotoState | null>(null);
  const [photoError, setPhotoError] = useState(false);

  // Step 1 — builder
  const [tier, setTier] = useState<Tier>("average");
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);
  const [output, setOutput] = useState<OutputKind>("sheet");
  const [scene, setScene] = useState<SceneKey>("studio");
  const [portraitRatio, setPortraitRatio] = useState<AspectRatio>("9:16");
  const [details, setDetails] = useState("");
  const ratio = output === "sheet" ? SHEET_RATIO : portraitRatio;
  const base =
    mode === "photo" ? composePhotoPrompt(selection, tier, output, scene)
    : mode === "soul" ? composeSoulIdPrompt(selection, output, scene)
    : composeCharacterPrompt(selection, tier, output, scene);
  const characterPrompt = [base, details.trim()].filter(Boolean).join(". ");
  const imageCost = generationCost({ workspace: "visual-character", kind: "image" });

  // Step 2 — Genjutsu
  const step2 = useRef<HTMLElement>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const images = useMemo(() => creations.filter((c) => c.kind === "image" && c.status !== "failed"), [creations]);

  // Preview canvas
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const focused = creations.find((c) => c.key === focusKey) ?? creations[0];

  function changeTier(next: Tier) {
    setTier(next);
    setSelection((prev) => normalize(prev, next, mode));
  }

  function chooseIdentity(id: string) {
    const nextMode: IdentityMode = id === "photo" ? "photo" : id === "new" ? "new" : "soul";
    setIdentity(id);
    setPhotoError(false);
    if (nextMode !== mode) setSelection((prev) => (nextMode === "photo" ? photoDefaults(prev, tier) : normalize(prev, tier, nextMode)));
  }

  function createCharacter(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (mode === "photo" && !photo?.token) return setPhotoError(true);
    setErrorAt("create");
    setFocusKey(null); // follow the newest creation
    void generate({
      prompt: characterPrompt,
      kind: "image",
      ratio,
      cost: imageCost,
      characterId: soulCharacter?.id,
      characterStrength: soulCharacter ? strength : undefined,
      referencePhoto: mode === "photo" ? (photo?.token ?? undefined) : undefined,
    });
  }

  function makeVideo(input: TransferInput) {
    if (busy) return;
    setErrorAt("video");
    setFocusKey(null);
    void transfer(input);
  }

  function pickForVideo(c: Creation) {
    setPicked((prev) => (prev.includes(c.key) ? prev : [c.key, ...prev].slice(0, GENJUTSU.maxImages)));
    smoothScroll(step2.current);
  }

  return (
    <div id="create" className="grid scroll-mt-24 items-start gap-5 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:grid-cols-[34rem_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        {/* ---------------- Step 1: character builder ---------------- */}
        <section aria-labelledby="step1-title" className="glass rounded-[var(--radius-card)] p-5 sm:p-6">
          <StepHeader badge={s.step1.badge} id="step1-title" title={s.step1.title} subtitle={s.step1.subtitle} model="DIZURA Character" />

          <Label>{b.identity}</Label>
          <div role="radiogroup" aria-label={b.identity} className="mb-2 flex flex-wrap items-center gap-2">
            {[
              { id: "new", name: b.newFace, thumb: null as string | null },
              { id: "photo", name: b.fromPhoto, thumb: null },
              ...readyCharacters.map((c) => ({ id: c.id, name: c.name, thumb: c.thumbnailUrl })),
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={identity === o.id}
                onClick={() => chooseIdentity(o.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border py-1 pe-3 ps-1 text-sm transition",
                  identity === o.id ? "border-mint-500 bg-mint-500/10 text-mint-300 shadow-[0_0_16px_-6px_var(--color-mint-500)]" : "border-ink-700 text-ink-300 hover:text-ink-100",
                )}
              >
                {o.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- provider CDN URL
                  <img src={o.thumb} alt="" className="size-7 rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="grid size-7 place-items-center rounded-full bg-ink-800 text-xs">{o.id === "new" ? "✦" : o.id === "photo" ? "📷" : o.name.slice(0, 1)}</span>
                )}
                <span dir="auto">{o.name}</span>
              </button>
            ))}
            <a href="#soul-id" className="ms-1 text-xs font-semibold text-mint-400 underline-offset-4 hover:underline">
              + {b.trainSoulId}
            </a>
          </div>
          {mode === "photo" && (
            <ReferencePhoto
              value={photo}
              onChange={(next) => {
                setPhoto(next);
                setPhotoError(false);
              }}
            />
          )}
          {photoError && <p role="alert" className="mb-2 text-sm text-danger">{b.photo.needed}</p>}
          {soulCharacter && (
            <label className="mb-2 flex items-center gap-3 text-xs text-ink-300">
              {t.soulId.strength}
              <input type="range" min={0.1} max={1} step={0.05} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="w-40 accent-mint-500" />
              <span className="w-9 tabular-nums text-ink-100">{nf.format(Math.round(strength * 100))}%</span>
            </label>
          )}

          <div className="mt-5">
            <CharacterBuilder tier={tier} onTier={changeTier} selection={selection} onSelection={setSelection} mode={mode} />
          </div>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setSelection(randomize(tier, selection, mode))} className="inline-flex items-center gap-1.5 rounded-lg border border-mint-500/40 px-3 py-1.5 text-xs font-semibold text-mint-300 transition hover:bg-mint-500/10">
              <span aria-hidden>⟳</span> {b.randomize}
            </button>
            <button type="button" onClick={() => setSelection(mode === "photo" ? photoDefaults(DEFAULT_SELECTION, tier) : normalize(DEFAULT_SELECTION, tier, mode))} className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition hover:text-ink-100">
              {b.reset}
            </button>
          </div>

          {/* Output + prompt bar */}
          <form onSubmit={createCharacter} className="mt-6 rounded-2xl border border-mint-500/25 bg-ink-950/60 p-3 shadow-[0_0_40px_-24px_var(--color-mint-500)]">
            <div role="radiogroup" aria-label={b.output} className="grid grid-cols-2 gap-2">
              {(["sheet", "portrait"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={output === key}
                  onClick={() => setOutput(key)}
                  className={cn("flex items-center gap-3 rounded-xl border p-2.5 text-start transition", output === key ? "border-mint-500/70 bg-mint-500/10" : "border-ink-700 hover:border-ink-500")}
                >
                  <OutputGlyph kind={key} active={output === key} />
                  <span>
                    <span className={cn("block text-xs font-semibold", output === key ? "text-mint-300" : "text-ink-100")}>{b.outputs[key]}</span>
                    <span className="hidden text-[11px] leading-snug text-ink-500 sm:block">{b.outputHints[key]}</span>
                  </span>
                </button>
              ))}
            </div>

            {output === "portrait" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div role="radiogroup" aria-label={b.scene} className="flex flex-wrap gap-1.5">
                  {(Object.keys(SCENES) as SceneKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={scene === key}
                      onClick={() => setScene(key)}
                      className={cn("rounded-full border px-2.5 py-1 text-xs transition", scene === key ? "border-mint-500/60 bg-mint-500/10 text-mint-300" : "border-ink-700 text-ink-300 hover:text-ink-100")}
                    >
                      {b.scenes[key]}
                    </button>
                  ))}
                </div>
                <Chips label={t.gen.aspect} value={portraitRatio} onChange={setPortraitRatio} options={PORTRAIT_RATIOS.map((r) => ({ value: r, label: r }))} ltr />
              </div>
            )}

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
              }}
              rows={2}
              maxLength={600}
              dir="auto"
              aria-label={s.step1.placeholder}
              placeholder={s.step1.placeholder}
              className="mt-3 w-full resize-none bg-transparent px-1 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Cost value={nf.format(imageCost)} label={t.gen.credits} />
              <Button type="submit" disabled={busy || (mode === "photo" && !photo?.token)} className="ms-auto px-6">
                {busy ? t.gen.generating : s.step1.create}
              </Button>
            </div>
          </form>
          {error && errorAt === "create" && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </section>

        {/* ---------------- Step 2: Genjutsu ---------------- */}
        <section ref={step2} aria-labelledby="step2-title" className="glass scroll-mt-24 rounded-[var(--radius-card)] p-5 sm:p-6">
          <StepHeader badge={s.step2.badge} id="step2-title" title={s.step2.title} subtitle={s.step2.subtitle} model="DIZURA Motion" />
          <GenjutsuStep images={images} picked={picked} onPicked={setPicked} busy={busy} error={errorAt === "video" ? error : null} onSubmit={makeVideo} />
        </section>

        <div id="soul-id" className="scroll-mt-24">
          <SoulIdPanel
            characters={soul.list}
            onTrained={(c) => soul.add(c)}
            onDeleted={(id) => {
              soul.removeLocal(id);
              if (identity === id) setIdentity("new");
            }}
          />
        </div>
      </div>

      {/* ---------------- Canvas: workspace + how it works ---------------- */}
      <CanvasPanel count={creations.length} guide={t.guide.visualCharacter} guideImages={GUIDE_IMAGES}>
        {focused ? <Preview creation={focused} onUse={pickForVideo} /> : <EmptyCanvas text={s.gallery.empty} />}
        {creations.length > 1 && (
          <ul className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5 xl:grid-cols-6" aria-label={s.gallery.title}>
            {creations.map((c) => (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => setFocusKey(c.key)}
                  aria-pressed={focused?.key === c.key}
                  aria-label={c.kind === "video" ? s.gallery.video : s.gallery.character}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-ink-850 transition",
                    focused?.key === c.key ? "border-mint-500" : "border-transparent opacity-75 hover:opacity-100",
                  )}
                >
                  <Thumb creation={c} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CanvasPanel>
    </div>
  );
}

function Preview({ creation: c, onUse }: { creation: Creation; onUse: (c: Creation) => void }) {
  const { t, locale } = useI18n();
  const s = t.influencerStudio.gallery;
  const media = c.outputs[0];
  return (
    <figure>
      <div className={cn("relative mx-auto overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-950", RATIO_CLASS[c.ratio], c.ratio === "16:9" ? "w-full" : "max-h-[36rem] max-w-full")}>
        {media ? (
          media.kind === "video" ? (
            <video src={media.url} controls playsInline loop className="size-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- provider CDN URL
            <img src={media.url} alt={s.character} className="size-full object-contain" />
          )
        ) : c.status === "failed" ? (
          <div className="grid size-full min-h-48 place-items-center p-4 text-center">
            <p className="text-sm text-danger">{c.error}</p>
          </div>
        ) : (
          <div className="shimmer grid size-full min-h-48 place-items-center">
            <span className="rounded-full bg-ink-950/70 px-3 py-1 text-xs text-ink-300 backdrop-blur">
              {c.status === "queued" || c.status === "submitting" ? t.gen.queued : t.gen.generating}
            </span>
          </div>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-ink-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-300 backdrop-blur">
          {c.kind === "video" ? s.video : isSheet(c) ? t.builder.outputs.sheet : s.character}
        </span>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-2">
        <Cost value={new Intl.NumberFormat(locale).format(c.cost)} label={t.gen.credits} />
        {media && (
          <span className="ms-auto flex gap-1.5">
            {c.kind === "image" && (
              <button type="button" onClick={() => onUse(c)} className="rounded-lg bg-mint-500/15 px-3 py-1.5 text-xs font-semibold text-mint-300 hover:bg-mint-500/25">
                {s.use}
              </button>
            )}
            <a href={media.url} target="_blank" rel="noopener noreferrer" download className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:text-ink-100">
              {s.download}
            </a>
          </span>
        )}
      </figcaption>
    </figure>
  );
}

function Thumb({ creation: c }: { creation: Creation }) {
  const media = c.outputs[0];
  if (!media) {
    return c.status === "failed" ? <span aria-hidden className="grid size-full place-items-center text-danger">!</span> : <span aria-hidden className="shimmer block size-full" />;
  }
  return (
    <>
      {media.kind === "video" ? (
        <video src={media.url} muted playsInline preload="metadata" className="size-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- provider CDN URL
        <img src={media.url} alt="" className="size-full object-cover" />
      )}
      {media.kind === "video" && <span aria-hidden className="absolute bottom-1 end-1 rounded bg-ink-950/80 px-1 text-[10px] text-mint-300">▶</span>}
    </>
  );
}

function EmptyCanvas({ text }: { text: string }) {
  return (
    <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-mint-500/25 bg-ink-950/40 p-6 text-center">
      <div>
        <div aria-hidden className="mx-auto flex w-56 max-w-full gap-2">
          <span className="grid aspect-[3/4] flex-1 place-items-center rounded-lg border border-ink-700 bg-ink-900/60">
            <span className="size-10 rounded-full border border-mint-500/40" />
          </span>
          <span className="grid aspect-[3/4] flex-1 place-items-center rounded-lg border border-ink-700 bg-ink-900/60">
            <svg viewBox="0 0 40 64" className="h-14 text-mint-500/50" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="20" cy="10" r="7" />
              <path d="M8 62V34c0-7 5-12 12-12s12 5 12 12v28M14 62V44M26 62V44" />
            </svg>
          </span>
        </div>
        <p className="mt-4 text-sm text-ink-500">{text}</p>
      </div>
    </div>
  );
}

function OutputGlyph({ kind, active }: { kind: OutputKind; active: boolean }) {
  const tone = active ? "border-mint-500/70" : "border-ink-500";
  return kind === "sheet" ? (
    <span aria-hidden className="flex h-8 w-12 shrink-0 gap-0.5">
      <span className={cn("flex-1 rounded-sm border", tone)} />
      <span className={cn("flex-1 rounded-sm border", tone)} />
    </span>
  ) : (
    <span aria-hidden className="grid h-8 w-12 shrink-0 place-items-center">
      <span className={cn("h-8 w-[1.15rem] rounded-sm border", tone)} />
    </span>
  );
}

function StepHeader({ badge, id, title, subtitle, model }: { badge: string; id: string; title: string; subtitle: string; model: string }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-400">{badge}</p>
        <h2 id={id} className="mt-1 text-xl font-bold sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-ink-300">{subtitle}</p>
      </div>
      <span dir="ltr" className="rounded-full border border-mint-500/30 bg-mint-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-mint-300">{model}</span>
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
