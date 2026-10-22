export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

export type PlanTier = "free" | "pro" | "studio" | "b2b";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  plan: PlanTier;
  locale: Locale;
}

export interface Session {
  user: SessionUser;
  expiresAt: string;
}
