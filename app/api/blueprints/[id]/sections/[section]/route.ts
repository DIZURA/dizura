import { z } from "zod";
import { BLUEPRINT_SECTIONS, generateSection, type BlueprintInputs } from "@/lib/ai/claude";
import { requireUser } from "@/lib/auth/session";
import { blueprints } from "@/lib/blueprints/store";
import { ApiError, ok, route } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST → generates one section of an already-paid blueprint. Free (the blueprint was charged once);
 * a section that already exists is returned as-is, so retries never regenerate or double-bill.
 */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string; section: string }> }) => {
  const user = await requireUser(req);
  rateLimit(`bp:section:${user.id}`, 24, 10 * 60_000);
  const { id, section: raw } = await ctx.params;
  const section = z.enum(BLUEPRINT_SECTIONS).safeParse(raw);
  if (!section.success || !z.uuid().safeParse(id).success) throw new ApiError("not_found", "Blueprint not found.");

  const bp = await blueprints().get(id, user.id);
  if (!bp) throw new ApiError("not_found", "Blueprint not found.");
  const existing = bp.sections[section.data];
  if (existing !== undefined) return ok({ section: section.data, content: existing });

  const { context = "", ...inputs } = bp.inputs as BlueprintInputs & { context?: string };
  const content = await generateSection(section.data, { ...inputs, goal: bp.goal }, bp.locale, context);
  await blueprints().fillSection(bp.id, user.id, section.data, content);
  return ok({ section: section.data, content });
});
