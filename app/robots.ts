import type { MetadataRoute } from "next";

/** Public pages are indexable; API routes, auth callbacks and payment returns are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/billing/"] },
  };
}
