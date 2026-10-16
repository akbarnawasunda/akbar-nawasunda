import type { Client } from "@libsql/client";

/**
 * Process-wide database state. Kept on globalThis under a Symbol.for key so that every module copy
 * in the same Node process (for example the SSR and root Next.js runtimes) shares one client and one
 * schema check, instead of each copy opening its own connection and re-checking the schema.
 * Plain module (no "server-only") so tests can exercise it directly.
 */
export interface StudioDbState {
  client: Client | null;
  schemaReady: Promise<void> | null;
}

const STATE_KEY = Symbol.for("nawa-studio.db-state.v1");

export function getStudioDbState(): StudioDbState {
  const scope = globalThis as typeof globalThis & { [STATE_KEY]?: StudioDbState };
  scope[STATE_KEY] ??= { client: null, schemaReady: null };
  return scope[STATE_KEY];
}
