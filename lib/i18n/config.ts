import type { Direction, Locale } from "@/types";

export const LOCALES: readonly Locale[] = ["ar", "en"] as const;
export const DEFAULT_LOCALE: Locale = "ar";
export const LOCALE_COOKIE = "dz_locale";

export const dirOf = (l: Locale): Direction => (l === "ar" ? "rtl" : "ltr");
export const isLocale = (v: unknown): v is Locale => v === "ar" || v === "en";
