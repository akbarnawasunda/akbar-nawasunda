/** Run after npm run build. Isolated local DB + production-mode server; no production credentials. */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import { applySchema } from "../src/studio/schema";
import { hashPassword } from "../src/studio/password";
import { credentialSessionHash, SESSION_COOKIE } from "../src/studio/security";
import { emptyPageDocument } from "../src/studio/content-model";

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "nawa-http-security-"));
  const url = `file:${join(dir, "audit.db")}`;
  const password = randomBytes(32).toString("hex");
  const credential = await hashPassword(password);
  const db = createClient({ url });
  await applySchema(db);
  const expired = randomBytes(32).toString("base64url");
  const revoked = randomBytes(32).toString("base64url");
  const valid = randomBytes(32).toString("base64url");
  const now = Date.now();
  for (const [token, hash, expiry] of [
    [expired, credential, now - 1],
    [revoked, "previous-test-credential", now + 60000],
    [valid, credential, now + 60000],
  ] as const) await db.execute({ sql: "INSERT INTO studio_sessions VALUES (?, ?, ?)", args: [credentialSessionHash(token, hash), now, expiry] });
  await db.execute({ sql: "INSERT INTO studio_pages VALUES (?, ?, ?, NULL, NULL)", args: ["release:private-audit", '{"title":"PRIVATE_AUDIT_SENTINEL"}', now] });
  // Export seed: a readable page DRAFT (admin export must include drafts; anonymous must never see it),
  // and an unrecognized key whose contents must never leave the database.
  const aboutDraft = { ...emptyPageDocument("About"), sections: [{ id: "s1", type: "paragraph", visible: true, text: "EXPORT_DRAFT_SENTINEL_AUDIT" }] };
  await db.execute({ sql: "INSERT INTO studio_pages VALUES (?, ?, ?, NULL, NULL)", args: ["about", JSON.stringify(aboutDraft), now] });
  await db.execute({ sql: "INSERT INTO studio_pages VALUES (?, ?, ?, NULL, NULL)", args: ["unknown:audit", '{"note":"UNKNOWN_KEY_SENTINEL_AUDIT"}', now] });
  const countStudioRows = async () => ({
    pages: Number((await db.execute("SELECT count(*) AS n FROM studio_pages")).rows[0]!.n),
    sessions: Number((await db.execute("SELECT count(*) AS n FROM studio_sessions")).rows[0]!.n),
  });
  const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
  const actions = new Map<string, string>(Object.entries(manifest.node).map(([id, value]) => [String((value as { exportedName: string }).exportedName), id]));
  const bootstrapOnly = process.env.SECURITY_TEST_UNCONFIGURED === "1";
  const port = Number(process.env.SECURITY_TEST_PORT || 3197);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: process.env.SECURITY_TEST_NO_DB === "1" ? "" : url, DATABASE_AUTH_TOKEN: "", STUDIO_ADMIN_PASSWORD_HASH: bootstrapOnly ? "" : credential },
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Do not echo server output: errors/cookies must not enter test logs.
  child.stderr.resume();
  let checks = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server startup timeout")), 20000);
      child.once("exit", () => { clearTimeout(timer); reject(new Error("Server exited")); });
      child.stdout.on("data", (chunk) => { if (String(chunk).includes("Ready")) { clearTimeout(timer); resolve(); } });
    });
    async function action(name: string, cookie = "", fields: Record<string, string> = {}, origin = base) {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.set(`_1_${key}`, value);
      form.set("0", name === "logoutAction" ? "[]" : '[null,"$K1"]');
      const response = await fetch(`${base}/studio/setup`, { method: "POST", headers: { "Next-Action": actions.get(name)!, Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: form, redirect: "manual" });
      return { response, text: await response.text() };
    }
    // Values that must never appear in any response body, including error responses.
    const sensitiveValues = [password, credential, valid, revoked, expired, credentialSessionHash(valid, credential), "scrypt:", "token_hash", "studio_sessions", "studio_login_failures", "window_start", "PRIVATE_AUDIT_SENTINEL", "UNKNOWN_KEY_SENTINEL_AUDIT"];
    function assertNoSecrets(text: string, where: string) {
      for (const value of sensitiveValues) assert.ok(!text.includes(value), `${where} must not expose sensitive data`);
    }
    // Anti-framing headers come from next.config.ts. Verified here against real responses (the real matcher).
    function assertStudioFraming(response: Response, where: string) {
      assert.equal(response.headers.get("x-frame-options"), "DENY", `${where} must send X-Frame-Options: DENY`);
      assert.ok((response.headers.get("content-security-policy") ?? "").includes("frame-ancestors 'none'"), `${where} must send CSP frame-ancestors 'none'`);
    }
    function assertNoStudioFraming(response: Response, where: string) {
      assert.equal(response.headers.get("x-frame-options"), null, `${where} must not receive studio framing headers`);
      assert.ok(!(response.headers.get("content-security-policy") ?? "").includes("frame-ancestors"), `${where} must not receive studio CSP`);
    }
    async function getExport(cookie = "", extraHeaders: Record<string, string> = {}) {
      const response = await fetch(`${base}/studio/export`, { headers: { ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders }, redirect: "manual" });
      return { response, text: await response.text() };
    }

    if (bootstrapOnly) {
      const page = await fetch(`${base}/studio/setup`);
      const text = await page.text();
      assert.equal(page.status, 200);
      assert.ok(text.includes("Browser bootstrap is disabled"));
      assert.ok(!text.includes('type="password"'));
      const attempts = await Promise.all(Array.from({ length: 20 }, () => action("generateAdminHashAction", "", { password, confirmation: password })));
      assert.equal(attempts.filter((r) => r.text.includes("Browser bootstrap is disabled")).length, 20);
      assert.ok(attempts.every((r) => !r.text.includes("scrypt:")));
      console.log("Production bootstrap checks: 5 assertions passed, 20 concurrent actions denied.");
      return;
    }
    if (process.env.SECURITY_TEST_NO_DB === "1") {
      // No DATABASE_URL: the Studio must fail closed. Even a cookie for a session that exists in a
      // database must not authenticate anyone, because the app cannot read any database at all.
      for (const token of [null, valid]) {
        const cookie = token ? `${SESSION_COOKIE}=${token}` : "";
        for (const route of ["/studio", "/studio/setup", "/studio/preview/about", "/studio/export"]) {
          const r = await fetch(base + route, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
          if (route === "/studio/export") {
            assert.equal(r.status, 401); checks++;
            assert.equal(r.headers.get("content-disposition"), null); checks++;
            assertNoSecrets(await r.text(), "export without database"); checks++;
          } else {
            assert.equal(r.status, 307); checks++;
            assert.equal(r.headers.get("location"), "/studio/login"); checks++;
          }
          assertStudioFraming(r, route); checks++;
        }
        for (const name of ["saveOrPublishAction", "createReleaseAction"]) {
          const { text } = await action(name, cookie, { slug: "about", intent: "publish", title: "ATTACK" });
          assert.ok(text.includes("Your session has ended"), `${name} must reject without database`); checks++;
        }
      }
      const noDbLogin = await action("loginAction", "", { password });
      assert.equal(noDbLogin.response.headers.has("set-cookie"), false, "login without database must not issue a session"); checks++;
      const noDbRedirect = noDbLogin.response.headers.get("x-action-redirect") ?? "";
      assert.ok(!noDbRedirect.startsWith("/studio") || noDbRedirect.startsWith("/studio/login"), "login without database must not reach the dashboard"); checks++;
      for (const path of ["/", "/about", "/music", "/contact"]) {
        const response = await fetch(base + path, { redirect: "manual" });
        assert.equal(response.status, 200); checks++;
        assertNoStudioFraming(response, path); checks++;
      }
      console.log(`NO_DB security checks: ${checks} passed (fail closed; no admin access without a database).`);
      return;
    }
    for (const token of [null, "invalid-test-token", expired, revoked]) {
      const cookie = token ? `${SESSION_COOKIE}=${token}` : "";
      for (const route of ["/studio", "/studio/setup", "/studio/preview/about", "/studio/preview/release/private-audit"]) {
        const r = await fetch(base + route, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
        assert.equal(r.status, 307);
        assert.equal(r.headers.get("location"), "/studio/login"); checks++;
        assertStudioFraming(r, route); checks++;
      }
      for (const name of ["saveOrPublishAction", "saveDesignAction", "createReleaseAction", "saveReleaseAction"]) {
        const { text } = await action(name, cookie, { slug: "about", intent: "publish", title: "ATTACK" });
        assert.ok(text.includes("Your session has ended"), `${name} must reject unauthorized mutation`); checks++;
      }
      assert.ok((await action("testAdminPasswordAction", cookie, { password })).text.includes("Sign in to check configuration")); checks++;
    }
    assert.ok((await action("generateAdminHashAction", "", { password, confirmation: password })).text.includes("already set")); checks++;
    const privatePage = await fetch(`${base}/music/private-audit`);
    assert.equal(privatePage.status, 404);
    assert.ok(!(await privatePage.text()).includes("PRIVATE_AUDIT_SENTINEL")); checks++;
    async function assertPublicPagesAnonymous() {
      for (const path of ["/", "/about", "/music", "/contact"]) {
        const response = await fetch(base + path, { redirect: "manual" });
        assert.equal(response.status, 200); checks++;
        assertNoStudioFraming(response, path); checks++;
      }
    }
    await assertPublicPagesAnonymous();
    const goodCookie = `${SESSION_COOKIE}=${valid}`;
    const studioHome = await fetch(`${base}/studio`, { headers: { Cookie: goodCookie }, redirect: "manual" });
    assert.equal(studioHome.status, 200); checks++;
    assertStudioFraming(studioHome, "/studio (authorized)"); checks++;
    assertStudioFraming(await fetch(`${base}/studio/login`, { redirect: "manual" }), "/studio/login"); checks++;
    assertNoStudioFraming(await fetch(`${base}/studiox`, { redirect: "manual" }), "/studiox (look-alike path)"); checks++;
    const cross = await action("saveDesignAction", goodCookie, { intent: "publish", accent: "bad" }, "https://foreign.invalid");
    assert.ok(cross.response.status >= 400); checks++;
    // Each Next.js server chunk keeps its own schema-ready state, so a chunk seeing the database for the
    // first time re-runs the idempotent CREATE TABLE statements. Warm the export route first, so the outage
    // checks below exercise a real failure and not a first-time schema bootstrap that would recreate the table.
    await getExport(`${SESSION_COOKIE}=invalid-test-token`);
    // Simulate a session-store outage, then restore the identical stored session.
    await db.execute("ALTER TABLE studio_sessions RENAME TO isolated_offline_sessions");
    const offlineLogout = await action("logoutAction", goodCookie);
    assert.ok(offlineLogout.response.headers.get("x-action-redirect")?.includes("logout=failed")); checks++;
    assert.equal(offlineLogout.response.headers.has("set-cookie"), false); checks++;
    // A session-store failure during authentication must never authenticate the admin for the export.
    const offlineExport = await getExport(goodCookie, { "Sec-Fetch-Site": "same-origin" });
    assert.equal(offlineExport.response.status, 401); checks++;
    assertNoSecrets(offlineExport.text, "export during session-store outage"); checks++;
    assert.equal((await fetch(`${base}/studio`, { headers: { Cookie: goodCookie }, redirect: "manual" })).status, 307); checks++;
    await assertPublicPagesAnonymous(); // session-store outage must not impose a public login wall
    await db.execute("ALTER TABLE isolated_offline_sessions RENAME TO studio_sessions");
    // Page-table read failure after a valid authentication: generic 500, no database details.
    await db.execute("ALTER TABLE studio_pages RENAME TO isolated_offline_pages");
    let failedExport: { response: Response; text: string };
    try {
      failedExport = await getExport(goodCookie, { "Sec-Fetch-Site": "same-origin" });
    } finally {
      await db.execute("ALTER TABLE isolated_offline_pages RENAME TO studio_pages");
    }
    assert.equal(failedExport.response.status, 500); checks++;
    assert.equal(failedExport.text, "The export could not be created. Try again later."); checks++;
    assert.doesNotMatch(failedExport.text, /sqlite|no such table|studio_pages|SQL|libsql/i); checks++;
    assertNoSecrets(failedExport.text, "export during read failure"); checks++;
    assert.equal((await fetch(`${base}/studio`, { headers: { Cookie: goodCookie }, redirect: "manual" })).status, 200); checks++;
    const warning = await fetch(`${base}/studio/login?logout=failed`, { headers: { Cookie: goodCookie } });
    assert.ok((await warning.text()).includes("Sign-out not confirmed")); checks++;
    await action("logoutAction", goodCookie);
    assert.equal((await fetch(`${base}/studio`, { headers: { Cookie: goodCookie }, redirect: "manual" })).status, 307); checks++;
    const login = await action("loginAction", "", { password });
    const setCookie = login.response.headers.get("set-cookie") || "";
    assert.ok(/httponly/i.test(setCookie) && /secure/i.test(setCookie) && /SameSite=lax/i.test(setCookie)); checks++;
    const replay = setCookie.split(";")[0]!;
    assert.equal((await fetch(`${base}/studio`, { headers: { Cookie: replay }, redirect: "manual" })).status, 200); checks++;
    const rows = await db.execute("SELECT count(*) AS n FROM studio_pages WHERE draft_json LIKE '%ATTACK%'");
    assert.equal(Number(rows.rows[0]!.n), 0); checks++;
    // Content export (GET /studio/export): auth before reads, read-only, no secrets, drafts for admins only.
    // goodCookie was revoked by the logout above, so the export checks use a fresh synthetic session.
    const exportToken = randomBytes(32).toString("base64url");
    await db.execute({ sql: "INSERT INTO studio_sessions VALUES (?, ?, ?)", args: [credentialSessionHash(exportToken, credential), Date.now(), Date.now() + 60000] });
    const exportCookie = `${SESSION_COOKIE}=${exportToken}`;
    const rowsBeforeExport = await countStudioRows();
    for (const token of [null, "invalid-test-token", expired, revoked]) {
      const { response, text } = await getExport(token ? `${SESSION_COOKIE}=${token}` : "");
      assert.equal(response.status, 401); checks++;
      assert.equal(response.headers.get("content-disposition"), null); checks++;
      assertNoSecrets(text, "unauthenticated export"); checks++;
      assertStudioFraming(response, "export 401"); checks++;
    }
    const crossSite = await getExport(exportCookie, { "Sec-Fetch-Site": "cross-site" });
    assert.equal(crossSite.response.status, 403); checks++;
    assertNoSecrets(crossSite.text, "cross-site export"); checks++;
    const crossSiteSpaced = await getExport(exportCookie, { "Sec-Fetch-Site": " Cross-Site " });
    assert.equal(crossSiteSpaced.response.status, 403); checks++;
    const sameOrigin = await getExport(exportCookie, { "Sec-Fetch-Site": "same-origin" });
    assert.equal(sameOrigin.response.status, 200); checks++;
    assert.equal(sameOrigin.response.headers.get("content-type"), "application/json; charset=utf-8"); checks++;
    assert.match(sameOrigin.response.headers.get("content-disposition") ?? "", /^attachment; filename="nawa-studio-export-\d{4}-\d{2}-\d{2}\.json"$/); checks++;
    assert.match(sameOrigin.response.headers.get("cache-control") ?? "", /no-store/); checks++;
    assert.equal(sameOrigin.response.headers.get("x-content-type-options"), "nosniff"); checks++;
    assert.equal(sameOrigin.response.headers.get("access-control-allow-origin"), null); checks++;
    assertStudioFraming(sameOrigin.response, "export 200"); checks++;
    const exported = JSON.parse(sameOrigin.text) as {
      format: string; formatVersion: number; complete: boolean;
      pages: Record<string, { draft: { sections: Array<{ text?: string }> } | null; published: unknown }>;
      unreadable: Array<{ key: string; part: string; status: string }>; omitted: { unrecognizedKeys: number };
    };
    assert.equal(exported.format, "nawa-studio-content-export"); checks++;
    assert.equal(exported.formatVersion, 1); checks++;
    assert.equal(exported.complete, false, "unreadable and unrecognized rows must mark the export incomplete"); checks++;
    assert.ok(exported.unreadable.some((note) => note.key === "release:private-audit" && note.part === "draft" && note.status === "unreadable"), "unreadable release must be reported by key and status only"); checks++;
    assert.ok(exported.omitted.unrecognizedKeys >= 1); checks++;
    assert.equal(exported.pages.about?.draft?.sections[0]?.text, "EXPORT_DRAFT_SENTINEL_AUDIT", "admin export must include drafts"); checks++;
    assert.equal(exported.pages.about?.published, null); checks++;
    assertNoSecrets(sameOrigin.text, "authorized export"); checks++;
    const noHeader = await getExport(exportCookie);
    assert.equal(noHeader.response.status, 200, "a missing Sec-Fetch-Site header must be allowed"); checks++;
    assertNoSecrets(noHeader.text, "export without Sec-Fetch-Site"); checks++;
    assert.deepEqual(await countStudioRows(), rowsBeforeExport, "export must not create, change, or delete rows"); checks++;
    await db.execute("DELETE FROM studio_login_failures");
    const attempts = await Promise.all(Array.from({ length: 20 }, () => action("loginAction", "", { password: "synthetic-wrong-password" })));
    assert.equal(attempts.filter((r) => r.text.includes("Incorrect password")).length, 5); checks++;
    assert.equal(attempts.filter((r) => r.text.includes("Too many password attempts")).length, 15); checks++;
    console.log(`HTTP security checks: ${checks} passed (no credentials logged).`);
  } catch (error) {
    // Only the script line is printed: messages and bodies can contain cookies or other sensitive values.
    const location = String((error as Error).stack ?? "").split("\n").find((line) => line.includes("security-http-check.ts"));
    console.error(`Failed after ${checks} successful HTTP assertions.${location ? ` First failing script location: ${location.trim()}` : ""}`);
    throw new Error("HTTP check failed");
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    db.close(); rmSync(dir, { recursive: true, force: true });
  }
}
main().catch(() => { console.error("HTTP security checks failed (details suppressed to protect credentials)."); process.exitCode = 1; });
