import assert from "node:assert/strict";
import { describe, it } from "node:test";

import robots from "../../src/app/robots";
import sitemap, { sitemapRoutes } from "../../src/app/sitemap";
import { siteConfig } from "../../src/config/site";
import { allLinks } from "../../src/config/socials";
import { releases } from "../../src/content/releases";
import { artistJsonLd, serializeJsonLd } from "../../src/lib/structured-data";
import { brandCard, releaseCard } from "../../src/lib/social-card";

/**
 * Phase 8 SEO: sitemap, robots and structured data. Everything is generated from the same content
 * modules the pages render, so a new release cannot appear on a page and be missing from the sitemap.
 */
describe("seo", () => {
  it("lists every public route and no private one", () => {
    const urls = sitemapRoutes().map((entry) => entry.url.replace(siteConfig.url, ""));
    assert.deepEqual(urls.slice(0, 6), ["", "/music", "/artist", "/visuals", "/epk", "/contact"]);
    assert.deepEqual(sitemap(), sitemapRoutes(), "the route handler returns the tested list");
    for (const forbidden of ["/studio", "/api", "/privacy", "/about"]) {
      assert.ok(!urls.some((url) => url.startsWith(forbidden)), `sitemap must not list ${forbidden}`);
    }
  });

  it("includes every verified release at its canonical path", () => {
    const urls = new Set(sitemapRoutes().map((entry) => entry.url));
    for (const release of releases) {
      assert.ok(urls.has(`${siteConfig.url}/music/${release.slug}`), `missing /music/${release.slug}`);
    }
    assert.equal(urls.size, 6 + releases.length);
  });

  it("tells crawlers to stay out of the studio and points at the sitemap", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const rule = rules[0];
    assert.ok(rule, "robots() must return at least one rule");
    assert.equal(rule.userAgent, "*");
    assert.equal(rule.allow, "/");
    assert.ok((rule.disallow as string[]).includes("/studio"));
    assert.ok((rule.disallow as string[]).includes("/api/"));
    assert.equal(result.sitemap, `${siteConfig.url}/sitemap.xml`);
  });

  it("describes the artist with verified facts only", () => {
    const data = artistJsonLd();
    assert.equal(data["@type"], "MusicGroup");
    assert.equal(data.name, "Akbar Nawasunda");
    assert.equal(data.alternateName, "DJ Akbar Remix");
    assert.equal(data.foundingDate, "2020");
    assert.deepEqual([...data.sameAs], allLinks.map((link) => link.href));
    assert.equal(data.sameAs.length, 14, "every platform the owner supplied, and nothing else");
    assert.equal(new Set(data.sameAs).size, 14, "no duplicate profile");
    assert.ok(!("award" in data) && !("recordLabel" in data));
  });

  it("cannot break out of its script tag", () => {
    const payload = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    assert.ok(!payload.includes("</script"));
    assert.ok(!payload.includes("<"));
    assert.deepEqual(JSON.parse(payload), { name: "</script><script>alert(1)</script>" });
  });
});

/**
 * Social cards. Before this, all sixteen pages shipped one square image with `summary`, so a link to
 * any of the ten releases looked exactly like a link to the homepage.
 *
 * Tested through `src/lib/social-card.ts` rather than `src/lib/metadata.ts`, because the latter
 * imports the static image manifest and cannot be loaded by the node test runner. The wiring itself
 * is checked against the built HTML by `scripts/check-web.mjs` and `npm run smoke`.
 */
describe("social cards", () => {
  it("gives a release its own card at the size the crawlers crop to", () => {
    const card = releaseCard("lali-dalane", "Lali Dalane", "Akbar Nawasunda");
    assert.equal(card.url, "/og?slug=lali-dalane");
    assert.equal(card.width, 1200);
    assert.equal(card.height, 630);
    assert.equal(card.alt, "Lali Dalane, Akbar Nawasunda");
  });

  it("escapes the slug instead of pasting it into the query string", () => {
    assert.equal(releaseCard("a&b=c", "x", "y").url, "/og?slug=a%26b%3Dc");
    assert.equal(releaseCard("a b", "x", "y").url, "/og?slug=a%20b");
  });

  it("points the home and section cards at the brand route", () => {
    const card = brandCard("Akbar Nawasunda", "produser, remixer, DJ");
    assert.equal(card.url, "/og");
    assert.equal(card.width, 1200);
  });

  it("keeps the card route out of the sitemap", () => {
    const urls = sitemapRoutes().map((entry) => entry.url);
    assert.ok(!urls.some((url) => url.includes("/og")), "the card route must not be indexed");
  });
});
