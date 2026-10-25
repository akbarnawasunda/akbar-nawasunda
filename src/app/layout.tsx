import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { accentFont, bodyFont, displayFont, headingFont, labelFont } from "@/lib/fonts";
import { siteConfig } from "@/config/site";
import { defaultSocialImages } from "@/lib/metadata";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Produser, Remixer, DJ asal Bandung Barat`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    images: defaultSocialImages,
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description,
    images: defaultSocialImages.map((image) => image.url),
  },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: siteConfig.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={[
        displayFont.variable,
        headingFont.variable,
        bodyFont.variable,
        labelFont.variable,
        accentFont.variable,
      ].join(" ")}
    >
      <body>{children}</body>
    </html>
  );
}
