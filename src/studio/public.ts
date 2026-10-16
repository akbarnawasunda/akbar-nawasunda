import "server-only";

import { getStudioConfigStatus } from "./config";
import { getReadyDb } from "./db";
import { DEFAULT_DESIGN, parseDesign, type DesignSettings } from "./design";
import { parsePageDocument, type PageDocument, type PageSlug } from "./content-model";
import * as repo from "./repository";
import { parseReleaseDocument, releaseKey, slugFromKey, type ReleaseDocument } from "./releases";
import { DEFAULT_ARTIST_SETTINGS, parseArtistSettings, type ArtistSettings } from "./artist-settings";

/**
 * Readers for public pages. They return only PUBLISHED data. When the Studio is not configured, or a
 * read fails, they return the defaults (null or empty), and the public site falls back to its static
 * content. Errors are logged on the server and never shown to visitors.
 */

async function safely<T>(label: string, fallback: T, read: () => Promise<T>): Promise<T> {
  if (!getStudioConfigStatus().ready) return fallback;
  try {
    return await read();
  } catch {
    console.error(`[studio] could not read ${label}`);
    return fallback;
  }
}

export function getPublicPage(slug: PageSlug): Promise<PageDocument | null> {
  return safely(`page "${slug}"`, null, async () => {
    const db = await getReadyDb();
    const row = await repo.readDocument(db, slug);
    return row?.publishedJson ? parsePageDocument(row.publishedJson) : null;
  });
}

export function getPublicDesign(): Promise<DesignSettings> {
  return safely("design settings", DEFAULT_DESIGN, async () => {
    const db = await getReadyDb();
    const row = await repo.readDocument(db, "design");
    return (row?.publishedJson && parseDesign(row.publishedJson)) || DEFAULT_DESIGN;
  });
}

/**
 * Published artist settings. Nothing on the public site reads this yet: the footer still shows no
 * social links until the owner authorises that public-site change.
 */
export function getPublicArtistSettings(): Promise<ArtistSettings> {
  return safely("artist settings", DEFAULT_ARTIST_SETTINGS, async () => {
    const db = await getReadyDb();
    const row = await repo.readDocument(db, "settings");
    return (row?.publishedJson && parseArtistSettings(row.publishedJson)) || DEFAULT_ARTIST_SETTINGS;
  });
}

export interface PublishedRelease {
  slug: string;
  doc: ReleaseDocument;
}

/** Published releases, newest verified date first. Undated releases follow, sorted by title. */
export function getPublishedReleases(): Promise<PublishedRelease[]> {
  return safely("releases", [], async () => {
    const db = await getReadyDb();
    const rows = await repo.readPublishedWithPrefix(db, "release:");
    const items: PublishedRelease[] = [];
    for (const row of rows) {
      const slug = slugFromKey(row.key);
      const doc = row.publishedJson ? parseReleaseDocument(row.publishedJson) : null;
      if (slug && doc) items.push({ slug, doc });
    }
    return sortReleases(items);
  });
}

export function getPublishedRelease(slug: string): Promise<ReleaseDocument | null> {
  return safely(`release "${slug}"`, null, async () => {
    const db = await getReadyDb();
    const row = await repo.readDocument(db, releaseKey(slug));
    return row?.publishedJson ? parseReleaseDocument(row.publishedJson) : null;
  });
}

function sortReleases(items: PublishedRelease[]): PublishedRelease[] {
  return [...items].sort((a, b) => {
    const dateA = a.doc.dateVerified && a.doc.releaseDate ? a.doc.releaseDate : "";
    const dateB = b.doc.dateVerified && b.doc.releaseDate ? b.doc.releaseDate : "";
    if (dateA && dateB) return dateB.localeCompare(dateA) || a.doc.title.localeCompare(b.doc.title);
    if (dateA) return -1;
    if (dateB) return 1;
    return a.doc.title.localeCompare(b.doc.title);
  });
}
