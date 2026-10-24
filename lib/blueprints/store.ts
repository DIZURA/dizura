import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { BLUEPRINT_GOALS, BLUEPRINT_SECTIONS, type BlueprintGoal, type BlueprintInputs, type BlueprintSection, type Locale } from "@/lib/ai/claude";
import { assertIds, restRows, serviceRest } from "@/lib/supabase/rest";

/** A saved strategy blueprint (ADR 50). Sections fill in independently while generating. */
export type Blueprint = {
  id: string;
  userId: string;
  title: string;
  goal: BlueprintGoal;
  locale: Locale;
  inputs: BlueprintInputs;
  sections: Partial<Record<BlueprintSection, unknown>>;
  tags: string[];
  creditsCharged: number;
  createdAt: string;
  updatedAt: string;
};
export type NewBlueprint = Pick<Blueprint, "userId" | "title" | "goal" | "locale" | "inputs" | "creditsCharged">;
export type BlueprintPatch = Partial<Pick<Blueprint, "title" | "tags">>;

export interface BlueprintStore {
  create(b: NewBlueprint): Promise<Blueprint>;
  list(userId: string): Promise<Blueprint[]>;
  get(id: string, userId: string): Promise<Blueprint | null>;
  update(id: string, userId: string, patch: BlueprintPatch): Promise<void>;
  /** Writes one section only if it is still empty (no overwrite, no double generation). */
  fillSection(id: string, userId: string, section: BlueprintSection, value: unknown): Promise<boolean>;
  remove(id: string, userId: string): Promise<void>;
}

const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  goal: z.enum(BLUEPRINT_GOALS),
  locale: z.enum(["ar", "en"]),
  inputs: z.record(z.string(), z.unknown()),
  strategy: z.unknown().nullable(),
  plan: z.unknown().nullable(),
  scripts: z.unknown().nullable(),
  prompts: z.unknown().nullable(),
  tags: z.array(z.string()),
  credits_charged: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
const fromRow = (r: z.infer<typeof rowSchema>): Blueprint => ({
  id: r.id,
  userId: r.user_id,
  title: r.title,
  goal: r.goal,
  locale: r.locale,
  inputs: r.inputs as BlueprintInputs,
  sections: Object.fromEntries(BLUEPRINT_SECTIONS.flatMap((k) => (r[k] == null ? [] : [[k, r[k]]]))),
  tags: r.tags,
  creditsCharged: r.credits_charged,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

class SupabaseBlueprintStore implements BlueprintStore {
  constructor(private conn: { url: string; key: string }) {}
  private rows(path: string, init?: RequestInit) {
    return restRows(this.conn, path, rowSchema, init, "blueprints");
  }
  async create(b: NewBlueprint) {
    assertIds(b.userId);
    const rows = await this.rows("blueprints", {
      method: "POST",
      body: JSON.stringify({ user_id: b.userId, title: b.title, goal: b.goal, locale: b.locale, inputs: b.inputs, credits_charged: b.creditsCharged }),
    });
    return fromRow(rows[0]!);
  }
  async list(userId: string) {
    assertIds(userId);
    return (await this.rows(`blueprints?user_id=eq.${userId}&order=created_at.desc&limit=100`)).map(fromRow);
  }
  async get(id: string, userId: string) {
    assertIds(id, userId);
    const rows = await this.rows(`blueprints?id=eq.${id}&user_id=eq.${userId}&limit=1`);
    return rows[0] ? fromRow(rows[0]) : null;
  }
  async update(id: string, userId: string, patch: BlueprintPatch) {
    assertIds(id, userId);
    await this.rows(`blueprints?id=eq.${id}&user_id=eq.${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
  }
  async fillSection(id: string, userId: string, section: BlueprintSection, value: unknown) {
    assertIds(id, userId);
    // `<section>=is.null` makes the write conditional: a section is generated (and saved) once.
    const rows = await this.rows(`blueprints?id=eq.${id}&user_id=eq.${userId}&${section}=is.null`, {
      method: "PATCH",
      body: JSON.stringify({ [section]: value, updated_at: new Date().toISOString() }),
    });
    return rows.length > 0;
  }
  async remove(id: string, userId: string) {
    assertIds(id, userId);
    await this.rows(`blueprints?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE" });
  }
}

/** Development-only store (never used in production — see blueprints()). */
class MemoryBlueprintStore implements BlueprintStore {
  private rows = new Map<string, Blueprint>();
  async create(b: NewBlueprint) {
    const now = new Date().toISOString();
    const row: Blueprint = { ...b, id: randomUUID(), sections: {}, tags: [], createdAt: now, updatedAt: now };
    this.rows.set(row.id, row);
    return row;
  }
  async list(userId: string) {
    return [...this.rows.values()].filter((r) => r.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async get(id: string, userId: string) {
    const r = this.rows.get(id);
    return r && r.userId === userId ? r : null;
  }
  async update(id: string, userId: string, patch: BlueprintPatch) {
    const r = await this.get(id, userId);
    if (r) this.rows.set(id, { ...r, ...patch, updatedAt: new Date().toISOString() });
  }
  async fillSection(id: string, userId: string, section: BlueprintSection, value: unknown) {
    const r = await this.get(id, userId);
    if (!r || r.sections[section] !== undefined) return false;
    this.rows.set(id, { ...r, sections: { ...r.sections, [section]: value }, updatedAt: new Date().toISOString() });
    return true;
  }
  async remove(id: string, userId: string) {
    if (await this.get(id, userId)) this.rows.delete(id);
  }
}

let store: BlueprintStore | undefined;
export function blueprints(): BlueprintStore {
  if (store) return store;
  const conn = serviceRest();
  store = conn ? new SupabaseBlueprintStore(conn) : new MemoryBlueprintStore();
  return store;
}
