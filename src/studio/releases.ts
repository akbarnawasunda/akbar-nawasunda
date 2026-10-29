/**
 * Music release model and slug rules. Pure, so it is unit-tested without a database.
 * Release documents are stored under the key `release:<slug>`.
 */

/**
 * "unknown" is a real state, not a placeholder: the owner has confirmed some titles but not their
 * type yet, and the site must not assert "single" on their behalf.
 *
 * Langkah 3i: it used to render as the word "Rilis", which is also this site's word for a release in
 * general — so the data sheet read `Jenis: Rilis`, i.e. "type: release". It now renders the explicit
 * status below, imported from the same constant the public pages use.
 */
import { UNCLASSIFIED } from "../content/copy";

export const RELEASE_TYPES = ["unknown", "single", "ep", "album", "remix", "mix"] as const;
export type ReleaseKind = (typeof RELEASE_TYPES)[number];

export const RELEASE_TYPE_LABELS: Record<ReleaseKind, string> = {
  unknown: UNCLASSIFIED,
  single: "Single",
  ep: "EP",
  album: "Album",
  remix: "Remix",
  mix: "Mix",
};

export const MAX_RELEASE_LINKS = 5;

export interface ReleaseLinkDoc {
  label: string;
  href: string;
}

export interface ReleaseDocument {
  title: string;
  type: ReleaseKind;
  /** YYYY-MM-DD. Only shown publicly when `dateVerified` is true. */
  releaseDate: string | null;
  dateVerified: boolean;
  description: string;
  /** Repository asset id, or null. Uploaded media is not supported yet. */
  artworkId: string | null;
  links: ReleaseLinkDoc[];
  seoTitle: string;
  seoDescription: string;
}

export const RELEASE_LIMITS = {
  title: 120,
  description: 2000,
  linkLabel: 60,
  linkHref: 500,
  seoTitle: 70,
  seoDescription: 200,
  slug: 80,
  slugMin: 2,
} as const;

const RESERVED_SLUGS = new Set(["new", "edit", "preview", "api", "studio"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug: string): string | null {
  if (slug.length < RELEASE_LIMITS.slugMin) return `Use at least ${RELEASE_LIMITS.slugMin} characters.`;
  if (slug.length > RELEASE_LIMITS.slug) return `Keep the URL under ${RELEASE_LIMITS.slug} characters.`;
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens only (for example: night-frequency-remix).";
  if (RESERVED_SLUGS.has(slug)) return "This address is reserved. Choose another.";
  return null;
}

/** Derives a URL-safe slug from a title. Returns "" when nothing usable remains. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, RELEASE_LIMITS.slug)
    .replace(/-+$/, "");
}

export function releaseKey(slug: string): string {
  return `release:${slug}`;
}

export function slugFromKey(key: string): string | null {
  return key.startsWith("release:") ? key.slice("release:".length) : null;
}

export function parseReleaseDocument(raw: unknown): ReleaseDocument | null {
  if (typeof raw !== "string") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.title !== "string" || !(RELEASE_TYPES as readonly unknown[]).includes(r.type)) return null;
  if (r.releaseDate !== null && typeof r.releaseDate !== "string") return null;
  if (typeof r.dateVerified !== "boolean") return null;
  if (typeof r.description !== "string") return null;
  if (r.artworkId !== null && typeof r.artworkId !== "string") return null;
  if (!Array.isArray(r.links)) return null;
  const links: ReleaseLinkDoc[] = [];
  for (const link of r.links) {
    if (typeof link !== "object" || link === null) return null;
    const l = link as Record<string, unknown>;
    if (typeof l.label !== "string" || typeof l.href !== "string") return null;
    links.push({ label: l.label, href: l.href });
  }
  if (typeof r.seoTitle !== "string" || typeof r.seoDescription !== "string") return null;
  return {
    title: r.title,
    type: r.type as ReleaseKind,
    releaseDate: r.releaseDate,
    dateVerified: r.dateVerified,
    description: r.description,
    artworkId: r.artworkId,
    links,
    seoTitle: r.seoTitle,
    seoDescription: r.seoDescription,
  };
}

/** Public display rule: a date is shown only when it was explicitly verified. */
export function publicReleaseDate(doc: ReleaseDocument): string | null {
  return doc.dateVerified && doc.releaseDate ? doc.releaseDate : null;
}
