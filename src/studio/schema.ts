import type { Client } from "@libsql/client";

/**
 * Database schema for NAWA STUDIO. Plain module (no "server-only") so tests can run it against a
 * temporary file database.
 *
 * `studio_pages` is the generic document table: each row is one managed document keyed by
 * `slug`, e.g. "about", "home", "design", "settings", or "release:<slug>". It stores a draft and an
 * optional published snapshot, both as JSON. Public code reads only the published snapshot.
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

/** Every table the statements above create. Keep in sync with SCHEMA_STATEMENTS. */
export const STUDIO_TABLES = ["studio_sessions", "studio_pages", "studio_login_failures"] as const;

/**
 * Thrown when some, but not all, NAWA STUDIO tables exist. This is never repaired silently:
 * recreating a missing table could hide data loss, so the caller must fail closed and an operator
 * must inspect the database.
 */
export class SchemaIncompleteError extends Error {
  constructor(
    public readonly missing: readonly string[],
    public readonly present: readonly string[],
  ) {
    super(`NAWA STUDIO schema is incomplete. Missing tables: ${missing.join(", ")}`);
    this.name = "SchemaIncompleteError";
  }
}

/**
 * Brings the database to the expected schema, without ever touching existing data:
 * - no NAWA STUDIO tables: a genuinely new database, so create them all;
 * - all tables present: nothing to do;
 * - some tables present: throw SchemaIncompleteError and create nothing.
 * The check and the creation run in one write transaction, so two processes starting at the same
 * time cannot leave a partial schema behind.
 */
export async function applySchema(db: Client): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await applySchemaOnce(db);
      return;
    } catch (error) {
      // SQLITE_BUSY means another process holds the write lock. The transaction was rolled back, so
      // retrying from the start is safe. Any other error (including SchemaIncompleteError) is final.
      if (!isBusyError(error) || attempt >= SCHEMA_BUSY_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
    }
  }
}

const SCHEMA_BUSY_ATTEMPTS = 8;

function isBusyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "SQLITE_BUSY";
}

async function applySchemaOnce(db: Client): Promise<void> {
  const tx = await db.transaction("write");
  try {
    const result = await tx.execute({
      sql: `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${STUDIO_TABLES.map(() => "?").join(", ")})`,
      args: [...STUDIO_TABLES],
    });
    const present = result.rows.map((row) => String(row.name));

    if (present.length === 0) {
      for (const statement of SCHEMA_STATEMENTS) await tx.execute(statement);
    } else if (present.length < STUDIO_TABLES.length) {
      throw new SchemaIncompleteError(
        STUDIO_TABLES.filter((name) => !present.includes(name)),
        present,
      );
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  }
}
