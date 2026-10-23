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

/** True when the URL is remote (libsql://, https://, wss://) and therefore needs an auth token. */
export function needsAuthToken(url: string): boolean {
  return !url.startsWith("file:");
}
