import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/qrcode";

/**
 * robots.txt — points crawlers at the per-request site origin's
 * sitemap, NOT a hardcoded tenant domain. Each tenant served on a
 * custom domain (or the platform host) gets a sitemap URL on its
 * own origin so crawlers stay scoped to that tenant.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin().replace(/\/+$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
