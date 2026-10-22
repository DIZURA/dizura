import { NextResponse } from "next/server";
import { parseCharge, verifyWebhookHash } from "@/lib/tap/client";
import { fulfillCharge } from "@/lib/tap/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tap `post` webhook. Security:
 * 1. Verify the `hashstring` HMAC header (rejects forged calls).
 * 2. Re-fetch the charge from Tap — the payload body is never trusted for status or amount.
 * 3. Ledger is idempotent on charge id — retries cannot double-credit.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 100_000) return new NextResponse(null, { status: 413 });

  let charge;
  try {
    charge = parseCharge(JSON.parse(raw));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!verifyWebhookHash(charge, req.headers.get("hashstring"))) {
    console.warn("[tap-webhook] invalid signature", { id: charge.id });
    return new NextResponse(null, { status: 401 });
  }

  try {
    const result = await fulfillCharge(charge.id);
    console.info("[tap-webhook] processed", { id: charge.id, ...result });
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[tap-webhook] fulfillment failed", { id: charge.id }, err);
    return new NextResponse(null, { status: 500 }); // Tap will retry
  }
}
