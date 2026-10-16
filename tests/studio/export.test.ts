import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createClient, type Client } from "@libsql/client";

import { applySchema } from "../../src/studio/schema";
import * as repo from "../../src/studio/repository";
import {
  buildContentExport,
  exportFilename,
  serializeContentExport,
  classifyKey,
  toIsoTimestamp,
  type ExportRow,
  type ExportSource,
} from "../../src/studio/export";
import { handleStudioExport, isExplicitCrossSite, type ExportDependencies } from "../../src/studio/export-response";

/**
 * Tests for the authenticated content export. Everything here runs against a temporary local
 * database or in-memory fakes. No production credentials, remote databases, or environment values
 * are used. Sentinel strings are synthetic and exist only to prove that they never reach the output.
 */

const NOW = new Date("2026-10-14T18:30:00.000Z"); // 2026-10-15 01:30 in Asia/Jakarta
const T1 = 1_700_000_000_000;
const T2 = 1_700_000_100_000;

const SENTINEL = {
  dbHost: "SENTINEL_DB_HOST.invalid",
  dbToken: "SENTINEL_DB_TOKEN_9f2c",
  sessionHash: "SENTINEL_SESSION_HASH_77ab",
  passwordHash: "scrypt:SENTINEL_PASSWORD_HASH_55",
  unknownContent: "SENTINEL_UNKNOWN_CONTENT_42",
  rawBroken: "SENTINEL_RAW_BROKEN_JSON_88",
};

const pageJson = (title: string, text = "") =>
  JSON.stringify({ title, lead: "", seoDescription: "", sections: text ? [{ id: "s1", type: "paragraph", visible: true, text }] : [] });

const releaseJson = (title: string) =>
  JSON.stringify({
    title,
    type: "single",
    releaseDate: null,
    dateVerified: false,
    description: "",
    artworkId: null,
    links: [],
    seoTitle: "",
    seoDescription: "",
  });

const designJson = JSON.stringify({ accent: "signal", titleCase: "uppercase" });

const row = (key: string, draftJson: unknown, publishedJson: unknown = null, extra: Partial<ExportRow> = {}): ExportRow => ({
  key,
  draftJson,
  draftUpdatedAt: T1,
  publishedJson,
  publishedAt: publishedJson === null ? null : T2,
  ...extra,
});

function exportFrom(source: ExportSource) {
  const output = serializeContentExport(buildContentExport(source, NOW));
  return { output, parsed: JSON.parse(output) };
}

describe("serializer: format and validity", () => {
  it("produces valid JSON with the expected format name and version", () => {
    const { output, parsed } = exportFrom({ allKeys: ["about"], rows: [row("about", pageJson("About"))] });
    assert.doesNotThrow(() => JSON.parse(output));
    assert.equal(parsed.format, "nawa-studio-content-export");
    assert.equal(parsed.formatVersion, 1);
    assert.equal(parsed.exportedAt, "2026-10-14T18:30:00.000Z");
    assert.equal(parsed.complete, true);
    assert.equal(output.endsWith("\n"), true);
  });

  it("uses the same rules for the same input and time (pure, deterministic)", () => {
    const source: ExportSource = { allKeys: ["about"], rows: [row("about", pageJson("About"))] };
    assert.equal(serializeContentExport(buildContentExport(source, NOW)), serializeContentExport(buildContentExport(source, NOW)));
  });

  it("converts stored millisecond timestamps to ISO 8601 and rejects unusable values", () => {
    assert.equal(toIsoTimestamp(T1), new Date(T1).toISOString());
    assert.equal(toIsoTimestamp(null), null);
    assert.equal(toIsoTimestamp("not a number"), null);
    assert.equal(toIsoTimestamp(1.5), null);
    assert.equal(toIsoTimestamp(Number.MAX_SAFE_INTEGER), null);
  });
});

describe("serializer: pages and design", () => {
  it("exports only the pages that exist and never invents missing ones", () => {
    const { parsed } = exportFrom({ allKeys: ["about"], rows: [row("about", pageJson("About"))] });
    assert.deepEqual(Object.keys(parsed.pages), ["about"]);
    assert.equal(parsed.design, null);
    assert.deepEqual(parsed.releases, []);
    assert.equal(parsed.complete, true);
  });

  it("keeps draft and published content separate and keeps unpublished content as null", () => {
    const { parsed } = exportFrom({
      allKeys: ["about"],
      rows: [row("about", pageJson("Draft title"), pageJson("Live title"))],
    });
    assert.equal(parsed.pages.about.draft.title, "Draft title");
    assert.equal(parsed.pages.about.published.title, "Live title");
    assert.equal(parsed.pages.about.draftUpdatedAt, new Date(T1).toISOString());
    assert.equal(parsed.pages.about.publishedAt, new Date(T2).toISOString());

    const unpublished = exportFrom({ allKeys: ["home"], rows: [row("home", pageJson("Only draft"))] }).parsed;
    assert.equal(unpublished.pages.home.published, null);
    assert.equal(unpublished.pages.home.publishedAt, null);
  });

  it("exports design settings as draft and published values", () => {
    const { parsed } = exportFrom({ allKeys: ["design"], rows: [row("design", designJson, designJson)] });
    assert.deepEqual(parsed.design.draft, { accent: "signal", titleCase: "uppercase" });
    assert.deepEqual(parsed.design.published, { accent: "signal", titleCase: "uppercase" });
  });
});

describe("serializer: releases", () => {
  it("exports draft and published releases in stable slug order", () => {
    const { parsed } = exportFrom({
      allKeys: ["release:zeta-one", "release:alpha-two"],
      rows: [
        row("release:zeta-one", releaseJson("Zeta"), releaseJson("Zeta live")),
        row("release:alpha-two", releaseJson("Alpha")),
      ],
    });
    assert.deepEqual(
      parsed.releases.map((release: { slug: string }) => release.slug),
      ["alpha-two", "zeta-one"],
    );
    assert.equal(parsed.releases[1].published.title, "Zeta live");
    assert.equal(parsed.releases[0].published, null);
  });

  it("recognizes release keys only with a valid slug", () => {
    assert.equal(classifyKey("release:night-frequency").kind, "release");
    assert.equal(classifyKey("release:Bad Slug").kind, "unknown");
    assert.equal(classifyKey("release:").kind, "unknown");
    assert.equal(classifyKey("release:new").kind, "unknown"); // reserved
    assert.equal(classifyKey("about").kind, "page");
    assert.equal(classifyKey("design").kind, "design");
    assert.equal(classifyKey("ABOUT").kind, "unknown");
  });
});

describe("unreadable documents", () => {
  it("does not replace an unreadable draft with a default, and does not export its raw contents", () => {
    const { output, parsed } = exportFrom({
      allKeys: ["about"],
      rows: [row("about", `{${SENTINEL.rawBroken}`)],
    });
    assert.equal(parsed.pages.about.draft, null);
    assert.deepEqual(parsed.unreadable, [{ key: "about", part: "draft", status: "unreadable" }]);
    assert.equal(parsed.complete, false);
    assert.equal(output.includes(SENTINEL.rawBroken), false);
  });

  it("reports an unreadable published snapshot while keeping the readable draft", () => {
    const { output, parsed } = exportFrom({
      allKeys: ["release:night-frequency"],
      rows: [row("release:night-frequency", releaseJson("Night"), `{${SENTINEL.rawBroken}`)],
    });
    assert.equal(parsed.releases[0].draft.title, "Night");
    assert.equal(parsed.releases[0].published, null);
    assert.ok(parsed.unreadable.some((note: { part: string }) => note.part === "published"));
    assert.equal(parsed.complete, false);
    assert.equal(output.includes(SENTINEL.rawBroken), false);
  });

  it("flags an unusable timestamp instead of silently dropping it", () => {
    const { parsed } = exportFrom({
      allKeys: ["design"],
      rows: [row("design", designJson, null, { draftUpdatedAt: "garbage" })],
    });
    assert.equal(parsed.design.draftUpdatedAt, null);
    assert.ok(parsed.unreadable.some((note: { part: string }) => note.part === "metadata"));
    assert.equal(parsed.complete, false);
  });
});

describe("unknown keys and sensitive tables", () => {
  it("counts unrecognized keys and never exports their contents", () => {
    const { output, parsed } = exportFrom({
      allKeys: ["about", "random-notes", "release:Bad Slug"],
      rows: [
        row("about", pageJson("About")),
        row("random-notes", SENTINEL.unknownContent),
        row("release:Bad Slug", SENTINEL.unknownContent),
      ],
    });
    assert.equal(parsed.omitted.unrecognizedKeys, 2);
    assert.equal(parsed.complete, false);
    assert.equal(output.includes(SENTINEL.unknownContent), false);
    assert.equal(output.includes("random-notes"), false);
  });

  it("never returns keys or contents of rows that were not recognized, even if passed in", () => {
    const { output } = exportFrom({
      allKeys: ["secret-internal"],
      rows: [row("secret-internal", SENTINEL.unknownContent)],
    });
    assert.equal(output.includes(SENTINEL.unknownContent), false);
    assert.equal(output.includes("secret-internal"), false);
  });
});

describe("read-only database access (temporary file database)", () => {
  let dir: string;
  let db: Client;
  const exactKeys = ["about", "home", "design"];

  const snapshotTables = async () =>
    JSON.stringify({
      pages: (await db.execute("SELECT slug, draft_json, draft_updated_at, published_json, published_at FROM studio_pages ORDER BY slug")).rows,
      sessions: (await db.execute("SELECT * FROM studio_sessions ORDER BY token_hash")).rows,
      failures: (await db.execute("SELECT * FROM studio_login_failures ORDER BY id")).rows,
    });

  async function seed() {
    await applySchema(db);
    await db.execute({
      sql: "INSERT INTO studio_pages (slug, draft_json, draft_updated_at, published_json, published_at) VALUES (?, ?, ?, ?, ?)",
      args: ["about", pageJson("About draft"), T1, pageJson("About live"), T2],
    });
    await db.execute({
      sql: "INSERT INTO studio_pages (slug, draft_json, draft_updated_at, published_json, published_at) VALUES (?, ?, ?, ?, ?)",
      args: ["release:night-frequency", releaseJson("Night draft"), T1, null, null],
    });
    await db.execute({
      sql: "INSERT INTO studio_pages (slug, draft_json, draft_updated_at, published_json, published_at) VALUES (?, ?, ?, ?, ?)",
      args: ["unknown-thing", SENTINEL.unknownContent, T1, null, null],
    });
    await db.execute({
      sql: "INSERT INTO studio_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)",
      args: [SENTINEL.sessionHash, T1, T2],
    });
    await db.execute({
      sql: "INSERT INTO studio_login_failures (id, failures, window_start) VALUES (1, 3, ?)",
      args: [T1],
    });
  }

  async function loadSource(): Promise<ExportSource> {
    const result = await repo.readExportSource(db, exactKeys, "release:");
    return { allKeys: result.allKeys, rows: result.rows };
  }

  it("exports drafts and published content from real rows, excludes sessions and login data, and skips unknown keys", async () => {
    dir = mkdtempSync(join(tmpdir(), "nawa-export-"));
    db = createClient({ url: `file:${join(dir, "export.db")}` });
    try {
      await seed();
      const { output, parsed } = exportFrom(await loadSource());
      assert.equal(parsed.pages.about.draft.title, "About draft");
      assert.equal(parsed.pages.about.published.title, "About live");
      assert.equal(parsed.releases[0].draft.title, "Night draft");
      assert.equal(parsed.omitted.unrecognizedKeys, 1);
      assert.equal(output.includes(SENTINEL.unknownContent), false);
      assert.equal(output.includes(SENTINEL.sessionHash), false);
      for (const forbidden of ["studio_sessions", "studio_login_failures", "token_hash", "window_start", "failures", "expires_at"]) {
        assert.equal(output.includes(forbidden), false, `output must not contain ${forbidden}`);
      }
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not modify any record and does not create missing pages", async () => {
    dir = mkdtempSync(join(tmpdir(), "nawa-export-"));
    db = createClient({ url: `file:${join(dir, "export.db")}` });
    try {
      await seed();
      const before = await snapshotTables();
      const source = await loadSource();
      buildContentExport(source, NOW);
      // Also exercise the full handler path.
      await handleStudioExport(new Request("https://example.test/studio/export"), {
        isAdmin: async () => true,
        readSource: loadSource,
        now: () => NOW,
      });
      assert.equal(await snapshotTables(), before, "export must not write to any table");
      const home = await db.execute("SELECT slug FROM studio_pages WHERE slug = 'home'");
      assert.equal(home.rows.length, 0, "a page that was never edited must not be created by export");
    } finally {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("fails with a generic error when the database is closed, without leaking details", async () => {
    dir = mkdtempSync(join(tmpdir(), "nawa-export-"));
    db = createClient({ url: `file:${join(dir, "export.db")}` });
    await seed();
    db.close();
    const logged: string[] = [];
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), {
      isAdmin: async () => true,
      readSource: loadSource,
      now: () => NOW,
      logError: (tag) => logged.push(tag),
    });
    rmSync(dir, { recursive: true, force: true });
    const body = await response.text();
    assert.equal(response.status, 500);
    assert.equal(body.includes(dir), false);
    assert.equal(body.toLowerCase().includes("sqlite"), false);
    assert.equal(body.toLowerCase().includes("libsql"), false);
    assert.deepEqual(logged, ["[studio] export failed"]);
  });
});

describe("HTTP handler: authentication and ordering", () => {
  function deps(overrides: Partial<ExportDependencies> & { admin?: boolean } = {}) {
    const calls: string[] = [];
    const base: ExportDependencies = {
      isAdmin: async () => {
        calls.push("isAdmin");
        return overrides.admin ?? true;
      },
      readSource: async () => {
        calls.push("readSource");
        return { allKeys: ["about"], rows: [row("about", pageJson("About"))] };
      },
      now: () => NOW,
      logError: () => {},
    };
    return { calls, deps: { ...base, ...overrides } as ExportDependencies };
  }

  it("returns a generic 401 for unauthenticated requests and never reads protected content", async () => {
    const { calls, deps: d } = deps({ admin: false });
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), d);
    const body = await response.text();
    assert.equal(response.status, 401);
    assert.deepEqual(calls, ["isAdmin"]);
    assert.equal(body.includes("About"), false);
    assert.equal(response.headers.get("content-disposition"), null);
  });

  it("treats a failing authentication check as unauthenticated (fails closed)", async () => {
    let read = false;
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), {
      isAdmin: async () => {
        throw new Error("boom");
      },
      readSource: async () => {
        read = true;
        return { allKeys: [], rows: [] };
      },
    });
    assert.equal(response.status, 401);
    assert.equal(read, false, "no protected read may happen when authentication fails");
  });

  it("checks authentication before reading, for authenticated admins too", async () => {
    const { calls, deps: d } = deps({ admin: true });
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), d);
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ["isAdmin", "readSource"]);
  });
});

describe("HTTP handler: headers and filename", () => {
  it("returns the expected headers for an authenticated admin", async () => {
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), {
      isAdmin: async () => true,
      readSource: async () => ({ allKeys: ["about"], rows: [row("about", pageJson("About"))] }),
      now: () => NOW,
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="nawa-studio-export-2026-10-15.json"');
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(response.headers.get("access-control-allow-origin"), null, "no permissive CORS");
    assert.equal(JSON.parse(await response.text()).formatVersion, 1);
  });

  it("uses the Asia/Jakarta date for the filename, including around midnight", () => {
    assert.equal(exportFilename(new Date("2026-10-14T16:59:59.000Z")), "nawa-studio-export-2026-10-14.json");
    assert.equal(exportFilename(new Date("2026-10-14T17:00:00.000Z")), "nawa-studio-export-2026-10-15.json");
    assert.equal(exportFilename(new Date("2026-10-14T18:30:00.000Z")), "nawa-studio-export-2026-10-15.json");
  });

  it("sets the same no-store headers on error responses", async () => {
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), {
      isAdmin: async () => false,
      readSource: async () => ({ allKeys: [], rows: [] }),
      now: () => NOW,
    });
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  });
});

describe("HTTP handler: cross-site requests", () => {
  const request = (value?: string) =>
    new Request("https://example.test/studio/export", value === undefined ? {} : { headers: { "Sec-Fetch-Site": value } });

  it("rejects explicit cross-site requests before authentication or reads", async () => {
    let touched = 0;
    const response = await handleStudioExport(request("cross-site"), {
      isAdmin: async () => {
        touched += 1;
        return true;
      },
      readSource: async () => {
        touched += 1;
        return { allKeys: [], rows: [] };
      },
    });
    assert.equal(response.status, 403);
    assert.equal(touched, 0);
  });

  it("matches the marker case-insensitively and ignores surrounding spaces", () => {
    assert.equal(isExplicitCrossSite(request(" Cross-Site ")), true);
    assert.equal(isExplicitCrossSite(request("CROSS-SITE")), true);
  });

  it("does not reject a missing header or same-origin, same-site, or none", async () => {
    for (const value of [undefined, "same-origin", "same-site", "none"]) {
      assert.equal(isExplicitCrossSite(request(value)), false, `value=${value}`);
      const response = await handleStudioExport(request(value), {
        isAdmin: async () => true,
        readSource: async () => ({ allKeys: [], rows: [] }),
        now: () => NOW,
      });
      assert.equal(response.status, 200, `value=${value}`);
    }
  });
});

describe("secrets and raw errors never appear in responses", () => {
  it("does not include raw database errors or connection details in a failed response", async () => {
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), {
      isAdmin: async () => true,
      readSource: async () => {
        throw new Error(`connect failed to libsql://${SENTINEL.dbHost} token=${SENTINEL.dbToken}`);
      },
      now: () => NOW,
      logError: () => {},
    });
    const body = await response.text();
    assert.equal(response.status, 500);
    assert.equal(body.includes(SENTINEL.dbHost), false);
    assert.equal(body.includes(SENTINEL.dbToken), false);
  });

  it("the successful export contains none of the sensitive sentinels", async () => {
    const response = await handleStudioExport(new Request("https://example.test/studio/export"), {
      isAdmin: async () => true,
      readSource: async () => ({
        allKeys: ["about", "unknown-thing"],
        rows: [row("about", pageJson("About")), row("unknown-thing", SENTINEL.unknownContent)],
      }),
      now: () => NOW,
    });
    const body = await response.text();
    for (const value of Object.values(SENTINEL)) {
      assert.equal(body.includes(value), false, `sentinel leaked: ${value.slice(0, 12)}`);
    }
    assert.equal(body.includes("scrypt:"), false);
    assert.equal(body.includes("token_hash"), false);
  });
});

describe("wiring: dashboard link and route (source checks)", () => {
  const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

  it("dashboard link is a plain anchor with download, not a Next.js Link, and does not fetch", () => {
    const page = source("src/app/studio/page.tsx");
    assert.ok(page.includes('href="/studio/export"'));
    assert.ok(page.includes("download"));
    assert.equal(/<Link[^>]*href="\/studio\/export"/.test(page), false, "must not be a prefetching Link");
    assert.equal(/\bprefetch\s*[={]/.test(page), false, "no prefetch attribute (a comment mentioning it is fine)");
    assert.equal(/\bfetch\(/.test(page), false, "rendering the dashboard must not request the export");
  });

  it("route is dynamic, guarded by the existing admin check, and delegates to the handler", () => {
    const route = source("src/app/studio/export/route.ts");
    assert.ok(route.includes('export const dynamic = "force-dynamic"'));
    assert.ok(route.includes("isAdminRequest"));
    assert.ok(route.includes("handleStudioExport"));
    assert.equal(/Access-Control-Allow-Origin/i.test(route), false);
  });

  it("the export source never uses prefix scans, ensureDocument, or the page/design getters", () => {
    const store = source("src/studio/store.ts");
    const start = store.indexOf("export async function getExportSource");
    assert.ok(start > 0);
    const body = store.slice(start, store.indexOf("\n}\n", start));
    assert.equal(body.includes("ensureDocument"), false);
    assert.equal(body.includes("getPageRecord"), false);
    assert.equal(body.includes("getDesignRecord"), false);
    assert.equal(body.includes("listWithPrefix"), false);
    assert.equal(body.includes('""'), false, "no empty-prefix scan");
  });
});
