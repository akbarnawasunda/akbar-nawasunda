import type { Client } from "@libsql/client";

/**
 * Data access for managed documents. Every function takes the client explicitly, so tests can run
 * them against a temporary file database. Server code wraps these in store.ts.
 *
 * A document is a row in `studio_pages`, keyed by `key`. Draft and published are separate JSON
 * columns: writing a draft never touches the published snapshot, and only publish copies draft to
 * published, in one batch.
 */

export interface DocumentRow {
  key: string;
  draftJson: string;
  draftUpdatedAt: number;
  publishedJson: string | null;
  publishedAt: number | null;
}

/** Creates the row with `defaultJson` as draft if it does not exist yet. Idempotent. */
export async function ensureDocument(db: Client, key: string, defaultJson: string, nowMs: number): Promise<void> {
  await db.execute({
    sql: "INSERT OR IGNORE INTO studio_pages (slug, draft_json, draft_updated_at) VALUES (?, ?, ?)",
    args: [key, defaultJson, nowMs],
  });
}

export async function readDocument(db: Client, key: string): Promise<DocumentRow | null> {
  const result = await db.execute({
    sql: "SELECT slug, draft_json, draft_updated_at, published_json, published_at FROM studio_pages WHERE slug = ?",
    args: [key],
  });
  const row = result.rows[0];
  return row ? toDocumentRow(row) : null;
}

/** Writes the draft only. Returns false when the document does not exist. */
export async function writeDraft(db: Client, key: string, json: string, nowMs: number): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE studio_pages SET draft_json = ?, draft_updated_at = ? WHERE slug = ?",
    args: [json, nowMs, key],
  });
  return result.rowsAffected > 0;
}

/** Writes the draft and the published snapshot in one atomic batch. */
export async function publishJson(db: Client, key: string, json: string, nowMs: number): Promise<boolean> {
  const results = await db.batch(
    [
      {
        sql: "UPDATE studio_pages SET draft_json = ?, draft_updated_at = ?, published_json = ?, published_at = ? WHERE slug = ?",
        args: [json, nowMs, json, nowMs, key],
      },
    ],
    "write",
  );
  return (results[0]?.rowsAffected ?? 0) > 0;
}

/** Removes the published snapshot. The draft is kept, so the item becomes private again. */
export async function unpublish(db: Client, key: string): Promise<boolean> {
  const result = await db.execute({
    sql: "UPDATE studio_pages SET published_json = NULL, published_at = NULL WHERE slug = ?",
    args: [key],
  });
  return result.rowsAffected > 0;
}

/** Published documents whose key starts with `prefix`. Drafts are never returned. */
export async function readPublishedWithPrefix(db: Client, prefix: string): Promise<DocumentRow[]> {
  const result = await db.execute({
    sql: `SELECT slug, draft_json, draft_updated_at, published_json, published_at
          FROM studio_pages
          WHERE substr(slug, 1, ?) = ? AND published_json IS NOT NULL`,
    args: [prefix.length, prefix],
  });
  return result.rows.map(toDocumentRow);
}

/** All documents whose key starts with `prefix`, drafts included. For the Studio list only. */
export async function listWithPrefix(db: Client, prefix: string): Promise<DocumentRow[]> {
  const result = await db.execute({
    sql: `SELECT slug, draft_json, draft_updated_at, published_json, published_at
          FROM studio_pages WHERE substr(slug, 1, ?) = ? ORDER BY draft_updated_at DESC`,
    args: [prefix.length, prefix],
  });
  return result.rows.map(toDocumentRow);
}

export async function ping(db: Client): Promise<void> {
  await db.execute("SELECT 1");
}

function toDocumentRow(row: Record<string, unknown> | { [key: string]: unknown; length?: number }): DocumentRow {
  const r = row as Record<string, unknown>;
  return {
    key: String(r.slug),
    draftJson: String(r.draft_json),
    draftUpdatedAt: Number(r.draft_updated_at),
    publishedJson: r.published_json == null ? null : String(r.published_json),
    publishedAt: r.published_at == null ? null : Number(r.published_at),
  };
}
