/**
 * Browser-safe configuration. Only NEXT_PUBLIC_* values belong here.
 * Next.js inlines these at build time, so each must be referenced literally.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  tapPublicKey: process.env.NEXT_PUBLIC_TAP_PUBLIC_KEY ?? "",
} as const;
