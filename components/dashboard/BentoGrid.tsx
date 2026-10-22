import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid auto-rows-[minmax(11rem,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}

export function BentoCard({
  href,
  title,
  description,
  icon,
  span = "1",
  accent = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  span?: "1" | "2" | "tall";
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-ink-700/70 bg-ink-900 p-6 transition hover:-translate-y-0.5 hover:border-ember-500/60",
        span === "2" && "sm:col-span-2",
        span === "tall" && "lg:row-span-2",
        accent && "bg-gradient-to-br from-ember-700/30 via-ink-900 to-ink-900",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 size-48 rounded-full bg-ember-500/10 blur-3xl transition group-hover:bg-ember-500/20" />
      <span className="grid size-11 place-items-center rounded-xl bg-ink-800 text-xl text-ember-400">{icon}</span>
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-ink-100">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{description}</p>
      </div>
      <span aria-hidden className="flip-rtl absolute end-6 top-6 text-ink-500 transition group-hover:text-ember-400">→</span>
    </Link>
  );
}
