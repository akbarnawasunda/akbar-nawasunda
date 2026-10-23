import localFont from "next/font/local";

/**
 * Three vendored families, self-hosted so the build never depends on a third-party font host.
 * Files and their OFL licences live in src/assets/fonts; weights are variable.
 *
 * - display: Syne 700-800 for the hero and section titles (docs/02-DESIGN-SYSTEM/TYPOGRAPHY.md)
 * - sans:    Inter 400-500 for body copy
 * - mono:    JetBrains Mono for metadata such as "BANDUNG BARAT • SINCE 2020"
 *
 * Each is exposed as a CSS variable consumed by src/styles/tokens.css.
 *
 * preload: false on the two text faces. Their `@font-face` rules are inlined in the document, so the
 * browser still finds them immediately — but without a <link rel=preload> they stop competing with
 * the hero portrait for the first 200 KB of the mobile connection (D-072). Display type keeps its
 * preload: the H1 is the largest text on the page and should not flash a fallback.
 */
export const displayFont = localFont({
  src: "../assets/fonts/syne-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "400 800",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const bodyFont = localFont({
  src: "../assets/fonts/inter-latin-wght-normal.woff2",
  variable: "--font-body",
  display: "swap",
  preload: false,
  weight: "100 900",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const monoFont = localFont({
  src: "../assets/fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  display: "swap",
  preload: false,
  weight: "100 800",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
  adjustFontFallback: false,
});
