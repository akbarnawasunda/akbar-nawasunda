import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LIMITS, validateDesign, validatePageDocument, validateRelease, parseLinks, isValidCalendarDate } from "../../src/studio/validation";
import { slugify, validateSlug, RELEASE_LIMITS } from "../../src/studio/releases";

const sectionsJson = (sections: unknown[]) => JSON.stringify(sections);
const aboutInput = (sections: unknown[], extra: Record<string, unknown> = {}) => ({
  title: "About",
  lead: "Lead",
  seoDescription: "",
  sections: sectionsJson(sections),
  ...extra,
});

describe("page document validation", () => {
  it("accepts headings and paragraphs and assigns server-side ids", () => {
    const result = validatePageDocument("about", aboutInput([
      { type: "heading", text: " Early years ", visible: true },
      { type: "paragraph", text: "Body text.", visible: true },
    ]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.title, "About");
    assert.deepEqual(result.value.sections.map((s) => s.id), ["s1", "s2"]);
    assert.equal(result.value.sections[0]?.type, "heading");
    assert.equal(result.value.sections[0]?.visible, true);
  });

  it("ignores client-supplied section ids", () => {
    const result = validatePageDocument("about", aboutInput([{ id: "../../evil", type: "paragraph", text: "x" }]));
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.sections[0]?.id, "s1");
  });

  it("rejects section types a page does not support", () => {
    const result = validatePageDocument("about", aboutInput([{ type: "music-list", heading: "", count: 3 }]));
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors["section-0"] ?? "", /tidak didukung/);
  });

  it("allows the music list only on the homepage", () => {
    const home = validatePageDocument("home", { seoDescription: "", sections: sectionsJson([{ type: "music-list", heading: "Music", count: 6 }]) });
    assert.equal(home.ok, true);
    if (home.ok) assert.equal(home.value.sections[0]?.type, "music-list");
  });

  it("rejects a music-list count that is not an approved value", () => {
    const result = validatePageDocument("home", { seoDescription: "", sections: sectionsJson([{ type: "music-list", heading: "", count: 100 }]) });
    assert.equal(result.ok, false);
  });

  it("reports the failing section by index, not the whole page", () => {
    const result = validatePageDocument("about", aboutInput([
      { type: "paragraph", text: "Fine" },
      { type: "paragraph", text: "   " },
    ]));
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors["section-0"], undefined);
      assert.match(result.errors["section-1"] ?? "", /Bagian 2/);
    }
  });

  it("enforces the section count limit per page", () => {
    const many = Array.from({ length: 31 }, () => ({ type: "paragraph", text: "x" }));
    const result = validatePageDocument("about", aboutInput(many));
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors.sections);
  });

  it("enforces text length limits", () => {
    const longHeading = validatePageDocument("about", aboutInput([{ type: "heading", text: "h".repeat(LIMITS.headingText + 1) }]));
    assert.equal(longHeading.ok, false);
    const longParagraph = validatePageDocument("about", aboutInput([{ type: "paragraph", text: "p".repeat(LIMITS.paragraphLength + 1) }]));
    assert.equal(longParagraph.ok, false);
    const longTitle = validatePageDocument("about", aboutInput([], { title: "t".repeat(LIMITS.title + 1) }));
    assert.equal(longTitle.ok, false);
  });

  it("rejects control characters", () => {
    const result = validatePageDocument("about", aboutInput([{ type: "paragraph", text: "bad\u0007text" }]));
    assert.equal(result.ok, false);
  });

  it("requires a title for About but not for the homepage", () => {
    assert.equal(validatePageDocument("about", aboutInput([], { title: "  " })).ok, false);
    assert.equal(validatePageDocument("home", { seoDescription: "", sections: "[]" }).ok, true);
  });

  it("rejects malformed or non-text input without throwing", () => {
    assert.equal(validatePageDocument("about", aboutInput([], { sections: "not json" })).ok, false);
    assert.equal(validatePageDocument("about", aboutInput([], { sections: "{}" })).ok, false);
    const nonText = validatePageDocument("about", { ...aboutInput([]), title: 42 });
    assert.equal(nonText.ok, false);
    if (!nonText.ok) assert.ok(nonText.errors.form);
  });

  it("rejects non-boolean visibility", () => {
    assert.equal(validatePageDocument("about", aboutInput([{ type: "paragraph", text: "x", visible: "no" }])).ok, false);
  });
});

describe("design validation", () => {
  it("accepts the closed options", () => {
    const result = validateDesign({ accent: "icy", titleCase: "as-written" });
    assert.equal(result.ok, true);
  });

  it("rejects anything outside the options, including CSS or colour codes", () => {
    const css = validateDesign({ accent: "red; background:url(x)", titleCase: "uppercase" });
    assert.equal(css.ok, false);
    const hex = validateDesign({ accent: "#ff0000", titleCase: "uppercase" });
    assert.equal(hex.ok, false);
    const missing = validateDesign({ titleCase: "uppercase" });
    assert.equal(missing.ok, false);
  });
});

describe("release validation", () => {
  const base = {
    title: "Night Frequency",
    type: "single",
    releaseDate: "",
    dateVerified: undefined,
    description: "A release.",
    artworkId: "",
    links: "[]",
    seoTitle: "",
    seoDescription: "",
  };
  const options = { allowedArtworkIds: ["cover-approved"] };

  it("accepts a minimal release", () => {
    const result = validateRelease(base, options);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.releaseDate, null);
      assert.equal(result.value.dateVerified, false);
      assert.equal(result.value.artworkId, null);
    }
  });

  it("refuses to store a date that has not been verified", () => {
    const result = validateRelease({ ...base, releaseDate: "2026-02-14" }, options);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.errors.releaseDate ?? "", /tanggal terverifikasi/);
  });

  it("stores a verified date", () => {
    const result = validateRelease({ ...base, releaseDate: "2026-02-14", dateVerified: "on" }, options);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.releaseDate, "2026-02-14");
      assert.equal(result.value.dateVerified, true);
    }
  });

  it("rejects impossible dates", () => {
    assert.equal(isValidCalendarDate("2026-02-30"), false);
    assert.equal(isValidCalendarDate("2026-13-01"), false);
    assert.equal(isValidCalendarDate("14/02/2026"), false);
    assert.equal(isValidCalendarDate("2028-02-29"), true);
  });

  it("accepts only approved artwork ids", () => {
    assert.equal(validateRelease({ ...base, artworkId: "cover-approved" }, options).ok, true);
    const other = validateRelease({ ...base, artworkId: "future-red" }, options);
    assert.equal(other.ok, false);
    if (!other.ok) assert.ok(other.errors.artworkId);
  });

  it("requires a title and a valid release type", () => {
    assert.equal(validateRelease({ ...base, title: " " }, options).ok, false);
    assert.equal(validateRelease({ ...base, type: "video" }, options).ok, false);
  });

  it("enforces seo and description limits", () => {
    assert.equal(validateRelease({ ...base, seoTitle: "t".repeat(RELEASE_LIMITS.seoTitle + 1) }, options).ok, false);
    assert.equal(validateRelease({ ...base, seoDescription: "d".repeat(RELEASE_LIMITS.seoDescription + 1) }, options).ok, false);
    assert.equal(validateRelease({ ...base, description: "d".repeat(RELEASE_LIMITS.description + 1) }, options).ok, false);
  });
});

describe("link validation", () => {
  it("accepts https links and drops fully blank rows", () => {
    const result = parseLinks(JSON.stringify([{ label: "Streaming", href: "https://example.com/a" }, { label: "", href: "" }]));
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 1);
  });

  it("refuses javascript:, http:, data: and malformed addresses", () => {
    for (const href of ["javascript:alert(1)", "http://example.com", "data:text/html,x", "example.com", "ftp://x.com"]) {
      const result = parseLinks(JSON.stringify([{ label: "x", href }]));
      assert.equal(typeof result, "string", `should refuse ${href}`);
    }
  });

  it("refuses credentials embedded in the address", () => {
    const result = parseLinks(JSON.stringify([{ label: "x", href: "https://user:pass@example.com" }]));
    assert.equal(typeof result, "string");
  });

  it("requires a label when an address is given", () => {
    assert.equal(typeof parseLinks(JSON.stringify([{ label: "", href: "https://example.com" }])), "string");
  });

  it("rejects unreadable link data", () => {
    assert.equal(typeof parseLinks("{not json"), "string");
    assert.equal(typeof parseLinks("{}"), "string");
  });
});

describe("slugs", () => {
  it("accepts URL-safe slugs", () => {
    assert.equal(validateSlug("night-frequency-2"), null);
  });

  it("rejects unsafe, reserved and malformed slugs", () => {
    assert.notEqual(validateSlug("a"), null);
    assert.notEqual(validateSlug("Night"), null);
    assert.notEqual(validateSlug("night frequency"), null);
    assert.notEqual(validateSlug("night--frequency"), null);
    assert.notEqual(validateSlug("../etc"), null);
    assert.notEqual(validateSlug("new"), null);
    assert.notEqual(validateSlug("x".repeat(RELEASE_LIMITS.slug + 1)), null);
  });

  it("derives safe slugs from titles", () => {
    assert.equal(slugify("Night Frequency (Remix)!"), "night-frequency-remix");
    assert.equal(slugify("Café Été"), "cafe-ete");
    assert.equal(slugify("!!!"), "");
    assert.equal(validateSlug(slugify("  Hello   World  ")), null);
  });
});
