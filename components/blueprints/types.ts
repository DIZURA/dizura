import type { BlueprintGoal, BlueprintSection, SectionContent } from "@/lib/ai/claude";

export type { BlueprintGoal, BlueprintSection, SectionContent };
export const SECTIONS = ["strategy", "plan", "scripts", "prompts"] as const satisfies readonly BlueprintSection[];
export const GOALS = ["single_product", "landing_page", "pod", "shopify", "ugc", "real_estate", "travel"] as const satisfies readonly BlueprintGoal[];

export type BlueprintSummary = { id: string; title: string; goal: BlueprintGoal; locale: "ar" | "en"; tags: string[]; createdAt: string; done: number };
export type Blueprint = Omit<BlueprintSummary, "done"> & { sections: Partial<SectionContent>; creditsCharged: number };
export type SectionState = "pending" | "loading" | "done" | "failed";

export const GOAL_GLYPH: Record<BlueprintGoal, string> = {
  single_product: "◎", landing_page: "▭", pod: "✎", shopify: "🛍", ugc: "▶", real_estate: "⌂", travel: "✈",
};
