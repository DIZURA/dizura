import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

/** Public footer with the legal links (Google OAuth requires the homepage to link the privacy policy). */
export async function SiteFooter() {
  const { t } = await getI18n();
  return (
    <footer className="border-t border-ink-700/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-500">
        <p>© {new Date().getFullYear()} {t.brand}</p>
        <nav aria-label={t.legal.footerLabel} className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/pricing" className="hover:text-ink-100">{t.nav.pricing}</Link>
          <Link href="/privacy" className="hover:text-ink-100">{t.legal.privacy.title}</Link>
          <Link href="/terms" className="hover:text-ink-100">{t.legal.terms.title}</Link>
          <a href={`mailto:${t.legal.contactEmail}`} dir="ltr" className="hover:text-ink-100">{t.legal.contactEmail}</a>
        </nav>
      </div>
    </footer>
  );
}
