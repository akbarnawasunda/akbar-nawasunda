import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

interface PageMetaInput {
  /** Page-specific title. The root layout template appends the site name. */
  title: string;
  description?: string;
  /** Route path, e.g. "/music". Used for the canonical URL and Open Graph. */
  path: string;
}

/** Builds consistent per-page metadata from the site defaults. */
export function pageMetadata({
  title,
  description = siteConfig.description,
  path,
}: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} — ${siteConfig.name}`,
      description,
      url: path,
    },
  };
}
