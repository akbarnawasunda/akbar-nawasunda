import "server-only";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { createClient, type Client } from "@libsql/client";

import { getStudioConfigStatus } from "./config";
import { applySchema } from "./schema";
import { getStudioDbState } from "./db-state";

export class StudioNotConfiguredError extends Error {
  constructor(public readonly missing: string[]) {
    super(`NAWA STUDIO is not configured. Missing: ${missing.join(", ")}`);
    this.name = "StudioNotConfiguredError";
  }
}

/** Server-only database client. Credentials are read from the environment and never returned. */
export function getDb(): Client {
  const status = getStudioConfigStatus();
  if (!status.ready) throw new StudioNotConfiguredError(status.missing);

  const state = getStudioDbState();
  if (!state.client) {
    const url = process.env.DATABASE_URL as string;
    if (url.startsWith("file:")) {
      mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
    }
    state.client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
    });
  }
  return state.client;
}

/**
 * Returns a client once the schema check has passed. A successful check runs at most once per process.
 * A failed check (including SchemaIncompleteError) is not cached, so the next request re-checks and
 * fails closed again rather than silently recreating tables.
 */
export async function getReadyDb(): Promise<Client> {
  const db = getDb();
  const state = getStudioDbState();
  state.schemaReady ??= applySchema(db).catch((error: unknown) => {
    state.schemaReady = null;
    throw error;
  });
  await state.schemaReady;
  return db;
}
