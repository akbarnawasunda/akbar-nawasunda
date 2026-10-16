import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { applySchema } from "../../src/studio/schema";
import { reserveLoginAttempt } from "../../src/studio/login-budget";
import { credentialSessionHash, LOGIN_FAILURE_WINDOW_MS, MAX_LOGIN_FAILURES } from "../../src/studio/security";

const source = (path: string) => readFileSync(path, "utf8");

test("concurrent password attempts across clients cannot exceed the database budget", async () => {
  const dir = mkdtempSync(join(tmpdir(), "studio-security-"));
  const clients = Array.from({ length: 4 }, () => createClient({ url: `file:${join(dir, "test.db")}` }));
  try {
    await applySchema(clients[0]!);
    const now = 1_000_000;
    const results = await Promise.all(Array.from({ length: 32 }, (_, i) => reserveLoginAttempt(clients[i % 4]!, now)));
    assert.equal(results.filter(Boolean).length, MAX_LOGIN_FAILURES);
    assert.equal(await reserveLoginAttempt(clients[0]!, now + LOGIN_FAILURE_WINDOW_MS - 1), false);
    assert.equal(await reserveLoginAttempt(clients[1]!, now + LOGIN_FAILURE_WINDOW_MS), true);
  } finally {
    clients.forEach((db) => db.close());
    rmSync(dir, { recursive: true, force: true });
  }
});

test("credential rotation invalidates a stored session without exposing credentials", () => {
  const old = credentialSessionHash("synthetic-token", "synthetic-old-credential");
  const current = credentialSessionHash("synthetic-token", "synthetic-new-credential");
  assert.notEqual(old, current);
  assert.equal(old.length, 64);
  for (const file of ["src/studio/auth.ts", "src/studio/actions.ts"]) {
    assert.match(source(file), /credentialSessionHash\(token, process.env.STUDIO_ADMIN_PASSWORD_HASH as string\)/);
  }
});

test("both password entry points reserve before verification and never clear competing attempts", () => {
  for (const file of ["src/studio/actions.ts", "src/studio/setup-actions.ts"]) {
    const s = source(file);
    assert.ok(s.indexOf("await reservePasswordAttempt(now)") < s.indexOf("await verifyPassword("));
    assert.doesNotMatch(s, /setFailureState|recordFailure|getFailureState/);
  }
});

test("activated setup authorizes before diagnostics, and password test authorizes server-side", () => {
  const page = source("src/app/studio/setup/page.tsx").split("export default async function StudioSetupPage()")[1]!;
  assert.ok(page.indexOf("await requireAdmin()") < page.indexOf("buildSetupChecks("));
  assert.match(page, /STUDIO_ADMIN_PASSWORD_HASH\?\.trim\(\)/);
  const action = source("src/studio/setup-actions.ts").split("export async function testAdminPasswordAction")[1]!;
  assert.ok(action.indexOf("await isAdminRequest()") < action.indexOf("await reservePasswordAttempt("));
});

test("database exceptions never enter logs or setup response text", () => {
  for (const file of ["auth", "actions", "public"]) {
    for (const call of source(`src/studio/${file}.ts`).matchAll(/console\.error\(([^;]+)\);/g)) {
      assert.doesNotMatch(call[1]!, /,\s*error/);
    }
  }
  assert.doesNotMatch(source("src/app/studio/setup/page.tsx"), /shortError\(/);
});


test("bootstrap hashing is bounded per worker, including overlapping requests", async () => {
  const { createSetupHashBudget } = await import("../../src/studio/setup-budget");
  const budget = createSetupHashBudget();
  assert.equal(budget.acquire(1000), true);
  assert.equal(budget.acquire(100000), false); // still computing
  budget.release();
  assert.equal(budget.acquire(12000), false);
  assert.equal(budget.acquire(13000), true);
  const action = source("src/studio/setup-actions.ts");
  assert.ok(action.indexOf("setupHashBudget.acquire") < action.indexOf("await hashPassword("));
  assert.match(action, /finally\s*{\s*setupHashBudget.release\(\)/);
});
