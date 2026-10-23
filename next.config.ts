import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * D-024: /artist is canonical. /about was the Phase 2 holding route; a permanent (308) redirect
   * keeps any existing link or search result working instead of serving the old page forever.
   */
  async redirects() {
    return [{ source: "/about", destination: "/artist", permanent: true }];
  },
};

export default nextConfig;
