import { requireUser } from "@/lib/auth/session";
import { ApiError, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { unseal } from "@/lib/security/signed-token";
import { readVoiceover } from "@/lib/voice/store";
import type { VoiceHandle } from "../../speech/route";

export const runtime = "nodejs";

/** GET → streams the caller's own voiceover MP3 (private bucket; token is sealed + owner-checked). */
export const GET = route(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const user = await requireUser(req);
  rateLimit(`voice:audio:${user.id}`, 120, 60_000);
  const { token } = await ctx.params;
  const handle = unseal<VoiceHandle>("voice", decodeURIComponent(token));
  if (!handle || handle.u !== user.id) throw new ApiError("not_found", "Voiceover not found.");
  const bytes = await readVoiceover(handle.path, user.id);
  return new Response(bytes as BodyInit, {
    headers: {
      "content-type": "audio/mpeg",
      "content-length": String(bytes.byteLength),
      "cache-control": "private, max-age=3600",
      "content-disposition": 'inline; filename="dizura-voice.mp3"',
    },
  });
});
