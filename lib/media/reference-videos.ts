import "server-only";
import { randomUUID } from "node:crypto";
import { env, NotConfiguredError } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { GENJUTSU } from "@/lib/credits/pricing";
import { looksLikeMp4, mp4DurationSeconds } from "./mp4";

/**
 * Reference videos for Genjutsu motion transfer. The browser uploads straight to private
 * storage with a single-use signed URL (videos exceed the ~6 MB function body limit); the server
 * reads only the MP4 header to get the real duration (which sets the price) and hands the
 * provider a short-lived signed download URL. Objects live under `<userId>/` in a private bucket
 * with no client policies — only the service role can read them.
 */
export const VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];

export type VideoUpload = { path: string; uploadUrl: string; headers: Record<string, string> };
export type VideoInfo = { durationSec: number; bytes: number };

interface ReferenceVideoStore {
  createUpload(userId: string, type: VideoType): Promise<VideoUpload>;
  /** Validates the stored file and returns its duration; throws bad_request for unusable files. */
  inspect(path: string): Promise<VideoInfo>;
  /** Short-lived https URL the provider can fetch. */
  signedUrl(path: string, expiresInSec: number): Promise<string>;
}

const BUCKET = "reference-videos";
const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|mov)$/;

export function assertOwnPath(path: string, userId: string) {
  if (!PATH_RE.test(path) || !path.startsWith(`${userId}/`)) throw new ApiError("not_found", "Video not found.");
}

async function inspectWith(read: (offset: number, length: number) => Promise<Uint8Array>, bytes: number): Promise<VideoInfo> {
  if (bytes <= 0) throw new ApiError("bad_request", "The video upload didn't finish. Please upload it again.");
  if (bytes > GENJUTSU.maxVideoBytes) throw new ApiError("bad_request", "Video is too large.");
  if (!looksLikeMp4(await read(0, 16))) throw new ApiError("bad_request", "Only MP4 or MOV videos are supported.");
  const durationSec = await mp4DurationSeconds(read, bytes);
  if (durationSec === null) throw new ApiError("bad_request", "We couldn't read this video. Try exporting it as MP4.");
  if (durationSec < GENJUTSU.minSeconds) throw new ApiError("bad_request", `The reference video must be at least ${GENJUTSU.minSeconds} seconds.`);
  return { durationSec, bytes };
}

class SupabaseVideoStore implements ReferenceVideoStore {
  private readonly storage: string;
  constructor(url: string, private readonly key: string) {
    this.storage = `${url.replace(/\/$/, "")}/storage/v1`;
  }
  private auth(extra: Record<string, string> = {}) {
    return { apikey: this.key, authorization: `Bearer ${this.key}`, ...extra };
  }
  private async call(path: string, init: RequestInit) {
    const res = await fetch(`${this.storage}${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (!res || (!res.ok && res.status !== 206)) {
      console.error("[storage] request failed", res?.status ?? "network", path.split("?")[0]);
      throw new ApiError(res?.status === 404 || res?.status === 400 ? "not_found" : "internal", "Video not found.");
    }
    return res;
  }

  async createUpload(userId: string, type: VideoType): Promise<VideoUpload> {
    const path = `${userId}/${randomUUID()}.${type === "video/quicktime" ? "mov" : "mp4"}`;
    const res = await this.call(`/object/upload/sign/${BUCKET}/${path}`, { method: "POST", headers: this.auth() });
    const { url } = (await res.json()) as { url?: string };
    if (!url?.startsWith("/object/upload/sign/")) throw new ApiError("internal", "Upload unavailable.");
    // Same headers storage-js sends for uploadToSignedUrl; the apikey is the public publishable key.
    const headers: Record<string, string> = { "content-type": type, "x-upsert": "false", "cache-control": "max-age=3600" };
    if (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) headers.apikey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    return { path, uploadUrl: `${this.storage}${url}`, headers };
  }

  private async range(path: string, offset: number, length: number) {
    const res = await this.call(`/object/authenticated/${BUCKET}/${path}`, {
      headers: this.auth({ range: `bytes=${offset}-${offset + length - 1}` }),
    });
    const total = Number(res.headers.get("content-range")?.split("/")[1] ?? res.headers.get("content-length") ?? 0);
    return { bytes: new Uint8Array(await res.arrayBuffer()).slice(0, length), total };
  }

  async inspect(path: string): Promise<VideoInfo> {
    const first = await this.range(path, 0, 16);
    return inspectWith(async (o, l) => (o === 0 && l <= 16 ? first.bytes : (await this.range(path, o, l)).bytes), first.total);
  }

  async signedUrl(path: string, expiresInSec: number): Promise<string> {
    const res = await this.call(`/object/sign/${BUCKET}/${path}`, {
      method: "POST",
      headers: this.auth({ "content-type": "application/json" }),
      body: JSON.stringify({ expiresIn: expiresInSec }),
    });
    const { signedURL } = (await res.json()) as { signedURL?: string };
    if (!signedURL?.startsWith("/object/sign/")) throw new ApiError("internal", "Video link unavailable.");
    return `${this.storage}${signedURL}`;
  }
}

/** Dev/test only (never in production): files kept in memory, served by /api/uploads/video/dev. */
class MemoryVideoStore implements ReferenceVideoStore {
  readonly files = new Map<string, { bytes: Uint8Array; type: VideoType }>();
  readonly pending = new Map<string, VideoType>();

  async createUpload(userId: string, type: VideoType): Promise<VideoUpload> {
    const path = `${userId}/${randomUUID()}.${type === "video/quicktime" ? "mov" : "mp4"}`;
    this.pending.set(path, type);
    const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    return { path, uploadUrl: `${base}/api/uploads/video/dev?path=${encodeURIComponent(path)}`, headers: { "content-type": type } };
  }
  async inspect(path: string): Promise<VideoInfo> {
    const file = this.files.get(path);
    if (!file) throw new ApiError("not_found", "Video not found.");
    return inspectWith(async (o, l) => file.bytes.slice(o, o + l), file.bytes.length);
  }
  async signedUrl(path: string): Promise<string> {
    return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/uploads/video/dev?path=${encodeURIComponent(path)}`;
  }
}

let store: ReferenceVideoStore | null = null;
let memory: MemoryVideoStore | null = null;

export function referenceVideos(): ReferenceVideoStore {
  if (store) return store;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    store = new SupabaseVideoStore(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (env.NODE_ENV !== "production") {
    store = memory = new MemoryVideoStore();
  } else {
    throw new NotConfiguredError(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  }
  return store;
}

/** The dev memory store, or null when real storage is configured (production always). */
export function devVideoStore(): MemoryVideoStore | null {
  referenceVideos();
  return env.NODE_ENV === "production" ? null : memory;
}
