import { randomUUID } from "node:crypto";
import { z } from "zod";
import { strategistReply } from "@/lib/ai/claude";
import { requireUser } from "@/lib/auth/session";
import { STRATEGY } from "@/lib/credits/pricing";
import { credits } from "@/lib/credits/store";
import { requireEnv } from "@/lib/env";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const turn = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(STRATEGY.maxMessageChars) });
const body = z.object({
  messages: z
    .array(turn)
    .min(1)
    .max(STRATEGY.maxChatTurns)
    .refine((m) => m[0]?.role === "user" && m.at(-1)?.role === "user", { message: "The conversation must start and end with the user." }),
  locale: z.enum(["ar", "en"]).default("ar"),
  studio: z.enum(["visual-character", "ads-studio", "blueprints"]).default("visual-character"),
});

/** POST → one DIZURA Strategist reply (charges STRATEGY.chatCredits; refunded if the call fails). */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`strategy:${user.id}`, 20, 60_000);
  const input = await parseJson(req, body, 64 * 1024);
  requireEnv("ANTHROPIC_API_KEY"); // fail before charging

  const referenceId = randomUUID();
  await credits().apply({ userId: user.id, delta: -STRATEGY.chatCredits, reason: "generation", referenceId });
  try {
    const reply = await strategistReply(input.messages, input.locale, input.studio);
    if (!reply) throw new ApiError("provider_error", "Empty reply.");
    return ok({ reply, creditsCharged: STRATEGY.chatCredits });
  } catch (err) {
    await credits().apply({ userId: user.id, delta: STRATEGY.chatCredits, reason: "refund", referenceId });
    throw err;
  }
});
