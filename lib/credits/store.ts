import "server-only";
import { randomUUID } from "node:crypto";
import type { CreditLedgerEntry, CreditReason } from "@/types";
import { env, NotConfiguredError } from "@/lib/env";
import { ApiError } from "@/lib/http";
import { WELCOME_CREDITS } from "./pricing";

/**
 * Credit ledger. All mutations are idempotent on (userId, reason, referenceId) so
 * webhook retries and double-submits can never double-credit or double-charge.
 * Production implementation: supabase/migrations/20261022060100_0001_credits.sql (`apply_credit_delta` RPC).
 */
export interface CreditStore {
  getBalance(userId: string): Promise<number>;
  /** Applies a delta atomically. Returns false if this (userId, reason, referenceId) was already applied. */
  apply(entry: { userId: string; delta: number; reason: CreditReason; referenceId: string }): Promise<boolean>;
}

class MemoryCreditStore implements CreditStore {
  private balances = new Map<string, number>();
  private ledger = new Map<string, CreditLedgerEntry>();

  async getBalance(userId: string) {
    // Mirrors the production welcome bonus. DEV_STARTING_CREDITS (dev/test only) lets local tests afford paid flows.
    return this.balances.get(userId) ?? (Number(process.env.DEV_STARTING_CREDITS) || WELCOME_CREDITS);
  }

  async apply({ userId, delta, reason, referenceId }: Parameters<CreditStore["apply"]>[0]) {
    const key = `${userId}:${reason}:${referenceId}`;
    if (this.ledger.has(key)) return false;
    const next = (await this.getBalance(userId)) + delta;
    if (next < 0) throw new ApiError("insufficient_credits", "Not enough credits.");
    this.balances.set(userId, next);
    this.ledger.set(key, { id: randomUUID(), userId, delta, reason, referenceId, createdAt: new Date().toISOString() });
    return true;
  }
}

class SupabaseCreditStore implements CreditStore {
  constructor(private url: string, private serviceKey: string) {}

  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: this.serviceKey,
        authorization: `Bearer ${this.serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      if (body.includes("insufficient_credits")) throw new ApiError("insufficient_credits", "Not enough credits.");
      console.error(`[credits] rpc ${fn} failed`, res.status, body.slice(0, 300));
      throw new ApiError("internal", "Credit ledger unavailable.");
    }
    return (await res.json()) as T;
  }

  getBalance(userId: string) {
    return this.rpc<number>("get_credit_balance", { p_user_id: userId });
  }

  apply({ userId, delta, reason, referenceId }: Parameters<CreditStore["apply"]>[0]) {
    return this.rpc<boolean>("apply_credit_delta", {
      p_user_id: userId,
      p_delta: delta,
      p_reason: reason,
      p_reference_id: referenceId,
    });
  }
}

let store: CreditStore | undefined;

export function credits(): CreditStore {
  if (store) return store;
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    store = new SupabaseCreditStore(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (env.NODE_ENV !== "production") {
    store = new MemoryCreditStore();
  } else {
    // Never silently run a money-handling ledger in memory in production.
    throw new NotConfiguredError(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  }
  return store;
}
