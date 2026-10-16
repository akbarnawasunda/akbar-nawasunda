import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { applySchema } from "../../src/studio/schema";
import { reserveLoginAttempt } from "../../src/studio/login-budget";
import { createSetupHashBudget } from "../../src/studio/setup-budget";
import { allowsBootstrapHash } from "../../src/studio/bootstrap-policy";
import { revokeThenClear } from "../../src/studio/revoke-session";
import { credentialSessionHash, isSessionActive, LOGIN_FAILURE_WINDOW_MS } from "../../src/studio/security";
const exec = promisify(execFile);

test("bootstrap memory limits reset across workers/restarts; production policy does not", () => {
  // Reproduction of the first-stage limitation, not a claim of durable throttling.
  assert.equal(createSetupHashBudget().acquire(100), true);
  assert.equal(createSetupHashBudget().acquire(100), true);
  for (const mode of ["production", "test", undefined]) {
    for (const credential of [undefined, "", "  ", "synthetic-configured"]) {
      for (let worker = 0; worker < 20; worker++) {
        assert.equal(allowsBootstrapHash({ NODE_ENV: mode, STUDIO_ADMIN_PASSWORD_HASH: credential }), false);
      }
    }
  }
  assert.equal(allowsBootstrapHash({ NODE_ENV: "development" }), true);
  assert.equal(allowsBootstrapHash({ NODE_ENV: "development", STUDIO_ADMIN_PASSWORD_HASH: "configured" }), false);
  const action = readFileSync("src/studio/setup-actions.ts", "utf8");
  assert.ok(action.indexOf("if (!allowsBootstrapHash(process.env))") < action.indexOf("await hashPassword("));
  const page = readFileSync("src/app/studio/setup/page.tsx", "utf8");
  assert.ok(page.indexOf('process.env.NODE_ENV !== "development"') < page.indexOf("let checks = buildSetupChecks"));
});

test("logout DB write failure preserves retry, recovery permits replay until revocation succeeds", async () => {
  const db = createClient({ url: "file::memory:" });
  try {
    await applySchema(db);
    const key = credentialSessionHash("test-token", "test-credential");
    await db.execute({ sql: "INSERT INTO studio_sessions VALUES (?, 1, 10000)", args: [key] });
    const revoke = async () => { await db.execute({ sql: "DELETE FROM studio_sessions WHERE token_hash = ?", args: [key] }); };
    let cleared = false;
    await db.execute("PRAGMA query_only = ON"); // actual DB rejects deletion
    assert.equal(await revokeThenClear(revoke, () => { cleared = true; }), false);
    assert.equal(cleared, false);
    await db.execute("PRAGMA query_only = OFF");
    const stillThere = await db.execute({ sql: "SELECT expires_at FROM studio_sessions WHERE token_hash = ?", args: [key] });
    assert.equal(isSessionActive(Number(stillThere.rows[0]!.expires_at), 100), true);
    assert.notEqual(key, credentialSessionHash("test-token", "rotated-credential"));
    assert.equal(isSessionActive(10000, 10000), false);
    assert.equal(await revokeThenClear(revoke, () => { cleared = true; }), true);
    assert.equal(cleared, true);
    assert.equal((await db.execute("SELECT * FROM studio_sessions")).rows.length, 0);
    assert.equal(await revokeThenClear(revoke, () => {}), true); // invalid/already revoked is idempotent
    assert.equal(await revokeThenClear(async () => { throw new Error("offline"); }, () => assert.fail("must not clear")), false);
  } finally { db.close(); }
  const auth = readFileSync("src/studio/auth.ts", "utf8");
  assert.match(auth, /return revokeThenClear\(/);
  const action = readFileSync("src/studio/actions.ts", "utf8");
  assert.match(action, /const revoked = await clearSession\(\)/);
  assert.match(action, /logout=failed/);
});

test("shared login limit survives multiple processes and restart; global denial remains reproducible", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stage2-lockout-"));
  const url = `file:${join(dir, "db")}`;
  const db = createClient({ url });
  try {
    await applySchema(db);
    const script = `const {createClient}=require('@libsql/client'); const {reserveLoginAttempt}=require('./src/studio/login-budget.ts'); (async()=>{const db=createClient({url:process.env.TEST_DB_URL});await db.execute("PRAGMA busy_timeout = 5000");let n=0;for(let i=0;i<8;i++)if(await reserveLoginAttempt(db,1000000))n++;db.close();console.log(n)})().catch(()=>process.exit(1));`;
    const run = () => exec(process.execPath, ["--import", "tsx", "--eval", script], { env: { ...process.env, TEST_DB_URL: url }, timeout: 20000 });
    const settled = await Promise.allSettled(Array.from({ length: 4 }, run));
    const results = settled.map((r) => { if (r.status === "rejected") throw r.reason; return r.value; });
    assert.equal(results.reduce((n, r) => n + Number(r.stdout.trim()), 0), 5);
    assert.equal(Number((await run()).stdout.trim()), 0); // new process, same DB
    // Valid-password owner also cannot reserve after strangers have exhausted the budget.
    assert.equal(await reserveLoginAttempt(db, 1000001), false);
    assert.equal(await reserveLoginAttempt(db, 1000000 + LOGIN_FAILURE_WINDOW_MS), true);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});
