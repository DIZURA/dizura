"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
      className={cn("rounded-lg border border-ink-700 px-2.5 py-1 text-[11px] text-ink-300 transition hover:border-mint-500/60 hover:text-ink-100", done && "border-mint-500/60 text-mint-300", className)}
    >
      <span aria-live="polite">{done ? `✓ ${t.blueprints.copied}` : t.blueprints.copy}</span>
    </button>
  );
}
