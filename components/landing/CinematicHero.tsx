import Link from "next/link";
import type { CSSProperties } from "react";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { WELCOME_CREDITS } from "@/lib/credits/pricing";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Hero3D } from "./Hero3D";

const delay = (s: number) => ({ "--intro-delay": `${s}s` }) as CSSProperties;

/**
 * Full-screen landing hero (ADR 52): a black stage with centred copy, and the DIZURA planet rising
 * from the bottom between mint flame light and violet cloud banks. Entrance ≈ 1.7 s, pure CSS,
 * off for reduced motion. Atmosphere layers live in globals.css (.stage-*).
 */
export function CinematicHero({ t }: { t: Dictionary }) {
  const l = t.landing;
  const h = t.home.hero;
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[38rem] flex-col items-center overflow-hidden bg-ink-950 h-[calc(100svh-3.6rem)]">
      {/* Atmosphere */}
      <div aria-hidden className="stage-stars pointer-events-none absolute inset-x-0 top-0 h-3/5" />
      <div aria-hidden className="stage-flame pointer-events-none absolute inset-x-0 bottom-0 h-[62%] opacity-70" />
      <div aria-hidden className="intro-planet pointer-events-none absolute start-1/2 top-[50%] w-[min(120vw,64rem)] -translate-x-1/2 rtl:translate-x-1/2 sm:top-[46%]">
        <Hero3D className="max-w-none" />
      </div>
      <div aria-hidden className="stage-clouds pointer-events-none absolute inset-x-0 bottom-0 h-[34%] opacity-90" />
      <div aria-hidden className="stage-veil pointer-events-none absolute inset-0" />

      {/* Copy */}
      <div className="relative z-10 mt-[11vh] flex max-w-3xl flex-col items-center px-5 text-center sm:mt-[13vh]">
        <Link
          href="/pricing"
          className="intro-pill inline-flex h-7 items-center gap-2 whitespace-nowrap rounded-full border border-ink-100/15 bg-ink-100/10 pe-3 ps-1 text-xs text-ink-100/90 transition-colors hover:bg-ink-100/15"
        >
          <span className="rounded-full bg-violet-500 px-2.5 py-0.5 text-[11px] font-semibold text-ink-100">{l.pill}</span>
          {h.pill}
          <svg viewBox="0 0 9.5 8" aria-hidden className="flip-rtl h-2 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0.7 4H8.8M5.6 0.75 8.85 4 5.6 7.25" />
          </svg>
        </Link>
        <h1 id="hero-title" className="mt-5 text-balance text-[clamp(2.4rem,6.2vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.015em] text-ink-100">
          <span className="hero-line"><span style={delay(0.34)}>{h.line1}</span></span>
          <span className="hero-line"><span className="text-gradient" style={delay(0.48)}>{h.line2}</span></span>
        </h1>
        <p className="intro-rise mt-5 max-w-xl text-pretty text-[clamp(0.95rem,1.4vw,1.05rem)] leading-relaxed text-ink-100/50" style={{ ...delay(0.86), "--intro-dur": ".7s" } as CSSProperties}>
          {h.sub}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Link href="/login?mode=signup" className={cn(buttonClass("secondary", "intro-btn border-ink-100/90 bg-transparent px-5 hover:border-ink-100 hover:bg-ink-100/10"))} style={delay(1)}>
            {l.try}
          </Link>
          <Link href="#studios" className={cn(buttonClass("primary", "intro-btn px-5"))} style={delay(1.07)}>
            {l.explore}
          </Link>
        </div>
        <p className="intro-rise mt-4 text-xs text-ink-100/60" style={delay(1.15)}>{h.free.replace("{n}", String(WELCOME_CREDITS))}</p>
      </div>
      <a href="#studios" className="intro-rise absolute inset-x-0 bottom-6 z-10 mx-auto flex w-fit items-center gap-2 text-xs text-ink-100/70 hover:text-ink-100" style={delay(1.3)}>
        {h.explore} <span aria-hidden>↓</span>
      </a>
    </section>
  );
}
