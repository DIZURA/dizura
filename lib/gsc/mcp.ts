import "server-only";
import { z } from "zod";
import type { GscSummary } from "@/types";
import { env } from "@/lib/env";

/**
 * Minimal MCP (Streamable HTTP) client for a Google Search Console MCP server.
 * Flow: initialize -> notifications/initialized -> tools/call.
 * Returns null when GSC is not configured or the site isn't verified — the audit degrades gracefully.
 * VERIFY: tool name/arguments against the deployed GSC MCP server's `tools/list`.
 */
const PROTOCOL_VERSION = "2025-06-18";

type JsonRpcResponse = { jsonrpc: "2.0"; id?: number; result?: unknown; error?: { code: number; message: string } };

class McpSession {
  private nextId = 1;
  private sessionId: string | null = null;

  constructor(private endpoint: string, private token: string) {}

  private async send(method: string, params?: unknown, notify = false): Promise<unknown> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${this.token}`,
      "mcp-protocol-version": PROTOCOL_VERSION,
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    const id = notify ? undefined : this.nextId++;
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", method, params, ...(id !== undefined && { id }) }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`MCP ${method} -> HTTP ${res.status}`);
    this.sessionId = res.headers.get("mcp-session-id") ?? this.sessionId;
    if (notify) return undefined;

    const messages = res.headers.get("content-type")?.includes("text/event-stream")
      ? parseSse(await res.text())
      : [(await res.json()) as JsonRpcResponse];
    const reply = messages.find((m) => m.id === id);
    if (!reply) throw new Error(`MCP ${method}: no response`);
    if (reply.error) throw new Error(`MCP ${method}: ${reply.error.message}`);
    return reply.result;
  }

  async init() {
    await this.send("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "dizura", version: "0.1.0" },
    });
    await this.send("notifications/initialized", undefined, true);
  }

  callTool(name: string, args: Record<string, unknown>) {
    return this.send("tools/call", { name, arguments: args });
  }
}

function parseSse(text: string): JsonRpcResponse[] {
  return text
    .split(/\r?\n\r?\n/)
    .map((evt) => evt.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join(""))
    .filter(Boolean)
    .flatMap((data) => {
      try {
        return [JSON.parse(data) as JsonRpcResponse];
      } catch {
        return [];
      }
    });
}

const rowSchema = z.object({
  keys: z.array(z.string()).optional(),
  clicks: z.number(),
  impressions: z.number(),
  ctr: z.number(),
  position: z.number(),
});
const toolResult = z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) });

export async function fetchGscSummary(siteUrl: string): Promise<GscSummary | null> {
  if (!env.GSC_MCP_ENDPOINT || !env.GSC_MCP_TOKEN) return null;
  try {
    const session = new McpSession(env.GSC_MCP_ENDPOINT, env.GSC_MCP_TOKEN);
    await session.init();
    const end = new Date();
    const start = new Date(end.getTime() - 28 * 86_400_000);
    const raw = toolResult.parse(
      await session.callTool("search_analytics", {
        site_url: siteUrl,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        dimensions: ["query"],
        row_limit: 10,
      }),
    );
    const text = raw.content.find((c) => c.type === "text")?.text;
    if (!text) return null;
    const rows = z.object({ rows: z.array(rowSchema).default([]) }).parse(JSON.parse(text)).rows;
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    return {
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: rows.length ? rows.reduce((s, r) => s + r.position, 0) / rows.length : 0,
      topQueries: rows.map((r) => ({ query: r.keys?.[0] ?? "", clicks: r.clicks, impressions: r.impressions })),
    };
  } catch (err) {
    console.warn("[gsc-mcp] unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}
