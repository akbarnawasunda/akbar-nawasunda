import "server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createClient, type Client } from "@libsql/client";

import { getStudioConfigStatus } from "./config";

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
    const url = process.env.DATABASE_URL as string;
    if (url.startsWith("file:")) {
      mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
    }
    client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
    });
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

async function applySchema(db: Client): Promise<void> {
  await db.batch(
    [
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
    ],
    "write",
  );
}
