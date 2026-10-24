"use client";

import { useState, type FormEvent } from "react";
import { openBuyCredits } from "@/components/billing/events";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { CostChip } from "@/components/ui/CostChip";
import { api, ClientApiError } from "@/lib/api-client";
import { STRATEGY, VOICE, voiceCost } from "@/lib/credits/pricing";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type DialectKey = keyof Dictionary["voice"]["dialects"];
type VoiceKey = keyof Dictionary["voice"]["voices"];

/** Mirrors `VOICES` in lib/voice/elevenlabs.ts (server-only); the server re-validates the id. */
const VOICE_OPTIONS: { key: VoiceKey; gender: "female" | "male" }[] = [
  { key: "layla", gender: "female" },
  { key: "sara", gender: "female" },
  { key: "noor", gender: "female" },
  { key: "faisal", gender: "male" },
  { key: "omar", gender: "male" },
  { key: "khalid", gender: "male" },
];
const DIALECT_KEYS: DialectKey[] = ["najdi", "hijazi", "kuwaiti", "emirati", "gulf", "msa", "english"];
const LENGTHS = [10, 20, 30, 45] as const;

type Take = { key: string; token: string; text: string; voice: VoiceKey };

/**
 * Step 3 — DIZURA Voice: a dialect voiceover for the video. "Write it for me" drafts the script in
 * the chosen dialect; generation is charged per 100 characters and refunded server-side on failure.
 */
export function VoiceStudio() {
  const { t, locale } = useI18n();
  const v = t.voice;
  const nf = new Intl.NumberFormat(locale);

  const [dialect, setDialect] = useState<DialectKey>("najdi");
  const [voice, setVoice] = useState<VoiceKey>("layla");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [brief, setBrief] = useState("");
  const [seconds, setSeconds] = useState<number>(20);
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);

  const trimmed = text.trim();
  const cost = voiceCost(trimmed.length || 1);

  function fail(err: unknown) {
    const code = err instanceof ClientApiError ? err.code : "internal";
    if (code === "insufficient_credits") {
      openBuyCredits("insufficient");
      setError(t.pricing.outOfCredits);
    } else setError(code === "not_configured" ? v.unavailable : v.error);
  }

  async function writeForMe() {
    if (writing || brief.trim().length < 3) return;
    setWriting(true);
    setError(null);
    try {
      const res = await api<{ script: string }>("/api/voice/script", { method: "POST", body: JSON.stringify({ dialect, brief: brief.trim(), seconds }) });
      setText(res.script.slice(0, VOICE.maxChars));
      window.dispatchEvent(new Event(CREDITS_CHANGED));
    } catch (err) {
      fail(err);
    } finally {
      setWriting(false);
    }
  }

  async function generate(e: FormEvent) {
    e.preventDefault();
    if (busy || trimmed.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ token: string }>("/api/voice/speech", { method: "POST", body: JSON.stringify({ text: trimmed, voice, speed }) });
      setTakes((list) => [{ key: crypto.randomUUID(), token: res.token, text: trimmed, voice }, ...list].slice(0, 6));
      window.dispatchEvent(new Event(CREDITS_CHANGED));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={generate} className="grid gap-6">
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-100">{v.dialect}</p>
        <div role="radiogroup" aria-label={v.dialect} className="flex flex-wrap gap-1.5">
          {DIALECT_KEYS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={dialect === d}
              onClick={() => setDialect(d)}
              className={cn("rounded-full border px-3 py-1.5 text-xs transition", dialect === d ? "border-mint-500/60 bg-mint-500/10 font-semibold text-mint-300" : "border-ink-700 text-ink-300 hover:text-ink-100")}
            >
              {v.dialects[d]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-100">{v.voice}</p>
        <div role="radiogroup" aria-label={v.voice} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {VOICE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={voice === o.key}
              onClick={() => setVoice(o.key)}
              className={cn("flex items-center gap-2 rounded-xl border p-2.5 text-start text-xs transition", voice === o.key ? "border-mint-500/70 bg-mint-500/10 text-mint-300" : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100")}
            >
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-800 text-sm">{o.gender === "female" ? "♀" : "♂"}</span>
              <span>
                <span className="block font-semibold">{v.voices[o.key]}</span>
                <span className="text-[11px] text-ink-500">{o.gender === "female" ? v.female : v.male}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Write it for me */}
      <div className="rounded-2xl border border-dashed border-mint-500/30 bg-mint-500/[0.03] p-3">
        <input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={1000}
          dir="auto"
          aria-label={v.briefPlaceholder}
          placeholder={v.briefPlaceholder}
          className="w-full bg-transparent px-1 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-500">{v.seconds}</span>
          <div role="radiogroup" aria-label={v.seconds} className="flex rounded-lg border border-ink-700 p-0.5">
            {LENGTHS.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={seconds === n}
                onClick={() => setSeconds(n)}
                className={cn("rounded-md px-2.5 py-1 text-xs tabular-nums transition", seconds === n ? "bg-ink-700 text-ink-100" : "text-ink-300 hover:text-ink-100")}
              >
                {t.blueprints.labels.seconds.replace("{n}", nf.format(n))}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void writeForMe()}
            disabled={writing || brief.trim().length < 3}
            className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-mint-500/40 px-3 py-1.5 text-xs font-semibold text-mint-300 transition hover:bg-mint-500/10 disabled:opacity-40"
          >
            <span aria-hidden>✦</span> {writing ? t.strategist.thinking : v.writeForMe}
            <span className="font-normal text-ember-300">⚡{nf.format(STRATEGY.chatCredits)}</span>
          </button>
        </div>
      </div>

      <label className="block">
        <span className="mb-2 flex items-baseline justify-between text-sm font-semibold text-ink-100">
          {v.script}
          <span className="text-[11px] font-normal tabular-nums text-ink-500">
            {v.chars.replace("{n}", nf.format(text.length)).replace("{max}", nf.format(VOICE.maxChars))}
          </span>
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={VOICE.maxChars}
          dir="auto"
          placeholder={v.scriptPlaceholder}
          className="w-full resize-y rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm leading-relaxed text-ink-100 placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none"
        />
      </label>

      <label className="flex items-center gap-3 text-xs text-ink-300">
        {v.speed}
        <input type="range" min={0.7} max={1.2} step={0.05} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-40 accent-mint-500" />
        <span className="w-10 tabular-nums text-ink-100" dir="ltr">{nf.format(speed)}×</span>
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700/60 pt-5">
        <CostChip value={nf.format(cost)} label={t.gen.credits} />
        <Button type="submit" disabled={busy || trimmed.length < 2} className="ms-auto px-6">
          {busy ? v.generating : v.generate}
        </Button>
      </div>
      {error && <p role="alert" className="-mt-3 text-sm text-danger">{error}</p>}

      {takes.length > 0 && (
        <ul className="grid gap-3">
          {takes.map((take) => {
            const src = `/api/voice/audio/${encodeURIComponent(take.token)}`;
            return (
              <li key={take.key} className="rounded-2xl border border-ink-700 bg-ink-950/50 p-3">
                <p className="mb-2 line-clamp-2 text-xs text-ink-300" dir="auto">{take.text}</p>
                <audio controls preload="metadata" src={src} className="w-full" />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a href={src} download="dizura-voice.mp3" className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:text-ink-100">
                    {v.download}
                  </a>
                  <button type="button" disabled title={v.syncSoon} className="ms-auto rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-500">
                    {v.sync} · <span className="text-ember-300">{v.syncSoon}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
