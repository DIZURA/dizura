"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrices } from "@/components/billing/PricesProvider";
import { useI18n } from "@/components/i18n/I18nProvider";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { AGENCY_SERVICES, currencyFor, PLAN_IDS, PLANS, VOICE } from "@/lib/credits/pricing";
import { exampleSrc } from "@/components/studio/examples";

/**
 * Home page sections below the hero (ADR 54). Layout, copy and interactions follow the Lovable
 * design ("DIZURA — Display Your Aura"); prices are the live credit prices; images are our own
 * examples until Lovable's new artwork is imported.
 */

const FEATURE_LINKS = ["/visual-character", "/visual-character", "/ads-studio", "/ads-studio", "/visual-character", "/blueprints"] as const;
const FEATURE_IMAGES = ["/influencer/options/tier/bold.webp", exampleSrc("motion-dance"), exampleSrc("ad-luxury"), exampleSrc("motion-unboxing"), null, null] as const;
const EMOTION_IMAGES = ["/influencer/options/expression/confident.webp", "/influencer/options/expression/smile.webp", "/influencer/options/expression/dreamy.webp"];
const KIND_GLYPHS = ["🧑", "🐾", "👽", "🤖", "🧚"];
const STEP_GLYPHS = ["⇪", "◐", "✦", "⇩"];

function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const els = root.current?.querySelectorAll("[data-reveal]");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("revealed"), io.unobserve(e.target))),
      { threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

function Heading({ eyebrow, title, body, center }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={cn("mb-9", center && "text-center")}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {body && <p className={cn("mt-4 max-w-2xl text-pretty leading-relaxed text-ink-300", center && "mx-auto")}>{body}</p>}
    </div>
  );
}

function Go({ href, children, secondary }: { href: string; children: ReactNode; secondary?: boolean }) {
  return (
    <Link href={href} className={buttonClass(secondary ? "secondary" : "primary", "rounded-full px-6")}>
      {children}
      <span aria-hidden className="flip-rtl">↗</span>
    </Link>
  );
}

function Cost({ n, unit }: { n: number; unit: string }) {
  const { t, locale } = useI18n();
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className="rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 font-semibold text-ember-300">
        {n === 1 ? t.home.credit : t.home.credits.replace("{n}", n.toLocaleString(locale))}
      </span>
      <span className="text-ink-500">{unit}</span>
    </span>
  );
}

function Waveform({ seed, playing }: { seed: number; playing: boolean }) {
  return (
    <div aria-hidden className={cn("flex h-24 w-full items-center justify-center gap-[5px] overflow-hidden", playing && "is-playing")}>
      {Array.from({ length: 44 }, (_, i) => (
        <span key={i} className="wave-bar" style={{ height: `${20 + (((i * 7 + seed * 3) % 9) * 9)}%`, animationDuration: `${0.85 + (seed % 3) * 0.4}s` }} />
      ))}
    </div>
  );
}

export function HomeSections() {
  const { t, locale } = useI18n();
  const h = t.home;
  const prices = usePrices();
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);

  const [feature, setFeature] = useState(0);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState(0);
  const [look, setLook] = useState(0);
  const [emotion, setEmotion] = useState(0);
  const [split, setSplit] = useState(48);
  const [fileTab, setFileTab] = useState(0);
  const [dialect, setDialect] = useState(2);
  const [playing, setPlaying] = useState(true);
  const [faq, setFaq] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const chat = useRef<HTMLDivElement>(null);
  const [chatSeen, setChatSeen] = useState(false);

  useEffect(() => {
    const el = chat.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setChatSeen(true), io.disconnect()), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!chatSeen) return;
    const answer = h.strategist.answer;
    const step = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? answer.length : 3;
    let n = 0;
    const timer = window.setInterval(() => {
      n += step;
      setTyped(answer.slice(0, n));
      if (n >= answer.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [chatSeen, h.strategist.answer]);

  const f = h.create.features[feature]!;
  const featureCost = [
    { n: prices.image },
    { n: prices.motion["480p"] },
    { n: prices.ad.standard },
    { n: prices.adVideo["480p"] },
    { n: Math.max(VOICE.minCredits, prices.voicePer100) },
    { n: prices.blueprint },
  ][feature]!.n;
  const featureImage = FEATURE_IMAGES[feature];
  const currency = currencyFor(locale);
  const money = (v: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => (v[k] ?? 0).toLocaleString(locale));

  return (
    <div ref={root}>
      {/* Trust strip */}
      <section className="border-y border-ink-700/70 bg-ink-900/60">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-5 py-7 lg:grid-cols-4">
          {h.trust.map((x, i) => (
            <li key={x} className="flex items-center justify-center gap-3 text-center text-xs sm:text-sm">
              <span aria-hidden className={cn("text-lg", i % 2 ? "text-mint-400" : "text-violet-300")}>{["◎", "♫", "↺", "✓"][i]}</span>
              {x}
            </li>
          ))}
        </ul>
      </section>

      {/* What you can make */}
      <section id="studios" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:py-24" data-reveal>
        <Heading eyebrow={h.create.eyebrow} title={h.create.title} body={h.create.body} />
        <div role="tablist" aria-label={h.create.title} className="mb-7 flex flex-wrap gap-2">
          {h.create.features.map((x, i) => (
            <button
              key={x.label}
              type="button"
              role="tab"
              id={`feature-${i}`}
              aria-selected={feature === i}
              aria-controls="feature-panel"
              onClick={() => setFeature(i)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm transition",
                feature === i ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-ink-700 text-ink-300 hover:text-ink-100",
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div id="feature-panel" role="tabpanel" aria-labelledby={`feature-${feature}`} className="grid overflow-hidden rounded-3xl border border-violet-500/25 bg-ink-900 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative min-h-80 overflow-hidden bg-ink-850 lg:min-h-[29rem]">
            {feature === 4 ? (
              <div className="flex h-full min-h-80 flex-col items-center justify-center gap-7 px-8">
                <span aria-hidden className="text-4xl text-violet-300">♫</span>
                <Waveform seed={dialect} playing />
                <p className="text-sm text-ink-300">{h.create.voiceLine}</p>
              </div>
            ) : feature === 5 ? (
              <div className="m-6 space-y-4 rounded-2xl border border-violet-500/30 bg-ink-950 p-7 sm:m-8">
                <p className="text-lg font-semibold">{h.create.fileTitle}</p>
                {h.strategist.tabs.map((x, i) => (
                  <div key={x} className="border-t border-ink-700 pt-3">
                    <p className="text-sm">0{i + 1} — {x}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-300">{h.strategist.details[i]}</p>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {featureImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- static example image
                  <img key={featureImage} src={featureImage} alt={f.label} loading="lazy" className="absolute inset-0 size-full object-cover" />
                )}
                {(feature === 1 || feature === 3) && (
                  <span className="absolute bottom-5 start-5 flex items-center gap-2 rounded-full border border-ink-100/20 bg-ink-950/80 px-3 py-2 text-xs">
                    <span aria-hidden className="text-mint-400">▶</span>
                    {feature === 3 ? h.create.cameraPreview : h.create.motionPreview}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <h3 className="text-2xl font-semibold leading-snug">{f.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-ink-300">{f.body}</p>
            <ul className="my-6 space-y-3">
              {f.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm">
                  <span aria-hidden className="text-violet-300">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="mb-6">
              <Cost n={featureCost} unit={f.unit} />
            </div>
            <div>
              <Go href={FEATURE_LINKS[feature] ?? "/visual-character"}>{h.create.tryIt}</Go>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-ink-700/70 bg-ink-900/40 py-20" data-reveal>
        <div className="mx-auto max-w-6xl px-5">
          <Heading eyebrow={h.steps.eyebrow} title={h.steps.title} />
          <ol className="grid gap-5 md:grid-cols-4">
            {h.steps.items.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  aria-pressed={step === i}
                  onClick={() => setStep(i)}
                  onMouseEnter={() => setStep(i)}
                  className="relative flex w-full flex-col items-start pt-6 text-start"
                >
                  <span aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5 rounded-full", step === i ? "step-line-active" : "bg-ink-700")} />
                  <span className={cn("mb-5 grid size-12 place-items-center rounded-full border text-lg transition", step === i ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-ink-700 text-ink-500")}>
                    {STEP_GLYPHS[i]}
                  </span>
                  <span className="text-xs text-ink-500">0{i + 1}</span>
                  <span className="mt-1 font-semibold">{s.title}</span>
                  <span className="mt-2 text-sm leading-relaxed text-ink-300">{s.body}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Character spotlight */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:py-24 lg:grid-cols-2" data-reveal>
        <div>
          <Heading eyebrow={h.character.eyebrow} title={h.character.title} body={h.character.body} />
          <ul className="mb-8 space-y-4 text-sm text-ink-300">
            {h.character.points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span aria-hidden className="text-mint-400">✦</span>
                {p}
              </li>
            ))}
          </ul>
          <Go href="/visual-character">{h.character.cta}</Go>
        </div>
        <div className="overflow-hidden rounded-3xl border border-violet-500/30 bg-ink-900 shadow-duo">
          <div className="flex items-center justify-between border-b border-ink-700 p-4 text-xs">
            <span className="flex items-center gap-2"><span aria-hidden className="size-2 rounded-full bg-mint-500" />DIZURA Character</span>
            <span className="text-violet-300">{h.character.sample}</span>
          </div>
          <div className="grid sm:grid-cols-[1fr_0.9fr]">
            <div className="relative aspect-square overflow-hidden bg-paper sm:aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element -- static option photo */}
              <img
                src={EMOTION_IMAGES[emotion] ?? EMOTION_IMAGES[0]}
                alt={`${h.character.kinds[kind]} · ${h.character.looks[look]} · ${h.character.emotions[emotion]}`}
                loading="lazy"
                className={cn("size-full object-cover transition duration-300 motion-reduce:transition-none", `builder-look-${look}`)}
              />
              <span aria-hidden className="absolute end-3 top-3 grid size-10 place-items-center rounded-full bg-ink-950/80 text-xl">{KIND_GLYPHS[kind]}</span>
              <span className="absolute bottom-3 start-3 rounded-full bg-ink-950/85 px-3 py-1.5 text-xs">
                {h.character.kinds[kind]} · {h.character.looks[look]} · {h.character.emotions[emotion]}
              </span>
            </div>
            <div className="space-y-5 p-5">
              {([
                [h.character.kind, h.character.kinds, kind, setKind],
                [h.character.look, h.character.looks, look, setLook],
                [h.character.emotion, h.character.emotions, emotion, setEmotion],
              ] as const).map(([label, options, value, set]) => (
                <div key={label}>
                  <p className="mb-2 text-xs text-ink-500">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((o, j) => (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={value === j}
                        onClick={() => set(j)}
                        className={cn("rounded-full border px-2.5 py-1 text-[11px] transition", value === j ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-ink-700 text-ink-300 hover:text-ink-100")}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Cost n={prices.image} unit={h.create.features[0]!.unit} />
            </div>
          </div>
        </div>
      </section>

      {/* Ads spotlight */}
      <section className="border-y border-ink-700/70 bg-ink-900/40" data-reveal>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:py-24 lg:grid-cols-2">
          <div className="lg:order-2">
            <Heading eyebrow={h.ads.eyebrow} title={h.ads.title} body={h.ads.body} />
            <p className="mb-2 text-sm font-semibold">{h.ads.imageTitle}</p>
            <p className="mb-5 text-sm leading-loose text-ink-300">{h.ads.imageList}</p>
            <p className="text-sm font-semibold text-violet-300">{h.ads.videoTitle}</p>
            <p className="mb-7 mt-2 text-sm leading-loose text-ink-300">{h.ads.videoList}</p>
            <Go href="/ads-studio">{h.ads.cta}</Go>
          </div>
          <div className="lg:order-1">
            <div dir="ltr" className="relative aspect-square overflow-hidden rounded-3xl border border-violet-500/30 bg-ink-850">
              {/* eslint-disable-next-line @next/next/no-img-element -- static example image */}
              <img src={exampleSrc("ad-studio") ?? undefined} alt={h.ads.after} loading="lazy" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static example image */}
                <img src={exampleSrc("how-ads-1") ?? undefined} alt={h.ads.before} loading="lazy" className="absolute inset-0 size-full object-cover" />
              </div>
              <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink-100" style={{ left: `${split}%` }}>
                <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ink-100 bg-violet-500 text-sm">↔</span>
              </div>
              <span className="absolute left-4 top-4 rounded-full bg-ink-950/85 px-3 py-1.5 text-xs">{h.ads.before}</span>
              <span className="absolute right-4 top-4 rounded-full bg-ink-950/85 px-3 py-1.5 text-xs text-violet-300">{h.ads.after}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
                aria-label={h.ads.compare}
                className="absolute inset-0 size-full cursor-ew-resize opacity-0"
              />
            </div>
            <p className="mt-3 text-center text-xs text-ink-500">{h.ads.caption}</p>
          </div>
        </div>
      </section>

      {/* Strategist */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24" data-reveal>
        <Heading eyebrow={h.strategist.eyebrow} title={h.strategist.title} body={h.strategist.body} />
        <div className="grid gap-8 lg:grid-cols-2">
          <div ref={chat} className="rounded-3xl border border-violet-500/30 bg-ink-900 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span aria-hidden className="grid size-9 place-items-center rounded-full bg-violet-500/20 text-violet-300">✦</span>
              <span className="text-sm font-semibold">DIZURA Strategist</span>
              <span className="ms-auto text-[10px] text-ink-500">{h.strategist.sample}</span>
            </div>
            <p className="ms-8 rounded-2xl rounded-se-sm bg-violet-700/50 p-4 text-sm leading-relaxed" dir="auto">{h.strategist.question}</p>
            <div className="me-5 mt-4 min-h-44 rounded-2xl rounded-ss-sm border border-ink-700 p-4">
              <p className="text-sm leading-loose text-ink-300" dir="auto">
                {typed}
                <span aria-hidden className="typing-cursor text-mint-400">▎</span>
              </p>
            </div>
            <div className="mt-5"><Cost n={prices.chat} unit={h.strategist.perMessage} /></div>
          </div>
          <div>
            <div role="tablist" aria-label={h.strategist.eyebrow} className="grid grid-cols-2 gap-3">
              {h.strategist.tabs.map((x, i) => (
                <button
                  key={x}
                  type="button"
                  role="tab"
                  aria-selected={fileTab === i}
                  onClick={() => setFileTab(i)}
                  className={cn("flex min-h-24 flex-col items-start rounded-2xl border p-4 text-start text-sm transition", fileTab === i ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-ink-700 hover:border-ink-500")}
                >
                  <span aria-hidden className="mb-2 text-violet-300">▤</span>
                  {x}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="my-5 min-h-20 border-s-2 border-violet-500 ps-4">
              <p className="text-sm font-semibold">{h.strategist.tabs[fileTab]}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{h.strategist.details[fileTab]}</p>
            </div>
            <Go href="/blueprints" secondary>{h.strategist.cta}</Go>
          </div>
        </div>
      </section>

      {/* Voice */}
      <section className="border-y border-ink-700/70 bg-ink-900/40 py-20 text-center" data-reveal>
        <div className="mx-auto max-w-4xl px-5">
          <Heading eyebrow={h.voice.eyebrow} title={h.voice.title} body={h.voice.body} center />
          <div className="mb-7 flex flex-wrap justify-center gap-2">
            {h.voice.dialects.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={dialect === i}
                onClick={() => {
                  setDialect(i);
                  setPlaying(true);
                }}
                className={cn("rounded-full border px-4 py-2 text-sm transition", dialect === i ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-ink-700 text-ink-300 hover:text-ink-100")}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="mx-auto flex max-w-2xl items-center gap-5">
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? h.voice.pause : h.voice.play} className="grid size-11 shrink-0 place-items-center rounded-full border border-violet-500/40 bg-violet-500/15 text-violet-200">
              {playing ? "Ⅱ" : "▶"}
            </button>
            <Waveform seed={dialect} playing={playing} />
          </div>
          <p className="mt-5 min-h-8 text-sm text-violet-300" dir="auto">“{h.voice.samples[dialect]}”</p>
          <div className="mt-5"><Go href="/visual-character" secondary>{h.voice.cta}</Go></div>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-24" data-reveal>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <Heading eyebrow={h.plans.eyebrow} title={h.plans.title} />
          <Link href="/pricing" className="mb-9 text-sm font-semibold text-violet-300 hover:text-violet-200">{h.plans.all} <span aria-hidden className="flip-rtl inline-block">↗</span></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            return (
              <div key={id} className={cn("relative rounded-2xl border bg-ink-900 p-6", plan.popular ? "border-violet-400 shadow-duo" : "border-ink-700")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{t.pricing.plans[id]}</h3>
                  {plan.popular && <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[10px] text-violet-200">{t.pricing.popular}</span>}
                </div>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums">{money(plan.prices[currency])}</span>
                  <span className="text-sm text-ink-500">{t.pricing.perMonth}</span>
                </p>
                <p className="my-5 text-sm text-mint-300">{t.pricing.creditsPerMonth.replace("{n}", plan.credits.toLocaleString(locale))}</p>
                <Go href="/pricing" secondary={!plan.popular}>{h.plans.choose}</Go>
                <p className="mt-5 text-xs text-ink-500">{h.plans.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Agency band */}
      <section className="border-y border-violet-500/25 bg-violet-900/30" data-reveal>
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-7 px-5 py-10 lg:flex-row lg:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">DIZURA Agency</p>
            <h2 className="text-2xl font-semibold">{h.agency.title}</h2>
            <p className="mt-3 text-sm leading-loose text-ink-300">{h.agency.list}</p>
            <p className="mt-2 text-sm text-violet-300">{fill(h.agency.price, { n: AGENCY_SERVICES.single_product.price })}</p>
          </div>
          <div><Go href="/agency" secondary>{h.agency.cta}</Go></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-20 sm:py-24 lg:grid-cols-[.8fr_1.2fr]" data-reveal>
        <Heading eyebrow={h.faq.eyebrow} title={h.faq.title} />
        <div>
          {h.faq.items.map((x, i) => (
            <div key={x.q} className="border-b border-ink-700">
              <button
                type="button"
                onClick={() => setFaq(faq === i ? null : i)}
                aria-expanded={faq === i}
                aria-controls={`faq-${i}`}
                className="flex min-h-16 w-full items-center justify-between gap-5 py-5 text-start text-sm transition hover:text-violet-200"
              >
                {x.q}
                <span aria-hidden className={cn("shrink-0 transition-transform motion-reduce:transition-none", faq === i && "rotate-180")}>⌄</span>
              </button>
              <div id={`faq-${i}`} hidden={faq !== i}>
                <p className="pb-6 pe-8 text-sm leading-loose text-ink-300">
                  {fill(x.a, { img: prices.image, ad: prices.ad.standard, motion: prices.motion["480p"] })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-signature text-ink-950" data-reveal>
        <div className="mx-auto max-w-6xl px-5 py-16 text-center">
          <span aria-hidden className="text-3xl">✦</span>
          <h2 className="mt-4 text-3xl font-semibold leading-snug sm:text-4xl">{h.final.title}</h2>
          <p className="mt-4 text-sm">{h.final.body}</p>
          <Link href="/login?mode=signup" className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink-950 px-7 text-sm font-semibold text-ink-100 transition hover:bg-ink-900">
            {h.final.cta}
            <span aria-hidden className="flip-rtl">↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
