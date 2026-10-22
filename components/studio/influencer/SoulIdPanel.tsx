"use client";

import { useEffect, useRef, useState } from "react";
import type { CharacterView } from "@/app/api/characters/view";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { api, ClientApiError } from "@/lib/api-client";
import { SOUL_ID } from "@/lib/credits/pricing";
import type { ApiResult } from "@/types";

type Photo = { key: string; preview: string; state: "uploading" | "uploaded" | "failed"; token?: string };

const MAX_EDGE = 1536;

/** Re-encodes to JPEG ≤ 1536 px: smaller uploads and strips EXIF (e.g. GPS) before anything leaves the device. */
async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.9));
}

async function upload(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  const res = await fetch("/api/uploads/image", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as ApiResult<{ token: string }> | null;
  if (!json?.ok) throw new ClientApiError(json && !json.ok ? json.error.code : "internal", "upload failed");
  return json.data.token;
}

export function SoulIdPanel({
  characters,
  onTrained,
  onDeleted,
}: {
  characters: CharacterView[];
  onTrained: (c: CharacterView) => void;
  onDeleted: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const s = t.soulId;
  const nf = new Intl.NumberFormat(locale);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Release preview object URLs when photos are removed / on unmount.
  const previews = useRef(new Set<string>());
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const ready = photos.filter((p) => p.state === "uploaded" && p.token);
  const uploading = photos.some((p) => p.state === "uploading");
  const canTrain = name.trim().length > 0 && consent && ready.length >= SOUL_ID.minPhotos && !uploading && !submitting;

  function errorText(err: unknown) {
    const code = err instanceof ClientApiError ? err.code : "generic";
    return code in t.gen.errors ? t.gen.errors[code as keyof typeof t.gen.errors] : t.gen.errors.generic;
  }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = SOUL_ID.maxPhotos - photos.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, room));
    const added: Photo[] = picked.map((f) => {
      const preview = URL.createObjectURL(f);
      previews.current.add(preview);
      return { key: crypto.randomUUID(), preview, state: "uploading" };
    });
    setPhotos((p) => [...p, ...added]);
    // Upload 3 at a time.
    let next = 0;
    const worker = async () => {
      while (next < picked.length) {
        const i = next++;
        const photo = added[i]!;
        try {
          const token = await upload(await toJpeg(picked[i]!));
          setPhotos((p) => p.map((x) => (x.key === photo.key ? { ...x, state: "uploaded", token } : x)));
        } catch (err) {
          setPhotos((p) => p.map((x) => (x.key === photo.key ? { ...x, state: "failed" } : x)));
          setError(errorText(err));
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }

  function removePhoto(key: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.key === key);
      if (gone) {
        URL.revokeObjectURL(gone.preview);
        previews.current.delete(gone.preview);
      }
      return p.filter((x) => x.key !== key);
    });
  }

  async function train() {
    if (!canTrain) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api<CharacterView>("/api/characters", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), uploads: ready.map((p) => p.token), consent: true }),
      });
      window.dispatchEvent(new Event(CREDITS_CHANGED));
      onTrained(created);
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setName("");
      setConsent(false);
      setOpen(false);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(c: CharacterView) {
    if (!window.confirm(s.confirmDelete)) return;
    try {
      await api(`/api/characters/${c.id}`, { method: "DELETE" });
      onDeleted(c.id);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <section aria-labelledby="soul-title" className="glass rounded-[var(--radius-card)] p-5 sm:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mint-400">
            {s.badge} <span className="ms-1 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-ink-300">{s.optional}</span>
          </p>
          <h2 id="soul-title" className="mt-1 text-xl font-bold sm:text-2xl">{s.title}</h2>
          <p className="mt-1 text-sm text-ink-300">{s.subtitle}</p>
        </div>
        {!open && characters.length < SOUL_ID.maxCharacters && (
          <Button variant="secondary" onClick={() => setOpen(true)}>+ {s.trainNew}</Button>
        )}
      </header>

      {/* Existing characters */}
      {characters.length > 0 && (
        <ul className="mb-2 flex gap-3 overflow-x-auto pb-1" aria-label={s.yours}>
          {characters.map((c) => (
            <li key={c.id} className="w-32 shrink-0 overflow-hidden rounded-2xl border border-ink-700/70 bg-ink-950/50">
              <div className="relative aspect-[3/4] bg-ink-850">
                {c.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- provider CDN URL
                  <img src={c.thumbnailUrl} alt={c.name} className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-3xl font-black text-mint-500/40">{c.name.slice(0, 1).toUpperCase()}</div>
                )}
                <span
                  className={cn(
                    "absolute start-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur",
                    c.state === "ready" && "bg-mint-500/20 text-mint-300",
                    c.state === "training" && "bg-ink-950/80 text-ink-300",
                    c.state === "failed" && "bg-danger/20 text-danger",
                  )}
                >
                  {c.state === "training" && <span aria-hidden className="size-2.5 animate-spin rounded-full border border-ink-500 border-t-mint-500" />}
                  {c.state === "ready" ? s.ready : c.state === "training" ? s.training : s.failed}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="truncate text-xs font-semibold text-ink-100" dir="auto">{c.name}</span>
                <button type="button" onClick={() => remove(c)} aria-label={`${s.delete} ${c.name}`} className="rounded px-1.5 text-xs text-ink-500 hover:text-danger">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {characters.some((c) => c.state === "training") && <p className="mb-2 text-xs text-ink-500">{s.trainingNote}</p>}
      {characters.length === 0 && !open && <p className="text-sm text-ink-500">{s.none}</p>}

      {/* Train form */}
      {open && (
        <div className="mt-4 rounded-2xl border border-mint-500/20 bg-ink-950/50 p-4 sm:p-5">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-ink-100">{s.name}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              dir="auto"
              placeholder={s.namePlaceholder}
              className="rounded-xl border border-ink-700 bg-ink-800 px-3 py-2.5 text-ink-100 placeholder:text-ink-500 focus:border-mint-500 focus:outline-none sm:max-w-sm"
            />
          </label>

          <p className="mt-5 text-sm font-semibold text-ink-100">
            {s.photos} <span className="font-normal tabular-nums text-ink-500">({nf.format(ready.length)}/{nf.format(SOUL_ID.maxPhotos)})</span>
          </p>
          <p className="mt-1 text-xs text-ink-500">{s.photosHint}</p>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {photos.map((p) => (
              <div key={p.key} className="group relative aspect-square overflow-hidden rounded-xl border border-ink-700">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={p.preview} alt="" className={cn("size-full object-cover", p.state === "uploading" && "opacity-50")} />
                <span
                  className={cn(
                    "absolute inset-x-1 bottom-1 rounded-md px-1 py-0.5 text-center text-[10px] font-semibold backdrop-blur",
                    p.state === "uploaded" && "bg-mint-500/25 text-mint-200",
                    p.state === "uploading" && "bg-ink-950/70 text-ink-300",
                    p.state === "failed" && "bg-danger/30 text-ink-100",
                  )}
                >
                  {p.state === "uploaded" ? s.uploaded : p.state === "uploading" ? s.uploading : s.uploadFailed}
                </span>
                <button
                  type="button"
                  onClick={() => removePhoto(p.key)}
                  aria-label={s.remove}
                  className="absolute end-1 top-1 grid size-6 place-items-center rounded-full bg-ink-950/80 text-xs text-ink-300 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < SOUL_ID.maxPhotos && (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="grid aspect-square place-items-center rounded-xl border border-dashed border-mint-500/40 text-center text-xs text-mint-300 transition hover:bg-mint-500/5"
              >
                <span><span aria-hidden className="block text-xl">＋</span>{s.addPhotos}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <label className="mt-5 flex items-start gap-3 text-sm text-ink-300">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-mint-500" />
            <span>{s.consent}</span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t.common.close}</Button>
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2.5 py-1 text-xs font-semibold text-ember-300">
              <span aria-hidden>⚡</span>
              <span className="tabular-nums">{nf.format(SOUL_ID.trainingCredits)}</span>
              <span className="font-normal">{t.gen.credits}</span>
            </span>
            <Button onClick={train} disabled={!canTrain} className="px-6">
              {submitting ? t.gen.generating : s.train}
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
