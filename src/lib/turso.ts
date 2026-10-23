import { existsSync, mkdirSync } from "node:fs";

/**
 * Database connection settings, read from the environment.
 *
 * Two variable names are supported for the same Turso database (decision D-014):
 *
 *   DATABASE_URL          / DATABASE_AUTH_TOKEN          (what the app and .env.example use)
 *   TURSO_DATABASE_URL    / TURSO_AUTH_TOKEN             (what older docs and the runbook use)
 *
 * DATABASE_URL wins when both are present. A local `file:` URL needs no token.
 *
 * This module is deliberately dependency-free so it can be imported by the app, by drizzle-kit
 * config and by the seed script.
 */
export interface DatabaseEnv {
  /** `file:./data/studio.db` or `libsql://<db>.turso.io`; null when unset. */
  url: string | null;
  /** Required only for remote libsql:// URLs. */
  authToken: string | null;
  /** Where each value came from, for logs and docs. */
  source: { url: string | null; authToken: string | null };
}

type Env = Record<string, string | undefined>;

function firstSet(env: Env, names: readonly string[]): { value: string | null; name: string | null } {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { value, name };
  }
  return { value: null, name: null };
}

export function readDatabaseEnv(env: Env = process.env): DatabaseEnv {
  const url = firstSet(env, ["DATABASE_URL", "TURSO_DATABASE_URL"]);
  const token = firstSet(env, ["DATABASE_AUTH_TOKEN", "TURSO_AUTH_TOKEN"]);
  return {
    url: url.value,
    authToken: token.value,
    source: { url: url.name, authToken: token.name },
  };
}

/**
 * Creates the directory for a `file:` URL before anything opens it.
 *
 * libSQL refuses to create a missing parent directory ("Unable to open connection ... 14"), which is
 * exactly the state of a fresh checkout: `.gitignore` keeps `/data/` out of git, so the folder does
 * not exist until something makes it. The app already did this in studio/db.ts; the seed script and
 * drizzle-kit did not, so `npm run db:seed` failed on the first run of a new clone.
 *
 * Returns the path it created, or null for remote URLs and for directories that already existed.
 */
export function ensureDatabaseDirectory(url: string | null): string | null {
  if (!url?.startsWith("file:")) return null;
  const path = url.slice("file:".length);
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (!dir) return null;
  if (existsSync(dir)) return null;
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** True when the URL is remote (libsql://, https://, wss://) and therefore needs an auth token. */
export function needsAuthToken(url: string): boolean {
  return !url.startsWith("file:");
}
