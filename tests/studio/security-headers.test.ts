import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contentSecurityPolicy, frameAncestors, securityHeaders } from "../../src/lib/security-headers";

/**
 * Phase 8: the headers that ship with every response (next.config.ts → headers()).
 *
 * These are assertions about strings, which is exactly the point: a CSP is only worth having if
 * nobody can quietly delete a directive. The browser-level check is the run in
 * docs/08-IMPLEMENTATION/PHASE_0_AUDIT_AND_PHASE_1.md §20 (axe + Lighthouse + header dump).
 */
describe("security headers", () => {
  it("locks the document down: no plugins, no foreign base, no foreign form target", () => {
    const csp = contentSecurityPolicy(false);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
    // Everything the page can load comes from this origin; no CDN, no inline data: for scripts.
    assert.match(csp, /script-src 'self' 'unsafe-inline'/);
    assert.match(csp, /connect-src 'self'/);
    assert.doesNotMatch(csp, /upgrade-insecure-requests/);
  });

  it("fails closed on framing, and widens only for the sandbox preview", () => {
    assert.equal(frameAncestors(false), "'self'");
    assert.match(frameAncestors(true), /https:\/\/\*\.e2b\.app/);
    assert.match(contentSecurityPolicy(true), /frame-ancestors 'self' https:\/\/\*\.e2b\.app/);
  });

  it("ships the classic hardening headers on every route", () => {
    const headers = new Map(securityHeaders(false).map((rule) => [rule.key, rule.value]));
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.match(headers.get("Permissions-Policy") ?? "", /camera=\(\)/);
    assert.match(headers.get("Strict-Transport-Security") ?? "", /max-age=\d+/);
    assert.equal(headers.get("Cross-Origin-Opener-Policy"), "same-origin");
    assert.equal(headers.get("X-Frame-Options"), "SAMEORIGIN");
    assert.equal(headers.get("Content-Security-Policy"), contentSecurityPolicy(false));
  });

  it("drops the legacy framing header when the preview has to be embedded", () => {
    const keys = securityHeaders(true).map((rule) => rule.key);
    assert.ok(!keys.includes("X-Frame-Options"), "X-Frame-Options has no wildcard form and would veto the CSP");
    assert.ok(keys.includes("Content-Security-Policy"));
  });
});
