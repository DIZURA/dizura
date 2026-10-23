import Image from "next/image";
import Link from "next/link";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { getCurrentUser } from "@/lib/auth/session";
import { AccountMenu } from "./AccountMenu";
import { CreditsBadge } from "./CreditsBadge";
import { NavLinks } from "./NavLinks";

/**
 * Global header. With `nav`, tool links sit inline on desktop and wrap to a second,
 * horizontally scrolling row on mobile.
 */
export async function TopBar({
  brand,
  showCredits = true,
  showAccount = true,
  nav = false,
}: {
  brand: string;
  showCredits?: boolean;
  showAccount?: boolean;
  nav?: boolean;
}) {
  const signedIn = showCredits ? (await getCurrentUser()) !== null : false;
  return (
    <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/95">
      <div className="mx-auto flex max-w-[96rem] items-center gap-4 px-4 py-2.5 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-black tracking-wider text-ink-100">
          <Image src="/brand/dizura-mark-128.png" alt="" width={28} height={28} priority className="size-7" />
          {brand}
        </Link>
        {nav && (
          <div className="hidden min-w-0 flex-1 lg:block">
            <NavLinks />
          </div>
        )}
        <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {signedIn && <CreditsBadge />}
          <LanguageToggle />
          {showAccount && <AccountMenu />}
        </div>
      </div>
      {nav && (
        <div className="border-t border-ink-700/40 px-3 py-1.5 lg:hidden">
          <NavLinks />
        </div>
      )}
    </header>
  );
}
