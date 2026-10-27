import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * robots.txt. Crawling the public site is allowed; the Studio, its login and the API are not
 * (they are password-gated anyway, but a crawler should never spend a request discovering that).
 * The sitemap line is absolute, as the spec requires.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/studio/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
