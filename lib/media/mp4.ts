/**
 * Minimal ISO-BMFF (MP4 / MOV) reader: finds `moov/mvhd` and returns the duration in seconds.
 * Reads through a range callback so only box headers + the movie header are fetched, wherever
 * `moov` sits (start for "fast start" files, end for most phone recordings).
 */
export type RangeReader = (offset: number, length: number) => Promise<Uint8Array>;

const MAX_BOXES = 64;
const MAX_MOOV_SCAN = 4 * 1024 * 1024;

const u32 = (b: Uint8Array, o: number) => ((b[o]! << 24) >>> 0) + (b[o + 1]! << 16) + (b[o + 2]! << 8) + b[o + 3]!;
const u64 = (b: Uint8Array, o: number) => u32(b, o) * 2 ** 32 + u32(b, o + 4);
const type = (b: Uint8Array, o: number) => String.fromCharCode(b[o]!, b[o + 1]!, b[o + 2]!, b[o + 3]!);

/** True when the bytes start like an MP4/MOV file (`ftyp` box first). */
export function looksLikeMp4(head: Uint8Array): boolean {
  return head.length >= 12 && type(head, 4) === "ftyp";
}

/** Duration in seconds, or null if the file isn't a readable MP4/MOV. */
export async function mp4DurationSeconds(read: RangeReader, fileSize: number): Promise<number | null> {
  let offset = 0;
  for (let i = 0; i < MAX_BOXES && offset + 8 <= fileSize; i++) {
    const h = await read(offset, 16);
    if (h.length < 8) return null;
    let size = u32(h, 0);
    const kind = type(h, 4);
    let header = 8;
    if (size === 1) {
      if (h.length < 16) return null;
      size = u64(h, 8);
      header = 16;
    } else if (size === 0) {
      size = fileSize - offset;
    }
    if (size < header) return null;
    if (kind === "moov") {
      const moov = await read(offset + header, Math.min(size - header, MAX_MOOV_SCAN));
      return mvhdDuration(moov);
    }
    offset += size;
  }
  return null;
}

function mvhdDuration(moov: Uint8Array): number | null {
  let o = 0;
  while (o + 8 <= moov.length) {
    const size = u32(moov, o);
    if (type(moov, o + 4) === "mvhd") {
      const version = moov[o + 8];
      const timescale = version === 1 ? u32(moov, o + 28) : u32(moov, o + 20);
      const duration = version === 1 ? u64(moov, o + 32) : u32(moov, o + 24);
      return timescale > 0 ? duration / timescale : null;
    }
    if (size < 8) return null;
    o += size;
  }
  return null;
}
