import type { GenerationJob } from "@/types";
import { poll } from "@/lib/ai";
import { requireUser } from "@/lib/auth/session";
import { credits } from "@/lib/credits/store";
import { ApiError, ok, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { unseal } from "@/lib/security/signed-token";

export const runtime = "nodejs";

/** Signed, tamper-proof job handle issued by /api/ai/generate. */
export type JobHandle = { u: string; p: GenerationJob["provider"]; j: string; c: number; r: string };

export const GET = route(async (req: Request, ctx: { params: Promise<{ token: string }> }) => {
  const user = await requireUser(req);
  rateLimit(`poll:${user.id}`, 120, 60_000);
  const { token } = await ctx.params;
  const handle = unseal<JobHandle>("job", token);
  if (!handle || handle.u !== user.id) throw new ApiError("not_found", "Job not found.");

  const state = await poll(handle.p, handle.j);
  let creditsRefunded = false;
  if (state.status === "failed" || state.status === "cancelled") {
    // Idempotent on the original reservation id — refunds at most once.
    creditsRefunded = await credits().apply({ userId: user.id, delta: handle.c, reason: "refund", referenceId: handle.r });
  }
  return ok({ ...state, creditsRefunded });
});
