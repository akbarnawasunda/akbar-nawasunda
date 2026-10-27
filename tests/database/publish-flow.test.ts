import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

/**
 * End-to-end check of the Studio content path against a real libSQL database (a temporary file, same
 * SQL dialect Turso uses).
 *
 * Run through `npm run test:db`, which starts Node with `--conditions=react-server` so modules that
 * `import "server-only"` (store.ts, public.ts, db.ts) can be loaded outside a React render.
 *
 * What this locks down, in the order the owner experiences it:
 *   1. a saved draft is never readable through the public reader;
 *   2. publishing makes that exact document public;
 *   3. editing after publishing changes the draft only, and the public page keeps the old text;
 *   4. a session token stored as a hash is active until it expires;
 *   5. the password hash verifies the right password and rejects the wrong one.
 */
const dir = mkdtempSync(join(tmpdir(), "nawa-studio-"));
const databasePath = join(dir, "studio.db");

process.env.DATABASE_URL = `file:${databasePath}`;
delete process.env.TURSO_DATABASE_URL;
delete process.env.DATABASE_AUTH_TOKEN;

// Imported inside before() so the environment above is in place before any module reads it, and so
// the file stays free of top-level await (tsx compiles .ts to CJS here).
type Store = typeof import("../../src/studio/store");
type PublicApi = typeof import("../../src/studio/public");
type Password = typeof import("../../src/studio/password");
type Security = typeof import("../../src/studio/security");
type Validation = typeof import("../../src/studio/validation");

let store: Store;
let publicApi: PublicApi;
let password: Password;
let security: Security;
let validation: Validation;

function aboutDoc(lead: string, paragraphs: string[]) {
  return {
    title: "Artist",
    lead,
    seoDescription: "",
    sections: paragraphs.map((text, index) => ({
      id: `p${index + 1}`,
      type: "paragraph" as const,
      visible: true,
      text,
    })),
  };
}

describe("Studio publish flow", () => {
  before(async () => {
    password = await import("../../src/studio/password");
    process.env.STUDIO_ADMIN_PASSWORD_HASH = await password.hashPassword("kata-sandi-uji");
    store = await import("../../src/studio/store");
    publicApi = await import("../../src/studio/public");
    security = await import("../../src/studio/security");
    validation = await import("../../src/studio/validation");
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("starts with no published page", async () => {
    const record = await store.getPageRecord("about");
    assert.equal(record.published, null, "a fresh document must have nothing published");
    assert.equal(await publicApi.getPublicPage("about"), null);
  });

  it("keeps a saved draft private", async () => {
    const draft = aboutDoc("Kalimat pembuka dari draf.", ["Paragraf pertama yang belum terbit."]);
    await store.savePageDraft("about", draft, Date.now());

    const record = await store.getPageRecord("about");
    assert.equal(record.draft.lead, "Kalimat pembuka dari draf.");
    assert.equal(record.draft.sections.length, 1);
    assert.equal(record.published, null, "saving must not publish");
    assert.equal(await publicApi.getPublicPage("about"), null, "the public reader must not see a draft");
  });

  it("publishes exactly what was reviewed", async () => {
    const doc = aboutDoc("Produser, remixer, dan DJ asal Bandung Barat.", [
      "Paragraf bio pertama.",
      "Paragraf bio kedua.",
    ]);
    await store.publishPage("about", doc, Date.now());

    const published = await publicApi.getPublicPage("about");
    assert.ok(published);
    assert.equal(published.lead, doc.lead);
    assert.deepEqual(
      published.sections.map((section) => (section.type === "paragraph" ? section.text : "")),
      ["Paragraf bio pertama.", "Paragraf bio kedua."],
    );
  });

  it("keeps the published version when a later draft is saved", async () => {
    await store.savePageDraft("about", aboutDoc("Revisi yang belum terbit.", ["Paragraf baru."]), Date.now());

    const record = await store.getPageRecord("about");
    assert.equal(record.draft.lead, "Revisi yang belum terbit.");

    const published = await publicApi.getPublicPage("about");
    assert.equal(published?.lead, "Produser, remixer, dan DJ asal Bandung Barat.");
    assert.equal(
      published?.sections.length,
      2,
      "the public page must still show the last published version",
    );
  });

  it("round-trips content through the database unchanged", async () => {
    const long = "Bio panjang. ".repeat(40).trim();
    await store.publishPage("about", aboutDoc("Pembuka.", [long]), Date.now());
    const published = await publicApi.getPublicPage("about");
    const first = published?.sections[0];
    assert.equal(first?.type === "paragraph" ? first.text : null, long);
  });

  it("stores only the hash of a session token", async () => {
    const token = "token-uji-yang-tidak-disimpan-mentah";
    const now = Date.now();
    await store.createSession(security.hashSessionToken(token), now, now + security.SESSION_TTL_MS);

    const expires = await store.findSessionExpiry(security.hashSessionToken(token));
    assert.ok(expires !== null && expires > now);
    assert.equal(
      await store.findSessionExpiry(token),
      null,
      "the raw token must not match: only its hash is stored",
    );
  });

  it("verifies the admin password and rejects the wrong one", async () => {
    const stored = process.env.STUDIO_ADMIN_PASSWORD_HASH as string;
    assert.equal(await password.verifyPassword("kata-sandi-uji", stored), true);
    assert.equal(await password.verifyPassword("kata-sandi-salah", stored), false);
    assert.equal(await password.verifyPassword("", stored), false);
  });

  it("rejects a document the public page could not render", () => {
    const result = validation.validatePageDocument("about", {
      title: "Artist",
      lead: "",
      seoDescription: "",
      // music-list is a homepage-only section type.
      sections: JSON.stringify([{ type: "music-list", visible: true, heading: "Rilis", count: 6 }]),
    });
    assert.equal(result.ok, false);
  });
});
