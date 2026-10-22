"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import { generationCost } from "@/lib/credits/pricing";
import type { AspectRatio, GeneratedMedia, GenerationJob, JobStatus, MediaKind, Workspace } from "@/types";

const RATIOS: AspectRatio[] = ["9:16", "1:1", "4:5", "16:9"];
const POLL_MS = 3_000;
const MAX_POLLS = 200; // ~10 min

type PollState = { status: JobStatus; outputs: GeneratedMedia[]; error: string | null; creditsRefunded: boolean };

/** Shared prompt -> job -> poll -> result flow for every AI workspace. */
export function GenerationPanel({ workspace, kinds }: { workspace: Workspace; kinds: MediaKind[] }) {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<MediaKind>(kinds[0] ?? "image");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [durationSec, setDurationSec] = useState(5);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<JobStatus | "idle" | "submitting">("idle");
  const [outputs, setOutputs] = useState<GeneratedMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => () => void (cancelled.current = true), []);

  const cost = generationCost({ workspace, kind, durationSec });
  const busy = status === "submitting" || status === "queued" || status === "processing";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOutputs([]);
    setStatus("submitting");
    try {
      const job = await api<GenerationJob>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ workspace, prompt, kind, aspectRatio, durationSec: kind === "video" ? durationSec : undefined }),
      });
      window.dispatchEvent(new Event(CREDITS_CHANGED));
      setStatus(job.status);
      for (let i = 0; i < MAX_POLLS && !cancelled.current; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const s = await api<PollState>(`/api/ai/jobs/${encodeURIComponent(job.id)}`);
        setStatus(s.status);
        if (s.status === "completed") return setOutputs(s.outputs);
        if (s.status === "failed" || s.status === "cancelled") {
          if (s.creditsRefunded) window.dispatchEvent(new Event(CREDITS_CHANGED));
          return setError(t.gen.failedRefunded);
        }
      }
    } catch (err) {
      setStatus("failed");
      setError(err instanceof ClientApiError ? err.message : t.common.error);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-ink-300">{t.gen.prompt}</span>
            <textarea
              required
              minLength={3}
              maxLength={2000}
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.gen.promptPlaceholder}
              dir="auto"
              className="resize-y rounded-xl border border-ink-700 bg-ink-800 p-3 text-ink-100 placeholder:text-ink-500 focus:border-ember-500 focus:outline-none"
            />
          </label>

          {kinds.length > 1 && (
            <Segmented label={t.gen.kind} value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, label: t.gen[k] }))} />
          )}
          <Segmented label={t.gen.aspect} value={aspectRatio} onChange={setAspectRatio} options={RATIOS.map((r) => ({ value: r, label: r }))} ltr />

          {kind === "video" && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="flex justify-between text-ink-300">
                {t.gen.duration} <span className="tabular-nums text-ink-100">{durationSec}</span>
              </span>
              <input type="range" min={3} max={15} value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} className="accent-ember-500" />
            </label>
          )}

          <div className="flex items-center justify-between border-t border-ink-700 pt-4">
            <span className="text-sm text-ink-300">
              {t.gen.cost}: <strong className="tabular-nums text-ember-300">{cost.toLocaleString(locale)}</strong> {t.gen.credits}
            </span>
            <Button type="submit" disabled={busy || prompt.trim().length < 3}>
              {busy ? t.gen.generating : t.gen.generate}
            </Button>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </form>
      </Card>

      <Card className="grid min-h-80 place-items-center" aria-live="polite" aria-busy={busy}>
        {outputs.length > 0 ? (
          <div className="grid w-full gap-3 sm:grid-cols-2">
            {outputs.map((o) =>
              o.kind === "video" ? (
                <video key={o.url} src={o.url} controls playsInline className="w-full rounded-xl" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- provider URLs, dimensions unknown
                <img key={o.url} src={o.url} alt={prompt} className="w-full rounded-xl" />
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-500">{busy ? (status === "queued" ? t.gen.queued : t.gen.generating) : t.gen.result}</p>
        )}
      </Card>
    </div>
  );
}

function Segmented<T extends string>({
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
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-2 text-ink-300">{label}</legend>
      <div className="flex flex-wrap gap-2" dir={ltr ? "ltr" : undefined}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 transition",
              value === o.value ? "border-ember-500 bg-ember-500/10 text-ember-300" : "border-ink-700 text-ink-300 hover:border-ink-500",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
