"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { openBuyCredits } from "@/components/billing/events";
import { useI18n } from "@/components/i18n/I18nProvider";
import { CREDITS_CHANGED } from "@/components/layout/CreditsBadge";
import { api, ClientApiError } from "@/lib/api-client";
import type { AspectRatio, GeneratedMedia, GenerationJob, JobStatus, MediaKind, Workspace } from "@/types";

export type Creation = {
  key: string;
  /** Signed job handle (set once submitted) — lets a finished image be animated later. */
  jobId: string | null;
  prompt: string;
  kind: MediaKind;
  ratio: AspectRatio;
  cost: number;
  status: JobStatus | "submitting";
  outputs: GeneratedMedia[];
  error: string | null;
  /** Key of the image this video was animated from. */
  animatedFrom?: string;
};

export type GenerateInput = {
  prompt: string;
  kind: MediaKind;
  ratio: AspectRatio;
  durationSec?: number;
  cost: number;
  source?: Creation;
  /** Trained Soul ID character (images only). */
  characterId?: string;
  characterStrength?: number;
  /** Signed upload token of a reference photo the character is made from (images only). */
  referencePhoto?: string;
};

export type TransferInput = {
  /** Signed reference-video token from /api/uploads/video. */
  video: string;
  /** The caller's own completed character images. */
  characters: Creation[];
  /** Signed photo upload tokens. */
  photos: string[];
  resolution: "480p" | "720p" | "1080p";
  prompt: string;
  ratio: AspectRatio;
  /** "swap": the character + product replace the person and product in the reference video. */
  mode: "standard" | "swap";
  /** Signed product photo token (swap mode only). */
  product?: string;
  /** Client-side estimate; replaced by the server's charged amount once submitted. */
  estimate: number;
};

export type AdInput = {
  /** Signed photo upload token for the product. */
  product: string;
  format: string;
  aspectRatio: AspectRatio;
  quality: "standard" | "high" | "ultra";
  notes: string;
  /** Client-side estimate; replaced by the server's charged amount once submitted. */
  estimate: number;
};

export type AdVideoInput = {
  /** Signed photo upload token for the product (becomes the first frame). */
  product: string;
  motion: string;
  aspectRatio: AspectRatio;
  seconds: number;
  resolution: "480p" | "720p" | "1080p";
  notes: string;
  estimate: number;
};

type PollState = { status: JobStatus; outputs: GeneratedMedia[]; error: string | null; creditsRefunded: boolean };

const MAX_POLLS = 120; // ~15 min at the 10 s ceiling
/** Higgsfield guidance: start at 2 s, back off to 10 s, add jitter. */
const pollDelay = (attempt: number) => Math.min(10_000, 2_000 * 1.4 ** attempt) + Math.random() * 500;

export const isBusy = (c: Creation) => c.status === "submitting" || c.status === "queued" || c.status === "processing";

/** Submit -> poll -> result, shared by every studio. Newest creation first. */
export function useGenerator(workspace: Workspace) {
  const { t } = useI18n();
  const [creations, setCreations] = useState<Creation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => void (mounted.current = false);
  }, []);

  const update = (key: string, patch: Partial<Creation>) =>
    setCreations((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  /** Adds a placeholder, submits via `request`, then polls until done (refund handled server-side). */
  const run = useCallback(
    async (meta: Omit<Creation, "key" | "jobId" | "status" | "outputs" | "error">, request: () => Promise<GenerationJob>) => {
      setError(null);
      const key = crypto.randomUUID();
      setCreations((list) => [{ ...meta, key, jobId: null, status: "submitting", outputs: [], error: null }, ...list]);
      try {
        const job = await request();
        window.dispatchEvent(new Event(CREDITS_CHANGED));
        update(key, { status: job.status, jobId: job.id, cost: job.creditsCharged });
        for (let i = 0; i < MAX_POLLS && mounted.current; i++) {
          await new Promise((r) => setTimeout(r, pollDelay(i)));
          const s = await api<PollState>(`/api/ai/jobs/${encodeURIComponent(job.id)}`);
          if (s.status === "completed") return update(key, { status: "completed", outputs: s.outputs });
          if (s.status === "failed" || s.status === "cancelled") {
            if (s.creditsRefunded) window.dispatchEvent(new Event(CREDITS_CHANGED));
            return update(key, { status: "failed", error: s.error === "nsfw" ? t.gen.errors.nsfw : t.gen.failedRefunded });
          }
          update(key, { status: s.status });
        }
      } catch (err) {
        const code = err instanceof ClientApiError ? err.code : "generic";
        if (code === "insufficient_credits") openBuyCredits("insufficient");
        setError(code in t.gen.errors ? t.gen.errors[code as keyof typeof t.gen.errors] : t.gen.errors.generic);
        setCreations((list) => list.filter((c) => c.key !== key));
      }
    },
    [t],
  );

  const generate = useCallback(
    ({ prompt, kind, ratio, durationSec, cost, source, characterId, characterStrength, referencePhoto }: GenerateInput) =>
      run({ prompt, kind, ratio, cost, animatedFrom: source?.key }, () =>
        api<GenerationJob>("/api/ai/generate", {
          method: "POST",
          body: JSON.stringify({
            workspace,
            prompt,
            kind,
            aspectRatio: ratio,
            durationSec: kind === "video" ? durationSec : undefined,
            sourceJob: source?.jobId ?? undefined,
            characterId,
            characterStrength: characterId ? characterStrength : undefined,
            referencePhoto,
          }),
        }),
      ),
    [run, workspace],
  );

  /** Genjutsu motion transfer: the chosen character images perform the uploaded reference video. */
  const transfer = useCallback(
    ({ video, characters, photos, resolution, prompt, ratio, estimate, mode, product }: TransferInput) =>
      run({ prompt, kind: "video", ratio, cost: estimate, animatedFrom: characters[0]?.key }, () =>
        api<GenerationJob>("/api/ai/motion-transfer", {
          method: "POST",
          body: JSON.stringify({ video, characters: characters.map((c) => c.jobId).filter(Boolean), photos, resolution, prompt, mode, product: mode === "swap" ? product : undefined }),
        }),
      ),
    [run],
  );

  /** Ads Creative Studio: Marketing Studio Image ad from the caller's own product photo. */
  const ad = useCallback(
    ({ product, format, aspectRatio, quality, notes, estimate }: AdInput) =>
      run({ prompt: format, kind: "image", ratio: aspectRatio, cost: estimate }, () =>
        api<GenerationJob>("/api/ai/ad", { method: "POST", body: JSON.stringify({ product, format, aspectRatio, quality, notes }) }),
      ),
    [run],
  );

  /** Video ad: WAN 3.0 Prime image-to-video from the caller's own product photo. */
  const adVideo = useCallback(
    ({ product, motion, aspectRatio, seconds, resolution, notes, estimate }: AdVideoInput) =>
      run({ prompt: motion, kind: "video", ratio: aspectRatio, cost: estimate }, () =>
        api<GenerationJob>("/api/ai/ad-video", { method: "POST", body: JSON.stringify({ product, motion, aspectRatio, seconds, resolution, notes }) }),
      ),
    [run],
  );

  return { creations, error, setError, generate, transfer, ad, adVideo, busy: creations.some(isBusy) };
}
