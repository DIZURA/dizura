"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { Button, buttonClass } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api, ClientApiError } from "@/lib/api-client";
import { AGENCY_SERVICES, type AgencyServiceId } from "@/lib/credits/pricing";

const IDS = Object.keys(AGENCY_SERVICES) as AgencyServiceId[];
const GLYPH: Record<AgencyServiceId, string> = { single_product: "◎", landing_page: "▭", pod: "✎", shopify: "🛍" };

/** DIZURA Agency: four done-for-you services. Price comes from the server; the client sends only the service id. */
export function AgencyServices({ signedIn }: { signedIn: boolean }) {
  const { t, locale } = useI18n();
  const a = t.agency;
  const [open, setOpen] = useState<AgencyServiceId | null>(null);
  const [form, setForm] = useState({ brand: "", phone: "", link: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = (id: AgencyServiceId) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: AGENCY_SERVICES[id].currency, maximumFractionDigits: 0 }).format(AGENCY_SERVICES[id].price);

  async function order(e: FormEvent) {
    e.preventDefault();
    if (!open || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ redirectUrl: string }>("/api/agency/orders", { method: "POST", body: JSON.stringify({ service: open, brief: form }) });
      window.location.assign(res.redirectUrl);
    } catch (err) {
      setError(err instanceof ClientApiError && err.code === "not_configured" ? a.unavailable : a.error);
      setBusy(false);
    }
  }

  const input = "w-full rounded-xl border border-ink-700 bg-ink-950/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-mint-500/60 focus:outline-none";

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {IDS.map((id) => {
          const s = a.services[id];
          return (
            <li key={id} className="glass flex flex-col rounded-[var(--radius-card)] p-6">
              <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-mint-500/15 text-xl text-mint-300">{GLYPH[id]}</span>
              <h2 className="mt-4 text-lg font-bold">{s.name}</h2>
              <p className="mt-1 text-sm text-ink-300">{s.desc}</p>
              <p className="mt-4 text-3xl font-black text-mint-300" dir="ltr">{price(id)}</p>
              <p className="text-xs text-ink-500">{a.delivery.replace("{n}", new Intl.NumberFormat(locale).format(AGENCY_SERVICES[id].deliveryDays))}</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-300">
                {s.includes.map((x) => (
                  <li key={x} className="flex gap-2"><span aria-hidden className="text-mint-400">✓</span>{x}</li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {signedIn ? (
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      setError(null);
                      setOpen(id);
                    }}
                  >
                    {a.order}
                  </Button>
                ) : (
                  <Link href="/login?next=/agency" className={buttonClass("primary", "w-full")}>{a.signIn}</Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-center text-sm text-ink-500">{a.note}</p>

      <Modal open={open !== null} onClose={() => !busy && setOpen(null)} title={open ? a.popupTitle.replace("{name}", a.services[open].name) : ""}>
        {open && (
          <form onSubmit={order} className="grid gap-4">
            <p className="text-2xl font-black text-mint-300" dir="ltr">{price(open)}</p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{a.brand}</span>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required minLength={2} maxLength={120} dir="auto" className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{a.phone}</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required minLength={6} maxLength={30} pattern="[+\d\s()\-]+" type="tel" inputMode="tel" dir="ltr" autoComplete="tel" className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{a.link}</span>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} maxLength={300} dir="ltr" className={input} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">{a.notes}</span>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={1500} dir="auto" className={`${input} resize-y`} />
            </label>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? a.paying : a.pay}</Button>
            <p className="text-center text-xs text-ink-500">{a.note}</p>
          </form>
        )}
      </Modal>
    </>
  );
}
