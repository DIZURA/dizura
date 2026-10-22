import Link from "next/link";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { CreditsBadge } from "./CreditsBadge";

export function TopBar({ brand, showCredits = true }: { brand: string; showCredits?: boolean }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-ink-700/60 bg-ink-950/80 px-5 py-3 backdrop-blur">
      <Link href="/" className="text-lg font-black tracking-wider text-ink-100">
        <span className="text-ember-500">◆</span> {brand}
      </Link>
      <div className="flex items-center gap-3">
        {showCredits && <CreditsBadge />}
        <LanguageToggle />
      </div>
    </header>
  );
}
