import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import nextConfig from "../../next.config";
import { footerNav, primaryNav } from "../../src/config/navigation";

const root = join(import.meta.dirname, "../..");

describe("public routing", () => {
  /**
   * D-024: /about was the Phase 2 holding route. It must stay reachable as a permanent redirect so
   * old links and search results do not 404, and it must not be served by a page component.
   */
  it("redirects /about to /artist permanently", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    assert.deepEqual(redirects, [{ source: "/about", destination: "/artist", permanent: true }]);
  });

  it("links only routes that exist", () => {
    const routes = new Set(["/", "/music", "/visuals", "/artist", "/epk", "/contact"]);
    for (const item of [...primaryNav, ...footerNav]) {
      const path = item.href.split("#")[0] ?? item.href;
      assert.ok(routes.has(path), `nav item ${item.label} points at missing route ${item.href}`);
    }
  });

  it("keeps the sitemap order Music, Visuals, Artist, EPK", () => {
    assert.deepEqual(
      primaryNav.map((item) => item.label),
      ["Music", "Visuals", "Artist", "EPK"],
    );
  });

  /** The page promises a download; the file has to be in public/ or the button is a dead link. */
  it("ships the press kit it links to", () => {
    for (const file of [
      "public/epk/akbar-nawasunda-epk.zip",
      "public/epk/press-photo-print.jpg",
      "public/epk/press-photo-web.webp",
      "public/epk/an-mark-transparent.png",
      "public/epk/lockup-transparent.png",
    ]) {
      const stats = statSync(join(root, file));
      assert.ok(stats.size > 1000, `${file} looks empty`);
    }
  });
});
