/**
 * Single source of truth for site-wide identity and metadata defaults.
 * Content copy that is artist-specific lives here; page content should import from this file
 * rather than hard-coding strings in components.
 */
export const siteConfig = {
  name: "Akbar Nawasunda",
  role: "Electronic music producer, remixer, and DJ",
  description:
    "The official website of Akbar Nawasunda, electronic music producer, remixer, and DJ.",
  /** Override with NEXT_PUBLIC_SITE_URL once the canonical URL is decided. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "en_US",
  themeColor: "#050506",
} as const;

/** The three roles the artist works in, in display order. Names only; no biography. */
export const roles = ["Producer", "Remixer", "DJ"] as const;

export type SiteConfig = typeof siteConfig;
