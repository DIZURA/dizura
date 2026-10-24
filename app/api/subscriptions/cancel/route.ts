import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { subscriptions } from "@/lib/subscriptions/store";

export const runtime = "nodejs";

const body = z.object({ cancel: z.boolean() });

/** POST { cancel } → cancel at the end of the paid period (credits and access stay), or resume. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`sub:cancel:${user.id}`, 10, 60_000);
  const { cancel } = await parseJson(req, body, 256);
  const current = await subscriptions().current(user.id);
  if (!current) throw new ApiError("not_found", "No active plan.");
  const updated = await subscriptions().setCancelAtPeriodEnd(current.id, user.id, cancel);
  if (!updated) throw new ApiError("not_found", "No active plan.");
  return ok({ cancelAtPeriodEnd: updated.cancelAtPeriodEnd, periodEnd: updated.periodEnd });
});
