import type { Dictionary } from "@/lib/i18n/dictionaries";

type NavKey = keyof Dictionary["workspaces"];
export type NavItem = { href: string; key: NavKey; icon: string; badge?: "new" };

/** Creative tools — shown in the top nav and on the landing bento. */
export const TOOLS = [
  { href: "/ai-influencer", key: "aiInfluencer", icon: "◉", badge: "new" },
  { href: "/motion", key: "motion", icon: "⟳", badge: "new" },
  { href: "/image", key: "image", icon: "▣" },
  { href: "/video", key: "video", icon: "▶" },
  { href: "/ads-studio", key: "adsStudio", icon: "◆" },
] as const satisfies readonly NavItem[];

/** Business tools — shown after the creative tools. */
export const EXTRAS = [
  { href: "/geo-audit", key: "geoAudit", icon: "⌖" },
  { href: "/scheduler", key: "scheduler", icon: "◷" },
  { href: "/b2b", key: "b2b", icon: "▦" },
] as const satisfies readonly NavItem[];

export const NAV: readonly NavItem[] = [...TOOLS, ...EXTRAS];
