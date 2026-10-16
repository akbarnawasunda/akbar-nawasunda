import assert from "node:assert/strict";
import { describe, it } from "node:test";

import nextConfig from "../../next.config";

/**
 * Anti-framing headers are configured in next.config.ts. These tests check the configuration itself.
 * The HTTP harness (scripts/security-http-check.ts) checks the real responses from a production build,
 * which is the authoritative proof that Next.js path matching behaves as described here.
 *
 * Headers are defence in depth against clickjacking. They do not replace authentication or authorization.
 */

type HeaderRule = { source: string; headers: Array<{ key: string; value: string }> };

async function loadRules(): Promise<HeaderRule[]> {
  assert.equal(typeof nextConfig.headers, "function", "next.config.ts must define headers()");
  return (await nextConfig.headers!()) as HeaderRule[];
}

/** Mirrors the two supported source forms. Used only to check the intent of each rule against sample paths. */
function ruleMatches(source: string, path: string): boolean {
  if (source === "/studio") return path === "/studio";
  if (source === "/studio/:path*") return path === "/studio" || path.startsWith("/studio/");
  throw new Error(`unexpected header source in test: ${source}`);
}

describe("studio framing headers (next.config.ts)", () => {
  it("applies frame-ancestors 'none' and X-Frame-Options DENY to the studio rules", async () => {
    const rules = await loadRules();
    assert.ok(rules.length > 0);
    for (const rule of rules) {
      const csp = rule.headers.find((h) => h.key === "Content-Security-Policy");
      const xfo = rule.headers.find((h) => h.key === "X-Frame-Options");
      assert.equal(csp?.value, "frame-ancestors 'none'", `${rule.source} must set CSP frame-ancestors`);
      assert.equal(xfo?.value, "DENY", `${rule.source} must set X-Frame-Options DENY`);
    }
  });

  it("only ever targets /studio and its nested routes, never the whole site", async () => {
    const rules = await loadRules();
    const sources = rules.map((rule) => rule.source).sort();
    assert.deepEqual(sources, ["/studio", "/studio/:path*"]);
    for (const rule of rules) {
      assert.ok(!rule.source.startsWith("/:"), `${rule.source} would match the public site`);
      assert.notEqual(rule.source, "/");
    }
  });

  it("matches studio paths and no public or look-alike paths", async () => {
    const rules = await loadRules();
    const covered = (path: string) => rules.some((rule) => ruleMatches(rule.source, path));

    for (const path of ["/studio", "/studio/", "/studio/login", "/studio/export", "/studio/preview/about", "/studio/music/new"]) {
      assert.ok(covered(path), `${path} must receive the studio headers`);
    }
    for (const path of ["/", "/about", "/music", "/music/some-release", "/contact", "/studiox", "/studio-archive", "/my/studio"]) {
      assert.ok(!covered(path), `${path} must NOT receive the studio-only headers`);
    }
  });

  it("does not add any other security header to the public site through this configuration", async () => {
    const rules = await loadRules();
    const publicRules = rules.filter((rule) => !rule.source.startsWith("/studio"));
    assert.equal(publicRules.length, 0);
  });
});
