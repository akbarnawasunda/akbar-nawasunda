import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getStudioConfigStatus } from "../../src/studio/config";
import { parsePageDocument, emptyPageDocument, isPageSlug } from "../../src/studio/content-model";
import { recordFailure, isLockedOut, hashSessionToken, isSessionActive, createSessionToken, MAX_LOGIN_FAILURES, LOGIN_FAILURE_WINDOW_MS } from "../../src/studio/security";
import { validatePageForm, LIMITS } from "../../src/studio/validation";

describe("config", () => {
  it("reports every missing variable for an empty environment", () => {
    const status = getStudioConfigStatus({});
    assert.equal(status.ready, false);
    assert.deepEqual(status.missing, ["DATABASE_URL", "STUDIO_ADMIN_PASSWORD_HASH"]);
  });

  it("does not require an auth token for a local file database", () => {
    const status = getStudioConfigStatus({ DATABASE_URL: "file:./data/studio.db", STUDIO_ADMIN_PASSWORD_HASH: "x" });
    assert.equal(status.ready, true);
  });

  it("requires an auth token for a remote libsql URL", () => {
    const status = getStudioConfigStatus({ DATABASE_URL: "libsql://example.turso.io", STUDIO_ADMIN_PASSWORD_HASH: "x" });
    assert.deepEqual(status.missing, ["DATABASE_AUTH_TOKEN"]);
  });

  it("treats whitespace-only values as missing", () => {
    const status = getStudioConfigStatus({ DATABASE_URL: "   ", STUDIO_ADMIN_PASSWORD_HASH: "x" });
    assert.deepEqual(status.missing, ["DATABASE_URL"]);
  });
});

describe("content model", () => {
  it("round-trips a valid document", () => {
    const doc = { ...emptyPageDocument("About"), lead: "Lead", sections: [{ id: "p1", type: "paragraph" as const, text: "Hello" }] };
    assert.deepEqual(parsePageDocument(JSON.stringify(doc)), doc);
  });

  it("rejects malformed or unknown section data", () => {
    assert.equal(parsePageDocument("not json"), null);
    assert.equal(parsePageDocument(JSON.stringify({ title: "A", lead: "", seoDescription: "", sections: [{ id: "x", type: "video", text: "" }] })), null);
    assert.equal(parsePageDocument(JSON.stringify({ title: 1, lead: "", seoDescription: "", sections: [] })), null);
    assert.equal(parsePageDocument(null), null);
  });

  it("accepts only known page slugs", () => {
    assert.equal(isPageSlug("about"), true);
    assert.equal(isPageSlug("admin"), false);
    assert.equal(isPageSlug("../about"), false);
  });
});

describe("validation", () => {
  const valid = { title: "  About  ", lead: "Lead", seoDescription: "", body: "First paragraph.\n\nSecond\nline." };

  it("normalises the title and splits paragraphs on blank lines", () => {
    const result = validatePageForm(valid);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.title, "About");
    assert.deepEqual(result.value.sections.map((s) => s.text), ["First paragraph.", "Second\nline."]);
    assert.deepEqual(result.value.sections.map((s) => s.id), ["p1", "p2"]);
  });

  it("requires a title", () => {
    const result = validatePageForm({ ...valid, title: "   " });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.title);
  });

  it("enforces length limits on the server", () => {
    const result = validatePageForm({ ...valid, title: "x".repeat(LIMITS.title + 1), lead: "y".repeat(LIMITS.lead + 1) });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.errors.title);
      assert.ok(result.errors.lead);
    }
  });

  it("rejects too many paragraphs and overlong paragraphs", () => {
    const many = Array.from({ length: LIMITS.paragraphs + 1 }, (_, i) => `P${i}`).join("\n\n");
    const tooMany = validatePageForm({ ...valid, body: many });
    assert.equal(tooMany.ok, false);
    const long = validatePageForm({ ...valid, body: "a".repeat(LIMITS.paragraphLength + 1) });
    assert.equal(long.ok, false);
  });

  it("rejects control characters", () => {
    const result = validatePageForm({ ...valid, title: "Bad\u0007title" });
    assert.equal(result.ok, false);
  });

  it("rejects non-string input", () => {
    const result = validatePageForm({ ...valid, title: 42 });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.form);
  });

  it("accepts an empty body", () => {
    const result = validatePageForm({ ...valid, body: "" });
    assert.equal(result.ok, true);
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
    let state = null as ReturnType<typeof recordFailure> | null;
    const start = 1_000_000;
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++) state = recordFailure(state, start + i);
    assert.equal(isLockedOut(state, start + 10), false);
    state = recordFailure(state, start + 10);
    assert.equal(isLockedOut(state, start + 20), true);
  });

  it("unlocks once the failure window has passed", () => {
    const start = 1_000_000;
    let state = null as ReturnType<typeof recordFailure> | null;
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) state = recordFailure(state, start);
    assert.equal(isLockedOut(state, start + LOGIN_FAILURE_WINDOW_MS + 1), false);
  });
});
