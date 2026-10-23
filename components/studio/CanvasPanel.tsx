"use client";

import { useId, useState, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { StudioGuide } from "./StudioGuide";

type Guide = Parameters<typeof StudioGuide>[0]["guide"];

/**
 * Right-hand studio canvas: "Workspace" (results) and "How it works" (guide) tabs.
 * Shows the guide until the first result exists, unless the user picks a tab.
 */
export function CanvasPanel({ count, guide, guideImages, children }: { count: number; guide: Guide; guideImages: readonly string[]; children: ReactNode }) {
  const { t, locale } = useI18n();
  const id = useId();
  const [chosen, setChosen] = useState<"workspace" | "how" | null>(null);
  const tab = chosen ?? (count > 0 ? "workspace" : "how");
  const tabs = [
    { key: "workspace" as const, label: t.guide.workspace, badge: count > 0 ? new Intl.NumberFormat(locale).format(count) : null },
    { key: "how" as const, label: t.guide.howItWorks, badge: null },
  ];
  return (
    <aside className="glass min-w-0 rounded-[var(--radius-card)] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
      <div role="tablist" aria-label={t.guide.workspace} className="sticky top-0 z-10 flex gap-1 border-b border-mint-500/15 bg-ink-900/80 px-3 py-2.5 backdrop-blur">
        {tabs.map((x) => (
          <button
            key={x.key}
            id={`${id}-${x.key}`}
            type="button"
            role="tab"
            aria-selected={tab === x.key}
            aria-controls={`${id}-panel`}
            onClick={() => setChosen(x.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              tab === x.key ? "border border-mint-500/40 bg-mint-500/10 text-mint-300" : "border border-transparent text-ink-300 hover:text-ink-100",
            )}
          >
            {x.label}
            {x.badge && <span className="rounded-full bg-ink-800 px-1.5 text-[11px] tabular-nums text-ink-300">{x.badge}</span>}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="p-4 sm:p-5">
        {tab === "how" ? <StudioGuide guide={guide} images={guideImages} /> : children}
      </div>
    </aside>
  );
}
