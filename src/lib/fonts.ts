import localFont from "next/font/local";

/**
 * Three vendored families, self-hosted so the build never depends on a third-party font host.
 * Files and their OFL licences live in src/assets/fonts.
 *
 * - display: **Instrument Serif** (400, roman + italic). Chosen 2026-10-24 over Syne: Syne's
 *   uppercase display is a techy grotesque that reads "startup landing page", and at -0.045em
 *   tracking the hero was a wall of slabs. A high-contrast serif with an italic is the language of
 *   printed music writing (Pitchfork, RA, an EP sleeve) — and the italic variant is what makes a
 *   headline feel authored rather than assembled.
 * - body: **Instrument Sans** (variable 400-700). Designed by the same foundry as the display face,
 *   so the two share proportions and terminals; Inter was neutral to the point of anonymous.
 * - mono: **JetBrains Mono** for metadata such as "BANDUNG BARAT • SINCE 2020".
 *
 * preload: false on the text faces. Their `@font-face` rules are inlined in the document, so the
 * browser still finds them immediately — but without a <link rel=preload> they stop competing with
 * the hero portrait for the first 200 KB of the mobile connection (D-072). Display type keeps its
 * preload: the H1 is the largest text on the page and a serif is far more obvious when it flashes a
 * fallback than a grotesque was.
 */
export const displayFont = localFont({
  src: [
    {
      path: "../assets/fonts/instrument-serif-latin-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/instrument-serif-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["ui-serif", "Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const bodyFont = localFont({
  src: "../assets/fonts/instrument-sans-latin-wght.woff2",
  variable: "--font-body",
  display: "swap",
  preload: false,
  weight: "400 700",
  fallback: ["ui-sans-serif", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
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
