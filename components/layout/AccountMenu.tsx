import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

export async function AccountMenu() {
  const [{ t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  if (!user) {
    return <Link href="/login" className={buttonClass("primary", "px-4 py-1.5")}>{t.auth.signIn}</Link>;
  }
  const label = user.name || user.email;
  return (
    <div className="flex items-center gap-2">
      <Link href="/billing" title={user.email} dir="auto" className="hidden max-w-40 truncate text-sm text-ink-300 transition hover:text-ink-100 sm:inline">{label}</Link>
      <Link
        href="/billing"
        title={t.nav.billing}
        aria-label={t.nav.billing}
        className="grid size-8 place-items-center rounded-full bg-mint-500/15 text-sm font-semibold uppercase text-mint-300 transition hover:bg-mint-500/25"
      >
        <span aria-hidden>{label.slice(0, 1)}</span>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          aria-label={t.auth.signOut}
          className="rounded-full border border-ink-700 px-2.5 py-1.5 text-sm text-ink-300 transition hover:border-mint-500 hover:text-ink-100 sm:px-3"
        >
          <span aria-hidden className="sm:hidden">⎋</span>
          <span className="hidden sm:inline">{t.auth.signOut}</span>
        </button>
      </form>
    </div>
  );
}
