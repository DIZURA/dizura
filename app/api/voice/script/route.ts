import { randomUUID } from "node:crypto";
import { z } from "zod";
import { writeVoiceScript } from "@/lib/ai/claude";
import { requireUser } from "@/lib/auth/session";
import { getPrices } from "@/lib/credits/costs";
import { credits } from "@/lib/credits/store";
import { requireEnv } from "@/lib/env";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { DIALECTS } from "@/lib/voice/elevenlabs";

export const runtime = "nodejs";

const body = z.object({
  dialect: z.enum(Object.keys(DIALECTS) as [keyof typeof DIALECTS, ...(keyof typeof DIALECTS)[]]),
  brief: z.string().trim().min(3).max(1000),
  seconds: z.number().int().min(5).max(90).default(20),
});

/** POST → a voiceover script in the chosen dialect (same price as one strategist message). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`voice:script:${user.id}`, 20, 10 * 60_000);
  const input = await parseJson(req, body, 8 * 1024);
  requireEnv("ANTHROPIC_API_KEY");

  const price = (await getPrices()).chat;
  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -price, reason: "generation", referenceId });
  try {
    const script = await writeVoiceScript(DIALECTS[input.dialect], input.brief, input.seconds);
    if (!script) throw new ApiError("provider_error", "Empty script.");
    return ok({ script, creditsCharged: price });
  } catch (err) {
    await credits().apply({ userId: user.id, delta: price, reason: "refund", referenceId });
    throw err;
  }
});
