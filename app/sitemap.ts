import type { MetadataRoute } from "next";
import { communities } from "@/lib/communities";
import { getPublishedCountySlugs } from "@/lib/countyLandingLoader";
import { siteOrigin } from "@/lib/qrcode";

// Always render fresh — county landing pages are toggled from admin and
// need to appear in the sitemap immediately, not after a Netlify Durable
// cache TTL. Querying Supabase per crawler hit is cheap (a single
// `select slug` against an indexed column).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const SITE = siteOrigin();
  const now = new Date();

  const pages = [
    "",
    "/about",
    "/buyers",
    "/sellers",
    "/path-to-ownership",
    "/communities",
    "/closings",
    "/partners",
    "/reviews",
    "/contact",
    "/privacy",
  ];

  // Pull every published county landing page so search engines pick them up
  // the moment the admin toggles one on.
  const countySlugs = await getPublishedCountySlugs();

  return [
    ...pages.map((path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1.0 : 0.8,
    })),
    ...communities.map((c) => ({
      url: `${SITE}/communities/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...countySlugs.map((slug) => ({
      url: `${SITE}/realtor-in/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      // County pages are high-intent SEO targets — give them strong priority.
      priority: 0.85,
    })),
  ];
}
