import "server-only";
import { env, requireEnv } from "@/lib/env";
import { after } from "next/server";
import { recordUsage } from "@/lib/credits/costs";
import { providerFetch } from "@/lib/http";

/**
 * DIZURA Voice (ADR 50) — ElevenLabs text-to-speech, server-side only. The API key never reaches the
 * browser; the UI shows only "DIZURA Voice" (ADR 42). Dialect comes from the script itself (written
 * in the chosen dialect) spoken by a multilingual voice.
 */

/** ElevenLabs premade voices (stable public ids). Labels/tones live in the i18n dictionary. */
export const VOICES = {
  layla: { id: "21m00Tcm4TlvDq8ikWAM", gender: "female" },
  sara: { id: "EXAVITQu4vr4xnSDxMaL", gender: "female" },
  noor: { id: "MF3mGyEYCl7XYWbV9V6O", gender: "female" },
  faisal: { id: "pNInz6obpgDQGcFmaJgB", gender: "male" },
  omar: { id: "ErXwobaYiN019PkySvjV", gender: "male" },
  khalid: { id: "TxGEqnHWrfWFTfGW9XjX", gender: "male" },
} as const;
export type VoiceId = keyof typeof VOICES;

export const DIALECTS = {
  najdi: "Saudi Najdi Arabic (Riyadh)",
  hijazi: "Saudi Hijazi Arabic (Jeddah)",
  kuwaiti: "Kuwaiti Arabic",
  emirati: "Emirati Arabic",
  gulf: "general Gulf (Khaleeji) Arabic",
  msa: "Modern Standard Arabic (Fusha)",
  english: "natural, friendly English",
} as const;
export type Dialect = keyof typeof DIALECTS;

/** Synthesises `text` to MP3 bytes. */
export async function synthesize(text: string, voice: VoiceId, speed: number): Promise<Uint8Array> {
  const { ELEVENLABS_API_KEY } = requireEnv("ELEVENLABS_API_KEY");
  const res = await providerFetch("ElevenLabs", `${env.ELEVENLABS_API_BASE_URL}/v1/text-to-speech/${VOICES[voice].id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: env.ELEVENLABS_MODEL_ID,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed },
    }),
    timeoutMs: 50_000,
  });
  // Billed per character on our ElevenLabs plan (ELEVENLABS_USD_PER_1K_CHARS) → live price table (ADR 51).
  after(() => recordUsage("voicePer100Chars", env.ELEVENLABS_USD_PER_1K_CHARS / 10));
  return new Uint8Array(await res.arrayBuffer());
}
