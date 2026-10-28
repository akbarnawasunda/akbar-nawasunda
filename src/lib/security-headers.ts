/**
 * Response headers applied to every route (next.config.ts → headers()).
 *
 * Kept in a plain module rather than inline in next.config so the values can be unit-tested
 * (tests/studio/security-headers.test.ts) and so the deployment runbook has one place to point at.
 *
 * CSP notes — the honest part:
 * - `script-src 'self' 'unsafe-inline'` is required by Next's App Router, which streams the RSC
 *   payload as inline <script> tags. Without 'unsafe-inline' the document still renders (it is SSR)
 *   but hydration dies, which is worse than the risk: every value on this site is either a literal
 *   in this repo or escaped by React, and there is no user HTML anywhere (no dangerouslySetInnerHTML
 *   except the JSON-LD block, which is escaped by src/lib/structured-data.ts).
 * - A nonce-based CSP is the stronger answer, but Next only attaches a nonce when middleware sets it
 *   per request, which forces every page to render dynamically. That would trade a static 0.42 s LCP
 *   for a header. Recorded as D-074; revisit if the site ever accepts owner HTML.
 * - `upgrade-insecure-requests` is deliberately absent: it breaks the local http:// preview and the
 *   screenshot harness, and production is https-only behind Vercel anyway.
 */

export interface HeaderRule {
  key: string;
  value: string;
}

/**
 * Framing policy. The sandbox preview is embedded in an iframe served from *.e2b.app, so a blanket
 * `frame-ancestors 'none'` would break the very thing the owner reviews. Production keeps the strict
 * value; PREVIEW_FRAMING=1 (set only for the sandbox preview process) widens it by exactly that host.
 */
export function frameAncestors(allowPreviewFraming = process.env.PREVIEW_FRAMING === "1"): string {
  return allowPreviewFraming ? "'self' https://*.e2b.app" : "'self'";
}

export function contentSecurityPolicy(allowPreviewFraming?: boolean): string {
  /**
   * React's development build calls `eval()` to reconstruct component stack traces. Without
   * `unsafe-eval` in dev, every `next dev` page prints a red console error even though nothing
   * is broken — which makes console-error verification unusable locally. It is added ONLY when
   * NODE_ENV is not production; the deployed CSP keeps the strict `script-src` unchanged.
   */
  const devEval = process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${devEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors(allowPreviewFraming)}`,
  ].join("; ");
}

export function securityHeaders(allowPreviewFraming?: boolean): HeaderRule[] {
  const preview = allowPreviewFraming ?? process.env.PREVIEW_FRAMING === "1";
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(preview) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    // SAMEORIGIN is the legacy twin of frame-ancestors; omitted while preview framing is allowed,
    // because the header has no wildcard form and would veto the CSP.
    ...(preview ? [] : [{ key: "X-Frame-Options", value: "SAMEORIGIN" }]),
  ];
}
