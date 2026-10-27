import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getImage } from "@/assets/manifest";
import { releaseCard } from "@/lib/social-card";

/**
 * Default social preview, used when a page has no card of its own: square (1000x1000), so it is
 * declared with the "summary" card rather than "summary_large_image".
 */
const socialImage = getImage("social-preview-optimized");
export const defaultSocialImages = [
  {
    url: socialImage.src,
    width: socialImage.width,
    height: socialImage.height,
    alt: `${siteConfig.name} promotional graphic`,
  },
];

interface PageMetaInput {
  /** Page-specific title. The root layout template appends the site name. */
  title: string;
  description?: string;
  /** Route path, e.g. "/music". Used for the canonical URL and Open Graph. */
  path: string;
  /**
   * Release slug. When present, the Open Graph image becomes the generated 1200×630 card for that
   * release instead of the shared square brand image — so ten release links stop looking identical
   * when they are pasted into WhatsApp, X or a group chat. See src/app/og/route.tsx.
   */
  ogSlug?: string;
}

/**
 * Builds consistent per-page metadata from the site defaults.
 * Next.js replaces whole openGraph/twitter objects on child routes, so the images are repeated here.
 */
export function pageMetadata({
  title,
  description = siteConfig.description,
  path,
  ogSlug,
}: PageMetaInput): Metadata {
  const fullTitle = `${title} — ${siteConfig.name}`;

  const card = ogSlug ? releaseCard(ogSlug, title, siteConfig.name) : null;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      images: card ? [card] : defaultSocialImages,
    },
    twitter: {
      // A 1200×630 card wants the large treatment; the square brand image does not.
      card: card ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: card ? [card.url] : defaultSocialImages.map((image) => image.url),
    },
  };
}
