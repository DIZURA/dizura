import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { env, requireEnv } from "@/lib/env";
import { ApiError } from "@/lib/http";

/**
 * DIZURA Strategist (ADR 50) — Claude API, server-side only. The key never leaves the server and
 * the UI never names the provider (ADR 42). Each call stays well under Netlify's 60 s function
 * limit: chat is one short turn; a blueprint is generated as four independent sections.
 */

/** Server-side refusal fallback: a declined request is re-run on a suitable model in the same call. */
const FALLBACK = (): { betas: Anthropic.AnthropicBeta[]; fallbacks: "default" } => ({
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
});

let client: Anthropic | undefined;
function claude() {
  const { ANTHROPIC_API_KEY } = requireEnv("ANTHROPIC_API_KEY");
  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 55_000, maxRetries: 1 });
  return client;
}

export const BLUEPRINT_GOALS = ["single_product", "landing_page", "pod", "shopify", "ugc", "real_estate", "travel"] as const;
export type BlueprintGoal = (typeof BLUEPRINT_GOALS)[number];
export type Locale = "ar" | "en";

const GOAL_BRIEF: Record<BlueprintGoal, string> = {
  single_product: "a single-product online store (one hero product, conversion-focused storefront)",
  landing_page: "a high-converting landing page for one offer",
  pod: "a print-on-demand brand (designs on apparel/merch, no inventory)",
  shopify: "a Shopify store",
  ugc: "UGC-style video ads for paid social",
  real_estate: "real-estate marketing (projects, units, brokers)",
  travel: "travel and tourism marketing (packages, destinations, agencies)",
};

const SYSTEM = (locale: Locale) =>
  [
    "You are DIZURA Strategist, a senior performance-marketing and brand strategist for GCC businesses",
    "(Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman). You know Snapchat, TikTok, Instagram, X and YouTube",
    "audiences in the Gulf, Ramadan/Eid/National Day seasonality, Arabic dialect copywriting, COD and BNPL norms,",
    "and Salla, Zid and Shopify storefronts.",
    "Be concrete and practical: numbers, hooks, examples. Never invent statistics; label estimates as estimates.",
    "Never mention which AI model or company powers you; you are part of DIZURA.",
    locale === "ar"
      ? "Reply in Arabic (clear Gulf-friendly Modern Standard Arabic unless the user asks for a dialect). Keep platform names in Latin script."
      : "Reply in English.",
  ].join(" ");

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** One strategist chat turn (short, low effort). */
export async function strategistReply(history: ChatTurn[], locale: Locale, studio: string): Promise<string> {
  const res = await claude()
    .beta.messages.create({
      ...FALLBACK(),
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: `${SYSTEM(locale)} The user is working in the DIZURA ${studio} studio. Keep answers under 250 words unless asked for more.`,
      messages: history,
    })
    .catch(rethrow);
  if (res.stop_reason === "refusal") throw new ApiError("bad_request", "The strategist can't help with that request.");
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}

// ---------------------------------------------------------------------------
// Blueprint sections
// ---------------------------------------------------------------------------

export const BLUEPRINT_SECTIONS = ["strategy", "plan", "scripts", "prompts"] as const;
export type BlueprintSection = (typeof BLUEPRINT_SECTIONS)[number];

const s = z.string();
export const SECTION_SCHEMAS = {
  strategy: z.object({
    summary: s,
    audience: z.object({ persona: s, pains: z.array(s), desires: z.array(s) }),
    positioning: s,
    offer: s,
    channels: z.array(z.object({ name: s, why: s })),
    budgetSplit: z.array(z.object({ channel: s, percent: z.number() })),
    kpis: z.array(z.object({ metric: s, target: s })),
    risks: z.array(s),
  }),
  plan: z.object({
    days: z.array(z.object({ day: z.number(), platform: s, format: s, hook: s, idea: s, cta: s })),
  }),
  scripts: z.object({
    scripts: z.array(z.object({ title: s, angle: s, hook: s, body: s, cta: s, shots: z.array(s), durationSec: z.number() })),
  }),
  prompts: z.object({
    formulas: z.array(z.object({ name: s, useFor: s, template: s, example: s })),
  }),
} as const;
export type SectionContent = { [K in BlueprintSection]: z.infer<(typeof SECTION_SCHEMAS)[K]> };

const SECTION_TASK: Record<BlueprintSection, string> = {
  strategy:
    "Write the marketing STRATEGY: a short summary, target persona with pains and desires, positioning, the core offer, " +
    "3-5 channels with why, a budget split in percent that sums to 100, 4-6 KPIs with realistic targets, and the main risks.",
  plan:
    "Write a 2-WEEK CONTENT PLAN: exactly 14 entries, day 1 to 14, each with platform, format (Reel, Story, Snap, carousel, UGC ad, live…), " +
    "a scroll-stopping hook, the idea, and the call to action. Mix organic and paid; respect GCC posting habits.",
  scripts:
    "Write exactly 3 UGC AD SCRIPTS (15-45 s each) with different angles (e.g. problem/solution, testimonial, unboxing/demo): " +
    "title, angle, hook (first 3 seconds), body, CTA, a shot list, and duration in seconds. Dialogue in the target dialect.",
  prompts:
    "Write 6 PROMPT FORMULAS the user can reuse in DIZURA's studios (character images, product ads, motion videos, voiceover scripts): " +
    "name, what it is for, a fill-in-the-blanks template with [PLACEHOLDERS], and a filled example for this business.",
};

export type BlueprintInputs = {
  goal: BlueprintGoal;
  product: string;
  audience: string;
  market: string;
  budget: string;
  tone: string;
  notes: string;
};

/** Generates one blueprint section as validated JSON (fits one serverless call). */
export async function generateSection<K extends BlueprintSection>(
  section: K,
  inputs: BlueprintInputs,
  locale: Locale,
  context: string,
): Promise<SectionContent[K]> {
  const brief = [
    `Business type: ${GOAL_BRIEF[inputs.goal]}.`,
    `Product / brand: ${inputs.product}`,
    inputs.audience && `Audience: ${inputs.audience}`,
    inputs.market && `Market / dialect: ${inputs.market}`,
    inputs.budget && `Monthly budget: ${inputs.budget}`,
    inputs.tone && `Brand tone: ${inputs.tone}`,
    inputs.notes && `Notes: ${inputs.notes}`,
    context && `Earlier conversation with the client (for context):\n${context}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await claude()
    .beta.messages.parse({
      ...FALLBACK(),
      model: env.ANTHROPIC_MODEL,
      max_tokens: 8000,
      output_config: { effort: "low", format: betaZodOutputFormat(SECTION_SCHEMAS[section]) },
      system: SYSTEM(locale),
      messages: [{ role: "user", content: `${brief}\n\nTask: ${SECTION_TASK[section]}` }],
    })
    .catch(rethrow);
  if (res.stop_reason === "refusal") throw new ApiError("bad_request", "This brief can't be turned into a blueprint.");
  if (!res.parsed_output) throw new ApiError("provider_error", "The strategist returned an incomplete section.");
  return res.parsed_output as SectionContent[K];
}

/** Maps SDK errors to our envelope; details are logged, never returned (ADR 3). */
function rethrow(err: unknown): never {
  if (err instanceof Anthropic.RateLimitError) throw new ApiError("rate_limited", "The strategist is busy. Try again in a minute.");
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[claude] authentication failed — check ANTHROPIC_API_KEY");
    throw new ApiError("not_configured", "The strategist isn't available right now.");
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[claude]", err.status, err.message.slice(0, 300));
    throw new ApiError("provider_error", "The strategist didn't respond. Please try again.");
  }
  throw err;
}

/** "Write it for me" in DIZURA Voice: a voiceover script in the requested dialect (plain text). */
export async function writeVoiceScript(dialectName: string, brief: string, seconds: number): Promise<string> {
  const words = Math.round(seconds * 2.3);
  const res = await claude()
    .beta.messages.create({
      ...FALLBACK(),
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1500,
      output_config: { effort: "low" },
      system:
        "You write short spoken voiceover scripts for GCC video ads. Write ONLY the words to be spoken: no stage directions, " +
        "no labels, no emojis, no hashtags. Never mention which AI model powers you.",
      messages: [
        {
          role: "user",
          content: `Write a ${seconds}-second voiceover (about ${words} words) in ${dialectName}, natural and conversational, ` +
            `with a strong hook in the first sentence and a clear call to action at the end.\n\nBrief: ${brief}`,
        },
      ],
    })
    .catch(rethrow);
  if (res.stop_reason === "refusal") throw new ApiError("bad_request", "This script can't be written.");
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
}
