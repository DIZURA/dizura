"use client";

import { useRef } from "react";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { toJpeg, uploadPhoto } from "./media";

export type ReferencePhotoState = { preview: string; token: string | null; failed: boolean };

/**
 * One reference photo (person, pet, toy, mascot…) the character is made from. Re-encoded to JPEG
 * in the browser (strips EXIF/GPS) and uploaded; the parent only ever holds the signed token.
 */
export function ReferencePhoto({ value, onChange }: { value: ReferencePhotoState | null; onChange: (next: ReferencePhotoState | null) => void }) {
  const { t } = useI18n();
  const p = t.builder.photo;
  const input = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (value) URL.revokeObjectURL(value.preview); // the preview survives unmounts; free it only on replace
    const url = URL.createObjectURL(file);
    onChange({ preview: url, token: null, failed: false });
    const token = await toJpeg(file).then(uploadPhoto).catch(() => null);
    onChange({ preview: url, token, failed: token === null });
  }

  const uploading = value !== null && !value.token && !value.failed;
  return (
    <div className="mb-2 flex items-center gap-3 rounded-2xl border border-dashed border-mint-500/40 bg-ink-950/40 p-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={value ? p.replace : p.choose}
        className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-700 bg-ink-850 text-2xl text-ink-500 transition hover:border-mint-500"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
          <img src={value.preview} alt="" className={cn("size-full object-cover", uploading && "opacity-50")} />
        ) : (
          <span aria-hidden>📷</span>
        )}
        {value?.token && (
          <span aria-hidden className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-mint-500 text-[11px] font-bold text-ink-950">✓</span>
        )}
      </button>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-ink-100">{p.title}</p>
        {value?.failed ? (
          <p role="alert" className="mt-0.5 text-danger">{p.failed}</p>
        ) : uploading ? (
          <p role="status" className="mt-0.5 text-ink-300">{p.uploading}</p>
        ) : (
          <p className="mt-0.5 text-xs leading-snug text-ink-500">{p.hint}</p>
        )}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-2 rounded-lg border border-ink-700 px-3 py-1 text-xs font-semibold text-ink-100 transition hover:border-mint-500"
        >
          {value ? p.replace : p.choose}
        </button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pick(e.target.files).finally(() => (e.target.value = ""))} />
    </div>
  );
}
