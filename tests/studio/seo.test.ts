import assert from "node:assert/strict";
import { describe, it } from "node:test";

import robots from "../../src/app/robots";
import sitemap, { sitemapRoutes } from "../../src/app/sitemap";
import { siteConfig } from "../../src/config/site";
import { allLinks } from "../../src/config/socials";
import { releases } from "../../src/content/releases";
import { artistJsonLd, serializeJsonLd } from "../../src/lib/structured-data";

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
