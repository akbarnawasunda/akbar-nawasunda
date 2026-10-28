import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * CSS is NOT inlined (experimental.inlineCss reverted, D-072): it grew the document from 11 KB to
   * 43 KB of transferred HTML and made first paint *later* in Lighthouse's model, because the HTML
   * is a single HTTP/1.1 response while the three stylesheets are separate cacheable requests.
   */
  poweredByHeader: false,
  /**
   * The social card route reads the OG font and the release sleeves off disk at request time
   * (src/app/og/route.tsx). Files under public/ are not part of a route's traced graph by default,
   * so without this the card works locally and 500s on the first cold request in production.
   */
  outputFileTracingIncludes: {
    "/og": ["./public/fonts/**", "./public/assets/covers/**"],
  },
  /**
   * Exclude documentation, artifacts, and scripts from Vercel's file tracing to prevent
   * bloating the serverless function bundle (storage anti-jebol).
   */
  outputFileTracingExcludes: {
    "*": [
      "./docs/**",
      "./artifacts/**",
      "./AKBAR-NAWASUNDA-ASSETS/**",
      "./scripts/**",
      "./*.md",
    ],
  },
  /**
   * D-024: /artist is canonical. /about was the Phase 2 holding route; a permanent (308) redirect
   * keeps any existing link or search result working instead of serving the old page forever.
   */
  async redirects() {
    return [{ source: "/about", destination: "/artist", permanent: true }];
  },
  /** One header set for every route, including /studio and /api (D-073). */
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
