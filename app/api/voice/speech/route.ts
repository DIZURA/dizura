import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { VOICE, voiceCost } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { requireEnv } from "@/lib/env";
import { ok, parseJson, route } from "@/lib/http";
import { assertSigningConfigured, seal } from "@/lib/security/signed-token";
import { rateLimit } from "@/lib/security/rate-limit";
import { synthesize, VOICES } from "@/lib/voice/elevenlabs";
import { saveVoiceover } from "@/lib/voice/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export type VoiceHandle = { u: string; path: string };

const body = z.object({
  text: z.string().trim().min(2).max(VOICE.maxChars),
  voice: z.enum(Object.keys(VOICES) as [keyof typeof VOICES, ...(keyof typeof VOICES)[]]),
  speed: z.number().min(0.7).max(1.2).default(1),
});

/** POST → DIZURA Voice voiceover (credits per 100 characters; refunded if synthesis fails). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`voice:${user.id}`, 20, 10 * 60_000);
  const input = await parseJson(req, body, 16 * 1024);
  requireEnv("ELEVENLABS_API_KEY"); // fail before charging
  assertSigningConfigured();

  const cost = voiceCost(input.text.length);
  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -cost, reason: "generation", referenceId });
  try {
    const bytes = await synthesize(input.text, input.voice, input.speed);
    const path = await saveVoiceover(user.id, bytes);
    const token = seal<VoiceHandle>("voice", { u: user.id, path }, 7 * 24 * 60 * 60);
    return ok({ token, creditsCharged: cost, chars: input.text.length });
  } catch (err) {
    await credits().apply({ userId: user.id, delta: cost, reason: "refund", referenceId });
    throw err;
  }
});
