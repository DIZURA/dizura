import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DIZURA — AI Creative Studio", template: "%s · DIZURA" },
  description: "DIZURA — AI visual characters and ad creatives for brands, in Arabic and English.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  // Google Search Console ownership token (public by design) — required for OAuth branding verification.
  verification: { google: "kDNDKdJXLdBF-zTX7vJa500-RGJ2IeWe1zOUlX74wGA" },
};

export const viewport: Viewport = { themeColor: "#0e0e10", colorScheme: "dark" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, dir, t } = await getI18n();
  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${plexArabic.variable}`}>
      <body>
        <I18nProvider value={{ locale, dir, t }}>{children}</I18nProvider>
      </body>
    </html>
  );
}
