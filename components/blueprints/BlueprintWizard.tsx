"use client";

import { usePrices } from "@/components/billing/PricesProvider";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { STRATEGIST_CONTEXT, readSession, writeSession } from "@/components/strategist/context";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { CostChip } from "@/components/ui/CostChip";
import { GOAL_GLYPH, GOALS, type BlueprintGoal } from "./types";

export type WizardInput = {
  goal: BlueprintGoal;
  inputs: { product: string; audience: string; market: string; budget: string; tone: string; notes: string; context: string };
};

const FIELDS = ["product", "audience", "market", "budget", "tone"] as const;

/** Goal → business details → confirm (⚡ prices.blueprint). */
export function BlueprintWizard({ busy, error, onCancel, onCreate }: { busy: boolean; error: string | null; onCancel: () => void; onCreate: (input: WizardInput) => void }) {
  const { t, locale } = useI18n();
  const prices = usePrices();
  const b = t.blueprints;
  const nf = new Intl.NumberFormat(locale);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [goal, setGoal] = useState<BlueprintGoal | null>(null);
  const [form, setForm] = useState({ product: "", audience: "", market: "", budget: "", tone: "", notes: "" });
  const [context, setContext] = useState("");


  function next(e: FormEvent) {
    e.preventDefault();
    if (step === 1 && form.product.trim().length >= 2) setStep(2);
  }

  function create() {
    if (!goal || busy) return;
    writeSession(STRATEGIST_CONTEXT, null);
    onCreate({ goal, inputs: { ...form, context } });
  }

  const input = "w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none";

  return (
    <section className="glass rounded-[var(--radius-card)] p-5 sm:p-7">
      <ol aria-hidden className="mb-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <li key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-mint-500" : "bg-ink-800")} />
        ))}
      </ol>

      {step === 0 && (
        <>
          <h2 className="mb-4 text-xl font-bold">{b.goalsTitle}</h2>
          <div role="radiogroup" aria-label={b.goalsTitle} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GOALS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={goal === g}
                onClick={() => {
                  setGoal(g);
                  setContext(readSession<string>(STRATEGIST_CONTEXT, ""));
                  setStep(1);
                }}
                className={cn("rounded-2xl border p-4 text-start transition", goal === g ? "border-mint-500/70 bg-mint-500/10" : "border-ink-700 hover:border-mint-500/40")}
              >
                <span aria-hidden className="mb-3 grid size-10 place-items-center rounded-xl bg-ink-800 text-lg text-mint-300">{GOAL_GLYPH[g]}</span>
                <span className="block font-semibold">{b.goals[g].name}</span>
                <span className="mt-1 block text-xs text-ink-500">{b.goals[g].hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && goal && (
        <form onSubmit={next}>
          <h2 className="mb-1 text-xl font-bold">{b.form.title}</h2>
          <p className="mb-5 text-sm text-mint-300">{GOAL_GLYPH[goal]} {b.goals[goal].name}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f} className={cn("block", f === "product" && "sm:col-span-2")}>
                <span className="mb-1.5 block text-sm font-semibold text-ink-100">{b.form[f]}</span>
                <input
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  required={f === "product"}
                  minLength={f === "product" ? 2 : undefined}
                  maxLength={f === "product" || f === "audience" ? 300 : f === "market" ? 120 : 80}
                  dir="auto"
                  placeholder={b.form[`${f}Hint`]}
                  className={input}
                />
              </label>
            ))}
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-ink-100">{b.form.notes}</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={1000} dir="auto" placeholder={b.form.notesHint} className={cn(input, "resize-y")} />
            </label>
          </div>
          {context && <p className="mt-3 text-xs text-mint-300">✦ {b.form.fromChat}</p>}
          <div className="mt-6 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>{b.back}</Button>
            <Button type="submit" className="ms-auto px-6" disabled={form.product.trim().length < 2}>{b.next}</Button>
          </div>
        </form>
      )}

      {step === 2 && goal && (
        <div>
          <h2 className="mb-2 text-xl font-bold">{b.confirmTitle}</h2>
          <p className="mb-4 text-sm text-ink-300">{b.confirmBody}</p>
          <dl className="mb-5 grid gap-2 rounded-2xl border border-ink-700 bg-ink-950/50 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-ink-500">{b.goalsTitle}</dt><dd>{b.goals[goal].name}</dd></div>
            {FIELDS.filter((f) => form[f].trim()).map((f) => (
              <div key={f}><dt className="text-xs text-ink-500">{b.form[f]}</dt><dd dir="auto" className="break-words">{form[f]}</dd></div>
            ))}
          </dl>
          <ul className="mb-6 flex flex-wrap gap-2 text-xs text-ink-300">
            {(["strategy", "plan", "scripts", "prompts"] as const).map((s) => (
              <li key={s} className="rounded-full border border-ink-700 px-3 py-1">✓ {b.sections[s]}</li>
            ))}
          </ul>
          {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={busy}>{b.back}</Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>{t.common.close}</Button>
            <CostChip value={nf.format(prices.blueprint)} label={t.gen.credits} className="ms-auto" />
            <Button type="button" onClick={create} disabled={busy} className="px-6">{busy ? b.generating : b.create}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
