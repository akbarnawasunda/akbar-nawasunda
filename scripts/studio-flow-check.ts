/**
 * HTTP-level check of the NAWA STUDIO admin flow against a running production server.
 *
 * It is meant for an ISOLATED, TEMPORARY database and a test password. Never point it at production.
 *
 * Required environment:
 *   STUDIO_FLOW_BASE      base URL of the server, e.g. http://127.0.0.1:3100
 *   STUDIO_FLOW_PASSWORD  the password whose hash the server was started with
 *   STUDIO_FLOW_HASH      the same STUDIO_ADMIN_PASSWORD_HASH the server uses
 *   STUDIO_FLOW_DB        path to the server's temporary SQLite file
 *
 * It prints check names and status codes only. Cookies, passwords, and response bodies are never printed.
 *
 * Run it against a FRESHLY CREATED temporary database. The login budget is global and counts every
 * sign-in attempt (5 per 15 minutes), so re-running on the same database can lock the check out.
 * That lockout is the intended behaviour, not a failure of the flow.
 */
import { createClient } from "@libsql/client";

import { PAGE_SLUGS } from "../src/studio/content-model";
import { credentialSessionHash, createSessionToken, SESSION_COOKIE } from "../src/studio/security";

const BASE = (process.env.STUDIO_FLOW_BASE ?? "").replace(/\/$/, "");
const PASSWORD = process.env.STUDIO_FLOW_PASSWORD ?? "";
const HASH = process.env.STUDIO_FLOW_HASH ?? "";
const DB_FILE = process.env.STUDIO_FLOW_DB ?? "";

if (!BASE || !PASSWORD || !HASH || !DB_FILE) {
  console.error("Set STUDIO_FLOW_BASE, STUDIO_FLOW_PASSWORD, STUDIO_FLOW_HASH and STUDIO_FLOW_DB.");
  process.exit(2);
}
if (!BASE.startsWith("http://127.0.0.1") && !BASE.startsWith("http://localhost")) {
  console.error("Refusing to run against a non-local base URL.");
  process.exit(2);
}

const results: Array<{ name: string; ok: boolean; detail: string }> = [];
function check(name: string, ok: boolean, detail = ""): void {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, { redirect: "manual", ...init });
}

/** Returns "name=value" for the session cookie from a response, or null. Value never leaves this function. */
function sessionCookieFrom(res: Response): string | null {
  for (const line of res.headers.getSetCookie()) {
    if (line.startsWith(`${SESSION_COOKIE}=`)) return line.split(";")[0] ?? null;
  }
  return null;
}

function cookieAttributes(res: Response): string[] {
  const line = res.headers.getSetCookie().find((value) => value.startsWith(`${SESSION_COOKIE}=`)) ?? "";
  return line.split(";").slice(1).map((part) => part.trim().toLowerCase());
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Hidden action fields from the first form whose HTML matches `marker`. */
function actionFieldsFor(html: string, marker: string): Record<string, string> | null {
  const forms = html.match(/<form[\s\S]*?<\/form>/g) ?? [];
  const form = forms.find((candidate) => candidate.includes(marker));
  if (!form) return null;
  const fields: Record<string, string> = {};
  for (const match of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const tag = match[0];
    const name = /name="([^"]+)"/.exec(tag)?.[1];
    const value = /value="([^"]*)"/.exec(tag)?.[1] ?? "";
    if (name && name.startsWith("$ACTION")) fields[name] = decodeEntities(value);
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

async function submitAction(path: string, fields: Record<string, string>, cookie?: string): Promise<Response> {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) body.append(name, value);
  return request(path, {
    method: "POST",
    body,
    headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: BASE },
  });
}

const PROTECTED_PATHS = [
  "/studio",
  "/studio/pages",
  "/studio/pages/about",
  "/studio/music",
  "/studio/music/new",
  "/studio/design",
  "/studio/settings",
  "/studio/media",
];

async function main(): Promise<void> {
  // 1. Anonymous access is redirected to the login page, never shown protected content.
  for (const path of ["/studio", "/studio/pages", "/studio/settings"]) {
    const res = await request(path);
    check(`anonymous ${path} redirects to login`, res.status === 307 && (res.headers.get("location") ?? "").endsWith("/studio/login"), `${res.status}`);
  }
  const exportAnon = await request("/studio/export");
  check("anonymous export is refused", exportAnon.status === 401, `${exportAnon.status}`);

  // 2. Login page renders and accepts a wrong password without granting access.
  const loginPage = await request("/studio/login");
  const loginHtml = await loginPage.text();
  check("login page renders with a password field", loginPage.status === 200 && loginHtml.includes('name="password"'), `${loginPage.status}`);
  const loginFields = actionFieldsFor(loginHtml, 'name="password"');
  check("login form exposes its server action", loginFields !== null);
  if (!loginFields) return;

  const wrong = await submitAction("/studio/login", { ...loginFields, password: `${PASSWORD}-wrong` });
  const wrongBody = await wrong.text();
  check("wrong password is refused", !sessionCookieFrom(wrong) && wrongBody.includes("Incorrect password"), `${wrong.status}`);

  // 3. Correct password signs in with a session cookie that has the required attributes.
  const login = await submitAction("/studio/login", { ...loginFields, password: PASSWORD });
  let cookie = sessionCookieFrom(login);
  const attrs = cookieAttributes(login);
  check("correct password redirects to /studio", login.status === 303 && (login.headers.get("location") ?? "").endsWith("/studio"), `${login.status}`);
  check("session cookie is set", cookie !== null);
  check("session cookie is HttpOnly, SameSite=Lax, Path=/", attrs.includes("httponly") && attrs.includes("samesite=lax") && attrs.includes("path=/"));
  check("session cookie is Secure in production build", attrs.includes("secure"));
  if (!cookie) return;

  // 4. Navigation between protected pages keeps the session, including on repeat visits (refresh).
  for (const path of [...PROTECTED_PATHS, ...PAGE_SLUGS.map((slug) => `/studio/pages/${slug}`)]) {
    const res = await request(path, { headers: { Cookie: cookie } });
    check(`signed-in ${path}`, res.status === 200, `${res.status}`);
  }
  for (let i = 0; i < 2; i++) {
    const res = await request("/studio/settings", { headers: { Cookie: cookie } });
    check(`refresh ${i + 1} of /studio/settings`, res.status === 200, `${res.status}`);
  }

  // 5. The login page does not loop when already signed in.
  const loginWhileIn = await request("/studio/login", { headers: { Cookie: cookie } });
  check("signed-in visit to /studio/login goes to /studio", loginWhileIn.status === 307 && (loginWhileIn.headers.get("location") ?? "").endsWith("/studio"), `${loginWhileIn.status}`);

  // 6. Logout revokes the session on the server, not just in the browser.
  const shellHtml = await (await request("/studio", { headers: { Cookie: cookie } })).text();
  const logoutFields = actionFieldsFor(shellHtml, "Sign out");
  check("sign-out form exposes its server action", logoutFields !== null);
  if (logoutFields) {
    const logout = await submitAction("/studio", logoutFields, cookie);
    const location = logout.headers.get("location") ?? "";
    check("logout redirects to login without a failure flag", logout.status === 303 && location.endsWith("/studio/login"), `${logout.status} ${location.includes("logout=failed") ? "failed-flag" : "clean"}`);
    const after = await request("/studio/settings", { headers: { Cookie: cookie } });
    check("old cookie is rejected after logout", after.status === 307 && (after.headers.get("location") ?? "").endsWith("/studio/login"), `${after.status}`);
  }

  // 7. Expired session is rejected. It is inserted directly, the same way a real login stores one.
  const db = createClient({ url: `file:${DB_FILE}` });
  try {
    const expiredToken = createSessionToken();
    const expiredHash = credentialSessionHash(expiredToken, HASH);
    const now = Date.now();
    await db.execute({
      sql: "INSERT INTO studio_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)",
      args: [expiredHash, now - 60_000, now - 1_000],
    });
    const expired = await request("/studio", { headers: { Cookie: `${SESSION_COOKIE}=${expiredToken}` } });
    check("expired session is rejected", expired.status === 307 && (expired.headers.get("location") ?? "").endsWith("/studio/login"), `${expired.status}`);

    // 8. A tampered or unknown token is rejected.
    const forged = await request("/studio", { headers: { Cookie: `${SESSION_COOKIE}=not-a-real-token` } });
    check("forged token is rejected", forged.status === 307, `${forged.status}`);
  } finally {
    db.close();
  }

  // 9. Sign in again, to confirm a fresh login still works after logout and the rejected attempts.
  const relogin = await submitAction("/studio/login", { ...loginFields, password: PASSWORD });
  cookie = sessionCookieFrom(relogin);
  check("fresh login works after logout", relogin.status === 303 && cookie !== null, `${relogin.status}`);
  if (cookie) {
    const home = await request("/studio", { headers: { Cookie: cookie } });
    check("fresh session reaches the dashboard", home.status === 200, `${home.status}`);
  }

  // 10. Artist settings: a draft is saved, unsafe input is refused, publish is explicit, and the export
  // carries the published values and stays complete.
  if (cookie) {
    const settingsHtml = await (await request("/studio/settings", { headers: { Cookie: cookie } })).text();
    const saveFields = actionFieldsFor(settingsHtml, 'name="socialLinks"');
    check("settings form exposes its server action", saveFields !== null);
    if (saveFields) {
      const base = { ...saveFields, artistName: "Smoke Artist", role: "Test role", socialLinks: "Site | https://example.com/site" };
      const draft = await submitAction("/studio/settings", { ...base, intent: "save" }, cookie);
      check("settings draft saves", (await draft.text()).includes("Draft saved"), `${draft.status}`);

      const unsafe = await submitAction("/studio/settings", { ...base, socialLinks: "Bad | javascript:alert(1)", intent: "save" }, cookie);
      const unsafeBody = await unsafe.text();
      check("unsafe social link is refused", unsafeBody.includes("only https") || unsafeBody.includes("Some fields need attention"), `${unsafe.status}`);

      const publish = await submitAction("/studio/settings", { ...base, intent: "publish" }, cookie);
      check("settings publish", (await publish.text()).includes("Published."), `${publish.status}`);

      const exported = await request("/studio/export", { headers: { Cookie: cookie } });
      const exportedText = await exported.text();
      let exportBody: { complete?: boolean; settings?: { published?: { artistName?: string } | null } } = {};
      try {
        exportBody = JSON.parse(exportedText) as typeof exportBody;
      } catch {
        exportBody = {};
      }
      check("export is a complete JSON file", exported.status === 200 && exportBody.complete === true, `${exported.status}`);
      check("export carries the published artist name", exportBody.settings?.published?.artistName === "Smoke Artist");
      check("export never includes session or password material", !/token_hash|password|scrypt/i.test(exportedText));
    }
  }

  // 11. Public pages stay available and do not depend on the admin session.
  for (const path of ["/", "/about", "/music", "/contact"]) {
    const res = await request(path);
    check(`public ${path} is reachable anonymously`, res.status === 200, `${res.status}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(`FAIL  flow aborted: ${error instanceof Error ? error.name : "unknown error"}`);
    results.push({ name: "flow aborted", ok: false, detail: "" });
  })
  .finally(() => {
    const failed = results.filter((item) => !item.ok);
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
    process.exit(failed.length === 0 ? 0 : 1);
  });
