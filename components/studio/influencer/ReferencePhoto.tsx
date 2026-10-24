"use client";

import { useRef, useState, type DragEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { toJpeg, uploadErrorKind, uploadPhoto } from "./media";

export type ReferencePhotoState = { preview: string; token: string | null; failed: boolean; unavailable?: boolean };

/**
 * One reference photo (person, pet, toy, mascot…) the character is made from. Re-encoded to JPEG
 * in the browser (strips EXIF/GPS) and uploaded; the parent only ever holds the signed token.
 */
export function ReferencePhoto({
  value,
  onChange,
  labels,
}: {
  value: ReferencePhotoState | null;
  onChange: (next: ReferencePhotoState | null) => void;
  /** Overrides the title/hint (e.g. the product photo in swap mode). */
  labels?: { title: string; hint: string };
}) {
  const { t } = useI18n();
  const p = t.builder.photo;
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (value) URL.revokeObjectURL(value.preview); // the preview survives unmounts; free it only on replace
    const url = URL.createObjectURL(file);
    onChange({ preview: url, token: null, failed: false });
    try {
      onChange({ preview: url, token: await toJpeg(file).then(uploadPhoto), failed: false });
    } catch (err) {
      onChange({ preview: url, token: null, failed: true, unavailable: uploadErrorKind(err) === "unavailable" });
    }
  }

  const uploading = value !== null && !value.token && !value.failed;
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      void pick(e.dataTransfer.files);
    },
  };
  const file = (
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pick(e.target.files).finally(() => (e.target.value = ""))} />
  );

  if (!value) {
    return (
      <div
        {...dropProps}
        className={cn(
          "mb-2 rounded-2xl border-2 border-dashed transition",
          over ? "border-violet-400 bg-violet-500/10" : "border-ink-700 bg-ink-950/40 hover:border-violet-400/60",
        )}
      >
        <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-2 px-4 py-8 text-center">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-ink-800 text-xl shadow-[0_8px_24px_-8px_var(--color-ink-950)]">📷</span>
          <span className="text-base font-semibold text-ink-100">{labels?.title ?? p.title}</span>
          <span className="text-sm font-semibold text-violet-300 underline-offset-4 hover:underline">{p.drop}</span>
          <span className="max-w-sm text-xs leading-snug text-ink-500">{labels?.hint ?? p.hint}</span>
          <span className="text-[11px] text-ink-500" dir="auto">{p.formats}</span>
        </button>
        {file}
      </div>
    );
  }

  return (
    <div
      {...dropProps}
      className={cn("mb-2 flex items-center gap-3 rounded-2xl border p-3 transition", over ? "border-violet-400 bg-violet-500/10" : "border-violet-400/40 bg-ink-950/40")}
    >
      <span className="relative block size-24 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-ink-700">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={value.preview} alt="" className={cn("size-full object-cover", uploading && "opacity-50")} />
        {uploading && <span aria-hidden className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-ink-950/40"><span className="block h-full w-1/2 animate-pulse rounded-full bg-violet-400" /></span>}
        {value.token && (
          <span aria-hidden className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-mint-500 text-xs font-bold text-ink-950">✓</span>
        )}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-ink-100">{labels?.title ?? p.title}</p>
        {value.failed ? (
          <p role="alert" className="mt-0.5 text-danger">{value.unavailable ? p.unavailable : p.failed}</p>
        ) : uploading ? (
          <p role="status" className="mt-0.5 text-ink-300">{p.uploading}</p>
        ) : (
          <p className="mt-0.5 text-xs leading-snug text-ink-500">{labels?.hint ?? p.hint}</p>
        )}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-2 rounded-lg border border-ink-600 px-3 py-1 text-xs font-semibold text-ink-100 transition hover:border-violet-400"
        >
          {p.replace}
        </button>
      </div>
      {file}
    </div>
  );
}
