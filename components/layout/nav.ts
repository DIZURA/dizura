import type { Dictionary } from "@/lib/i18n/dictionaries";

type NavKey = keyof Dictionary["workspaces"];
export type NavItem = { href: string; key: NavKey; icon: string; badge?: "new" };

/** DIZURA's two studios — top nav + landing showcase. */
export const NAV = [
  { href: "/visual-character", key: "visualCharacter", icon: "◉", badge: "new" },
  { href: "/ads-studio", key: "adsStudio", icon: "◆", badge: "new" },
] as const satisfies readonly NavItem[];
