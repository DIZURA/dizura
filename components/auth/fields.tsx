"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";

const inputClass =
  "w-full rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-ink-100 placeholder:text-ink-500 transition focus:border-ember-500 focus:outline-none aria-[invalid=true]:border-danger";

export function TextField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={id} className="text-ink-300">{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass} {...props} />
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function PasswordField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={id} className="text-ink-300">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          dir="ltr"
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputClass} pe-16`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-controls={id}
          aria-pressed={visible}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute inset-y-0 end-0 px-3 text-xs text-ink-300 hover:text-ember-300"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
