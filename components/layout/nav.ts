import type { Dictionary } from "@/lib/i18n/dictionaries";

export const NAV = [
  { href: "/ads-studio", key: "adsStudio", icon: "◆" },
  { href: "/ai-influencer", key: "aiInfluencer", icon: "◉" },
  { href: "/wan-prime", key: "wanPrime", icon: "▶" },
  { href: "/geo-audit", key: "geoAudit", icon: "⌖" },
  { href: "/scheduler", key: "scheduler", icon: "◷" },
  { href: "/b2b", key: "b2b", icon: "▦" },
] as const satisfies readonly { href: string; key: keyof Dictionary["nav"]; icon: string }[];
