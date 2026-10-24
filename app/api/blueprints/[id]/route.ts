import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { blueprints } from "@/lib/blueprints/store";
import { ApiError, ok, parseJson, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
async function load(req: Request, ctx: Ctx) {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError("not_found", "Blueprint not found.");
  const bp = await blueprints().get(id, user.id);
  if (!bp) throw new ApiError("not_found", "Blueprint not found.");
  return { user, bp };
}

export const GET = route(async (req: Request, ctx: Ctx) => {
  const { user, bp } = await load(req, ctx);
  rateLimit(`bp:get:${user.id}`, 120, 60_000);
  return ok(bp);
});

const patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const { user, bp } = await load(req, ctx);
  rateLimit(`bp:patch:${user.id}`, 30, 60_000);
  const input = await parseJson(req, patch, 4 * 1024);
  await blueprints().update(bp.id, user.id, input);
  return ok({ ...bp, ...input });
});

export const DELETE = route(async (req: Request, ctx: Ctx) => {
  const { user, bp } = await load(req, ctx);
  rateLimit(`bp:delete:${user.id}`, 30, 60_000);
  await blueprints().remove(bp.id, user.id);
  return ok({ deleted: true });
});
