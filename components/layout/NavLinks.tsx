"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { EXTRA_NAV, NAV } from "./nav";

/** Studio navigation (two studios). Scrolls sideways on small screens. */
export function NavLinks() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label={t.nav.home} className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <span key={item.href} className="flex shrink-0 items-center">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition",
                active ? "bg-ink-800 text-ink-100" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100",
              )}
            >
              {t.nav[item.key]}
              {item.badge === "new" && (
                <span className="rounded bg-mint-500/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-mint-300">
                  {t.nav.newBadge}
                </span>
              )}
            </Link>
          </span>
        );
      })}
      {EXTRA_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition",
            pathname === item.href ? "bg-ink-800 text-ink-100" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100",
          )}
        >
          {t.nav[item.key]}
        </Link>
      ))}
    </nav>
  );
}
