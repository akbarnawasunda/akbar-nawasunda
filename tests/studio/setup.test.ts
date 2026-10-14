import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSetupChecks,
  describePasswordProblem,
  inspectDatabaseUrl,
  inspectPasswordHash,
  isActivated,
  maskHost,
  redactSecrets,
  shortError,
  withConnectionResult,
} from "../../src/studio/setup";
import { hashPassword } from "../../src/studio/password";

const VALID_ENV = {
  DATABASE_URL: "libsql://akbar-nawasunda-studio-owner.turso.io",
  DATABASE_AUTH_TOKEN: "token-value-here",
  STUDIO_ADMIN_PASSWORD_HASH: "scrypt:16384:8:1:c2FsdHZhbHVlMTIzNDU2:keyvaluekeyvaluekeyvalue",
};

describe("database url inspection", () => {
  it("reports a missing value", () => {
    const info = inspectDatabaseUrl(undefined);
    assert.equal(info.kind, "missing");
    assert.equal(info.problem, "Not set.");
  });

  it("accepts a local file database", () => {
    const info = inspectDatabaseUrl("file:./data/studio.db");
    assert.equal(info.kind, "file");
    assert.equal(info.problem, null);
  });

  it("accepts a remote libsql url and masks the database name", () => {
    const info = inspectDatabaseUrl("libsql://akbar-nawasunda-studio-owner.turso.io");
    assert.equal(info.kind, "libsql");
    assert.equal(info.problem, null);
    assert.equal(info.host, "akb….turso.io");
    assert.ok(!info.host?.includes("nawasunda"));
  });

  it("refuses a postgres url with an explanation", () => {
    const info = inspectDatabaseUrl("postgres://user:pass@host/db");
    assert.equal(info.kind, "postgres");
    assert.match(info.problem ?? "", /libSQL/);
  });

  it("refuses other protocols and junk", () => {
    assert.equal(inspectDatabaseUrl("mysql://host/db").kind, "unsupported");
    assert.equal(inspectDatabaseUrl("studio.db").kind, "unsupported");
  });

  it("handles a value that looks like a url but is malformed", () => {
    assert.equal(inspectDatabaseUrl("libsql://").kind, "unsupported");
  });
});

describe("host masking", () => {
  it("hides the database name but keeps the provider domain", () => {
    const masked = maskHost("my-super-secret-database.turso.io");
    assert.ok(!masked.includes("super-secret"));
    assert.ok(masked.endsWith(".turso.io"));
  });

  it("never returns an empty string for a non-empty input", () => {
    assert.ok(maskHost("x").length > 0);
  });
});

describe("error redaction", () => {
  it("removes secret values and libsql urls from a message", () => {
    const message = "Failed to connect to libsql://db.turso.io with token token-value-here";
    const redacted = redactSecrets(message, ["token-value-here", "libsql://db.turso.io"]);
    assert.ok(!redacted.includes("token-value-here"));
    assert.ok(!redacted.includes("db.turso.io"));
  });

  it("keeps the first line of an error and shortens it", () => {
    const long = `${"x".repeat(400)}\nsecond line`;
    const short = shortError(new Error(long), []);
    assert.ok(short.length <= 240);
    assert.ok(!short.includes("second line"));
  });
});

describe("password hash inspection", () => {
  it("marks a missing hash as still to do", () => {
    assert.deepEqual(inspectPasswordHash("").present, false);
  });

  it("accepts a hash produced by hashPassword", async () => {
    const hash = await hashPassword("a-long-enough-password");
    const info = inspectPasswordHash(hash);
    assert.equal(info.valid, true);
  });

  it("rejects a truncated value", () => {
    const info = inspectPasswordHash("scrypt:16384:8:1:abc");
    assert.equal(info.present, true);
    assert.equal(info.valid, false);
    assert.match(info.detail, /cut off/);
  });

  it("rejects a plain password pasted by mistake", () => {
    const info = inspectPasswordHash("my-password-in-plain-text");
    assert.equal(info.valid, false);
  });
});

describe("password rules", () => {
  it("asks for a minimum length and a matching confirmation", () => {
    assert.match(describePasswordProblem("short", "short") ?? "", /at least 12/);
    assert.match(describePasswordProblem("a-long-enough-password", "a-long-enough-passwerd") ?? "", /do not match/);
    assert.equal(describePasswordProblem("a-long-enough-password", "a-long-enough-password"), null);
  });
});

describe("activation checklist", () => {
  it("reports everything as still to do on an empty environment", () => {
    const checks = buildSetupChecks({}, { isProduction: true });
    assert.equal(checks.find((check) => check.id === "database")?.level, "todo");
    assert.equal(checks.find((check) => check.id === "password")?.level, "todo");
    assert.equal(checks.find((check) => check.id === "connection")?.level, "todo");
    assert.equal(isActivated(checks), false);
  });

  it("passes a complete production environment once the connection is confirmed", () => {
    const checks = withConnectionResult(buildSetupChecks(VALID_ENV, { isProduction: true }), "ok", "Connected.");
    assert.equal(isActivated(checks), true);
    assert.ok(checks.every((check) => check.level === "ok" || check.level === "warn"));
  });

  it("fails a remote database without a token", () => {
    const checks = buildSetupChecks({ ...VALID_ENV, DATABASE_AUTH_TOKEN: "" }, { isProduction: true });
    assert.equal(checks.find((check) => check.id === "token")?.level, "bad");
    assert.equal(isActivated(withConnectionResult(checks, "ok", "Connected.")), false);
  });

  it("refuses a file database in production and allows it locally", () => {
    const localEnv = { ...VALID_ENV, DATABASE_URL: "file:./data/studio.db" };
    const production = buildSetupChecks(localEnv, { isProduction: true });
    const development = buildSetupChecks(localEnv, { isProduction: false });
    assert.equal(production.find((check) => check.id === "database")?.level, "bad");
    assert.match(production.find((check) => check.id === "database")?.detail ?? "", /temporary/);
    assert.equal(development.find((check) => check.id === "database")?.level, "ok");
  });

  it("keeps a failed connection from counting as activated", () => {
    const checks = withConnectionResult(buildSetupChecks(VALID_ENV, { isProduction: true }), "bad", "Refused.");
    assert.equal(isActivated(checks), false);
    assert.equal(checks.find((check) => check.id === "connection")?.detail, "Refused.");
  });

  it("never repeats a secret value in the checklist output", () => {
    const rendered = JSON.stringify(buildSetupChecks(VALID_ENV, { isProduction: true }));
    assert.ok(!rendered.includes(VALID_ENV.DATABASE_AUTH_TOKEN));
    assert.ok(!rendered.includes(VALID_ENV.STUDIO_ADMIN_PASSWORD_HASH));
    assert.ok(!rendered.includes("akbar-nawasunda-studio-owner"));
  });
});
