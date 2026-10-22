import type { Character } from "@/lib/characters/store";

/** What the browser may see about a character (no provider ids). */
export type CharacterView = {
  id: string;
  name: string;
  state: "training" | "ready" | "failed";
  thumbnailUrl: string | null;
  photoCount: number;
  createdAt: string;
};

export const toView = (c: Character): CharacterView => ({
  id: c.id,
  name: c.name,
  state: c.status === "completed" ? "ready" : c.status === "failed" ? "failed" : "training",
  thumbnailUrl: c.thumbnailUrl?.startsWith("https://") ? c.thumbnailUrl : null,
  photoCount: c.photoCount,
  createdAt: c.createdAt,
});

export const isTerminal = (c: Character) => c.status === "completed" || c.status === "failed";
