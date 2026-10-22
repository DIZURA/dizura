"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Accessible modal on native <dialog>: focus trap, Esc to close, backdrop click to close. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto w-[min(92vw,32rem)] rounded-[var(--radius-card)] border border-ink-700 bg-ink-900 p-0 text-ink-100 backdrop:bg-ink-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-ink-700 px-6 py-4">
        <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label={t.common.close} className="rounded-lg p-1 text-ink-300 hover:bg-ink-800 hover:text-ink-100">
          ✕
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
