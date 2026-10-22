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
export async function createCharge(pack: CreditPack, user: SessionUser, orderId: string): Promise<TapCharge> {
  const { base, headers } = auth();
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const res = await providerFetch("Tap", `${base}/charges`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: pack.price,
      currency: pack.currency,
      threeDSecure: true,
      save_card: false,
      description: `DIZURA ${pack.credits} credits`,
      customer: { first_name: user.name ?? "DIZURA", email: user.email },
      source: { id: "src_all" },
      metadata: { userId: user.id, packId: pack.id, orderId },
      reference: { transaction: orderId, order: orderId },
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
