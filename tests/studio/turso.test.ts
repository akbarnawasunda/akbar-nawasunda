import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { needsAuthToken, readDatabaseEnv } from "../../src/lib/turso";
import { getStudioConfigStatus } from "../../src/studio/config";

describe("database environment", () => {
  it("prefers DATABASE_URL when both spellings are present", () => {
    const env = readDatabaseEnv({
      DATABASE_URL: "libsql://primary.turso.io",
      TURSO_DATABASE_URL: "libsql://legacy.turso.io",
      DATABASE_AUTH_TOKEN: "primary-token",
      TURSO_AUTH_TOKEN: "legacy-token",
    });
    assert.equal(env.url, "libsql://primary.turso.io");
    assert.equal(env.authToken, "primary-token");
    assert.deepEqual(env.source, { url: "DATABASE_URL", authToken: "DATABASE_AUTH_TOKEN" });
  });

  it("falls back to the TURSO_* names used by the older runbook", () => {
    const env = readDatabaseEnv({
      TURSO_DATABASE_URL: "libsql://legacy.turso.io",
      TURSO_AUTH_TOKEN: "legacy-token",
    });
    assert.equal(env.url, "libsql://legacy.turso.io");
    assert.equal(env.authToken, "legacy-token");
    assert.deepEqual(env.source, { url: "TURSO_DATABASE_URL", authToken: "TURSO_AUTH_TOKEN" });
  });

  it("treats blank values as unset and keeps a local file URL token-free", () => {
    const blank = readDatabaseEnv({ DATABASE_URL: "   ", TURSO_DATABASE_URL: "" });
    assert.equal(blank.url, null);
    assert.equal(needsAuthToken("file:./data/studio.db"), false);
    assert.equal(needsAuthToken("libsql://db.turso.io"), true);
  });
});

describe("studio configuration status", () => {
  it("accepts the TURSO_* aliases", () => {
    const status = getStudioConfigStatus({
      TURSO_DATABASE_URL: "libsql://db.turso.io",
      TURSO_AUTH_TOKEN: "token",
      STUDIO_ADMIN_PASSWORD_HASH: "scrypt$hash",
    });
    assert.deepEqual(status, { ready: true, missing: [] });
  });

});
