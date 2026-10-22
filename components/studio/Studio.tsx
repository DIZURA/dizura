"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import { generationCost, VIDEO_DURATION } from "@/lib/credits/pricing";
import type { AspectRatio, GeneratedMedia, GenerationJob, JobStatus, MediaKind, Workspace } from "@/types";

export type Idea = { title: string; prompt: string; angle: number };

type Creation = {
  key: string;
  prompt: string;
  kind: MediaKind;
  ratio: AspectRatio;
  status: JobStatus | "submitting";
  outputs: GeneratedMedia[];
  error: string | null;
};
type PollState = { status: JobStatus; outputs: GeneratedMedia[]; error: string | null; creditsRefunded: boolean };

const RATIOS: AspectRatio[] = ["9:16", "1:1", "3:4", "16:9"];
const POLL_MS = 3_000;
const MAX_POLLS = 200; // ~10 min
const RATIO_CLASS: Record<AspectRatio, string> = { "9:16": "aspect-[9/16]", "1:1": "aspect-square", "3:4": "aspect-[3/4]", "16:9": "aspect-video" };

/**
 * Shared studio surface: results canvas + floating prompt bar.
 * Guided pages (influencer, motion) pass `basePrompt` built from their controls and render
 * those controls via `aside` (side panel) or above the studio.
 */
export function Studio({
  workspace,
  kinds,
  basePrompt = "",
  promptOptional = false,
  ideas = [],
  aside,
  chip,
}: {
  workspace: Workspace;
  kinds: MediaKind[];
  basePrompt?: string;
  promptOptional?: boolean;
  ideas?: Idea[];
  aside?: ReactNode;
  chip?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<MediaKind>(kinds[0] ?? "image");
  const [ratio, setRatio] = useState<AspectRatio>("9:16");
  const [duration, setDuration] = useState<number>(VIDEO_DURATION.default);
  const [prompt, setPrompt] = useState("");
  const [creations, setCreations] = useState<Creation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => void (mounted.current = false), []);

  const finalPrompt = [basePrompt.trim(), prompt.trim()].filter(Boolean).join(". ");
  const busy = creations.some((c) => c.status === "submitting" || c.status === "queued" || c.status === "processing");
  const cost = generationCost({ workspace, kind, durationSec: duration });
  const nf = new Intl.NumberFormat(locale);

  const update = (key: string, patch: Partial<Creation>) =>
    setCreations((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (finalPrompt.length < 3 || busy) return;
    setError(null);
    const key = crypto.randomUUID();
    setCreations((list) => [{ key, prompt: finalPrompt, kind, ratio, status: "submitting", outputs: [], error: null }, ...list]);
    try {
      const job = await api<GenerationJob>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ workspace, prompt: finalPrompt, kind, aspectRatio: ratio, durationSec: kind === "video" ? duration : undefined }),
      });
      window.dispatchEvent(new Event(CREDITS_CHANGED));
      update(key, { status: job.status });
      for (let i = 0; i < MAX_POLLS && mounted.current; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const s = await api<PollState>(`/api/ai/jobs/${encodeURIComponent(job.id)}`);
        if (s.status === "completed") return update(key, { status: "completed", outputs: s.outputs });
        if (s.status === "failed" || s.status === "cancelled") {
          if (s.creditsRefunded) window.dispatchEvent(new Event(CREDITS_CHANGED));
          return update(key, { status: "failed", error: s.error === "nsfw" ? t.gen.errors.nsfw : t.gen.failedRefunded });
        }
        update(key, { status: s.status });
      }
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "generic";
      const message = code in t.gen.errors ? t.gen.errors[code as keyof typeof t.gen.errors] : t.gen.errors.generic;
      setError(message);
      setCreations((list) => list.filter((c) => c.key !== key));
    }
  }

  const canvas = (
    <section aria-label={t.studio.yourCreations} className="flex min-h-[30rem] flex-col rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900">
      <header className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <h2 className="text-sm font-semibold text-ink-100">{t.studio.yourCreations}</h2>
        {creations.length > 0 && <span className="text-xs text-ink-500">{t.studio.session} · {nf.format(creations.length)}</span>}
      </header>

      <div className="flex-1 p-4 sm:p-5" aria-live="polite">
        {creations.length === 0 ? (
          <div className="flex h-full flex-col">
            <div className="py-8 text-center">
              <p className="font-semibold text-ink-100">{t.studio.emptyTitle}</p>
              <p className="mt-1 text-sm text-ink-500">{t.studio.emptyBody}</p>
            </div>
            {ideas.length > 0 && (
              <>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">{t.studio.ideas}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {ideas.map((idea) => (
                    <button
                      key={idea.title}
                      type="button"
                      onClick={() => {
                        setPrompt(idea.prompt);
                        textarea.current?.focus();
                      }}
                      className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-700/60 text-start transition hover:border-ember-500/60"
                      style={{ "--a": `${idea.angle}deg` } as CSSProperties}
                    >
                      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(var(--a),var(--color-ember-700),var(--color-ink-850)_60%)] opacity-70 transition group-hover:opacity-100" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/95 to-transparent p-3 pt-10">
                        <span className="block text-sm font-semibold text-ink-100">{idea.title}</span>
                        <span className="mt-0.5 block text-xs text-ember-300 opacity-0 transition group-hover:opacity-100">{t.studio.useIdea} →</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {creations.map((c) => (
              <li key={c.key} className="flex flex-col gap-2">
                <div className={cn("relative overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-850", RATIO_CLASS[c.ratio])}>
                  {c.outputs[0] ? (
                    c.outputs[0].kind === "video" ? (
                      <video src={c.outputs[0].url} controls playsInline loop className="size-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- provider CDN URLs
                      <img src={c.outputs[0].url} alt={c.prompt} className="size-full object-cover" />
                    )
                  ) : (
                    <div className="grid size-full place-items-center p-4 text-center">
                      {c.status === "failed" ? (
                        <p className="text-xs text-danger">{c.error}</p>
                      ) : (
                        <span className="flex flex-col items-center gap-2 text-xs text-ink-300">
                          <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-ink-700 border-t-ember-500" />
                          {c.status === "queued" || c.status === "submitting" ? t.gen.queued : t.gen.generating}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-ink-500" dir="auto">{c.prompt}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating prompt bar */}
      <form onSubmit={onSubmit} className="sticky bottom-3 m-3 rounded-2xl border border-ink-700 bg-ink-850/95 p-3 shadow-2xl shadow-ink-950/60 backdrop-blur sm:m-4">
        {chip && <div className="mb-2 flex flex-wrap gap-2">{chip}</div>}
        <textarea
          ref={textarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
          rows={2}
          maxLength={1500}
          dir="auto"
          aria-label={promptOptional ? t.studio.extraDetails : t.studio.describe}
          placeholder={promptOptional ? t.studio.extraDetails : t.studio.describe}
          className="w-full resize-none bg-transparent px-1 text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {kinds.length > 1 && (
            <ChipGroup label={t.gen.kind} value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: t.gen[k] }))} />
          )}
          <ChipGroup label={t.gen.aspect} value={ratio} onChange={setRatio} options={RATIOS.map((r) => ({ value: r, label: r }))} ltr />
          {kind === "video" && (
            <label className="flex items-center gap-2 rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-300">
              {t.gen.duration}
              <input
                type="range"
                min={VIDEO_DURATION.min}
                max={VIDEO_DURATION.max}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 accent-ember-500"
              />
              <span className="w-5 tabular-nums text-ink-100">{nf.format(duration)}</span>
            </label>
          )}
          <span className="ms-auto text-xs text-ink-300">
            <strong className="tabular-nums text-ember-300">{nf.format(cost)}</strong> {t.gen.credits}
          </span>
          <Button type="submit" disabled={busy || finalPrompt.length < 3} className="px-6">
            {busy ? t.gen.generating : t.gen.generate}
          </Button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      </form>
    </section>
  );

  if (!aside) return canvas;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900 lg:sticky lg:top-20">{aside}</aside>
      {canvas}
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  ltr,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ltr?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} dir={ltr ? "ltr" : undefined} className="flex rounded-lg border border-ink-700 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition",
            value === o.value ? "bg-ink-700 text-ink-100" : "text-ink-300 hover:text-ink-100",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
