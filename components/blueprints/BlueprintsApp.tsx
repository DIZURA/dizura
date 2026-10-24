"use client";

import { usePrices } from "@/components/billing/PricesProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { openBuyCredits } from "@/components/billing/events";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { OPEN_STRATEGIST } from "@/components/strategist/context";
import { Button } from "@/components/ui/Button";
import { CostChip } from "@/components/ui/CostChip";
import { api, ClientApiError } from "@/lib/api-client";
import { BlueprintDoc } from "./BlueprintDoc";
import { BlueprintWizard, type WizardInput } from "./BlueprintWizard";
import { GOAL_GLYPH, SECTIONS, type Blueprint, type BlueprintSection, type BlueprintSummary, type SectionContent, type SectionState } from "./types";

const allStates = (bp: Blueprint | null): Record<BlueprintSection, SectionState> =>
  Object.fromEntries(SECTIONS.map((s) => [s, bp?.sections[s] !== undefined ? "done" : "pending"])) as Record<BlueprintSection, SectionState>;

/** Strategy files: list (search + tags) · wizard (?new=1) · document (?id=…). */
export function BlueprintsApp() {
  const { t, locale } = useI18n();
  const prices = usePrices();
  const b = t.blueprints;
  const nf = new Intl.NumberFormat(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const id = params.get("id");
  const wizard = params.get("new") === "1";

  const [list, setList] = useState<BlueprintSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [states, setStates] = useState(allStates(null));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(new Set<string>());

  const go = useCallback((q: string) => router.push(q ? `${pathname}?${q}` : pathname), [router, pathname]);

  const refresh = useCallback(() => {
    api<BlueprintSummary[]>("/api/blueprints").then(setList).catch(() => setList([]));
  }, []);
  useEffect(refresh, [refresh]);

  /** Generates one section (free — the file was charged once); safe to retry. */
  const generate = useCallback((bpId: string, section: BlueprintSection) => {
    const key = `${bpId}:${section}`;
    if (running.current.has(key)) return;
    running.current.add(key);
    setStates((s) => ({ ...s, [section]: "loading" }));
    api<{ content: SectionContent[typeof section] }>(`/api/blueprints/${bpId}/sections/${section}`, { method: "POST", body: "{}" })
      .then(({ content }) => {
        setBp((cur) => (cur?.id === bpId ? { ...cur, sections: { ...cur.sections, [section]: content } } : cur));
        setStates((s) => ({ ...s, [section]: "done" }));
        setList((l) => l?.map((x) => (x.id === bpId ? { ...x, done: Math.min(SECTIONS.length, x.done + 1) } : x)) ?? l);
      })
      .catch(() => setStates((s) => ({ ...s, [section]: "failed" })))
      .finally(() => running.current.delete(key));
  }, []);

  // Open a file; any section that never finished (e.g. tab closed mid-way) is generated now.
  useEffect(() => {
    if (!id || bp?.id === id) return;
    let live = true;
    api<Blueprint>(`/api/blueprints/${id}`)
      .then((doc) => {
        if (!live) return;
        setBp(doc);
        setStates(allStates(doc));
        SECTIONS.filter((s) => doc.sections[s] === undefined).forEach((s) => generate(doc.id, s));
      })
      .catch(() => live && go(""));
    return () => void (live = false);
  }, [id, bp?.id, generate, go]);

  async function create(input: WizardInput) {
    setCreating(true);
    setError(null);
    try {
      const doc = await api<Blueprint>("/api/blueprints", { method: "POST", body: JSON.stringify({ ...input, locale }) });
      window.dispatchEvent(new Event(CREDITS_CHANGED));
      setBp(doc);
      setStates(allStates(doc));
      SECTIONS.forEach((s) => generate(doc.id, s));
      go(`id=${doc.id}`);
      refresh();
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "internal";
      if (code === "insufficient_credits") {
        openBuyCredits("insufficient");
        setError(t.pricing.outOfCredits);
      } else setError(code in t.gen.errors ? t.gen.errors[code as keyof typeof t.gen.errors] : t.gen.errors.generic);
    } finally {
      setCreating(false);
    }
  }

  async function patch(p: { title?: string; tags?: string[] }) {
    if (!bp) return;
    setBp({ ...bp, ...p });
    await api(`/api/blueprints/${bp.id}`, { method: "PATCH", body: JSON.stringify(p) }).catch(() => undefined);
    refresh();
  }

  async function remove() {
    if (!bp) return;
    await api(`/api/blueprints/${bp.id}`, { method: "DELETE" }).catch(() => undefined);
    setBp(null);
    go("");
    refresh();
  }

  if (wizard) return <BlueprintWizard busy={creating} error={error} onCancel={() => go("")} onCreate={(i) => void create(i)} />;
  if (id) {
    return bp?.id === id ? (
      <BlueprintDoc key={bp.id} bp={bp} states={states} onRetry={(s) => generate(bp.id, s)} onPatch={(p) => void patch(p)} onDelete={() => void remove()} onBack={() => go("")} />
    ) : (
      <div className="shimmer h-96 rounded-[var(--radius-card)]" />
    );
  }

  const q = query.trim().toLowerCase();
  const shown = (list ?? []).filter((x) => !q || x.title.toLowerCase().includes(q) || x.tags.some((tg) => tg.toLowerCase().includes(q)) || b.goals[x.goal].name.toLowerCase().includes(q));

  return (
    <section className="glass rounded-[var(--radius-card)] p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={b.search}
          aria-label={b.search}
          dir="auto"
          className="min-w-0 flex-1 rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none sm:max-w-xs"
        />
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_STRATEGIST))} className="rounded-xl border border-mint-500/40 px-3 py-2 text-xs font-semibold text-mint-300 hover:bg-mint-500/10">
          ✦ {t.strategist.open}
        </button>
        <CostChip value={nf.format(prices.blueprint)} label={t.gen.credits} className="ms-auto" />
        <Button type="button" onClick={() => go("new=1")}>+ {b.new}</Button>
      </div>

      {list === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-700 p-10 text-center text-sm text-ink-500">{b.empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => go(`id=${x.id}`)} className="flex h-full w-full flex-col rounded-2xl border border-ink-700 bg-ink-950/50 p-4 text-start transition hover:border-mint-500/50">
                <span className="flex items-start gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-mint-300">{GOAL_GLYPH[x.goal]}</span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block font-semibold" dir="auto">{x.title}</span>
                    <span className="text-xs text-ink-500">{b.goals[x.goal].name} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(x.createdAt))}</span>
                  </span>
                </span>
                <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  {x.tags.map((tg) => <span key={tg} className="rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-ink-300" dir="auto">{tg}</span>)}
                  <span className="ms-auto text-[11px] tabular-nums text-mint-400">{b.sectionsDone.replace("{n}", nf.format(x.done))}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
