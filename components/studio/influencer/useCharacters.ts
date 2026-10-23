"use client";

import { useCallback, useEffect, useState } from "react";
import type { CharacterView } from "@/app/api/characters/view";
import { api } from "@/lib/api-client";

/** The caller's Soul ID characters; re-polls every 10 s while any is still training. */
export function useCharacters() {
  const [list, setList] = useState<CharacterView[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setList(await api<CharacterView[]>("/api/characters"));
    } catch {
      /* keep last known list */
    } finally {
      setLoaded(true);
    }
  }, []);

  // Initial load (state is only set in the async callback, and not after unmount).
  useEffect(() => {
    let cancelled = false;
    api<CharacterView[]>("/api/characters")
      .then((data) => !cancelled && setList(data))
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const training = list.some((c) => c.state === "training");
  useEffect(() => {
    if (!training) return;
    const id = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(id);
  }, [training, refresh]);

  return {
    list,
    loaded,
    refresh,
    add: (c: CharacterView) => setList((l) => [c, ...l]),
    removeLocal: (id: string) => setList((l) => l.filter((c) => c.id !== id)),
  };
}
