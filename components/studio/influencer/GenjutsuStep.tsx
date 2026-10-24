"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { GENJUTSU, genjutsuCost, type GenjutsuResolution } from "@/lib/credits/pricing";
import type { AspectRatio } from "@/types";
import { isBusy, type Creation, type TransferInput } from "../useGenerator";
import { toJpeg, uploadPhoto, uploadVideo, VIDEO_ACCEPT, videoMeta } from "./media";
import { ReferencePhoto, type ReferencePhotoState } from "./ReferencePhoto";

type VideoState = {
  name: string;
  preview: string;
  duration: number;
  ratio: AspectRatio;
  progress: number;
  token: string | null;
  error: string | null;
};
type Photo = { key: string; preview: string; token: string | null; failed: boolean };

const RESOLUTIONS = Object.keys(GENJUTSU.creditsPerSecond) as GenjutsuResolution[];

/** Closest supported ratio to the reference video's frame (for the preview tile only). */
function nearestRatio(w: number, h: number): AspectRatio {
  const r = w && h ? w / h : 9 / 16;
  const options: [AspectRatio, number][] = [["9:16", 9 / 16], ["3:4", 3 / 4], ["1:1", 1], ["16:9", 16 / 9]];
  return options.reduce((best, o) => (Math.abs(o[1] - r) < Math.abs(best[1] - r) ? o : best))[0];
}

/**
 * Step 2 — Genjutsu motion transfer: upload a reference video, pick character images (created in
 * Step 1 or uploaded), and the character performs the video with the same moves and style.
 */
export function GenjutsuStep({
  images,
  picked,
  onPicked,
  busy,
  error,
  onSubmit,
}: {
  /** Image creations from Step 1 (any status; only completed ones are selectable). */
  images: Creation[];
  /** Explicitly chosen image keys (owned by the parent so "Use in video" can add to it). */
  picked: string[];
  onPicked: (keys: string[]) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (input: TransferInput) => void;
}) {
  const { t, locale } = useI18n();
  const s = t.influencerStudio.step2;
  const nf = new Intl.NumberFormat(locale);
  const videoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const [video, setVideo] = useState<VideoState | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [resolution, setResolution] = useState<GenjutsuResolution>(GENJUTSU.defaultResolution);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"standard" | "swap">("standard");
  const [product, setProduct] = useState<ReferencePhotoState | null>(null);
  const sw = t.swap;

  const ready = images.filter((c) => c.status === "completed" && c.outputs[0] && c.jobId);
  // Until the user picks explicitly, use the newest image.
  const fallback = ready[0];
  const selectedKeys = picked.length || photos.length ? picked : fallback ? [fallback.key] : [];
  const selected = ready.filter((c) => selectedKeys.includes(c.key));
  const photoTokens = photos.flatMap((p) => (p.token ? [p.token] : []));
  const total = selected.length + photoTokens.length;
  // The product photo counts towards the provider's image limit in swap mode.
  const maxImages = GENJUTSU.maxImages - (mode === "swap" ? 1 : 0);
  const cost = video ? genjutsuCost(video.duration, resolution) : null;
  const canSubmit = !busy && !!video?.token && total > 0 && total <= maxImages && !photos.some((p) => !p.token && !p.failed) && (mode === "standard" || !!product?.token);

  // Release object URLs on unmount.
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  const objectUrl = (f: File) => {
    const u = URL.createObjectURL(f);
    urls.current.push(u);
    return u;
  };

  async function chooseVideo(file: File | undefined) {
    if (!file) return;
    const base = { name: file.name, preview: objectUrl(file), duration: 0, ratio: "9:16" as AspectRatio, progress: 0, token: null };
    if (!["video/mp4", "video/quicktime"].includes(file.type)) return setVideo({ ...base, error: s.badType });
    if (file.size > GENJUTSU.maxVideoBytes) return setVideo({ ...base, error: s.tooLarge });
    const meta = await videoMeta(file).catch(() => null);
    if (!meta) return setVideo({ ...base, error: s.badType });
    const next = { ...base, duration: meta.duration, ratio: nearestRatio(meta.width, meta.height), error: null };
    if (meta.duration < GENJUTSU.minSeconds) return setVideo({ ...next, error: s.tooShort });
    setVideo(next);
    try {
      const token = await uploadVideo(file, (p) => setVideo((v) => (v && v.preview === next.preview ? { ...v, progress: p } : v)));
      setVideo((v) => (v && v.preview === next.preview ? { ...v, token, progress: 1 } : v));
    } catch {
      setVideo((v) => (v && v.preview === next.preview ? { ...v, error: s.uploadFailed } : v));
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = maxImages - selected.length - photos.length;
    const batch = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    if (!picked.length && fallback) onPicked([fallback.key]); // keep the implicit pick once photos are added
    const added = batch.map((file) => ({ file, photo: { key: crypto.randomUUID(), preview: objectUrl(file), token: null, failed: false } satisfies Photo }));
    setPhotos((prev) => [...prev, ...added.map((a) => a.photo)]);
    await Promise.all(
      added.map(async ({ file, photo: { key } }) => {
        const token = await toJpeg(file).then(uploadPhoto).catch(() => null);
        setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, token, failed: !token } : p)));
      }),
    );
  }

  function togglePick(key: string) {
    const base = picked.length || photos.length ? picked : selectedKeys;
    if (base.includes(key)) onPicked(base.filter((k) => k !== key));
    else if (total < maxImages) onPicked([...base, key]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !video?.token || cost === null) return;
    onSubmit({
      video: video.token, characters: selected, photos: photoTokens, resolution, prompt: prompt.trim(), ratio: video.ratio, estimate: cost,
      mode, product: mode === "swap" ? (product?.token ?? undefined) : undefined,
    });
  }

  const seconds = video ? Math.ceil(Math.min(GENJUTSU.maxSeconds, video.duration)) : 0;

  return (
    <form onSubmit={submit} className="grid gap-6">
      {/* Mode: standard motion transfer or face & product swap */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-100">{sw.label}</p>
        <div role="radiogroup" aria-label={sw.label} className="grid grid-cols-2 gap-2">
          {(["standard", "swap"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-xl border px-3 py-2.5 text-start text-xs font-semibold transition", mode === m ? "border-mint-500/70 bg-mint-500/10 text-mint-300" : "border-ink-700 text-ink-300 hover:border-ink-500 hover:text-ink-100")}
            >
              <span aria-hidden className="me-1.5">{m === "swap" ? "⇄" : "▶"}</span>
              {sw[m]}
            </button>
          ))}
        </div>
        {mode === "swap" && (
          <div className="mt-3">
            <p className="mb-2 text-xs leading-relaxed text-ink-500">{sw.hint}</p>
            <ReferencePhoto value={product} onChange={setProduct} labels={{ title: sw.product, hint: sw.productHint }} />
            {!product?.token && video?.token && <p className="text-xs text-ember-300">{sw.needProduct}</p>}
          </div>
        )}
      </div>

      {/* Reference video */}
      <div>
        <p className="mb-1 text-sm font-semibold text-ink-100">{s.video}</p>
        <p className="mb-3 text-xs text-ink-500">{s.videoHint}</p>
        <input ref={videoInput} type="file" accept={VIDEO_ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => void chooseVideo(e.target.files?.[0])} />
        {video ? (
          <div className="flex gap-4 rounded-2xl border border-ink-700 bg-ink-950/50 p-3">
            <video src={video.preview} muted playsInline loop autoPlay className="h-36 w-auto max-w-[45%] rounded-xl bg-ink-850 object-cover motion-reduce:[animation:none]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-xs">
              <p className="truncate font-medium text-ink-100" dir="auto">{video.name}</p>
              {video.duration > 0 && (
                <p className="text-ink-300">
                  <span className="tabular-nums">{s.seconds.replace("{n}", nf.format(Math.round(video.duration * 10) / 10))}</span>
                  {video.duration > GENJUTSU.maxSeconds && <span className="ms-2 text-ember-300">· {s.trimmed}</span>}
                </p>
              )}
              {video.error ? (
                <p role="alert" className="text-danger">{video.error}</p>
              ) : video.token ? (
                <p className="font-semibold text-mint-300">✓ {s.uploaded}</p>
              ) : (
                <div>
                  <p className="mb-1 text-ink-300">{s.uploading.replace("{p}", nf.format(Math.round(video.progress * 100)))}</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                    <div className="h-full rounded-full bg-mint-500 transition-[width]" style={{ width: `${Math.round(video.progress * 100)}%` }} />
                  </div>
                </div>
              )}
              <button type="button" onClick={() => videoInput.current?.click()} className="mt-auto self-start rounded-lg border border-ink-700 px-3 py-1.5 text-ink-300 hover:text-ink-100">
                {s.replace}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void chooseVideo(e.dataTransfer.files[0]);
            }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-mint-500/40 bg-mint-500/[0.03] px-4 py-8 text-sm text-ink-300 transition hover:border-mint-500 hover:bg-mint-500/[0.06]"
          >
            <span aria-hidden className="grid size-11 place-items-center rounded-full border border-mint-500/40 text-lg text-mint-300">▶</span>
            <span className="font-semibold text-mint-300">{s.dropVideo}</span>
          </button>
        )}
      </div>

      {/* Character images */}
      <div>
        <p className="mb-1 flex items-baseline gap-2 text-sm font-semibold text-ink-100">
          {s.characters}
          <span className="text-[11px] font-normal text-ink-500">{s.selected.replace("{n}", nf.format(total))}</span>
        </p>
        <p className="mb-3 text-xs text-ink-500">{s.charactersHint}</p>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {ready.map((c) => {
            const on = selectedKeys.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                aria-label={t.influencerStudio.gallery.character}
                onClick={() => togglePick(c.key)}
                className={cn(
                  "relative h-28 shrink-0 overflow-hidden rounded-xl border-2 bg-ink-850 transition",
                  c.ratio === "16:9" ? "aspect-video" : "aspect-[3/4]",
                  on ? "border-mint-500 shadow-[0_0_20px_-4px_var(--color-mint-500)]" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- provider CDN URL */}
                <img src={c.outputs[0]!.url} alt="" className="size-full object-cover" />
                {on && <span aria-hidden className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-mint-500 text-[11px] font-bold text-ink-950">✓</span>}
              </button>
            );
          })}
          {images.filter(isBusy).map((c) => (
            <span key={c.key} aria-label={s.waiting} className="shimmer h-28 shrink-0 rounded-xl aspect-[3/4]" />
          ))}
          {photos.map((p) => (
            <span key={p.key} className={cn("relative h-28 shrink-0 overflow-hidden rounded-xl border-2 aspect-[3/4]", p.failed ? "border-danger" : "border-mint-500")}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.preview} alt="" className={cn("size-full object-cover", !p.token && !p.failed && "opacity-50")} />
              {!p.token && !p.failed && <span aria-hidden className="absolute inset-0 grid place-items-center"><span className="size-5 animate-spin rounded-full border-2 border-ink-700 border-t-mint-500 motion-reduce:animate-none" /></span>}
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((x) => x.key !== p.key))}
                aria-label={t.soulId.remove}
                className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-ink-950/80 text-[11px] text-ink-100"
              >
                ×
              </button>
            </span>
          ))}
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => void addPhotos(e.target.files)} />
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            disabled={total >= maxImages}
            className="flex h-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-500 px-4 text-xs text-ink-300 transition aspect-[3/4] hover:border-mint-500 hover:text-mint-300 disabled:opacity-40"
          >
            <span aria-hidden className="text-lg">+</span>
            {s.addPhoto}
          </button>
        </div>
        {ready.length === 0 && photos.length === 0 && !images.some(isBusy) && <p className="mt-2 text-xs text-ink-500">{s.empty}</p>}
      </div>

      {/* Quality + changes */}
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-100">{s.resolution}</p>
          <div role="radiogroup" aria-label={s.resolution} dir="ltr" className="inline-flex rounded-xl border border-ink-700 p-1">
            {RESOLUTIONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={resolution === r}
                onClick={() => setResolution(r)}
                className={cn("rounded-lg px-3 py-1.5 text-xs transition", resolution === r ? "bg-mint-500 font-semibold text-ink-950" : "text-ink-300 hover:text-ink-100")}
              >
                {r}
                <span className={cn("ms-1 text-[10px]", resolution === r ? "text-ink-950/70" : "text-ink-500")}>⚡{s.perSecond.replace("{n}", nf.format(GENJUTSU.creditsPerSecond[r]))}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink-100">{s.prompt}</span>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            dir="auto"
            placeholder={s.promptPlaceholder}
            className="w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-700/60 pt-5">
        {cost !== null && (
          <span className="inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-xs font-semibold text-ember-300">
            <span aria-hidden>⚡</span>
            <span className="tabular-nums">{nf.format(cost)}</span>
            <span className="font-normal">{t.gen.credits}</span>
            <span className="font-normal text-ember-300/70">· {s.seconds.replace("{n}", nf.format(Math.max(GENJUTSU.minSeconds, seconds)))}</span>
          </span>
        )}
        <Button type="submit" disabled={!canSubmit} className="ms-auto px-6">
          {busy ? t.gen.generating : s.generate}
        </Button>
      </div>
      {error && <p role="alert" className="-mt-3 text-sm text-danger">{error}</p>}
    </form>
  );
}
