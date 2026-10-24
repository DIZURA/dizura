import { z } from "zod";
import { serviceOrders } from "@/lib/agency/store";
import { requireUser } from "@/lib/auth/session";
import { AGENCY_SERVICES } from "@/lib/credits/pricing";
import { requireEnv } from "@/lib/env";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { createServiceCharge } from "@/lib/tap/client";

export const runtime = "nodejs";

const SERVICE_NAMES = {
  single_product: "Single Product Store",
  landing_page: "High-Converting Landing Page",
  pod: "Print on Demand Store",
  shopify: "Shopify Store",
} as const;

const field = (max: number) => z.string().trim().max(max).default("");
const body = z.object({
  service: z.enum(["single_product", "landing_page", "pod", "shopify"]),
  brief: z.object({
    brand: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(30).regex(/^[+\d\s()-]+$/),
    link: field(300),
    notes: field(1500),
  }),
});

/** GET → the caller's service orders. */
export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`agency:list:${user.id}`, 60, 60_000);
  return ok(await serviceOrders().list(user.id));
});

/** POST → creates a pending DIZURA Agency order (price from AGENCY_SERVICES) and opens Tap checkout. */
export const POST = route(async (req: Request) => {
  const user = await requireUser(req);
  rateLimit(`agency:order:${user.id}`, 5, 10 * 60_000);
  const input = await parseJson(req, body, 8 * 1024);
  const price = AGENCY_SERVICES[input.service];
  requireEnv("TAP_SECRET_KEY", "TAP_API_BASE_URL"); // no pending order when payments aren't set up

  const order = await serviceOrders().create({
    userId: user.id, service: input.service, amount: price.price, currency: price.currency, brief: input.brief,
  });
  const charge = await createServiceCharge(order, user, `DIZURA Agency — ${SERVICE_NAMES[input.service]}`);
  if (!charge.transaction?.url) throw new ApiError("provider_error", "Payment page unavailable.");
  await serviceOrders().attachCharge(order.id, user.id, charge.id);
  return ok({ redirectUrl: charge.transaction.url, orderId: order.id });
});
