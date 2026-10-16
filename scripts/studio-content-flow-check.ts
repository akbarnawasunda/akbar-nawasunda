/**
 * HTTP-level check of content flows: pages and music releases. Create, edit, save a draft, publish,
 * unpublish, and what the public site and the export show at each step.
 *
 * It is meant for an ISOLATED, TEMPORARY database and a test password. Never point it at production.
 *
 * Required environment (same as scripts/studio-flow-check.ts):
 *   STUDIO_FLOW_BASE      base URL of the running server, e.g. http://127.0.0.1:3100
 *   STUDIO_FLOW_PASSWORD  the password whose hash the server was started with
 *
 * It prints check names and status codes only. Cookies, passwords, and response bodies are never printed.
 * Run it against a FRESHLY CREATED temporary database: the login budget is global (5 per 15 minutes).
 */

const BASE = (process.env.STUDIO_FLOW_BASE ?? "").replace(/\/$/, "");
const PASSWORD = process.env.STUDIO_FLOW_PASSWORD ?? "";
const SESSION_COOKIE = "nawa_studio_session";

if (!BASE || !PASSWORD) {
  console.error("Set STUDIO_FLOW_BASE and STUDIO_FLOW_PASSWORD.");
  process.exit(2);
}

let failures = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, { redirect: "manual", ...init });
}

function sessionCookieFrom(res: Response): string | null {
  for (const line of res.headers.getSetCookie()) {
    if (line.startsWith(`${SESSION_COOKIE}=`)) return line.split(";")[0] ?? null;
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Hidden $ACTION fields from the first form whose HTML contains `marker`. */
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

async function main(): Promise<void> {
  // Sign in once. Everything after this uses the same session.
  const loginHtml = await (await request("/studio/login")).text();
  const loginFields = actionFieldsFor(loginHtml, 'name="password"');
  if (!loginFields) {
    check("login form exposes its server action", false);
    return;
  }
  const login = await submitAction("/studio/login", { ...loginFields, password: PASSWORD });
  const cookie = sessionCookieFrom(login);
  check("signed in for content checks", login.status === 303 && cookie !== null, `${login.status}`);
  if (!cookie) return;

  // --- PAGES -------------------------------------------------------------
  const aboutEditor = await (await request("/studio/pages/about", { headers: { Cookie: cookie } })).text();
  const pageFields = actionFieldsFor(aboutEditor, 'name="lead"');
  check("pages editor exposes its server action", pageFields !== null);
  if (pageFields) {
    const draftTitle = "Tentang Uji Draf";
    const save = await submitAction(
      "/studio/pages/about",
      { ...pageFields, slug: "about", title: draftTitle, lead: "Pengantar uji", seoDescription: "Deskripsi uji", sections: "[]", intent: "save" },
      cookie,
    );
    check("page draft saves", (await save.text()).includes("Draft saved"), `${save.status}`);

    const reloaded = await (await request("/studio/pages/about", { headers: { Cookie: cookie } })).text();
    check("saved page draft loads back into the editor", reloaded.includes(`value="${draftTitle}"`));

    const publicBefore = await (await request("/about")).text();
    check("unpublished page draft is not on the public site", !publicBefore.includes(draftTitle));

    const publish = await submitAction(
      "/studio/pages/about",
      { ...pageFields, slug: "about", title: draftTitle, lead: "Pengantar uji", seoDescription: "Deskripsi uji", sections: "[]", intent: "publish" },
      cookie,
    );
    check("page publish", (await publish.text()).includes("Published."), `${publish.status}`);
    const publicAfter = await (await request("/about")).text();
    check("published page shows on the public site", publicAfter.includes(draftTitle));

    // A newer draft must not leak into the public page: the published version stays until republished.
    const newerDraft = await submitAction(
      "/studio/pages/about",
      { ...pageFields, slug: "about", title: "Tentang Draf Kedua", lead: "Pengantar uji", seoDescription: "Deskripsi uji", sections: "[]", intent: "save" },
      cookie,
    );
    check("newer page draft saves", (await newerDraft.text()).includes("Draft saved"), `${newerDraft.status}`);
    const aboutWithDraft = await (await request("/about")).text();
    check("public page keeps the published version while a newer draft exists", aboutWithDraft.includes(draftTitle) && !aboutWithDraft.includes("Tentang Draf Kedua"));
    check("published SEO description reaches the public page", aboutWithDraft.includes("Deskripsi uji"));

    const badSave = await submitAction(
      "/studio/pages/about",
      { ...pageFields, slug: "about", title: "", lead: "x", seoDescription: "", sections: "[]", intent: "save" },
      cookie,
    );
    check("empty page title is refused", (await badSave.text()).includes("need attention"), `${badSave.status}`);
  }

  // --- MUSIC / RELEASES ---------------------------------------------------
  const newPage = await (await request("/studio/music/new", { headers: { Cookie: cookie } })).text();
  const releaseNewFields = actionFieldsFor(newPage, 'name="releaseDate"');
  check("new release form exposes its server action", releaseNewFields !== null);
  if (releaseNewFields) {
    const slug = "lagu-uji";
    const create = await submitAction(
      "/studio/music/new",
      {
        ...releaseNewFields,
        title: "Lagu Uji",
        type: "single",
        releaseDate: "",
        dateVerified: "",
        description: "Deskripsi lagu uji",
        artworkId: "",
        links: "[]",
        seoTitle: "",
        seoDescription: "",
        slug,
      },
      cookie,
    );
    check("release create redirects to its editor", create.status === 303 && (create.headers.get("location") ?? "").includes(`/studio/music/${slug}`), `${create.status}`);

    const editor = await (await request(`/studio/music/${slug}`, { headers: { Cookie: cookie } })).text();
    const releaseEditFields = actionFieldsFor(editor, 'name="releaseDate"');
    check("release editor exposes its server action", releaseEditFields !== null);
    if (releaseEditFields) {
      const base = {
        ...releaseEditFields,
        slug,
        title: "Lagu Uji Revisi",
        type: "single",
        releaseDate: "",
        dateVerified: "",
        description: "Deskripsi lagu uji",
        artworkId: "",
        links: "[]",
        seoTitle: "",
        seoDescription: "",
      };
      const draft = await submitAction(`/studio/music/${slug}`, { ...base, intent: "save" }, cookie);
      check("release draft saves", (await draft.text()).includes("Draft saved"), `${draft.status}`);

      const musicBeforePublish = await (await request("/music")).text();
      check("unpublished release is not on the public Music page", !musicBeforePublish.includes("Lagu Uji Revisi"));
      const detailBefore = await request(`/music/${slug}`);
      check("unpublished release has no public page", detailBefore.status === 404 || !(await detailBefore.text()).includes("Lagu Uji Revisi"), `${detailBefore.status}`);

      const publish = await submitAction(`/studio/music/${slug}`, { ...base, intent: "publish" }, cookie);
      check("release publish", (await publish.text()).includes("Published."), `${publish.status}`);
      const musicAfter = await (await request("/music")).text();
      check("published release shows on the public Music page", musicAfter.includes("Lagu Uji Revisi"));
      const detailAfter = await request(`/music/${slug}`);
      check("published release has a public page", detailAfter.status === 200, `${detailAfter.status}`);
      const detailText = await detailAfter.text();
      check("published release page shows its description", detailText.includes("Deskripsi lagu uji"));
      check("release without links shows the honest notice", detailText.includes("Listening links for this release are not available yet."));

      const exported = await (await request("/studio/export", { headers: { Cookie: cookie } })).text();
      check("export includes the published release", exported.includes("Lagu Uji Revisi"));
      check("export declares its format", /"format"\s*:\s*"nawa-studio-content-export"/.test(exported));
      check("export has pages, settings, and releases sections", /"pages"\s*:/.test(exported) && /"settings"\s*:/.test(exported) && /"releases"\s*:/.test(exported));

      const unpublish = await submitAction(`/studio/music/${slug}`, { ...base, intent: "unpublish" }, cookie);
      check("release unpublish", (await unpublish.text()).includes("Unpublished."), `${unpublish.status}`);
      const musicAfterUnpublish = await (await request("/music")).text();
      check("unpublished release disappears from the public Music page", !musicAfterUnpublish.includes("Lagu Uji Revisi"));
      const detailAfterUnpublish = await request(`/music/${slug}`);
      check("unpublished release page returns 404", detailAfterUnpublish.status === 404, `${detailAfterUnpublish.status}`);

      const restore = await submitAction(`/studio/music/${slug}`, { ...base, intent: "publish" }, cookie);
      check("release republish after unpublish", (await restore.text()).includes("Published."), `${restore.status}`);

      const invalid = await submitAction(`/studio/music/${slug}`, { ...base, title: "", intent: "save" }, cookie);
      check("empty release title is refused", (await invalid.text()).includes("need attention"), `${invalid.status}`);
    }
  }

  // --- DRAFT ISOLATION ----------------------------------------------------
  if (releaseNewFields) {
    const secretDraftTitle = "Rahasia Draf Lagu";
    const create = await submitAction(
      "/studio/music/new",
      { ...releaseNewFields, title: secretDraftTitle, type: "single", releaseDate: "", dateVerified: "", description: "", artworkId: "", links: "[]", seoTitle: "", seoDescription: "", slug: "rahasia-draf" },
      cookie,
    );
    check("draft-only release is created", create.status === 303, `${create.status}`);
    const exported = await (await request("/studio/export", { headers: { Cookie: cookie } })).text();
    check("export keeps the draft (it is the owner's backup)", exported.includes(secretDraftTitle));
    const pub = await (await request("/music")).text();
    const detail = await request("/music/rahasia-draf");
    check("draft-only release is never exposed publicly", !pub.includes(secretDraftTitle) && detail.status !== 200, `${detail.status}`);
  }

  // --- ARTIST IDENTITY -----------------------------------------------------
  // Published name, role line and social links show on the public site. A saved draft does not, and a
  // blank published field keeps the site wording.
  {
    const settingsHtml = await (await request("/studio/settings", { headers: { Cookie: cookie } })).text();
    const fields = actionFieldsFor(settingsHtml, 'name="socialLinks"');
    check("artist settings form exposes its server action", fields !== null);
    if (fields) {
      const draftOnly = await submitAction("/studio/settings", { ...fields, artistName: "Draf Identitas", role: "Peran Draf", socialLinks: "", intent: "save" }, cookie);
      check("artist settings draft saves", (await draftOnly.text()).includes("Draft saved"), `${draftOnly.status}`);
      const beforePublish = await (await request("/about")).text();
      check("unpublished artist draft does not reach the public site", !beforePublish.includes("Draf Identitas") && beforePublish.includes("Akbar Nawasunda"));

      const publishIdentity = await submitAction(
        "/studio/settings",
        { ...fields, artistName: "Nama Uji", role: "Peran Uji", socialLinks: "Instagram | https://example.com/uji-ig", intent: "publish" },
        cookie,
      );
      check("artist settings publish", (await publishIdentity.text()).includes("Published."), `${publishIdentity.status}`);
      const shown = await (await request("/about")).text();
      check("published artist name shows on the public site", shown.includes("Nama Uji") && !shown.includes("Akbar Nawasunda</a>"));
      check("published role shows in the footer", shown.includes("Peran Uji"));
      check("published social link shows in the footer", shown.includes('aria-label="Social"') && shown.includes('href="https://example.com/uji-ig"'));

      const revert = await submitAction("/studio/settings", { ...fields, artistName: "", role: "", socialLinks: "", intent: "publish" }, cookie);
      check("blank artist settings publish", (await revert.text()).includes("Published."), `${revert.status}`);
      const reverted = await (await request("/about")).text();
      check("blank published name keeps the site name", reverted.includes("Akbar Nawasunda") && !reverted.includes("Nama Uji"));
      check("no social links are shown when none are published", !reverted.includes('aria-label="Social"'));
    }
  }

  // --- EDITOR LINKS ---------------------------------------------------------
  // The editors link to the public page they change, so the owner can check a publish on the phone.
  if (cookie) {
    const releaseEditor = await (await request("/studio/music/lagu-uji", { headers: { Cookie: cookie } })).text();
    check("published release editor links to its public page", releaseEditor.includes('href="/music/lagu-uji"'));
    const pageEditor = await (await request("/studio/pages/about", { headers: { Cookie: cookie } })).text();
    check("page editor links to its public page", pageEditor.includes('href="/about"'));
  }

  // --- SESSION REQUIRED FOR WRITES ---------------------------------------
  // Use the REAL action IDs taken from the signed-in editor, but send them without any session cookie.
  // A refusal here proves the server-side check, not just a malformed request.
  const anonPageFields = actionFieldsFor(aboutEditor, 'name="lead"');
  if (anonPageFields) {
    const anonPublish = await submitAction("/studio/pages/about", { ...anonPageFields, slug: "about", title: "Anon Publish Uji", lead: "x", seoDescription: "", sections: "[]", intent: "publish" });
    const anonBody = await anonPublish.text();
    check("anonymous page publish with a real action is refused", !anonBody.includes("Published.") && anonBody.includes("Your session has ended"), `${anonPublish.status}`);
    const publicAfterAnon = await (await request("/about")).text();
    check("anonymous attempt does not change the public page", !publicAfterAnon.includes("Anon Publish Uji"));
  }
  if (releaseNewFields) {
    const anonRelease = await submitAction("/studio/music/new", { ...releaseNewFields, title: "Anon Rilis Uji", type: "single", releaseDate: "", dateVerified: "", description: "", artworkId: "", links: "[]", seoTitle: "", seoDescription: "", slug: "anon-rilis-uji" });
    const anonReleaseBody = await anonRelease.text();
    check("anonymous release create with a real action is refused", anonRelease.status !== 303 && anonReleaseBody.includes("Your session has ended"), `${anonRelease.status}`);
    const after = await request("/studio/music/anon-rilis-uji", { headers: { Cookie: cookie } });
    check("anonymous release was not created", after.status === 404 || !(await after.text()).includes("Anon Rilis Uji"), `${after.status}`);
  }
  const anonExport = await request("/studio/export");
  check("anonymous export is still refused", anonExport.status === 401, `${anonExport.status}`);

  console.log(failures === 0 ? "\nAll content checks passed." : `\n${failures} content check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error("Content flow check crashed:", error instanceof Error ? error.name : "unknown error");
  process.exitCode = 1;
});
