/**
 * Social card URL, kept in its own module so it can be unit-tested.
 *
 * `src/lib/metadata.ts` imports `src/assets/manifest.ts`, which pulls in ten static image imports —
 * fine inside a Next build, impossible to `import()` from a node test runner. The two things worth
 * testing here are the URL shape and the escaping, and neither needs an image bundler.
 */

export interface SocialCard {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** The 1200×630 card the Open Graph crawlers crop to (src/app/og/route.tsx). */
export const SOCIAL_CARD_WIDTH = 1200;
export const SOCIAL_CARD_HEIGHT = 630;

/**
 * Per-release card. The slug is the only input, and it is escaped: an unescaped `&` would silently
 * truncate the query string and every card would render the brand fallback.
 */
export function releaseCard(slug: string, title: string, siteName: string): SocialCard {
  return {
    url: `/og/${encodeURIComponent(slug)}`,
    width: SOCIAL_CARD_WIDTH,
    height: SOCIAL_CARD_HEIGHT,
    alt: `${title}, ${siteName}`,
  };
}

/** Brand card for the homepage and the section pages that have no artwork of their own. */
export function brandCard(siteName: string, tagline: string): SocialCard {
  return {
    url: "/og",
    width: SOCIAL_CARD_WIDTH,
    height: SOCIAL_CARD_HEIGHT,
    alt: `${siteName} — ${tagline}`,
  };
}
