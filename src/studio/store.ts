import "server-only";

import { getReadyDb } from "./db";
import * as repo from "./repository";
import { DEFAULT_DESIGN, parseDesign, type DesignSettings } from "./design";
import { PAGE_CONFIG, emptyPageDocument, parsePageDocument, type PageDocument, type PageSlug } from "./content-model";
import { parseReleaseDocument, releaseKey, slugFromKey, type ReleaseDocument } from "./releases";
import type { FailureState } from "./security";

/** A managed document as the Studio editor needs it. */
export interface DocumentRecord<T> {
  key: string;
  draft: T;
  draftUpdatedAt: number;
  published: T | null;
  publishedAt: number | null;
}

export const DESIGN_KEY = "design";

// ---------- pages (about, home) ----------

function pageDefault(slug: PageSlug): PageDocument {
  const config = PAGE_CONFIG[slug];
  return emptyPageDocument(config.fields.title ? config.label : "");
}

export async function getPageRecord(slug: PageSlug): Promise<DocumentRecord<PageDocument>> {
  const db = await getReadyDb();
  const fallback = pageDefault(slug);
  await repo.ensureDocument(db, slug, JSON.stringify(fallback), Date.now());
  const row = await repo.readDocument(db, slug);
  if (!row) throw new Error(`Document missing: ${slug}`);
  return {
    key: slug,
    draft: parsePageDocument(row.draftJson) ?? fallback,
    draftUpdatedAt: row.draftUpdatedAt,
    published: row.publishedJson === null ? null : parsePageDocument(row.publishedJson),
    publishedAt: row.publishedAt,
  };
}

export async function savePageDraft(slug: PageSlug, doc: PageDocument, nowMs: number): Promise<void> {
  const db = await getReadyDb();
  await repo.ensureDocument(db, slug, JSON.stringify(pageDefault(slug)), nowMs);
  await repo.writeDraft(db, slug, JSON.stringify(doc), nowMs);
}

export async function publishPage(slug: PageSlug, doc: PageDocument, nowMs: number): Promise<void> {
  const db = await getReadyDb();
  await repo.ensureDocument(db, slug, JSON.stringify(pageDefault(slug)), nowMs);
  await repo.publishJson(db, slug, JSON.stringify(doc), nowMs);
}

// ---------- design settings ----------

export async function getDesignRecord(): Promise<DocumentRecord<DesignSettings>> {
  const db = await getReadyDb();
  const now = Date.now();
  await repo.ensureDocument(db, DESIGN_KEY, JSON.stringify(DEFAULT_DESIGN), now);
  const row = await repo.readDocument(db, DESIGN_KEY);
  if (!row) throw new Error("Design settings missing");
  return {
    key: DESIGN_KEY,
    draft: parseDesign(row.draftJson) ?? DEFAULT_DESIGN,
    draftUpdatedAt: row.draftUpdatedAt,
    published: row.publishedJson === null ? null : parseDesign(row.publishedJson),
    publishedAt: row.publishedAt,
  };
}

export async function saveDesignDraft(settings: DesignSettings, nowMs: number): Promise<void> {
  const db = await getReadyDb();
  await repo.ensureDocument(db, DESIGN_KEY, JSON.stringify(DEFAULT_DESIGN), nowMs);
  await repo.writeDraft(db, DESIGN_KEY, JSON.stringify(settings), nowMs);
}

export async function publishDesign(settings: DesignSettings, nowMs: number): Promise<void> {
  const db = await getReadyDb();
  await repo.ensureDocument(db, DESIGN_KEY, JSON.stringify(DEFAULT_DESIGN), nowMs);
  await repo.publishJson(db, DESIGN_KEY, JSON.stringify(settings), nowMs);
}

// ---------- releases ----------

export interface ReleaseRecord {
  slug: string;
  draft: ReleaseDocument | null;
  draftUpdatedAt: number;
  published: ReleaseDocument | null;
  publishedAt: number | null;
}

export async function releaseExists(slug: string): Promise<boolean> {
  const db = await getReadyDb();
  return (await repo.readDocument(db, releaseKey(slug))) !== null;
}

export async function getReleaseRecord(slug: string): Promise<ReleaseRecord | null> {
  const db = await getReadyDb();
  const row = await repo.readDocument(db, releaseKey(slug));
  if (!row) return null;
  return {
    slug,
    draft: parseReleaseDocument(row.draftJson),
    draftUpdatedAt: row.draftUpdatedAt,
    published: row.publishedJson === null ? null : parseReleaseDocument(row.publishedJson),
    publishedAt: row.publishedAt,
  };
}

/** Creates a release with an initial draft. Fails if the slug is already used. */
export async function createReleaseDraft(slug: string, doc: ReleaseDocument, nowMs: number): Promise<boolean> {
  const db = await getReadyDb();
  const key = releaseKey(slug);
  if ((await repo.readDocument(db, key)) !== null) return false;
  await repo.ensureDocument(db, key, JSON.stringify(doc), nowMs);
  return true;
}

export async function saveReleaseDraft(slug: string, doc: ReleaseDocument, nowMs: number): Promise<boolean> {
  const db = await getReadyDb();
  return repo.writeDraft(db, releaseKey(slug), JSON.stringify(doc), nowMs);
}

export async function publishRelease(slug: string, doc: ReleaseDocument, nowMs: number): Promise<boolean> {
  const db = await getReadyDb();
  return repo.publishJson(db, releaseKey(slug), JSON.stringify(doc), nowMs);
}

export async function unpublishRelease(slug: string): Promise<boolean> {
  const db = await getReadyDb();
  return repo.unpublish(db, releaseKey(slug));
}

/** All releases for the Studio list, including drafts. */
export async function listReleaseRecords(): Promise<ReleaseRecord[]> {
  const db = await getReadyDb();
  const rows = await repo.listWithPrefix(db, "release:");
  const out: ReleaseRecord[] = [];
  for (const row of rows) {
    const slug = slugFromKey(row.key);
    if (!slug) continue;
    out.push({
      slug,
      draft: parseReleaseDocument(row.draftJson),
      draftUpdatedAt: row.draftUpdatedAt,
      published: row.publishedJson === null ? null : parseReleaseDocument(row.publishedJson),
      publishedAt: row.publishedAt,
    });
  }
  return out;
}

// ---------- sessions and login failures ----------

export async function createSession(tokenHash: string, createdMs: number, expiresMs: number): Promise<void> {
  const db = await getReadyDb();
  await db.execute({
    sql: "INSERT INTO studio_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)",
    args: [tokenHash, createdMs, expiresMs],
  });
}

/** Expiry time for a session hash, or null if no such session exists. */
export async function findSessionExpiry(tokenHash: string): Promise<number | null> {
  const db = await getReadyDb();
  const result = await db.execute({
    sql: "SELECT expires_at FROM studio_sessions WHERE token_hash = ?",
    args: [tokenHash],
  });
  const row = result.rows[0];
  return row ? Number(row.expires_at) : null;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  const db = await getReadyDb();
  await db.execute({ sql: "DELETE FROM studio_sessions WHERE token_hash = ?", args: [tokenHash] });
}

export async function getFailureState(): Promise<FailureState | null> {
  const db = await getReadyDb();
  const result = await db.execute("SELECT failures, window_start FROM studio_login_failures WHERE id = 1");
  const row = result.rows[0];
  return row ? { failures: Number(row.failures), windowStartMs: Number(row.window_start) } : null;
}

export async function setFailureState(state: FailureState | null): Promise<void> {
  const db = await getReadyDb();
  if (state === null) {
    await db.execute("DELETE FROM studio_login_failures WHERE id = 1");
    return;
  }
  await db.execute({
    sql: "INSERT INTO studio_login_failures (id, failures, window_start) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET failures = excluded.failures, window_start = excluded.window_start",
    args: [state.failures, state.windowStartMs],
  });
}

/** Round-trip check used by the dashboard. */
export async function pingDatabase(): Promise<void> {
  const db = await getReadyDb();
  await repo.ping(db);
}

/** Counts of published items for the dashboard. Read-only. */
export async function publicationCounts(): Promise<{ pages: number; releases: number; draftReleases: number }> {
  const db = await getReadyDb();
  const pageRows = await repo.readPublishedWithPrefix(db, "");
  const pages = pageRows.filter((row) => !row.key.includes(":") && row.key !== "design").length;
  const releaseRows = await repo.listWithPrefix(db, "release:");
  return {
    pages,
    releases: releaseRows.filter((row) => row.publishedJson !== null).length,
    draftReleases: releaseRows.filter((row) => row.publishedJson === null).length,
  };
}
