import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { releases } from "@/content/releases";

/**
 * sitemap.xml — public routes only.
 *
 * Deliberately absent: /studio and its children (behind the owner password), /api/*, the /about
 * redirect (it 308s to /artist, and a sitemap must not list redirects) and /privacy, which does not
 * exist yet and is the owner's text to write.
 *
 * `lastModified` is omitted on purpose: nothing here can know when a page actually changed, and a
 * build timestamp teaches crawlers to distrust the field.
 */
export function sitemapRoutes(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const pages = ["", "/music", "/artist", "/visuals", "/epk", "/contact"];

  return [
    ...pages.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: (path === "" || path === "/music" ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: path === "" ? 1 : path === "/music" ? 0.8 : 0.6,
    })),
    ...releases.map((release) => ({
      url: `${base}/music/${release.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes();
}
