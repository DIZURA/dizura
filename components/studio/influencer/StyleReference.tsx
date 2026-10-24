"use client";

import { useRef, useState, type DragEvent } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import type { ReferencePhotoState } from "./ReferencePhoto";
import { toJpeg, uploadErrorKind, uploadPhoto } from "./media";

/**
 * "Add style reference": one outfit photo whose clothes and styling the character wears (never
 * its face). Re-encoded to JPEG in the browser (strips EXIF) and uploaded; the parent keeps only
 * the signed token.
 */
export function StyleReference({
  value,
  onChange,
}: {
  value: ReferencePhotoState | null;
  onChange: (next: ReferencePhotoState | null) => void;
}) {
  const { t } = useI18n();
  const s = t.builder.styleRef;
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  async function pick(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (value) URL.revokeObjectURL(value.preview);
    const url = URL.createObjectURL(file);
    onChange({ preview: url, token: null, failed: false });
    try {
      onChange({ preview: url, token: await toJpeg(file).then(uploadPhoto), failed: false });
    } catch (err) {
      onChange({ preview: url, token: null, failed: true, unavailable: uploadErrorKind(err) === "unavailable" });
    }
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    void pick(e.dataTransfer.files[0]);
  }

  function clear() {
    if (value) URL.revokeObjectURL(value.preview);
    onChange(null);
  }

  const file = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        void pick(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (!value) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cn(
          "col-span-full rounded-2xl border-2 border-dashed transition",
          over ? "border-violet-400 bg-violet-500/10" : "border-ink-700 bg-ink-950/40 hover:border-violet-400/60",
        )}
      >
        <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center justify-center gap-4 px-4 py-7 text-start">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-ink-800 text-xl shadow-[0_8px_24px_-8px_var(--color-ink-950)]">🖼</span>
          <span>
            <span className="block text-base font-semibold text-ink-100">{s.add}</span>
            <span className="mt-0.5 block max-w-xs text-xs leading-snug text-ink-500">{s.hint}</span>
          </span>
        </button>
        {file}
      </div>
    );
  }

  const uploading = !value.token && !value.failed;
  return (
    <div className="col-span-full flex items-center gap-3 rounded-2xl border border-violet-400/50 bg-violet-500/10 p-3">
      <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={value.preview} alt="" className={cn("size-full object-cover", uploading && "opacity-50")} />
        {value.token && (
          <span aria-hidden className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-mint-500 text-[11px] font-bold text-ink-950">✓</span>
        )}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink-100">{s.active}</p>
        <p
          role={value.failed ? "alert" : undefined}
          className={cn("mt-0.5 text-xs leading-snug", value.failed ? "text-danger" : "text-ink-300")}
        >
          {value.failed ? (value.unavailable ? s.unavailable : s.failed) : uploading ? s.uploading : s.activeHint}
        </p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => input.current?.click()} className="rounded-lg border border-ink-600 px-2.5 py-1 text-xs font-semibold text-ink-100 hover:border-violet-400">
            {s.replace}
          </button>
          <button type="button" onClick={clear} className="rounded-lg px-2.5 py-1 text-xs text-ink-300 hover:text-ink-100">
            {s.remove}
          </button>
        </div>
      </div>
      {file}
    </div>
  );
}
