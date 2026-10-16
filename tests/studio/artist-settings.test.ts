import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ARTIST_LIMITS,
  DEFAULT_ARTIST_SETTINGS,
  parseArtistSettings,
  parseSocialLinkLines,
  socialLinksToText,
  validateArtistSettings,
} from "../../src/studio/artist-settings";
import { buildContentExport, type ExportRow, type ExportSource } from "../../src/studio/export";

/**
 * Artist settings are user input that becomes public later, so the rules are tested directly:
 * https-only links, no credentials in URLs, bounded lengths, and no invented defaults.
 */

describe("social link lines", () => {
  it("accepts label | https pairs and ignores blank lines", () => {
    const result = parseSocialLinkLines("Instagram | https://example.com/a\n\nSoundCloud | https://example.com/b\n");
    assert.deepEqual(result, [
      { label: "Instagram", href: "https://example.com/a" },
      { label: "SoundCloud", href: "https://example.com/b" },
    ]);
  });

  it("rejects javascript:, http:, and plain text addresses", () => {
    assert.match(String(parseSocialLinkLines("X | javascript:alert(1)")), /https/);
    assert.match(String(parseSocialLinkLines("X | http://example.com")), /https/);
    assert.match(String(parseSocialLinkLines("X | example.com")), /https/);
  });

  it("rejects credentials embedded in an address", () => {
    assert.match(String(parseSocialLinkLines("X | https://user:pass@example.com")), /username/);
  });

  it("rejects a line without a separator or label", () => {
    assert.match(String(parseSocialLinkLines("https://example.com")), /Label \| https/);
    assert.match(String(parseSocialLinkLines(" | https://example.com")), /add a label/);
  });

  it("enforces the link count limit and reports line numbers", () => {
    const many = Array.from({ length: ARTIST_LIMITS.socialLinks + 1 }, (_, i) => `L${i} | https://example.com/${i}`).join("\n");
    assert.match(String(parseSocialLinkLines(many)), /or fewer/);
    assert.match(String(parseSocialLinkLines("ok | https://example.com\nbad")), /^Line 2:/);
  });

  it("round-trips through the text form used by the editor", () => {
    const links = [{ label: "Instagram", href: "https://example.com/a" }];
    assert.deepEqual(parseSocialLinkLines(socialLinksToText(links)), links);
  });
});

describe("validateArtistSettings", () => {
  it("accepts blank fields because nothing is invented for the owner", () => {
    const result = validateArtistSettings({ artistName: "", role: "", socialLinks: "" });
    assert.deepEqual(result, { ok: true, value: DEFAULT_ARTIST_SETTINGS });
  });

  it("rejects over-long names and control characters", () => {
    const long = validateArtistSettings({ artistName: "x".repeat(ARTIST_LIMITS.artistName + 1), role: "", socialLinks: "" });
    assert.equal(long.ok, false);
    if (!long.ok) assert.ok(long.errors.artistName);

    const control = validateArtistSettings({ artistName: "Akbar\u0007", role: "", socialLinks: "" });
    assert.equal(control.ok, false);
  });

  it("ignores non-string input rather than trusting it", () => {
    const result = validateArtistSettings({ artistName: { evil: true }, role: null, socialLinks: 42 });
    assert.equal(result.ok, false);
  });

  it("reports link errors under socialLinks", () => {
    const result = validateArtistSettings({ artistName: "", role: "", socialLinks: "X | http://example.com" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.socialLinks);
  });
});

describe("parseArtistSettings (stored JSON)", () => {
  it("returns null for anything that does not match the rules", () => {
    assert.equal(parseArtistSettings("not json"), null);
    assert.equal(parseArtistSettings(JSON.stringify({ artistName: 1, role: "", socialLinks: [] })), null);
    assert.equal(
      parseArtistSettings(JSON.stringify({ artistName: "", role: "", socialLinks: [{ label: "x", href: "javascript:1" }] })),
      null,
    );
  });

  it("reads a valid stored document", () => {
    const stored = JSON.stringify({ artistName: "Akbar", role: "Producer", socialLinks: [{ label: "IG", href: "https://example.com" }] });
    assert.deepEqual(parseArtistSettings(stored), {
      artistName: "Akbar",
      role: "Producer",
      socialLinks: [{ label: "IG", href: "https://example.com/" }],
    });
  });
});

describe("settings in the content export", () => {
  const settingsJson = JSON.stringify({ artistName: "Akbar", role: "", socialLinks: [] });
  const row = (key: string, draftJson: string | null): ExportRow => ({
    key,
    draftJson,
    draftUpdatedAt: 1,
    publishedJson: null,
    publishedAt: null,
  });
  const now = new Date("2026-10-15T00:00:00Z");

  it("exports a readable settings document and stays complete", () => {
    const source: ExportSource = { allKeys: ["settings"], rows: [row("settings", settingsJson)] };
    const exported = buildContentExport(source, now);
    assert.equal(exported.complete, true);
    assert.equal(exported.omitted.unrecognizedKeys, 0);
    assert.equal(exported.settings?.draft?.artistName, "Akbar");
  });

  it("marks the export partial when the settings document is unreadable", () => {
    const source: ExportSource = { allKeys: ["settings"], rows: [row("settings", "{broken")] };
    const exported = buildContentExport(source, now);
    assert.equal(exported.complete, false);
    assert.deepEqual(exported.unreadable, [{ key: "settings", part: "draft", status: "unreadable" }]);
  });
});
