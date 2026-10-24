import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { CreditPack, SessionUser, TapCharge } from "@/types";
import { env, requireEnv } from "@/lib/env";
import { providerFetch } from "@/lib/http";

/** Tap Payments server client. https://developers.tap.company */

const chargeSchema = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
  reference: z.record(z.string(), z.string().optional()).optional(),
  gateway: z.object({ reference: z.string().optional() }).optional(),
  transaction: z.object({ created: z.union([z.string(), z.number()]).optional(), url: z.string().optional() }).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

function auth() {
  const { TAP_SECRET_KEY, TAP_API_BASE_URL } = requireEnv("TAP_SECRET_KEY", "TAP_API_BASE_URL");
  return {
    base: TAP_API_BASE_URL.replace(/\/$/, ""),
    headers: { authorization: `Bearer ${TAP_SECRET_KEY}`, "content-type": "application/json", accept: "application/json" },
  };
}

function normalise(raw: z.infer<typeof chargeSchema>): TapCharge {
  return {
    ...raw,
    status: raw.status as TapCharge["status"],
    currency: raw.currency as TapCharge["currency"],
    transaction: raw.transaction && { url: raw.transaction.url, created: raw.transaction.created?.toString() },
  };
}

/** Creates a hosted-page charge. Amount comes from the server-side pack table, never the client. */
export function createCharge(pack: CreditPack, user: SessionUser, orderId: string): Promise<TapCharge> {
  return hostedCharge({
    amount: pack.price,
    currency: pack.currency,
    description: `DIZURA ${pack.credits} credits`,
    user,
    orderId,
    metadata: { userId: user.id, packId: pack.id, orderId },
  });
}

/** Charge for a done-for-you DIZURA Agency service (ADR 50); price from AGENCY_SERVICES, never the client. */
export function createServiceCharge(
  order: { id: string; service: string; amount: number; currency: string },
  user: SessionUser,
  description: string,
): Promise<TapCharge> {
  return hostedCharge({
    amount: order.amount,
    currency: order.currency,
    description,
    user,
    orderId: order.id,
    metadata: { userId: user.id, kind: "service", serviceOrderId: order.id, service: order.service },
  });
}

async function hostedCharge(c: {
  amount: number;
  currency: string;
  description: string;
  user: SessionUser;
  orderId: string;
  metadata: Record<string, string>;
}): Promise<TapCharge> {
  const { base, headers } = auth();
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const res = await providerFetch("Tap", `${base}/charges`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: c.amount,
      currency: c.currency,
      threeDSecure: true,
      save_card: false,
      description: c.description,
      customer: { first_name: c.user.name ?? "DIZURA", email: c.user.email },
      source: { id: "src_all" },
      metadata: c.metadata,
      reference: { transaction: c.orderId, order: c.orderId },
      redirect: { url: `${appUrl}/billing/return` },
      post: { url: `${appUrl}/api/webhooks/tap` },
    }),
  });
  return normalise(chargeSchema.parse(await res.json()));
}

/** Authoritative status lookup — always re-fetch before granting credits. */
export async function retrieveCharge(chargeId: string): Promise<TapCharge> {
  if (!/^chg_[A-Za-z0-9]+$/.test(chargeId)) throw new Error("Invalid Tap charge id");
  const { base, headers } = auth();
  const res = await providerFetch("Tap", `${base}/charges/${chargeId}`, { headers });
  return normalise(chargeSchema.parse(await res.json()));
}

const THREE_DECIMAL = new Set(["KWD", "BHD", "OMR", "JOD"]);

/**
 * Verifies Tap's `hashstring` webhook header (HMAC-SHA256 with the secret key).
 * https://developers.tap.company/docs/webhook
 */
export function verifyWebhookHash(payload: TapCharge, received: string | null): boolean {
  if (!received) return false;
  const { TAP_SECRET_KEY } = requireEnv("TAP_SECRET_KEY");
  const amount = payload.amount.toFixed(THREE_DECIMAL.has(payload.currency) ? 3 : 2);
  const toHash =
    `x_id${payload.id}` +
    `x_amount${amount}` +
    `x_currency${payload.currency}` +
    `x_gateway_reference${payload.reference?.gateway ?? payload.gateway?.reference ?? ""}` +
    `x_payment_reference${payload.reference?.payment ?? ""}` +
    `x_status${payload.status}` +
    `x_created${payload.transaction?.created ?? ""}`;
  const expected = createHmac("sha256", TAP_SECRET_KEY).update(toHash).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCharge(json: unknown): TapCharge {
  return normalise(chargeSchema.parse(json));
}
