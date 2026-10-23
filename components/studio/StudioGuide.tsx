"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { exampleSrc } from "./examples";

type Guide = { title: string; body: string; steps: readonly { title: string; body: string }[] };

/**
 * "How it works" panel (Higgsfield-style): eyebrow, big headline, example media and a step strip.
 * `images[i]` is the example picture name for step i (see examples.ts); missing ones show art.
 */
export function StudioGuide({ guide, images }: { guide: Guide; images: readonly string[] }) {
  const { t, locale } = useI18n();
  const nf = new Intl.NumberFormat(locale);
  const [step, setStep] = useState(0);
  const total = guide.steps.length;
  const current = guide.steps[step]!;
  const go = (i: number) => setStep((i + total) % total);

  return (
    <div className="flex flex-col items-center px-2 py-4 text-center sm:px-6">
      <Media name={images[step]} index={step} label={current.title} />
      <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-mint-400">{t.guide.idea}</p>
      <h2 className="mt-2 max-w-2xl text-balance text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">{guide.title}</h2>
      <p className="mt-3 max-w-xl text-pretty text-ink-300">{guide.body}</p>

      <div aria-live="polite" className="mt-6 max-w-xl rounded-2xl border border-mint-500/20 bg-mint-500/5 px-5 py-3 text-start">
        <p className="text-xs font-semibold text-mint-300">{t.guide.step.replace("{n}", nf.format(step + 1))} · {current.title}</p>
        <p className="mt-1 text-sm text-ink-300">{current.body}</p>
      </div>

      <div className="mt-6 flex max-w-full items-center gap-1.5 sm:gap-3">
        <ArrowButton label={t.guide.prev} onClick={() => go(step - 1)} glyph="‹" />
        <ol className="flex gap-1.5 sm:gap-2">
          {guide.steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-label={`${t.guide.step.replace("{n}", nf.format(i + 1))}: ${s.title}`}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "relative block h-9 w-12 overflow-hidden rounded-lg border-2 transition sm:h-12 sm:w-20 sm:rounded-xl",
                  i === step ? "border-mint-500 shadow-[0_0_18px_-4px_var(--color-mint-500)]" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <Thumb name={images[i]} index={i} />
              </button>
            </li>
          ))}
        </ol>
        <ArrowButton label={t.guide.next} onClick={() => go(step + 1)} glyph="›" />
      </div>
    </div>
  );
}

function Media({ name, index, label }: { name: string | undefined; index: number; label: string }) {
  const src = name ? exampleSrc(name) : null;
  return (
    <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-3xl border border-ink-700/70 bg-ink-950">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- static example image
        <img src={src} alt={label} className="size-full object-cover motion-safe:animate-[kenburns_14s_ease-in-out_infinite_alternate]" />
      ) : (
        <span aria-hidden className="absolute inset-0" style={{ background: `var(--art-${index % 6})` }} />
      )}
      <span aria-hidden className="absolute bottom-4 start-4 rounded-full bg-ink-950/70 px-3 py-1 text-xs font-semibold text-ink-100 backdrop-blur">{label}</span>
    </div>
  );
}

function Thumb({ name, index }: { name: string | undefined; index: number }) {
  const src = name ? exampleSrc(name) : null;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- static example image
    <img src={src} alt="" className="size-full object-cover" />
  ) : (
    <span aria-hidden className="block size-full" style={{ background: `var(--art-${index % 6})` }} />
  );
}

function ArrowButton({ label, onClick, glyph }: { label: string; onClick: () => void; glyph: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flip-rtl grid size-8 shrink-0 place-items-center sm:size-10 rounded-full border border-ink-700 text-lg text-ink-300 transition hover:border-mint-500 hover:text-mint-300"
    >
      {glyph}
    </button>
  );
}
