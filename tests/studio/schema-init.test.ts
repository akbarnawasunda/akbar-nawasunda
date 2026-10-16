import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { createClient, type Client } from "@libsql/client";

import { applySchema, SchemaIncompleteError, STUDIO_TABLES } from "../../src/studio/schema";
import { getStudioDbState } from "../../src/studio/db-state";

/**
 * Schema initialisation must distinguish a genuinely new database (create everything) from a
 * partially missing one (refuse, and never recreate the missing table silently). These tests use
 * temporary file databases only.
 */

const dirs: string[] = [];
after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function tempDb(name: string): { dir: string; url: string } {
  const dir = mkdtempSync(join(tmpdir(), "studio-schema-"));
  dirs.push(dir);
  return { dir, url: `file:${join(dir, name)}` };
}

async function tableNames(db: Client): Promise<string[]> {
  const result = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  return result.rows.map((row) => String(row.name));
}

describe("schema initialisation", () => {
  it("creates every table in a genuinely new database", async () => {
    const { url } = tempDb("new.db");
    const db = createClient({ url });
    try {
      await applySchema(db);
      const names = await tableNames(db);
      for (const table of STUDIO_TABLES) assert.ok(names.includes(table), `${table} should exist`);
    } finally {
      db.close();
    }
  });

  it("leaves an existing complete schema and its rows untouched", async () => {
    const { url } = tempDb("complete.db");
    const db = createClient({ url });
    try {
      await applySchema(db);
      await db.execute({
        sql: "INSERT INTO studio_pages (slug, draft_json, draft_updated_at) VALUES (?, ?, ?)",
        args: ["about", "{}", 1],
      });
      await applySchema(db); // second start of the same process or a restart
      await applySchema(db);
      const rows = await db.execute("SELECT slug FROM studio_pages");
      assert.deepEqual(rows.rows.map((row) => row.slug), ["about"]);
    } finally {
      db.close();
    }
  });

  it("refuses a partially missing schema and does not recreate the missing table", async () => {
    const { url } = tempDb("partial.db");
    const db = createClient({ url });
    try {
      await applySchema(db);
      await db.execute({
        sql: "INSERT INTO studio_pages (slug, draft_json, draft_updated_at) VALUES (?, ?, ?)",
        args: ["release:keep-me", "{}", 1],
      });
      await db.execute("DROP TABLE studio_login_failures");

      await assert.rejects(applySchema(db), (error: unknown) => {
        assert.ok(error instanceof SchemaIncompleteError, "expected SchemaIncompleteError");
        assert.deepEqual([...error.missing], ["studio_login_failures"]);
        return true;
      });

      // Nothing was created behind the operator's back, and existing rows are still there.
      const names = await tableNames(db);
      assert.equal(names.includes("studio_login_failures"), false);
      const rows = await db.execute("SELECT slug FROM studio_pages");
      assert.deepEqual(rows.rows.map((row) => row.slug), ["release:keep-me"]);

      // Repeated attempts keep failing closed.
      await assert.rejects(applySchema(db), SchemaIncompleteError);
    } finally {
      db.close();
    }
  });

  it("initialises correctly when two processes start at the same time", async () => {
    const { url } = tempDb("race.db");
    const clients = [1, 2, 3].map(() => createClient({ url }));
    try {
      const outcomes = await Promise.allSettled(clients.map((db) => applySchema(db)));
      for (const outcome of outcomes) {
        assert.equal(outcome.status, "fulfilled", outcome.status === "rejected" ? String(outcome.reason) : "");
      }
      const names = await tableNames(clients[0]!);
      for (const table of STUDIO_TABLES) assert.ok(names.includes(table), `${table} should exist`);
    } finally {
      for (const db of clients) db.close();
    }
  });
});

describe("process-wide database state", () => {
  it("returns the same state object on every lookup", () => {
    const first = getStudioDbState();
    const second = getStudioDbState();
    assert.equal(first, second);
  });
});
