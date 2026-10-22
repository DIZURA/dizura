"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import type { GeoAuditReport } from "@/types";

export function GeoAuditForm() {
  const { t, locale } = useI18n();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<GeoAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setReport(await api<GeoAuditReport>("/api/geo-audit", { method: "POST", body: JSON.stringify({ url }) }));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }

  const nf = new Intl.NumberFormat(locale);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="text-ink-300">{t.geo.url}</span>
            <input
              required
              type="text"
              inputMode="url"
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-ink-100 placeholder:text-ink-500 focus:border-ember-500 focus:outline-none"
            />
          </label>
          <Button type="submit" disabled={loading}>{loading ? t.geo.running : t.geo.run}</Button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </Card>

      {report && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]" aria-live="polite">
          <Card className="flex flex-col items-center justify-center text-center">
            <span className="text-sm text-ink-300">{t.geo.score}</span>
            <span className={cn("mt-2 text-6xl font-black tabular-nums", report.score >= 70 ? "text-success" : "text-ember-400")}>
              {nf.format(report.score)}
            </span>
            <span dir="ltr" className="mt-3 max-w-full truncate text-xs text-ink-500">{report.url}</span>
          </Card>
          <Card className="p-0">
            <ul className="divide-y divide-ink-700/60">
              {report.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-6 py-3.5">
                  <span aria-hidden className={cn("mt-0.5", c.passed ? "text-success" : "text-ember-400")}>{c.passed ? "✓" : "!"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink-100">
                      {c.label} <span className="sr-only">— {c.passed ? t.geo.passed : t.geo.failed}</span>
                    </p>
                    <p className="truncate text-sm text-ink-500" dir="auto">{c.detail}</p>
                  </div>
                  <span className="rounded-md bg-ink-800 px-2 py-0.5 text-xs uppercase text-ink-300">{c.severity}</span>
                </li>
              ))}
            </ul>
          </Card>
          {report.searchConsole && (
            <Card className="lg:col-span-2">
              <h3 className="mb-3 font-semibold">{t.geo.gsc}</h3>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(
                  [
                    ["Clicks", nf.format(report.searchConsole.clicks)],
                    ["Impressions", nf.format(report.searchConsole.impressions)],
                    ["CTR", new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(report.searchConsole.ctr)],
                    ["Avg. position", new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(report.searchConsole.position)],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-ink-500">{k}</dt>
                    <dd className="text-xl font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
