import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getStudioConfigStatus } from "../../src/studio/config";
import { recordFailure, isLockedOut, hashSessionToken, isSessionActive, createSessionToken, MAX_LOGIN_FAILURES, LOGIN_FAILURE_WINDOW_MS, type FailureState } from "../../src/studio/security";

describe("config", () => {
  it("reports every missing variable for an empty environment", () => {
    const status = getStudioConfigStatus({});
    assert.equal(status.ready, false);
    assert.deepEqual(status.missing, [
      "DATABASE_URL (or TURSO_DATABASE_URL)",
      "STUDIO_ADMIN_PASSWORD_HASH",
    ]);
  });

  it("does not require an auth token for a local file database", () => {
    const status = getStudioConfigStatus({ DATABASE_URL: "file:./data/studio.db", STUDIO_ADMIN_PASSWORD_HASH: "x" });
    assert.equal(status.ready, true);
  });

  it("requires an auth token for a remote libsql URL", () => {
    const status = getStudioConfigStatus({ DATABASE_URL: "libsql://example.turso.io", STUDIO_ADMIN_PASSWORD_HASH: "x" });
    assert.deepEqual(status.missing, ["DATABASE_AUTH_TOKEN (or TURSO_AUTH_TOKEN)"]);
  });

  it("treats whitespace-only values as missing", () => {
    const status = getStudioConfigStatus({ DATABASE_URL: "   ", STUDIO_ADMIN_PASSWORD_HASH: "x" });
    assert.deepEqual(status.missing, ["DATABASE_URL (or TURSO_DATABASE_URL)"]);
  });
});

describe("security rules", () => {
  it("stores only a hash of the session token, never the token itself", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);
    assert.notEqual(hash, token);
    assert.equal(hash.length, 64);
    assert.equal(hashSessionToken(token), hash);
    assert.ok(token.length >= 40);
  });

  it("treats expired sessions as inactive", () => {
    assert.equal(isSessionActive(1_000, 2_000), false);
    assert.equal(isSessionActive(3_000, 2_000), true);
  });

  it("locks out after the configured number of failures within the window", () => {
    let state: FailureState | null = null;
    const start = 1_000_000;
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++) state = recordFailure(state, start + i);
    assert.equal(isLockedOut(state, start + 10), false);
    state = recordFailure(state, start + 10);
    assert.equal(isLockedOut(state, start + 20), true);
  });

  it("unlocks once the failure window has passed", () => {
    const start = 1_000_000;
    let state: FailureState | null = null;
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) state = recordFailure(state, start);
    assert.equal(isLockedOut(state, start + LOGIN_FAILURE_WINDOW_MS + 1), false);
  });
});
