import "server-only";

import { getStudioConfigStatus } from "./config";
import type { PageDocument, PageSlug } from "./content-model";
import { getPublishedDocument } from "./store";

/**
 * Published content for public pages. Returns null when the Studio is not configured, nothing is
 * published, or the read fails, so the public page falls back to its static content.
 * Drafts are never returned from this function.
 */
export async function getPublicPage(slug: PageSlug): Promise<PageDocument | null> {
  if (!getStudioConfigStatus().ready) return null;
  try {
    return await getPublishedDocument(slug);
  } catch (error) {
    console.error(`[studio] could not read published page "${slug}"`, error);
    return null;
  }
}
