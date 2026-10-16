/**
 * Content export: a pure serializer. No database, no environment, no server-only imports, so it is
 * unit-tested directly.
 *
 * Only three document families are ever exported, and each is recognized by an explicit rule:
 *   - pages:    "about" and "home" (keys from PAGE_SLUGS)
 *   - design:   "design"
 *   - releases: "release:<slug>" where <slug> passes validateSlug
 *
 * Anything else in `studio_pages` (and the session and login-failure tables, which are never read)
 * is counted, never read into the output. A document that does not parse is reported by its
 * recognized key and a generic status. Its raw contents are never exported, and it is never replaced
 * with a default.
 */

import { PAGE_SLUGS, parsePageDocument, type PageDocument, type PageSlug } from "./content-model";
import { parseDesign, type DesignSettings } from "./design";
import { parseArtistSettings, type ArtistSettings } from "./artist-settings";
import { parseReleaseDocument, validateSlug, type ReleaseDocument } from "./releases";

export const EXPORT_FORMAT = "nawa-studio-content-export" as const;
export const EXPORT_FORMAT_VERSION = 1 as const;
export const DESIGN_DOCUMENT_KEY = "design" as const;
export const SETTINGS_DOCUMENT_KEY = "settings" as const;
export const RELEASE_KEY_PREFIX = "release:" as const;

/** One stored row, exactly as read from `studio_pages`. Timestamps are whatever the database returned. */
export interface ExportRow {
  key: string;
  draftJson: unknown;
  draftUpdatedAt: unknown;
  publishedJson: unknown;
  publishedAt: unknown;
}

/** Everything the export is allowed to see: every key (for counting) and the rows of recognized keys only. */
export interface ExportSource {
  /** Every key present in the table, recognized or not. Keys only, never contents. */
  allKeys: readonly string[];
  /** Full rows, limited by the caller to recognized keys. The serializer re-checks each one. */
  rows: readonly ExportRow[];
}

export interface ExportEntry<T> {
  draft: T | null;
  draftUpdatedAt: string | null;
  published: T | null;
  publishedAt: string | null;
}

export interface UnreadableNote {
  key: string;
  part: "draft" | "published" | "metadata";
  status: "unreadable";
}

export interface ContentExport {
  format: typeof EXPORT_FORMAT;
  formatVersion: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  /** False when anything was unreadable or unrecognized, so the file is known to be partial. */
  complete: boolean;
  pages: Partial<Record<PageSlug, ExportEntry<PageDocument>>>;
  design: ExportEntry<DesignSettings> | null;
  settings: ExportEntry<ArtistSettings> | null;
  releases: Array<{ slug: string } & ExportEntry<ReleaseDocument>>;
  unreadable: UnreadableNote[];
  omitted: { unrecognizedKeys: number };
}

export type KeyClass =
  | { kind: "page"; slug: PageSlug }
  | { kind: "design" }
  | { kind: "settings" }
  | { kind: "release"; slug: string }
  | { kind: "unknown" };

/** Classifies a stored key by exact rules. Anything not matched is unknown, with no partial matching. */
export function classifyKey(key: string): KeyClass {
  if ((PAGE_SLUGS as readonly string[]).includes(key)) return { kind: "page", slug: key as PageSlug };
  if (key === DESIGN_DOCUMENT_KEY) return { kind: "design" };
  if (key === SETTINGS_DOCUMENT_KEY) return { kind: "settings" };
  if (key.startsWith(RELEASE_KEY_PREFIX)) {
    const slug = key.slice(RELEASE_KEY_PREFIX.length);
    if (slug.length > 0 && validateSlug(slug) === null) return { kind: "release", slug };
  }
  return { kind: "unknown" };
}

/** Converts a stored millisecond timestamp to ISO 8601, or null when the value is not usable. */
export function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type Part<T> = { value: T | null; ok: boolean };

function readJsonPart<T>(raw: unknown, parse: (value: unknown) => T | null): Part<T> {
  if (raw === null) return { value: null, ok: true };
  const parsed = parse(raw);
  return parsed === null ? { value: null, ok: false } : { value: parsed, ok: true };
}

function buildEntry<T>(
  key: string,
  row: ExportRow,
  parse: (value: unknown) => T | null,
  unreadable: UnreadableNote[],
): ExportEntry<T> {
  const draft = readJsonPart(row.draftJson, parse);
  const published = readJsonPart(row.publishedJson, parse);
  const draftUpdatedAt = toIsoTimestamp(row.draftUpdatedAt);
  const publishedAt = toIsoTimestamp(row.publishedAt);

  // A draft is required: a null or non-matching draft is reported, never replaced with a default.
  if (!draft.ok || row.draftJson === null) unreadable.push({ key, part: "draft", status: "unreadable" });
  if (!published.ok) unreadable.push({ key, part: "published", status: "unreadable" });
  if (draftUpdatedAt === null && row.draftUpdatedAt !== null && row.draftUpdatedAt !== undefined) {
    unreadable.push({ key, part: "metadata", status: "unreadable" });
  }
  if (publishedAt === null && row.publishedAt !== null && row.publishedAt !== undefined) {
    unreadable.push({ key, part: "metadata", status: "unreadable" });
  }

  return {
    draft: draft.value,
    draftUpdatedAt,
    published: published.value,
    publishedAt,
  };
}

/** Builds the export. Pure: the same input and `now` always give the same output. */
export function buildContentExport(source: ExportSource, now: Date): ContentExport {
  const unreadable: UnreadableNote[] = [];
  const pages: ContentExport["pages"] = {};
  let design: ExportEntry<DesignSettings> | null = null;
  let settings: ExportEntry<ArtistSettings> | null = null;
  const releases: ContentExport["releases"] = [];

  // Count keys that are not recognized. Their contents are never read here.
  const unrecognizedKeys = source.allKeys.filter((key) => classifyKey(key).kind === "unknown").length;

  // Stable order: pages in configuration order, then design, then releases sorted by slug.
  const seen = new Set<string>();
  for (const row of source.rows) {
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    const kind = classifyKey(row.key);
    if (kind.kind === "page") {
      pages[kind.slug] = buildEntry(row.key, row, parsePageDocument, unreadable);
    } else if (kind.kind === "design") {
      design = buildEntry(row.key, row, parseDesign, unreadable);
    } else if (kind.kind === "settings") {
      settings = buildEntry(row.key, row, parseArtistSettings, unreadable);
    } else if (kind.kind === "release") {
      releases.push({ slug: kind.slug, ...buildEntry(row.key, row, parseReleaseDocument, unreadable) });
    }
    // Unknown rows that happen to be passed in are ignored: their contents never reach the output.
  }

  releases.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const orderedPages: ContentExport["pages"] = {};
  for (const slug of PAGE_SLUGS) {
    const entry = pages[slug];
    if (entry) orderedPages[slug] = entry;
  }

  return {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    complete: unreadable.length === 0 && unrecognizedKeys === 0,
    pages: orderedPages,
    design,
    settings,
    releases,
    unreadable,
    omitted: { unrecognizedKeys },
  };
}

/** Serializes the export as pretty JSON with a trailing newline. */
export function serializeContentExport(exported: ContentExport): string {
  return `${JSON.stringify(exported, null, 2)}\n`;
}

/**
 * Download filename with the date in Asia/Jakarta, regardless of the server's own timezone.
 * Only digits and fixed text are used, so no request data can reach the header.
 */
export function exportFilename(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return `nawa-studio-export-${date}.json`;
}

