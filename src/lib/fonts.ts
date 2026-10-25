import localFont from "next/font/local";

/**
 * Three vendored families, self-hosted so the build never depends on a third-party font host.
 * Files and their OFL licences live in src/assets/fonts.
 *
 * - display: **Anton** (single weight 400, 18 KB latin). Round 12 replaced Instrument Serif with it
 *   after the owner's verdict on the serif build: "template AI yang generik, aman, dan korporat".
 *   He was right, and the reason is structural rather than a matter of taste — a high-contrast serif
 *   plus a clean blue plus a symmetrical grid *is* the visual language of a premium SaaS landing
 *   page in 2026. A zine is set in whatever the print shop had: condensed, heavy, uppercase, tight,
 *   with no finesse in the letterforms at all. Anton is that voice — a 19th-century poster grotesque,
 *   one weight, no italic, 18 KB. The CSS asks for `font-style: italic` on two accents and the
 *   browser synthesises an oblique, which is exactly what a photocopied zine does.
 *
 *   The two Instrument Serif files stay in `src/assets/fonts` (they are real assets and the licence
 *   is committed) but neither is loaded any more: dropping them from the loader removes 43 KB from
 *   the build and one preload from the critical path.
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
  src: "../assets/fonts/anton-latin-400.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "400",
  /* The fallback is a condensed grotesque stack before it reaches a serif: if Anton never arrives,
     the page should still read as a poster, not as a book. */
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow Bold", "Helvetica Neue", "Arial", "sans-serif"],
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
