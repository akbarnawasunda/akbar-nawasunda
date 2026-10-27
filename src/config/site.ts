/**
 * Single source of truth for site-wide identity and metadata defaults.
 * Artist-specific copy lives here; pages import from this file instead of hard-coding strings.
 *
 * Copy follows docs/01-BRAND-IDENTITY/BRAND_VOICE.md: Indonesian, direct, no hyperbole, and only
 * facts listed as VERIFIED in docs/01-BRAND-IDENTITY/FACTS_AND_VERIFICATION.md.
 */
export const siteConfig = {
  name: "Akbar Nawasunda",
  /** One line, max 12 words (CONTENT_GUIDELINES.md). */
  role: "Produser, remixer, dan DJ asal Bandung Barat",
  origin: "Bandung Barat, Indonesia",
  since: 2020,
  description:
    "Situs resmi Akbar Nawasunda — produser, remixer, dan DJ asal Bandung Barat. Breakbeat dan Indo Bass sejak 2020.",
  /** Canonical URL. Override with NEXT_PUBLIC_SITE_URL for preview deployments. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://akbarnawasunda.my.id",
  locale: "id_ID",
  themeColor: "#0A0A0E",
} as const;

/** The three roles the artist works in, in display order. Names only; no biography. */
export const roles = ["Produser", "Remixer", "DJ"] as const;

/**
 * Genres from the owner's profile (`artistPlatform.ts → verifiedArtistProfile.genres`).
 * Kendang Chops joined the four original ones on 2026-10-24, with the rest of their profile data.
 */
export const genres = ["Breakbeat", "Indo Bass", "Jedag Jedug", "Jungle Dutch", "Kendang Chops"] as const;

export type SiteConfig = typeof siteConfig;
