import type { ReactNode } from "react";

/** Page banner for a studio: eyebrow, headline, description, model badge, optional visual. */
export function ToolHero({
  eyebrow,
  title,
  description,
  model,
  visual,
}: {
  eyebrow: string;
  title: string;
  description: string;
  model: string;
  visual?: ReactNode;
}) {
  return (
    <section className="relative my-5 overflow-hidden rounded-[var(--radius-card)] border border-ink-700/60 bg-ink-900 px-6 py-8 sm:px-10 sm:py-10">
      <div aria-hidden className="pointer-events-none absolute -top-24 end-0 size-96 rounded-full bg-ember-500/15 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember-400">{eyebrow}</p>
          <h1 className="mt-2 text-balance text-3xl font-black leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-pretty text-ink-300 sm:text-lg">{description}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-850 px-3 py-1 text-xs text-ink-300">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            <span dir="ltr">{model}</span>
          </p>
        </div>
        {visual && <div className="shrink-0">{visual}</div>}
      </div>
    </section>
  );
}
