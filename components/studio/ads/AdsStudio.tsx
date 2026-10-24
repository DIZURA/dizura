"use client";

import { usePrices } from "@/components/billing/PricesProvider";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { AD_IMAGE, AD_RATIOS, MOTION_RESOLUTIONS, VIDEO_AD, videoAdCost, type AdQuality, type GenjutsuResolution } from "@/lib/credits/pricing";
import type { AspectRatio } from "@/types";
import { CanvasPanel } from "../CanvasPanel";
import { exampleSrc } from "../examples";
import { toJpeg, uploadErrorKind, uploadPhoto } from "../influencer/media";
import { useGenerator, type Creation } from "../useGenerator";

const FORMATS = ["studio", "lifestyle", "luxury", "ramadan", "social", "marketplace", "poster"] as const;
type Format = (typeof FORMATS)[number];
const QUALITIES = Object.keys(AD_IMAGE) as AdQuality[];
const MOTIONS = ["push_in", "orbit", "reveal", "lifestyle", "unbox", "splash"] as const;
type Motion = (typeof MOTIONS)[number];
const MOTION_GLYPH: Record<Motion, string> = { push_in: "⤢", orbit: "⟳", reveal: "✧", lifestyle: "✋", unbox: "🎁", splash: "💧" };
const RATIO_CLASS: Record<AspectRatio, string> = { "9:16": "aspect-[9/16]", "1:1": "aspect-square", "3:4": "aspect-[3/4]", "16:9": "aspect-video" };
const GUIDE_IMAGES = ["how-ads-1", "how-ads-2", "how-ads-3", "how-ads-4", "how-ads-5"] as const;

type Product = { preview: string; token: string | null; failed: false | "failed" | "unavailable" };

/**
 * Ads Creative Studio: one product photo → image ads (Marketing Studio Image) or video ads
 * (WAN 3.0 Prime image-to-video, the photo is the first frame). Priced server-side.
 */
export function AdsStudio() {
  const { t, locale } = useI18n();
  const a = t.adsStudio;
  const nf = new Intl.NumberFormat(locale);
  const { creations, error, ad, adVideo, busy } = useGenerator("ads-studio");
  const [mode, setMode] = useState<"image" | "video">("image");
  const fileInput = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [format, setFormat] = useState<Format>("studio");
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [quality, setQuality] = useState<AdQuality>("standard");
  const [notes, setNotes] = useState("");
  const [motion, setMotion] = useState<Motion>("push_in");
  const [seconds, setSeconds] = useState<number>(VIDEO_AD.defaultSeconds);
  const [resolution, setResolution] = useState<GenjutsuResolution>(VIDEO_AD.defaultResolution);
  const prices = usePrices();
  const cost = mode === "image" ? prices.ad[quality] : videoAdCost(seconds, resolution, prices);

  const preview = product?.preview;
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function chooseProduct(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const next: Product = { preview: URL.createObjectURL(file), token: null, failed: false };
    setProduct(next);
    let token: string | null = null;
    let failed: Product["failed"] = false;
    try {
      token = await toJpeg(file).then(uploadPhoto);
    } catch (err) {
      failed = uploadErrorKind(err);
    }
    setProduct((p) => (p && p.preview === next.preview ? { ...p, token, failed } : p));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !product?.token) return;
    if (mode === "video") void adVideo({ product: product.token, motion, aspectRatio: ratio, seconds, resolution, notes: notes.trim(), estimate: cost });
    else void ad({ product: product.token, format, aspectRatio: ratio, quality, notes: notes.trim(), estimate: cost });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] xl:grid-cols-[34rem_minmax(0,1fr)]">
      <form onSubmit={submit} className="glass flex min-w-0 flex-col gap-6 rounded-[var(--radius-card)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div role="radiogroup" aria-label={a.badge} className="inline-flex rounded-full border border-ink-700 p-1">
            {(["image", "video"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn("rounded-full px-4 py-1.5 text-xs font-semibold transition", mode === m ? "bg-violet-500 text-ink-100" : "text-ink-300 hover:text-ink-100")}
              >
                {a.modes[m]}
              </button>
            ))}
          </div>
          <span dir="ltr" className="rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-violet-200">DIZURA Ads</span>
        </div>

        {/* Product photo */}
        <div>
          <p className="mb-1 text-sm font-semibold text-ink-100">{a.product}</p>
          <p className="mb-3 text-xs text-ink-500">{a.productHint}</p>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => void chooseProduct(e.target.files?.[0])} />
          {product ? (
            <div className="flex items-center gap-4 rounded-2xl border border-violet-400/40 bg-ink-950/50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={product.preview} alt={a.product} className="size-24 rounded-2xl bg-paper object-contain ring-1 ring-ink-700" />
              <div className="flex flex-1 flex-col items-start gap-2 text-xs">
                {product.failed ? (
                  <p role="alert" className="text-danger">{product.failed === "unavailable" ? a.uploadUnavailable : a.uploadFailed}</p>
                ) : product.token ? (
                  <p className="font-semibold text-mint-300">✓</p>
                ) : (
                  <p className="text-ink-300">{a.uploading}</p>
                )}
                <button type="button" onClick={() => fileInput.current?.click()} className="rounded-lg border border-ink-700 px-3 py-1.5 text-ink-300 hover:text-ink-100">
                  {a.replace}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void chooseProduct(e.dataTransfer.files[0]);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-700 bg-ink-950/40 px-4 py-9 text-sm text-ink-300 transition hover:border-violet-400/70 hover:bg-violet-500/[0.06]"
            >
              <span aria-hidden className="grid size-14 place-items-center rounded-full bg-ink-800 text-xl text-ink-100 shadow-[0_8px_24px_-8px_var(--color-ink-950)]">🖼</span>
              <span className="text-base font-semibold text-ink-100">{a.addProduct}</span>
            </button>
          )}
        </div>

        {/* Ad format (image) / camera move (video) */}
        {mode === "video" ? (
          <div role="radiogroup" aria-label={a.motion}>
            <p className="mb-1 text-sm font-semibold text-ink-100">{a.motion}</p>
            <p className="mb-3 text-xs text-ink-500">{a.videoHint}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MOTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={motion === m}
                  onClick={() => setMotion(m)}
                  className={cn("flex items-start gap-2 rounded-xl border p-2.5 text-start transition", motion === m ? "border-violet-400/70 bg-violet-500/15" : "border-ink-700 hover:border-ink-500")}
                >
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-800 text-sm">{MOTION_GLYPH[m]}</span>
                  <span className="min-w-0">
                    <span className={cn("block text-xs font-semibold", motion === m ? "text-mint-300" : "text-ink-100")}>{a.motions[m].name}</span>
                    <span className="block text-[11px] leading-snug text-ink-500">{a.motions[m].hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div role="radiogroup" aria-label={a.format}>
          <p className="mb-3 text-sm font-semibold text-ink-100">{a.format}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {FORMATS.map((f, i) => {
              const on = format === f;
              const src = exampleSrc(`ad-${f}`);
              return (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={a.formats[f].hint}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-xl border-2 text-start transition",
                    on ? "border-mint-500 shadow-[0_0_20px_-6px_var(--color-mint-500)]" : "border-transparent hover:border-ink-500",
                  )}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static example image
                    <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none" />
                  ) : (
                    <span aria-hidden className="absolute inset-0" style={{ background: `var(--art-${i % 6})` }} />
                  )}
                  {on && <span aria-hidden className="absolute end-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-mint-500 text-[11px] font-bold text-ink-950">✓</span>}
                  <span className="relative bg-gradient-to-t from-ink-950/95 to-transparent px-1.5 pb-1.5 pt-6 text-[11px] font-medium leading-tight text-ink-100">{a.formats[f].name}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-500">{a.formats[format].hint}</p>
        </div>
        )}

        {/* Size + quality */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-100">{a.aspect}</p>
            <div role="radiogroup" aria-label={a.aspect} dir="ltr" className="inline-flex rounded-xl border border-ink-700 p-1">
              {AD_RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={ratio === r}
                  onClick={() => setRatio(r)}
                  className={cn("rounded-lg px-2.5 py-1.5 text-xs transition", ratio === r ? "bg-violet-500 font-semibold text-ink-100" : "text-ink-300 hover:text-ink-100")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {mode === "video" ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-100">{a.length}</p>
              <div role="radiogroup" aria-label={a.length} className="inline-flex rounded-xl border border-ink-700 p-1">
                {VIDEO_AD.seconds.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={seconds === n}
                    onClick={() => setSeconds(n)}
                    className={cn("rounded-lg px-2.5 py-1.5 text-xs tabular-nums transition", seconds === n ? "bg-violet-500 font-semibold text-ink-100" : "text-ink-300 hover:text-ink-100")}
                  >
                    {a.seconds.replace("{n}", nf.format(n))}
                  </button>
                ))}
              </div>
            </div>
          ) : (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-100">{a.quality}</p>
            <div role="radiogroup" aria-label={a.quality} className="inline-flex rounded-xl border border-ink-700 p-1">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  role="radio"
                  aria-checked={quality === q}
                  onClick={() => setQuality(q)}
                  className={cn("rounded-lg px-2.5 py-1.5 text-xs transition", quality === q ? "bg-violet-500 font-semibold text-ink-100" : "text-ink-300 hover:text-ink-100")}
                >
                  {a.qualities[q]}
                  <span className={cn("ms-1 text-[10px]", quality === q ? "text-ink-100/70" : "text-ink-500")}>{nf.format(prices.ad[q])}</span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>

        {mode === "video" && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-100">{a.resolution}</p>
            <div role="radiogroup" aria-label={a.resolution} dir="ltr" className="inline-flex rounded-xl border border-ink-700 p-1">
              {MOTION_RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={resolution === r}
                  onClick={() => setResolution(r)}
                  className={cn("rounded-lg px-3 py-1.5 text-xs transition", resolution === r ? "bg-violet-500 font-semibold text-ink-100" : "text-ink-300 hover:text-ink-100")}
                >
                  {r}
                  <span dir="auto" className={cn("ms-1 text-[10px]", resolution === r ? "text-ink-100/70" : "text-ink-500")}>{a.perSecond.replace("{n}", nf.format(prices.adVideo[r]))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink-100">{a.extra}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            dir="auto"
            placeholder={a.extraPlaceholder}
            className="w-full resize-none rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink-700/60 pt-5">
          <span className="inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-xs font-semibold text-ember-300">
            <span className="tabular-nums">{nf.format(cost)}</span>
            <span className="font-normal">{t.gen.credits}</span>
          </span>
          {!product && <span className="text-xs text-ink-500">{a.needProduct}</span>}
          <Button type="submit" disabled={busy || !product?.token} className="ms-auto px-6">
            {busy ? t.gen.generating : mode === "video" ? a.generateVideo : a.generate}
          </Button>
        </div>
        {error && <p role="alert" className="-mt-3 text-sm text-danger">{error}</p>}
      </form>

      <CanvasPanel count={creations.length} guide={t.guide.adsStudio} guideImages={GUIDE_IMAGES}>
        {creations.length === 0 ? (
          <p className="grid aspect-video place-items-center rounded-2xl border border-dashed border-mint-500/25 text-sm text-ink-500">{a.empty}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3" aria-label={t.guide.workspace}>
            {creations.map((c) => (
              <AdCard key={c.key} creation={c} />
            ))}
          </ul>
        )}
      </CanvasPanel>
    </div>
  );
}

function AdCard({ creation: c }: { creation: Creation }) {
  const { t, locale } = useI18n();
  const media = c.outputs[0];
  return (
    <li className="overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-950/50">
      <div className={cn("relative bg-ink-850", RATIO_CLASS[c.ratio])}>
        {media ? (
          media.kind === "video" ? (
            <video src={media.url} controls playsInline loop className="size-full object-cover" aria-label={t.adsStudio.video} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- provider CDN URL
            <img src={media.url} alt={t.adsStudio.ad} className="size-full object-cover" />
          )
        ) : c.status === "failed" ? (
          <p className="grid size-full place-items-center p-3 text-center text-xs text-danger">{c.error}</p>
        ) : (
          <span className="shimmer grid size-full place-items-center">
            <span className="rounded-full bg-ink-950/70 px-3 py-1 text-xs text-ink-300">{c.status === "queued" || c.status === "submitting" ? t.gen.queued : t.gen.generating}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 p-2.5">
        <span className="text-xs font-semibold tabular-nums text-ember-300">{new Intl.NumberFormat(locale).format(c.cost)} {t.gen.credits}</span>
        {media && (
          <a href={media.url} target="_blank" rel="noopener noreferrer" download className="ms-auto rounded-lg border border-ink-700 px-2.5 py-1 text-xs text-ink-300 hover:text-ink-100">
            {t.influencerStudio.gallery.download}
          </a>
        )}
      </div>
    </li>
  );
}
