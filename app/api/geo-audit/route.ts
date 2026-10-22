import { z } from "zod";
import { runGeoAudit } from "@/lib/geo/audit";
import { clientIp, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const body = z.object({ url: z.string().trim().min(4).max(2048) });

/** Public & free — protected by per-IP rate limiting and SSRF-safe fetching. */
export const POST = route(async (req: Request) => {
  rateLimit(`geo:${clientIp(req)}`, 5, 60_000);
  const { url } = await parseJson(req, body, 4096);
  return ok(await runGeoAudit(url));
});
