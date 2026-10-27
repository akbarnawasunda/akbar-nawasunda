/**
 * Drizzle schema — the declarative source of truth for the Turso database.
 *
 * These tables are the ones the running app actually uses (src/studio/schema.ts holds the same DDL
 * as idempotent CREATE TABLE statements, so the site keeps working even if a migration was not run).
 *
 * Why a document table instead of the `releases` table in docs/04-TECHNICAL-ARCHITECTURE/
 * DATA_MODEL_2.md: the Studio stores every managed item (pages, design settings, releases) as a row
 * with a draft JSON and an optional published JSON snapshot. That is what makes "draft never leaks"
 * enforce-able in one place — the public readers select `published_json` only. A dedicated releases
 * table plus a separate publish flag would duplicate that rule per table. See D-025.
 *
 * Generate a migration with `npm run db:generate`, apply it with `npm run db:migrate`.
 */
import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** One managed document: "home", "about", "design", or "release:<slug>". */
export const studioPages = sqliteTable("studio_pages", {
  /** Document key. `release:<slug>` for releases, bare slug for pages. */
  slug: text("slug").primaryKey(),
  /** JSON of the working copy. Never exposed by a public reader. */
  draftJson: text("draft_json").notNull(),
  draftUpdatedAt: integer("draft_updated_at").notNull(),
  /** JSON snapshot that the public site reads. NULL means unpublished. */
  publishedJson: text("published_json"),
  publishedAt: integer("published_at"),
});

/** Admin sessions. Only the hash of the cookie value is stored. */
export const studioSessions = sqliteTable("studio_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

/** Login throttle. One row only (id = 1), enforced by a CHECK constraint. */
export const studioLoginFailures = sqliteTable(
  "studio_login_failures",
  {
    id: integer("id").primaryKey(),
    failures: integer("failures").notNull(),
    windowStart: integer("window_start").notNull(),
  },
  (table) => [check("studio_login_failures_single_row", sql`${table.id} = 1`)],
);

export type StudioPageRow = typeof studioPages.$inferSelect;
export type StudioPageInsert = typeof studioPages.$inferInsert;
