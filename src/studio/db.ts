import "server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createClient, type Client } from "@libsql/client";

import { readDatabaseEnv } from "../lib/turso";
import { getStudioConfigStatus } from "./config";
import { applySchema } from "./schema";

export class StudioNotConfiguredError extends Error {
  constructor(public readonly missing: string[]) {
    super(`NAWA STUDIO is not configured. Missing: ${missing.join(", ")}`);
    this.name = "StudioNotConfiguredError";
  }
}

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

/** Server-only database client. Credentials are read from the environment and never returned. */
export function getDb(): Client {
  const status = getStudioConfigStatus();
  if (!status.ready) throw new StudioNotConfiguredError(status.missing);

  if (!client) {
    const { url, authToken } = readDatabaseEnv();
    if (!url) throw new StudioNotConfiguredError(["DATABASE_URL (or TURSO_DATABASE_URL)"]);
    if (url.startsWith("file:")) {
      mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
    }
    client = createClient({ url, authToken: authToken ?? undefined });
  }
  return client;
}

/** Returns a client after the schema has been applied once per process. Statements are idempotent. */
export async function getReadyDb(): Promise<Client> {
  const db = getDb();
  schemaReady ??= applySchema(db).catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return db;
}
