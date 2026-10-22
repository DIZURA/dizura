import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env, NotConfiguredError } from "@/lib/env";
import { ApiError } from "@/lib/http";

/** A Soul ID character. `providerReferenceId` never leaves the server. */
export type CharacterStatus = "uploading" | "not_ready" | "queued" | "in_progress" | "completed" | "failed";
export type Character = {
  id: string;
  userId: string;
  name: string;
  providerReferenceId: string | null;
  status: CharacterStatus;
  thumbnailUrl: string | null;
  failReason: string | null;
  photoCount: number;
  creditsCharged: number;
  createdAt: string;
};
export type NewCharacter = Pick<Character, "userId" | "name" | "photoCount" | "creditsCharged">;
export type CharacterPatch = Partial<Pick<Character, "providerReferenceId" | "status" | "thumbnailUrl" | "failReason">>;

export interface CharacterStore {
  create(c: NewCharacter): Promise<Character>;
  list(userId: string): Promise<Character[]>;
  get(id: string, userId: string): Promise<Character | null>;
  update(id: string, userId: string, patch: CharacterPatch): Promise<void>;
  remove(id: string, userId: string): Promise<void>;
}

const uuid = z.uuid();
const ids = (...values: string[]) => values.forEach((v) => uuid.parse(v)); // guards PostgREST filters

const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  provider_reference_id: z.string().nullable(),
  status: z.enum(["uploading", "not_ready", "queued", "in_progress", "completed", "failed"]),
  thumbnail_url: z.string().nullable(),
  fail_reason: z.string().nullable(),
  photo_count: z.number(),
  credits_charged: z.number(),
  created_at: z.string(),
});
const fromRow = (r: z.infer<typeof rowSchema>): Character => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  providerReferenceId: r.provider_reference_id,
  status: r.status,
  thumbnailUrl: r.thumbnail_url,
  failReason: r.fail_reason,
  photoCount: r.photo_count,
  creditsCharged: r.credits_charged,
  createdAt: r.created_at,
});
const toRow = (p: CharacterPatch) => ({
  ...(p.providerReferenceId !== undefined && { provider_reference_id: p.providerReferenceId }),
  ...(p.status !== undefined && { status: p.status }),
  ...(p.thumbnailUrl !== undefined && { thumbnail_url: p.thumbnailUrl }),
  ...(p.failReason !== undefined && { fail_reason: p.failReason?.slice(0, 500) ?? null }),
  updated_at: new Date().toISOString(),
});

class SupabaseCharacterStore implements CharacterStore {
  constructor(private url: string, private key: string) {}

  private async req(path: string, init: RequestInit = {}) {
    const res = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        authorization: `Bearer ${this.key}`,
        "content-type": "application/json",
        prefer: "return=representation",
        ...init.headers,
      },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[characters] supabase", res.status, (await res.text()).slice(0, 300));
      throw new ApiError("internal", "Character store unavailable.");
    }
    return res.status === 204 ? [] : z.array(rowSchema).parse(await res.json());
  }

  async create(c: NewCharacter) {
    ids(c.userId);
    const rows = await this.req("characters", {
      method: "POST",
      body: JSON.stringify({
        user_id: c.userId, name: c.name, photo_count: c.photoCount, credits_charged: c.creditsCharged,
        status: "uploading", consent_at: new Date().toISOString(),
      }),
    });
    return fromRow(rows[0]!);
  }
  async list(userId: string) {
    ids(userId);
    return (await this.req(`characters?user_id=eq.${userId}&order=created_at.desc&limit=50`)).map(fromRow);
  }
  async get(id: string, userId: string) {
    ids(id, userId);
    const rows = await this.req(`characters?id=eq.${id}&user_id=eq.${userId}&limit=1`);
    return rows[0] ? fromRow(rows[0]) : null;
  }
  async update(id: string, userId: string, patch: CharacterPatch) {
    ids(id, userId);
    await this.req(`characters?id=eq.${id}&user_id=eq.${userId}`, { method: "PATCH", body: JSON.stringify(toRow(patch)) });
  }
  async remove(id: string, userId: string) {
    ids(id, userId);
    await this.req(`characters?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE" });
  }
}

/** Development-only store (never used in production — see characters()). */
class MemoryCharacterStore implements CharacterStore {
  private rows = new Map<string, Character>();
  async create(c: NewCharacter) {
    const row: Character = {
      ...c, id: randomUUID(), providerReferenceId: null, status: "uploading", thumbnailUrl: null, failReason: null,
      createdAt: new Date().toISOString(),
    };
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
  async update(id: string, userId: string, patch: CharacterPatch) {
    const r = await this.get(id, userId);
    if (r) this.rows.set(id, { ...r, ...patch });
  }
  async remove(id: string, userId: string) {
    if (await this.get(id, userId)) this.rows.delete(id);
  }
}

let store: CharacterStore | undefined;
export function characters(): CharacterStore {
  if (store) return store;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    store = new SupabaseCharacterStore(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (env.NODE_ENV !== "production") {
    store = new MemoryCharacterStore();
  } else {
    throw new NotConfiguredError(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  }
  return store;
}
