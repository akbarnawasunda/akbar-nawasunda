import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PAGE_CONFIG, PAGE_SLUGS, emptyPageDocument, isPageSlug, parsePageDocument } from "../../src/studio/content-model";
import { DEFAULT_DESIGN, designAttributes, isAccent, isTitleCase, parseDesign } from "../../src/studio/design";
import { parseReleaseDocument, publicReleaseDate, slugFromKey, releaseKey, type ReleaseDocument } from "../../src/studio/releases";

describe("page content model", () => {
  it("round-trips a document with every section type", () => {
    const doc = {
      ...emptyPageDocument("About"),
      lead: "Lead",
      sections: [
        { id: "s1", type: "heading" as const, visible: true, text: "Early years" },
        { id: "s2", type: "paragraph" as const, visible: false, text: "Hidden draft text" },
        { id: "s3", type: "music-list" as const, visible: true, heading: "Music", count: 6 as const },
      ],
    };
    assert.deepEqual(parsePageDocument(JSON.stringify(doc)), doc);
  });

  it("treats documents saved before the visibility flag as visible", () => {
    const legacy = JSON.stringify({ title: "A", lead: "", seoDescription: "", sections: [{ id: "p1", type: "paragraph", text: "Old" }] });
    const parsed = parsePageDocument(legacy);
    assert.ok(parsed);
    assert.equal(parsed.sections[0]?.visible, true);
  });

  it("rejects malformed, unknown or badly-typed section data", () => {
    assert.equal(parsePageDocument("not json"), null);
    assert.equal(parsePageDocument(JSON.stringify({ title: "A", lead: "", seoDescription: "", sections: [{ id: "x", type: "video", visible: true, text: "" }] })), null);
    assert.equal(parsePageDocument(JSON.stringify({ title: "A", lead: "", seoDescription: "", sections: [{ id: "x", type: "music-list", visible: true, heading: "", count: 7 }] })), null);
    assert.equal(parsePageDocument(JSON.stringify({ title: "A", lead: "", seoDescription: "", sections: [{ id: "x", type: "heading", visible: "yes", text: "t" }] })), null);
    assert.equal(parsePageDocument(JSON.stringify({ title: 1, lead: "", seoDescription: "", sections: [] })), null);
    assert.equal(parsePageDocument(null), null);
  });

  it("accepts only pages declared in the configuration", () => {
    assert.deepEqual([...PAGE_SLUGS].sort(), ["about", "home"]);
    assert.equal(isPageSlug("about"), true);
    assert.equal(isPageSlug("home"), true);
    assert.equal(isPageSlug("admin"), false);
    assert.equal(isPageSlug("constructor"), false);
    assert.equal(isPageSlug("__proto__"), false);
    assert.equal(isPageSlug("../about"), false);
  });

  it("limits the homepage to section types that render on the homepage", () => {
    assert.deepEqual([...PAGE_CONFIG.home.sectionTypes], ["heading", "paragraph", "music-list"]);
    assert.deepEqual([...PAGE_CONFIG.about.sectionTypes], ["heading", "paragraph"]);
  });
});

describe("design settings", () => {
  it("accepts only the closed option values", () => {
    assert.equal(isAccent("cobalt"), true);
    assert.equal(isAccent("#ff0000"), false);
    assert.equal(isAccent("constructor"), false);
    assert.equal(isTitleCase("as-written"), true);
    assert.equal(isTitleCase("font-family: x"), false);
  });

  it("rejects stored settings that contain anything other than known values", () => {
    assert.equal(parseDesign(JSON.stringify({ accent: "bone", titleCase: "uppercase" })) !== null, true);
    assert.equal(parseDesign(JSON.stringify({ accent: "bone", titleCase: "uppercase", css: "body{display:none}" })) !== null, true);
    assert.equal(parseDesign(JSON.stringify({ accent: "body{}", titleCase: "uppercase" })), null);
    assert.equal(parseDesign("[]"), null);
    assert.equal(parseDesign(null), null);
  });

  it("emits only the approved attribute values", () => {
    assert.deepEqual(designAttributes(DEFAULT_DESIGN), { "data-accent": "signal", "data-title-case": "uppercase" });
  });
});

describe("release model", () => {
  const doc: ReleaseDocument = {
    title: "Night Frequency (Remix)",
    type: "remix",
    releaseDate: "2026-03-01",
    dateVerified: false,
    description: "",
    artworkId: null,
    links: [{ label: "Streaming", href: "https://example.com/r" }],
    seoTitle: "",
    seoDescription: "",
  };

  it("round-trips a release document", () => {
    assert.deepEqual(parseReleaseDocument(JSON.stringify(doc)), doc);
    assert.equal(parseReleaseDocument(JSON.stringify({ ...doc, type: "video" })), null);
    assert.equal(parseReleaseDocument(JSON.stringify({ ...doc, links: [{ label: "x" }] })), null);
  });

  it("shows a release date publicly only when it is verified", () => {
    assert.equal(publicReleaseDate(doc), null);
    assert.equal(publicReleaseDate({ ...doc, dateVerified: true }), "2026-03-01");
    assert.equal(publicReleaseDate({ ...doc, dateVerified: true, releaseDate: null }), null);
  });

  it("builds and reads release keys", () => {
    assert.equal(releaseKey("night-frequency"), "release:night-frequency");
    assert.equal(slugFromKey("release:night-frequency"), "night-frequency");
    assert.equal(slugFromKey("about"), null);
  });
});
