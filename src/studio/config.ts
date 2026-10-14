/**
 * NAWA STUDIO configuration. Reads environment variable names only; values never leave the server.
 *
 * DATABASE_URL              file:./data/studio.db (local) or libsql://<db>.turso.io (production)
 * DATABASE_AUTH_TOKEN       required for libsql:// URLs, not for file: URLs
 * STUDIO_ADMIN_PASSWORD_HASH  scrypt hash produced by `npm run studio:hash-password`
 */
export interface StudioConfigStatus {
  ready: boolean;
  missing: string[];
}

type Env = Record<string, string | undefined>;

export function getStudioConfigStatus(env: Env = process.env): StudioConfigStatus {
  const missing: string[] = [];
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    missing.push("DATABASE_URL");
  } else if (!databaseUrl.startsWith("file:") && !env.DATABASE_AUTH_TOKEN?.trim()) {
    missing.push("DATABASE_AUTH_TOKEN");
  }
  if (!env.STUDIO_ADMIN_PASSWORD_HASH?.trim()) {
    missing.push("STUDIO_ADMIN_PASSWORD_HASH");
  }
  return { ready: missing.length === 0, missing };
}
