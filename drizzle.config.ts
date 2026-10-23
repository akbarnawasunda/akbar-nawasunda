import { defineConfig } from "drizzle-kit";

import { readDatabaseEnv } from "./src/lib/turso";

/**
 * drizzle-kit configuration.
 *
 * Reads DATABASE_URL / DATABASE_AUTH_TOKEN, falling back to TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
 * (D-014). Without any URL it points at the local development file, so `npm run db:generate` works
 * offline; `db:migrate` and `db:push` need a real URL and token.
 */
const { url, authToken } = readDatabaseEnv();

export default defineConfig({
  dialect: "turso",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: url ?? "file:./data/studio.db",
    authToken: authToken ?? undefined,
  },
  strict: true,
  verbose: true,
});
