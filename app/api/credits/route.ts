import { requireUser } from "@/lib/auth/session";
import { credits } from "@/lib/credits/store";
import { ok, route } from "@/lib/http";

export const runtime = "nodejs";

export const GET = route(async (req: Request) => {
  const user = await requireUser(req);
  return ok({ balance: await credits().getBalance(user.id) });
});
