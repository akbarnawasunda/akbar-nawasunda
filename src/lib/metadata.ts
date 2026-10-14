import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getImage } from "@/assets/manifest";

/**
 * Default social preview. The graphic is square (1000x1000), so it is declared with the
 * "summary" card rather than "summary_large_image".
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
}

/**
 * Builds consistent per-page metadata from the site defaults.
 * Next.js replaces whole openGraph/twitter objects on child routes, so the images are repeated here.
 */
export function pageMetadata({
  title,
  description = siteConfig.description,
  path,
}: PageMetaInput): Metadata {
  const fullTitle = `${title} — ${siteConfig.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      images: defaultSocialImages,
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
      images: defaultSocialImages.map((image) => image.url),
    },
  };
}
