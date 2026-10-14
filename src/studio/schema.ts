import type { Client } from "@libsql/client";

/**
 * Database schema for NAWA STUDIO. Plain module (no "server-only") so tests can run it against a
 * temporary file database. Every statement is idempotent.
 *
 * `studio_pages` is the generic document table: each row is one managed document keyed by
 * `slug`, e.g. "about", "home", "design", or "release:<slug>". It stores a draft and an optional
 * published snapshot, both as JSON. Public code reads only the published snapshot.
 */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS studio_sessions (
    token_hash TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS studio_pages (
    slug TEXT PRIMARY KEY,
    draft_json TEXT NOT NULL,
    draft_updated_at INTEGER NOT NULL,
    published_json TEXT,
    published_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS studio_login_failures (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    failures INTEGER NOT NULL,
    window_start INTEGER NOT NULL
  )`,
] as const;

export async function applySchema(db: Client): Promise<void> {
  await db.batch([...SCHEMA_STATEMENTS], "write");
}
