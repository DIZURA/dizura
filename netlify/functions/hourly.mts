/**
 * Netlify Scheduled Function (production deploys only): once an hour, asks the app to renew due
 * subscriptions and refresh provider prices (ADR 51). The work happens in /api/cron/hourly; this
 * function only holds the schedule and the shared secret.
 */
export default async function hourly(): Promise<Response> {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("[hourly] URL or CRON_SECRET missing");
    return new Response("not configured", { status: 503 });
  }
  const res = await fetch(`${base}/api/cron/hourly`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  const text = await res.text();
  console.info("[hourly]", res.status, text.slice(0, 500));
  return new Response(null, { status: res.ok ? 200 : 500 });
}

export const config = { schedule: "@hourly" };
