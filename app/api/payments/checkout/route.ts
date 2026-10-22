import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { CheckoutResponse } from "@/types";
import { requireUser } from "@/lib/auth/session";
import { CREDIT_PACKS } from "@/lib/credits/pricing";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { createCharge } from "@/lib/tap/client";

export const runtime = "nodejs";

const body = z.object({ packId: z.enum(["starter", "pro", "studio"]) });

export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`checkout:${user.id}`, 5, 60_000);
  const { packId } = await parseJson(req, body, 1024);

  const charge = await createCharge(CREDIT_PACKS[packId], user, `ord_${randomUUID()}`);
  if (!charge.transaction?.url) throw new ApiError("provider_error", "Payment page unavailable.");
  return ok<CheckoutResponse>({ redirectUrl: charge.transaction.url, chargeId: charge.id });
});
