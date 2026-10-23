"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const generate = useCallback(
    async ({ prompt, kind, ratio, durationSec, cost, source, characterId, characterStrength }: GenerateInput) => {
      setError(null);
      const key = crypto.randomUUID();
      setCreations((list) => [
        { key, jobId: null, prompt, kind, ratio, cost, status: "submitting", outputs: [], error: null, animatedFrom: source?.key },
        ...list,
      ]);
      try {
        const job = await api<GenerationJob>("/api/ai/generate", {
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
          }),
        });
        window.dispatchEvent(new Event(CREDITS_CHANGED));
        update(key, { status: job.status, jobId: job.id });
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
        setError(code in t.gen.errors ? t.gen.errors[code as keyof typeof t.gen.errors] : t.gen.errors.generic);
        setCreations((list) => list.filter((c) => c.key !== key));
      }
    },
    [workspace, t],
  );

  return { creations, error, setError, generate, busy: creations.some(isBusy) };
}
