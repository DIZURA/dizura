import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative grid min-h-[calc(100dvh-57px)] place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-mint-500/10 blur-3xl rtl:translate-x-1/2" />
      <Card className="relative w-full max-w-md p-7 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-300">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 border-t border-ink-700 pt-5 text-center text-sm text-ink-300">{footer}</div>}
      </Card>
    </main>
  );
}
