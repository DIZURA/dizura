"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { Studio, type Idea } from "./Studio";

/** Preset -> camera direction appended to the prompt (English for the model). */
export const MOTIONS = {
  dollyIn: "slow cinematic dolly-in camera move toward the subject",
  dollyOut: "slow dolly-out camera move revealing the surroundings",
  orbit: "smooth 360-degree orbit camera move around the subject",
  craneUp: "crane shot rising upward over the scene",
  pan: "slow horizontal camera pan across the scene",
  crashZoom: "sudden fast crash zoom into the subject",
  tiltUp: "camera tilts up from the ground to reveal the subject",
  handheld: "handheld camera with subtle natural shake",
  fpv: "fast FPV drone flight swooping through the scene",
  barrelRoll: "camera barrel roll rotating around its axis",
} as const;
type MotionKey = keyof typeof MOTIONS;

export function MotionPreview({ motion, className }: { motion: MotionKey; className?: string }) {
  return (
    <span aria-hidden className={cn("relative block overflow-hidden", className)}>
      <span className={cn("motion-scene", `m-${motion}`)} />
    </span>
  );
}

export function MotionStudio({ ideas }: { ideas: Idea[] }) {
  const { t } = useI18n();
  const [motion, setMotion] = useState<MotionKey>("dollyIn");

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="motion-pick" className="rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900 p-4 sm:p-5">
        <h2 id="motion-pick" className="mb-3 text-sm font-semibold">{t.motion.pick}</h2>
        <div role="radiogroup" aria-labelledby="motion-pick" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(MOTIONS) as MotionKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={motion === key}
              onClick={() => setMotion(key)}
              className={cn(
                "group overflow-hidden rounded-2xl border text-start transition",
                motion === key ? "border-ember-500 ring-2 ring-ember-500/30" : "border-ink-700/60 hover:border-ink-500",
              )}
            >
              <MotionPreview motion={key} className="aspect-video" />
              <span className={cn("block px-3 py-2 text-sm", motion === key ? "text-ember-300" : "text-ink-300 group-hover:text-ink-100")}>
                {t.motion.presets[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-ink-700 p-4">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-800 text-lg text-ink-500">⇪</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-300">{t.studio.uploadTitle}</p>
            <p className="text-xs text-ink-500">{t.studio.uploadBody}</p>
          </div>
          <span className="rounded-full bg-ink-800 px-2.5 py-1 text-xs text-ink-300">{t.studio.comingSoon}</span>
        </div>
      </section>

      <Studio
        workspace="motion"
        kinds={["video"]}
        basePrompt={MOTIONS[motion]}
        ideas={ideas}
        chip={
          <span className="inline-flex items-center gap-2 rounded-full border border-ember-500/40 bg-ember-500/10 py-0.5 pe-3 ps-0.5 text-xs text-ember-300">
            <MotionPreview motion={motion} className="size-6 rounded-full" />
            {t.motion.presets[motion]}
          </span>
        }
      />
    </div>
  );
}
