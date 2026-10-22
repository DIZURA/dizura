"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/components/ui/cn";
import { NAV } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <nav aria-label="Workspaces" className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-visible">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "bg-ember-500/10 text-ember-300 ring-1 ring-ember-500/30" : "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
            )}
          >
            <span aria-hidden className="w-4 text-center">{item.icon}</span>
            {t.nav[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
