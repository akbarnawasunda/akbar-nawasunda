import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Web app manifest. Small and honest: one dark theme colour, the two icons Next already generates
 * from src/app/icon.png and src/app/apple-icon.png, and no screenshots or shortcuts that would have
 * to be invented.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.role}`,
    short_name: "Akbar Nawasunda",
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    lang: "id",
    icons: [
      { src: "/icon.png", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
