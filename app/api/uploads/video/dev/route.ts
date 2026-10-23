import { devVideoStore, VIDEO_TYPES, type VideoType } from "@/lib/media/reference-videos";
import { GENJUTSU } from "@/lib/credits/pricing";

export const runtime = "nodejs";

/**
 * DEV/TEST ONLY stand-in for Supabase Storage (upload PUT + provider GET). Returns 404 whenever
 * real storage is configured, and always in production.
 */
const notFound = () => new Response(null, { status: 404 });

export async function PUT(req: Request) {
  const store = devVideoStore();
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const type = store?.pending.get(path);
  if (!store || !type) return notFound();
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length > GENJUTSU.maxVideoBytes) return new Response(null, { status: 413 });
  store.pending.delete(path);
  store.files.set(path, { bytes, type: VIDEO_TYPES.includes(type) ? type : ("video/mp4" as VideoType) });
  return new Response(null, { status: 200 });
}

export async function GET(req: Request) {
  const file = devVideoStore()?.files.get(new URL(req.url).searchParams.get("path") ?? "");
  if (!file) return notFound();
  return new Response(new Blob([file.bytes as Uint8Array<ArrayBuffer>]), { headers: { "content-type": file.type } });
}
