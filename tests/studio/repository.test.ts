import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { createClient, type Client } from "@libsql/client";

import { applySchema } from "../../src/studio/schema";
import * as repo from "../../src/studio/repository";
import { emptyPageDocument, parsePageDocument, type PageDocument } from "../../src/studio/content-model";
import { parseReleaseDocument, type ReleaseDocument } from "../../src/studio/releases";

/**
 * These tests exercise the real data-access functions against a temporary libSQL file database.
 * They cover what the public site can read, draft/published separation, and persistence across a
 * fresh connection (the same situation as a reload or a server restart).
 */

let dir: string;
let file: string;
let db: Client;

const doc = (title: string, text: string): PageDocument => ({
  ...emptyPageDocument(title),
  sections: [{ id: "s1", type: "paragraph", visible: true, text }],
});

const firstText = (json: string | null): string | undefined => {
  const parsed = parsePageDocument(json);
  const first = parsed?.sections[0];
  return first && "text" in first ? first.text : undefined;
};

const release = (title: string): ReleaseDocument => ({
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

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "studio-test-"));
  file = join(dir, "test.db");
  db = createClient({ url: `file:${file}` });
  await applySchema(db);
});

after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("draft and published separation", () => {
  it("keeps drafts out of the public read", async () => {
    await repo.ensureDocument(db, "about", JSON.stringify(emptyPageDocument("About")), 1);
    await repo.writeDraft(db, "about", JSON.stringify(doc("About", "Only a draft")), 2);
    const row = await repo.readDocument(db, "about");
    assert.ok(row);
    assert.equal(row.publishedJson, null, "a draft must not create a published snapshot");
    const published = await repo.readPublishedWithPrefix(db, "");
    assert.equal(published.some((r) => r.key === "about"), false);
  });

  it("publishes a snapshot and leaves later draft edits private", async () => {
    await repo.publishJson(db, "about", JSON.stringify(doc("About", "Public v1")), 3);
    await repo.writeDraft(db, "about", JSON.stringify(doc("About", "Draft v2")), 4);
    const row = await repo.readDocument(db, "about");
    assert.ok(row);
    const publicText = firstText(row.publishedJson);
    const draftText = firstText(row.draftJson);
    assert.equal(publicText, "Public v1");
    assert.equal(draftText, "Draft v2");
  });

  it("unpublish hides the page but keeps the draft", async () => {
    await repo.ensureDocument(db, "release:unpub", JSON.stringify(release("Unpub")), 5);
    await repo.publishJson(db, "release:unpub", JSON.stringify(release("Unpub")), 6);
    await repo.unpublish(db, "release:unpub");
    const row = await repo.readDocument(db, "release:unpub");
    assert.ok(row);
    assert.equal(row.publishedJson, null);
    assert.equal(parseReleaseDocument(row.draftJson)?.title, "Unpub");
  });

  it("does not write to a document that was never created", async () => {
    assert.equal(await repo.writeDraft(db, "missing-key", "{}", 7), false);
  });
});

describe("releases", () => {
  it("lists only published releases for the public site, but all for the Studio", async () => {
    await repo.ensureDocument(db, "release:alpha", JSON.stringify(release("Alpha")), 10);
    await repo.publishJson(db, "release:alpha", JSON.stringify(release("Alpha")), 11);
    await repo.ensureDocument(db, "release:beta-draft", JSON.stringify(release("Beta")), 12);

    const publicRows = await repo.readPublishedWithPrefix(db, "release:");
    const publicKeys = publicRows.map((r) => r.key);
    assert.ok(publicKeys.includes("release:alpha"));
    assert.equal(publicKeys.includes("release:beta-draft"), false);

    const studioRows = await repo.listWithPrefix(db, "release:");
    assert.ok(studioRows.some((r) => r.key === "release:beta-draft"));
  });

  it("does not treat a page key as a release", async () => {
    const rows = await repo.readPublishedWithPrefix(db, "release:");
    assert.equal(rows.every((r) => r.key.startsWith("release:")), true);
  });

  it("refuses to publish a document that does not exist", async () => {
    assert.equal(await repo.publishJson(db, "release:ghost", "{}", 20), false);
  });

  it("ensureDocument is idempotent and never overwrites an existing draft", async () => {
    await repo.ensureDocument(db, "release:alpha", JSON.stringify(release("Replaced")), 30);
    const row = await repo.readDocument(db, "release:alpha");
    assert.equal(parseReleaseDocument(row?.draftJson)?.title, "Alpha");
  });
});

describe("persistence across connections", () => {
  it("keeps drafts and publications after the database is reopened", async () => {
    db.close();
    db = createClient({ url: `file:${file}` });
    await applySchema(db); // idempotent on restart
    const about = await repo.readDocument(db, "about");
    assert.ok(about);
    assert.ok(about.publishedJson, "published snapshot survives reopen");
    assert.match(about.draftJson, /Draft v2/);
    const alpha = await repo.readDocument(db, "release:alpha");
    assert.ok(alpha?.publishedJson);
  });

  it("schema setup can run repeatedly without losing data", async () => {
    await applySchema(db);
    await applySchema(db);
    const rows = await repo.listWithPrefix(db, "release:");
    assert.ok(rows.length >= 3);
  });
});

describe("atomic release creation (insertNewDocument)", () => {
  let createDir: string;
  let createFile: string;
  const clients: Client[] = [];
  const open = () => {
    const client = createClient({ url: `file:${createFile}` });
    clients.push(client);
    return client;
  };

  before(async () => {
    createDir = mkdtempSync(join(tmpdir(), "studio-create-"));
    createFile = join(createDir, "create.db");
    await applySchema(open());
  });

  after(() => {
    clients.forEach((client) => client.close());
    rmSync(createDir, { recursive: true, force: true });
  });

  it("creates a new release as a private draft", async () => {
    const db = open();
    const json = JSON.stringify(release("First Release"));
    assert.equal(await repo.insertNewDocument(db, "release:first-release", json, 1_000), true);
    const row = await repo.readDocument(db, "release:first-release");
    assert.equal(row?.draftJson, json);
    assert.equal(row?.publishedJson, null);
    assert.equal(row?.draftUpdatedAt, 1_000);
  });

  it("reports a duplicate without changing the existing draft or published snapshot", async () => {
    const db = open();
    const key = "release:kept-release";
    const original = JSON.stringify(release("Original"));
    assert.equal(await repo.insertNewDocument(db, key, original, 2_000), true);
    assert.equal(await repo.publishJson(db, key, original, 2_500), true);

    const replacement = JSON.stringify(release("Replacement that must not win"));
    assert.equal(await repo.insertNewDocument(db, key, replacement, 3_000), false);

    const row = await repo.readDocument(db, key);
    assert.equal(row?.draftJson, original);
    assert.equal(row?.draftUpdatedAt, 2_500, "publishing updated the draft timestamp; the duplicate must not change it");
    assert.equal(row?.publishedJson, original);
    assert.equal(row?.publishedAt, 2_500);
  });

  it("lets exactly one of many concurrent duplicate creations succeed, across separate connections", async () => {
    const key = "release:race-release";
    const attempts = Array.from({ length: 12 }, (_, i) => ({ i, json: JSON.stringify(release(`Racer ${i}`)) }));
    const clientsForRace = Array.from({ length: 4 }, () => open());
    const outcomes = await Promise.all(
      attempts.map(({ i, json }) => repo.insertNewDocument(clientsForRace[i % 4]!, key, json, 4_000 + i)),
    );

    assert.equal(outcomes.filter(Boolean).length, 1, "exactly one creation may report success");
    const winnerIndex = outcomes.indexOf(true);
    const row = await repo.readDocument(open(), key);
    assert.equal(row?.draftJson, attempts[winnerIndex]!.json, "the stored draft must be the winning creation");
    const rows = await repo.listWithPrefix(open(), "release:race-release");
    assert.equal(rows.length, 1, "no duplicate rows may exist");
  });

  it("throws on a failed write instead of reporting a false creation", async () => {
    const closed = open();
    closed.close();
    await assert.rejects(repo.insertNewDocument(closed, "release:never-written", "{}", 5_000));
    assert.equal(await repo.readDocument(open(), "release:never-written"), null);
  });

  it("leaves other release records intact", async () => {
    const db = open();
    await repo.insertNewDocument(db, "release:neighbour", JSON.stringify(release("Neighbour")), 6_000);
    await repo.insertNewDocument(db, "release:neighbour", JSON.stringify(release("Attempted overwrite")), 6_100);
    const neighbour = await repo.readDocument(db, "release:neighbour");
    assert.equal(parseReleaseDocument(neighbour?.draftJson ?? null)?.title, "Neighbour");
    assert.equal(neighbour?.draftUpdatedAt, 6_000);
    const first = await repo.readDocument(db, "release:first-release");
    assert.equal(parseReleaseDocument(first?.draftJson ?? null)?.title, "First Release");
  });

  it("the store uses the atomic insert and no longer checks for existence before writing", () => {
    const store = readFileSync("src/studio/store.ts", "utf8");
    const body = store.split("export async function createReleaseDraft")[1]!.split("export async function saveReleaseDraft")[0]!;
    assert.match(body, /repo\.insertNewDocument\(/);
    assert.doesNotMatch(body, /readDocument|ensureDocument|writeDraft/);
  });
});
