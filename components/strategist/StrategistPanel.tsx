"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { openBuyCredits } from "@/components/billing/events";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import { STRATEGY } from "@/lib/credits/pricing";
import { OPEN_STRATEGIST, readSession, STRATEGIST_CHAT, STRATEGIST_CONTEXT, transcript, writeSession, type ChatTurn } from "./context";
import { RichText } from "./RichText";

const STUDIOS = ["visual-character", "ads-studio", "blueprints"] as const;

/**
 * DIZURA Strategist: a collapsible chat drawer on the inline-end side of every studio. Each reply
 * costs STRATEGY.chatCredits (refunded server-side on failure). The chat lives in sessionStorage;
 * "Turn into blueprint" hands the transcript to the /blueprints wizard as context.
 */
export function StrategistPanel() {
  const { t, locale } = useI18n();
  const s = t.strategist;
  const nf = new Intl.NumberFormat(locale);
  const router = useRouter();
  const pathname = usePathname();
  const studio = STUDIOS.find((x) => pathname.startsWith(`/${x}`)) ?? "visual-character";

  const [open, setOpen] = useState(false);
  // Loaded from sessionStorage on first open (keeps server and client markup identical).
  const [stored, setStored] = useState<ChatTurn[] | null>(null);
  const turns = stored ?? [];
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);

  function show() {
    setStored((cur) => cur ?? readSession<ChatTurn[]>(STRATEGIST_CHAT, []));
    setOpen(true);
  }
  useEffect(() => {
    window.addEventListener(OPEN_STRATEGIST, show);
    return () => window.removeEventListener(OPEN_STRATEGIST, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [stored, busy]);

  function save(next: ChatTurn[]) {
    setStored(next);
    writeSession(STRATEGIST_CHAT, next.length ? next : null);
  }

  async function send(text: string) {
    const content = text.trim().slice(0, STRATEGY.maxMessageChars);
    if (!content || busy) return;
    // Keep the newest turns; the window must start with a user message.
    let history = [...turns, { role: "user", content } satisfies ChatTurn].slice(-(STRATEGY.maxChatTurns - 1));
    while (history[0]?.role === "assistant") history = history.slice(1);
    save([...turns, { role: "user", content }]);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ reply: string }>("/api/strategy/chat", { method: "POST", body: JSON.stringify({ messages: history, locale, studio }) });
      save([...turns, { role: "user", content }, { role: "assistant", content: res.reply }]);
      window.dispatchEvent(new Event(CREDITS_CHANGED));
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "internal";
      save(turns); // drop the unanswered message so the conversation still alternates
      setDraft(content);
      if (code === "insufficient_credits") {
        openBuyCredits("insufficient");
        setError(t.pricing.outOfCredits);
      } else setError(code === "rate_limited" ? t.gen.errors.rate_limited : s.error);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function toBlueprint() {
    writeSession(STRATEGIST_CONTEXT, transcript(turns));
    setOpen(false);
    router.push("/blueprints?new=1");
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-expanded={open}
        aria-controls="strategist"
        className={cn(
          "fixed bottom-5 end-5 z-30 inline-flex items-center gap-2 rounded-full border border-mint-500/50 bg-ink-900 px-4 py-2.5 text-sm font-semibold text-mint-300 shadow-[0_0_32px_-8px_var(--color-mint-500)] transition hover:bg-ink-850",
          open && "pointer-events-none opacity-0",
        )}
      >
        <span aria-hidden>✦</span>
        <span className="hidden sm:inline">{s.open}</span>
      </button>

      <aside
        id="strategist"
        aria-label={s.title}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "fixed inset-y-0 end-0 z-40 flex w-full max-w-md flex-col border-s border-mint-500/20 bg-ink-900 shadow-2xl transition-transform duration-300 motion-reduce:transition-none",
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full",
        )}
      >
        <header className="flex items-start gap-3 border-b border-ink-700 px-5 py-4">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-500/15 text-mint-300">✦</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-xs text-ink-500">{s.subtitle}</p>
          </div>
          {turns.length > 0 && (
            <button type="button" onClick={() => save([])} className="rounded-lg px-2 py-1 text-xs text-ink-300 hover:bg-ink-800 hover:text-ink-100">
              {s.clear}
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} aria-label={s.close} className="rounded-lg p-1 text-ink-300 hover:bg-ink-800 hover:text-ink-100">
            ✕
          </button>
        </header>

        <div ref={log} aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-ink-100">
          {turns.length === 0 && (
            <div>
              <p className="text-ink-300">{s.intro}</p>
              <div className="mt-4 grid gap-2">
                {s.suggestions.map((q) => (
                  <button key={q} type="button" onClick={() => void send(q)} disabled={busy} className="rounded-xl border border-ink-700 px-3 py-2 text-start text-xs text-ink-300 transition hover:border-mint-500/60 hover:text-ink-100">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {turns.map((m, i) =>
            m.role === "user" ? (
              <p key={i} dir="auto" className="ms-8 whitespace-pre-wrap rounded-2xl rounded-se-sm bg-mint-500/10 px-3 py-2 text-ink-100">
                <span className="sr-only">{s.you}: </span>
                {m.content}
              </p>
            ) : (
              <div key={i} dir="auto" className="me-4 rounded-2xl rounded-ss-sm border border-ink-700 bg-ink-950/60 px-3 py-2">
                <span className="sr-only">{s.title}: </span>
                <RichText text={m.content} />
              </div>
            ),
          )}
          {busy && (
            <p role="status" className="me-4 inline-flex items-center gap-2 rounded-2xl border border-ink-700 px-3 py-2 text-ink-500">
              <span aria-hidden className="size-3 animate-spin rounded-full border-2 border-ink-700 border-t-mint-500 motion-reduce:animate-none" />
              {s.thinking}
            </p>
          )}
        </div>

        <footer className="border-t border-ink-700 px-4 pb-4 pt-3">
          {turns.some((m) => m.role === "assistant") && (
            <button type="button" onClick={toBlueprint} className="mb-3 w-full rounded-xl border border-mint-500/40 px-3 py-2 text-xs font-semibold text-mint-300 transition hover:bg-mint-500/10">
              ▤ {s.createBlueprint}
            </button>
          )}
          {error && <p role="alert" className="mb-2 text-xs text-danger">{error}</p>}
          <form onSubmit={submit} className="rounded-2xl border border-mint-500/25 bg-ink-950/60 p-2">
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={STRATEGY.maxMessageChars}
              dir="auto"
              aria-label={s.placeholder}
              placeholder={s.placeholder}
              className="w-full resize-none bg-transparent px-1 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ember-300">⚡ {s.perMessage.replace("{n}", nf.format(STRATEGY.chatCredits))}</span>
              <button type="submit" disabled={busy || !draft.trim()} className="ms-auto rounded-lg bg-mint-500 px-4 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-mint-400 disabled:opacity-40">
                {s.send}
              </button>
            </div>
          </form>
        </footer>
      </aside>
    </>
  );
}
