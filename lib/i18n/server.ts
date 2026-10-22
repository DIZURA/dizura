import "server-only";
import { cookies, headers } from "next/headers";
import type { Locale } from "@/types";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dirOf, isLocale } from "./config";
import { dictionaries } from "./dictionaries";

export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^en\b/i.test(accept) ? "en" : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, dir: dirOf(locale), t: dictionaries[locale] };
}
