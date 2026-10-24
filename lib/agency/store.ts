import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AgencyServiceId } from "@/lib/credits/pricing";
import { assertIds, restRows, serviceRest } from "@/lib/supabase/rest";
import { devSingleton } from "@/lib/dev-singleton";

/** A done-for-you service order (ADR 50). Becomes `paid` only after Tap confirms the charge. */
export type ServiceOrder = {
  id: string;
  userId: string;
  service: AgencyServiceId;
  amount: number;
  currency: string;
  brief: Record<string, string>;
  status: "pending" | "paid" | "cancelled" | "in_progress" | "delivered";
  chargeId: string | null;
  createdAt: string;
};
export type NewServiceOrder = Pick<ServiceOrder, "userId" | "service" | "amount" | "currency" | "brief">;

export interface ServiceOrderStore {
  create(o: NewServiceOrder): Promise<ServiceOrder>;
  get(id: string, userId: string): Promise<ServiceOrder | null>;
  list(userId: string): Promise<ServiceOrder[]>;
  attachCharge(id: string, userId: string, chargeId: string): Promise<void>;
  /** Idempotent: only a pending order becomes paid. Returns true when this call marked it. */
  markPaid(id: string, userId: string, chargeId: string): Promise<boolean>;
}

const rowSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  service: z.enum(["single_product", "landing_page", "pod", "shopify"]),
  amount: z.coerce.number(),
  currency: z.string(),
  brief: z.record(z.string(), z.string()),
  status: z.enum(["pending", "paid", "cancelled", "in_progress", "delivered"]),
  charge_id: z.string().nullable(),
  created_at: z.string(),
});
const fromRow = (r: z.infer<typeof rowSchema>): ServiceOrder => ({
  id: r.id,
  userId: r.user_id,
  service: r.service,
  amount: r.amount,
  currency: r.currency,
  brief: r.brief,
  status: r.status,
  chargeId: r.charge_id,
  createdAt: r.created_at,
});

class SupabaseServiceOrderStore implements ServiceOrderStore {
  constructor(private conn: { url: string; key: string }) {}
  private rows(path: string, init?: RequestInit) {
    return restRows(this.conn, path, rowSchema, init, "service-orders");
  }
  async create(o: NewServiceOrder) {
    assertIds(o.userId);
    const rows = await this.rows("service_orders", {
      method: "POST",
      body: JSON.stringify({ user_id: o.userId, service: o.service, amount: o.amount, currency: o.currency, brief: o.brief }),
    });
    return fromRow(rows[0]!);
  }
  async get(id: string, userId: string) {
    assertIds(id, userId);
    const rows = await this.rows(`service_orders?id=eq.${id}&user_id=eq.${userId}&limit=1`);
    return rows[0] ? fromRow(rows[0]) : null;
  }
  async list(userId: string) {
    assertIds(userId);
    return (await this.rows(`service_orders?user_id=eq.${userId}&order=created_at.desc&limit=50`)).map(fromRow);
  }
  async attachCharge(id: string, userId: string, chargeId: string) {
    assertIds(id, userId);
    await this.rows(`service_orders?id=eq.${id}&user_id=eq.${userId}&status=eq.pending`, {
      method: "PATCH",
      body: JSON.stringify({ charge_id: chargeId, updated_at: new Date().toISOString() }),
    });
  }
  async markPaid(id: string, userId: string, chargeId: string) {
    assertIds(id, userId);
    const now = new Date().toISOString();
    const rows = await this.rows(`service_orders?id=eq.${id}&user_id=eq.${userId}&status=eq.pending`, {
      method: "PATCH",
      body: JSON.stringify({ status: "paid", charge_id: chargeId, paid_at: now, updated_at: now }),
    });
    return rows.length > 0;
  }
}

/** Development-only store (never used in production — see serviceOrders()). */
class MemoryServiceOrderStore implements ServiceOrderStore {
  private rows = new Map<string, ServiceOrder>();
  async create(o: NewServiceOrder) {
    const row: ServiceOrder = { ...o, id: randomUUID(), status: "pending", chargeId: null, createdAt: new Date().toISOString() };
    this.rows.set(row.id, row);
    return row;
  }
  async get(id: string, userId: string) {
    const r = this.rows.get(id);
    return r && r.userId === userId ? r : null;
  }
  async list(userId: string) {
    return [...this.rows.values()].filter((r) => r.userId === userId);
  }
  async attachCharge(id: string, userId: string, chargeId: string) {
    const r = await this.get(id, userId);
    if (r?.status === "pending") this.rows.set(id, { ...r, chargeId });
  }
  async markPaid(id: string, userId: string, chargeId: string) {
    const r = await this.get(id, userId);
    if (r?.status !== "pending") return false;
    this.rows.set(id, { ...r, status: "paid", chargeId });
    return true;
  }
}

let store: ServiceOrderStore | undefined;
export function serviceOrders(): ServiceOrderStore {
  if (store) return store;
  const conn = serviceRest();
  store = conn ? new SupabaseServiceOrderStore(conn) : devSingleton("service-orders", () => new MemoryServiceOrderStore());
  return store;
}
