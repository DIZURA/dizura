import type { NextConfig } from "next";
import { resolveAppUrl } from "./lib/app-url";

// Resolved once per build and inlined everywhere `process.env.NEXT_PUBLIC_APP_URL` is referenced
// (server + client). On Netlify, previews/branch deploys get their own URL automatically.
const appUrl = resolveAppUrl(process.env);
process.env.NEXT_PUBLIC_APP_URL = appUrl;

/**
 * Static security headers. The per-request CSP (with nonce) is set in proxy.ts.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_URL: appUrl },
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.higgsfield.ai" }],
  },
  async redirects() {
    // WAN 3.0 Prime now lives in the Video studio.
    return [{ source: "/wan-prime", destination: "/video", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
