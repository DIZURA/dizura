import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { characters } from "@/lib/characters/store";
import { deleteSoulReference } from "@/lib/higgsfield/client";
import { ApiError, ok, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/** DELETE → removes the character here AND its trained identity at Higgsfield. */
export const DELETE = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req);
  rateLimit(`chars:delete:${user.id}`, 20, 60_000);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError("not_found", "Character not found.");
  const c = await characters().get(id, user.id);
  if (!c) throw new ApiError("not_found", "Character not found.");

  if (c.providerReferenceId) {
    try {
      await deleteSoulReference(c.providerReferenceId);
    } catch (err) {
      // Already gone at the provider is fine; anything else must be retried so no trained identity is orphaned.
      if (!(err instanceof ApiError && err.message.includes("(404)"))) throw err;
    }
  }
  await characters().remove(c.id, user.id);
  return ok({ deleted: true });
});
