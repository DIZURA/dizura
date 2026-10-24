import "server-only";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/http";
import { serviceRest } from "@/lib/supabase/rest";
import { devSingleton } from "@/lib/dev-singleton";

/**
 * Voiceover files in the private `voiceovers` bucket (migration 0008). Paths are `<userId>/<uuid>.mp3`;
 * the browser only ever gets a sealed token and streams the file through /api/voice/audio/[token].
 */
const BUCKET = "voiceovers";
const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp3$/;
const memory = devSingleton("voiceovers", () => new Map<string, Uint8Array>()); // development only (serviceRest() is null outside prod)

export async function saveVoiceover(userId: string, bytes: Uint8Array): Promise<string> {
  const path = `${userId}/${randomUUID()}.mp3`;
  const conn = serviceRest();
  if (!conn) {
    memory.set(path, bytes);
    return path;
  }
  const res = await fetch(`${conn.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: conn.key, authorization: `Bearer ${conn.key}`, "content-type": "audio/mpeg", "x-upsert": "false" },
    body: new Blob([bytes as BlobPart], { type: "audio/mpeg" }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("[voiceovers] upload failed", res?.status ?? "network");
    throw new ApiError("internal", "Couldn't save the voiceover.");
  }
  return path;
}

export async function readVoiceover(path: string, userId: string): Promise<Uint8Array> {
  if (!PATH_RE.test(path) || !path.startsWith(`${userId}/`)) throw new ApiError("not_found", "Voiceover not found.");
  const conn = serviceRest();
  if (!conn) {
    const bytes = memory.get(path);
    if (!bytes) throw new ApiError("not_found", "Voiceover not found.");
    return bytes;
  }
  const res = await fetch(`${conn.url}/storage/v1/object/authenticated/${BUCKET}/${path}`, {
    headers: { apikey: conn.key, authorization: `Bearer ${conn.key}` },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) throw new ApiError("not_found", "Voiceover not found.");
  return new Uint8Array(await res.arrayBuffer());
}
