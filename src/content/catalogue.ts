import "server-only";

import { coverArtwork, resolveCover, type CoverArtwork } from "./covers";
import { catalogueFloor, releaseTypeLabel, type Release } from "./releases";
import { RELEASE_TYPE_LABELS, publicReleaseDate, type ReleaseDocument } from "@/studio/releases";
import { getPublishedReleases } from "@/studio/public";

/**
 * The catalogue, as one answer.
 *
 * Round 34 — the P0 bug this file removes: the homepage used to build its own list straight from
 * `src/content/releases.ts` while `/music` asked the database first. Two sources, one page each, and
 * a release published in NAWA STUDIO therefore appeared in the catalogue and *not* on the front
 * page (or the reverse, after a static edit). Every public surface now asks this module, so there
 * is exactly one order, one set of titles and one artwork waterfall for the whole site.
 *
 * Precedence is the Studio's, unchanged: published rows win; when the database is not configured
 * (preview, local dev, a read failure — `public.ts` swallows those and returns an empty list) the
 * verified static catalogue is the fallback. Both paths are mapped to the same shape here, so no
 * component has to know which one it is looking at.
 */
export interface CatalogueItem {
  slug: string;
  /** Display title, including the original artist when known. */
  title: string;
  /** One-line metadata: "Remix · 2025", "Single · 2024", or "Rilis". */
  meta: string;
  href: string;
  /** Public URL of the 1:1 artwork, or null when the sleeve is drawn by the component. */
  coverUrl: string | null;
  artwork: CoverArtwork;
  /** Official links only, ordered for display (streaming first). */
  links: readonly { label: string; href: string }[];
  /** Verified release year, or null. Never inferred from a partial date. */
  year: number | null;
  /** Human format label ("Single", "EP", "Remix", …), "Rilis" when unknown. */
  format: string;
  /** True when the row came from a published Studio document. */
  managed: boolean;
}

/**
 * Display order for a release's own links: the three services a visitor expects to find first,
 * then whatever else the owner supplied (SoundCloud, Bandcamp, …). Ordering only — nothing is ever
 * added that the catalogue does not contain.
 */
const LINK_PRIORITY = ["spotify", "apple music", "youtube", "soundcloud"] as const;

function rank(label: string): number {
  const normalised = label.toLowerCase();
  const index = LINK_PRIORITY.findIndex((name) => normalised.includes(name));
  return index === -1 ? LINK_PRIORITY.length : index;
}

function orderLinks(links: readonly { label: string; href: string }[]) {
  return [...links].sort((a, b) => rank(a.label) - rank(b.label));
}

function fromStatic(release: Release): CatalogueItem {
  const cover = release.cover ?? resolveCover(release.slug);
  return {
    slug: release.slug,
    title: release.source ? `${release.title} — ${release.source}` : release.title,
    meta: [release.type ? releaseTypeLabel[release.type] : null, release.year ? String(release.year) : null]
      .filter((part): part is string => Boolean(part))
      .join(" · ") || "Rilis",
    href: `/music/${release.slug}`,
    coverUrl: cover,
    artwork: cover ? { kind: "image", src: cover } : coverArtwork(release.slug),
    links: orderLinks(release.links),
    year: release.year ?? null,
    format: release.type ? releaseTypeLabel[release.type] : "Rilis",
    managed: false,
  };
}

function fromDocument(slug: string, doc: ReleaseDocument): CatalogueItem {
  const cover = resolveCover(slug);
  const date = publicReleaseDate(doc);
  const year = date ? Number(date.slice(0, 4)) : null;
  const format = RELEASE_TYPE_LABELS[doc.type];
  return {
    slug,
    title: doc.title,
    meta: [format, date].filter((part): part is string => Boolean(part)).join(" · ") || "Rilis",
    href: `/music/${slug}`,
    coverUrl: cover,
    artwork: cover ? { kind: "image", src: cover } : coverArtwork(slug),
    links: orderLinks(doc.links),
    year: Number.isFinite(year) ? year : null,
    format,
    managed: true,
  };
}

/**
 * The whole catalogue, Studio order (newest verified date first) or the owner's static order.
 * Callers pass their own copy where they need to slice it; the array itself is frozen by convention.
 *
 * Round 35 — this function may not return an empty list.
 *
 * The failure it guards against is not hypothetical: publish nothing in a fresh Studio install, or
 * let the Turso read fall through, and the old version returned `[]` and every page below it
 * printed an empty catalogue. "The songs disappeared" is the one bug a music site cannot ship. So:
 *
 *   1. the database read is wrapped — an unexpected throw (a schema drift, a network timeout that
 *      is not swallowed inside `public.ts`) falls back instead of propagating;
 *   2. published rows that fail to map (a document missing a title, say) are dropped individually
 *      rather than taking the list down with them;
 *   3. when the result is empty, `catalogueFloor()` — the verified static list — is the answer.
 */
export async function getCatalogue(): Promise<CatalogueItem[]> {
  const floor = catalogueFloor().map(fromStatic);

  try {
    const published = await getPublishedReleases();
    const managed = published.flatMap(({ slug, doc }) => {
      try {
        return [fromDocument(slug, doc)];
      } catch {
        return [];
      }
    });
    if (managed.length > 0) return managed;
  } catch {
    /* Fall through to the floor. Never rethrow: a public page must render. */
  }

  return floor;
}

/** The release that owns the homepage spotlight: first in the same order `/music` prints. */
export async function getFeaturedRelease(): Promise<CatalogueItem | null> {
  const [first] = await getCatalogue();
  return first ?? null;
}
