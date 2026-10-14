import "server-only";

import { getReadyDb } from "./db";
import { emptyPageDocument, parsePageDocument, PAGE_LABELS, type PageDocument, type PageSlug } from "./content-model";
import type { FailureState } from "./security";

export interface PageRecord {
  slug: PageSlug;
  draft: PageDocument;
  draftUpdatedAt: number;
  published: PageDocument | null;
  publishedAt: number | null;
}

/** Returns the page record, creating an empty draft the first time a page is touched. */
export async function getPageRecord(slug: PageSlug): Promise<PageRecord> {
  const db = await getReadyDb();
  const nowMs = Date.now();
  const fallback = emptyPageDocument(PAGE_LABELS[slug]);
  await db.execute({
    sql: "INSERT OR IGNORE INTO studio_pages (slug, draft_json, draft_updated_at) VALUES (?, ?, ?)",
    args: [slug, JSON.stringify(fallback), nowMs],
  });

  const result = await db.execute({
    sql: "SELECT draft_json, draft_updated_at, published_json, published_at FROM studio_pages WHERE slug = ?",
    args: [slug],
  });
  const row = result.rows[0];
  if (!row) throw new Error(`Page record missing for ${slug}`);

  const draft = parsePageDocument(row.draft_json) ?? fallback;
  const published = row.published_json == null ? null : parsePageDocument(row.published_json);
  return {
    slug,
    draft,
    draftUpdatedAt: Number(row.draft_updated_at),
    published,
    publishedAt: row.published_at == null ? null : Number(row.published_at),
  };
}

/** Saves the draft only. The public site never reads drafts. */
export async function saveDraft(slug: PageSlug, doc: PageDocument, nowMs: number): Promise<void> {
  const db = await getReadyDb();
  await db.execute({
    sql: "UPDATE studio_pages SET draft_json = ?, draft_updated_at = ? WHERE slug = ?",
    args: [JSON.stringify(doc), nowMs, slug],
  });
}

/** Saves the document as the draft and publishes it, in one atomic batch. */
export async function publishDocument(slug: PageSlug, doc: PageDocument, nowMs: number): Promise<void> {
  const db = await getReadyDb();
  const json = JSON.stringify(doc);
  await db.batch(
    [
      {
        sql: "UPDATE studio_pages SET draft_json = ?, draft_updated_at = ?, published_json = ?, published_at = ? WHERE slug = ?",
        args: [json, nowMs, json, nowMs, slug],
      },
    ],
    "write",
  );
}

/** Published content for public pages. Returns null when nothing has been published. */
export async function getPublishedDocument(slug: PageSlug): Promise<PageDocument | null> {
  const db = await getReadyDb();
  const result = await db.execute({
    sql: "SELECT published_json FROM studio_pages WHERE slug = ?",
    args: [slug],
  });
  const row = result.rows[0];
  if (!row || row.published_json == null) return null;
  return parsePageDocument(row.published_json);
}

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

/** Counts published pages for the dashboard. Reads only, never mutates. */
export async function countPublishedPages(): Promise<number> {
  const db = await getReadyDb();
  const result = await db.execute("SELECT COUNT(*) AS n FROM studio_pages WHERE published_json IS NOT NULL");
  return Number(result.rows[0]?.n ?? 0);
}

/** Round-trip check used by the dashboard. */
export async function pingDatabase(): Promise<void> {
  const db = await getReadyDb();
  await db.execute("SELECT 1");
}
