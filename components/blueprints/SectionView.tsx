"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CopyButton } from "./CopyButton";
import type { BlueprintSection, SectionContent } from "./types";

function Block({ title, children, copy }: { title: string; children: ReactNode; copy?: string }) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-950/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">{title}</h3>
        {copy && <CopyButton text={copy} className="ms-auto" />}
      </div>
      <div className="text-sm leading-relaxed text-ink-100" dir="auto">{children}</div>
    </div>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1 ps-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);

/** Renders one generated blueprint section. Text is rendered as text (never HTML). */
export function SectionView<K extends BlueprintSection>({ section, content }: { section: K; content: SectionContent[K] }) {
  const { t, locale } = useI18n();
  const l = t.blueprints.labels;
  const nf = new Intl.NumberFormat(locale);

  if (section === "strategy") {
    const c = content as SectionContent["strategy"];
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="lg:col-span-2"><Block title={l.summary}><p>{c.summary}</p></Block></div>
        <Block title={l.persona}>
          <p>{c.audience.persona}</p>
          <p className="mt-3 text-xs font-semibold text-ink-300">{l.pains}</p>
          <Bullets items={c.audience.pains} />
          <p className="mt-3 text-xs font-semibold text-ink-300">{l.desires}</p>
          <Bullets items={c.audience.desires} />
        </Block>
        <div className="grid gap-3">
          <Block title={l.positioning}><p>{c.positioning}</p></Block>
          <Block title={l.offer}><p>{c.offer}</p></Block>
        </div>
        <Block title={l.channels}>
          <ul className="space-y-2">{c.channels.map((ch, i) => <li key={i}><span className="font-semibold">{ch.name}</span> — <span className="text-ink-300">{ch.why}</span></li>)}</ul>
        </Block>
        <Block title={l.budgetSplit}>
          <ul className="space-y-2">
            {c.budgetSplit.map((b, i) => (
              <li key={i}>
                <div className="flex justify-between text-xs"><span>{b.channel}</span><span className="tabular-nums text-mint-300">{nf.format(b.percent)}%</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full rounded-full bg-mint-500" style={{ width: `${Math.max(0, Math.min(100, b.percent))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Block>
        <Block title={l.kpis}>
          <ul className="space-y-1">{c.kpis.map((k, i) => <li key={i} className="flex justify-between gap-3"><span>{k.metric}</span><span className="text-end text-ink-300">{k.target}</span></li>)}</ul>
        </Block>
        <Block title={l.risks}><Bullets items={c.risks} /></Block>
      </div>
    );
  }

  if (section === "plan") {
    const c = content as SectionContent["plan"];
    return (
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {c.days.map((d) => (
          <li key={d.day} className="rounded-2xl border border-ink-700 bg-ink-950/50 p-4 text-sm" dir="auto">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-mint-500/15 px-2.5 py-0.5 text-xs font-semibold text-mint-300">{t.blueprints.day.replace("{n}", nf.format(d.day))}</span>
              <span className="text-xs text-ink-300">{d.platform} · {d.format}</span>
            </div>
            <p className="font-semibold">“{d.hook}”</p>
            <p className="mt-1 text-ink-300">{d.idea}</p>
            <p className="mt-2 text-xs text-ember-300">{l.cta}: {d.cta}</p>
          </li>
        ))}
      </ol>
    );
  }

  if (section === "scripts") {
    const c = content as SectionContent["scripts"];
    return (
      <div className="grid gap-3 lg:grid-cols-3">
        {c.scripts.map((s, i) => {
          const full = [s.title, `${l.hook}: ${s.hook}`, s.body, `${l.cta}: ${s.cta}`, `${l.shots}:\n- ${s.shots.join("\n- ")}`].join("\n\n");
          return (
            <article key={i} className="flex flex-col rounded-2xl border border-ink-700 bg-ink-950/50 p-4 text-sm" dir="auto">
              <div className="mb-2 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-xs text-ink-500">{l.angle}: {s.angle} · {l.seconds.replace("{n}", nf.format(s.durationSec))}</p>
                </div>
                <CopyButton text={full} />
              </div>
              <p className="rounded-xl bg-mint-500/10 px-3 py-2 font-semibold text-mint-300">{s.hook}</p>
              <p className="mt-3 whitespace-pre-wrap text-ink-100">{s.body}</p>
              <p className="mt-3 text-xs text-ember-300">{l.cta}: {s.cta}</p>
              <p className="mt-3 text-xs font-semibold text-ink-300">{l.shots}</p>
              <ol className="mt-1 list-decimal space-y-0.5 ps-5 text-xs text-ink-300">{s.shots.map((x, j) => <li key={j}>{x}</li>)}</ol>
              <Link href="/visual-character" className="mt-auto pt-4 text-xs font-semibold text-mint-400 hover:text-mint-300">{t.blueprints.openStudio} →</Link>
            </article>
          );
        })}
      </div>
    );
  }

  const c = content as SectionContent["prompts"];
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {c.formulas.map((f, i) => (
        <article key={i} className="rounded-2xl border border-ink-700 bg-ink-950/50 p-4 text-sm" dir="auto">
          <h3 className="font-semibold">{f.name}</h3>
          <p className="text-xs text-ink-500">{l.useFor}: {f.useFor}</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-300">{l.template}<CopyButton text={f.template} className="ms-auto" /></div>
          <pre dir="ltr" className="mt-1 whitespace-pre-wrap rounded-xl bg-ink-900 p-3 font-mono text-xs text-ink-100">{f.template}</pre>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-ink-300">{l.example}<CopyButton text={f.example} className="ms-auto" /></div>
          <p className="mt-1 text-ink-300">{f.example}</p>
        </article>
      ))}
    </div>
  );
}
