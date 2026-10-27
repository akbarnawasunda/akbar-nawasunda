/**
 * NAWA STUDIO configuration. Reads environment variable names only; values never leave the server.
 *
 * DATABASE_URL / TURSO_DATABASE_URL          file:./data/studio.db (local) or libsql://<db>.turso.io
 * DATABASE_AUTH_TOKEN / TURSO_AUTH_TOKEN     required for libsql:// URLs, not for file: URLs
 * STUDIO_ADMIN_PASSWORD_HASH                 scrypt hash from `npm run studio:hash-password`
 *
 * The two database variable spellings are resolved in ../lib/turso.ts (decision D-014).
 */
import { needsAuthToken, readDatabaseEnv } from "../lib/turso";

export interface StudioConfigStatus {
  ready: boolean;
  missing: string[];
}

type Env = Record<string, string | undefined>;

export function getStudioConfigStatus(env: Env = process.env): StudioConfigStatus {
  const missing: string[] = [];
  const database = readDatabaseEnv(env);

  if (!database.url) {
    missing.push("DATABASE_URL (or TURSO_DATABASE_URL)");
  } else if (needsAuthToken(database.url) && !database.authToken) {
    missing.push("DATABASE_AUTH_TOKEN (or TURSO_AUTH_TOKEN)");
  }
  if (!env.STUDIO_ADMIN_PASSWORD_HASH?.trim()) {
    missing.push("STUDIO_ADMIN_PASSWORD_HASH");
  }
  return { ready: missing.length === 0, missing };
}
