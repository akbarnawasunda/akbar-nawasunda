import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { ensureDatabaseDirectory, readDatabaseEnv } from "./src/lib/turso";

/**
 * drizzle-kit configuration.
 *
 * Reads DATABASE_URL / DATABASE_AUTH_TOKEN, falling back to TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
 * (D-014). Without any URL it points at the local development file, so `npm run db:generate` works
 * offline; `db:migrate` and `db:push` need a real URL and token.
 */
// drizzle-kit is a standalone process: it does not read .env.local the way `next` does.
loadEnvConfig(process.cwd());

const { url, authToken } = readDatabaseEnv();
ensureDatabaseDirectory(url);

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
