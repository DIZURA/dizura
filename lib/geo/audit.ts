import "server-only";
import type { GeoAuditCheck, GeoAuditReport } from "@/types";
import { fetchGscSummary } from "@/lib/gsc/mcp";
import { safeFetchText } from "@/lib/security/safe-fetch";

const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];
const WEIGHT = { high: 3, medium: 2, low: 1 } as const;

/**
 * Free GEO (Generative Engine Optimization) audit: how well can AI answer engines
 * discover, parse and cite this page? Deterministic checks + optional GSC data.
 */
export async function runGeoAudit(rawUrl: string): Promise<GeoAuditReport> {
  const page = await safeFetchText(rawUrl);
  const origin = new URL(page.url).origin;
  const [robots, llms, gsc] = await Promise.all([
    safeFetchText(`${origin}/robots.txt`, { maxBytes: 200_000 }).catch(() => null),
    safeFetchText(`${origin}/llms.txt`, { maxBytes: 200_000 }).catch(() => null),
    fetchGscSummary(origin + "/"),
  ]);

  const html = page.body;
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
  const metaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i.test(html);
  const blocked = robots?.status === 200 ? blockedCrawlers(robots.body) : [];

  const checks: GeoAuditCheck[] = [
    check("https", "HTTPS", page.url.startsWith("https://"), "high", "Answer engines prefer secure sources."),
    check("status", "Page reachable", page.status === 200, "high", `HTTP ${page.status}`),
    check("ai-crawlers", "AI crawlers allowed", blocked.length === 0, "high",
      blocked.length ? `robots.txt blocks: ${blocked.join(", ")}` : "No AI crawler is blocked."),
    check("llms-txt", "llms.txt present", llms?.status === 200, "medium", "An /llms.txt file guides LLMs to your key content."),
    check("schema", "Structured data (JSON-LD)", /application\/ld\+json/i.test(html), "high",
      "Schema.org markup helps engines extract entities and facts."),
    check("title", "Descriptive title", title.length >= 15 && title.length <= 70, "medium", title ? `"${title.slice(0, 80)}"` : "Missing <title>."),
    check("meta-description", "Meta description", metaDesc, "medium", "A 50+ character summary is often quoted by AI answers."),
    check("h1", "Single H1", (html.match(/<h1[\s>]/gi) ?? []).length === 1, "low", "One clear primary heading."),
    check("content-depth", "Content depth", words >= 300, "medium", `${words} words of visible text.`),
    check("faq", "FAQ / Q&A content", /FAQPage|<details|\?\s*<\/h[23]>/i.test(html), "low", "Question-style headings map directly to AI prompts."),
    check("lang", "Language declared", /<html[^>]+lang=/i.test(html), "low", "Needed for correct Arabic/English attribution."),
  ];

  const max = checks.reduce((s, c) => s + WEIGHT[c.severity], 0);
  const got = checks.reduce((s, c) => s + (c.passed ? WEIGHT[c.severity] : 0), 0);
  return { url: page.url, score: Math.round((got / max) * 100), checks, searchConsole: gsc, generatedAt: new Date().toISOString() };
}

function check(id: string, label: string, passed: boolean, severity: GeoAuditCheck["severity"], detail: string): GeoAuditCheck {
  return { id, label, passed, severity, detail };
}

/** Returns AI crawlers fully disallowed by robots.txt (explicitly, or via `User-agent: *` + `Disallow: /`). */
function blockedCrawlers(robots: string): string[] {
  const groups: { agents: string[]; disallowAll: boolean }[] = [];
  let current: { agents: string[]; disallowAll: boolean } | null = null;
  let lastWasAgent = false;
  for (const line of robots.split(/\r?\n/)) {
    const [k = "", ...rest] = line.replace(/#.*/, "").split(":");
    const key = k.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) groups.push((current = { agents: [], disallowAll: false }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (key) {
      lastWasAgent = false;
      if (current && key === "disallow" && value === "/") current.disallowAll = true;
    }
  }
  return AI_CRAWLERS.filter((bot) => {
    const own = groups.find((g) => g.agents.includes(bot.toLowerCase()));
    return own ? own.disallowAll : groups.some((g) => g.agents.includes("*") && g.disallowAll);
  });
}
