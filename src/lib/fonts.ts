import localFont from "next/font/local";

/**
 * TWO families. That is the whole type system (round 19).
 *
 *   --font-display  Excess V Straight  the site's own name, set giant: the hero H1, the footer
 *                                      wordmark, the loading curtain. Nothing else, ever.
 *   --font-body     Relidux            every other glyph on the site: H2/H3, release and track
 *                                      titles, paragraphs, buttons, navigation, meta labels.
 *
 * Round 17–18 ran five roles (display / heading / body / label / accent). On screen that read as a
 * ransom note: four display faces competing in one viewport, and the label face drew a white tape
 * box inside every song title. The owner's correction is the classic label-site discipline — one
 * voice for the identity, one voice for reading — and it is stricter, not poorer: hierarchy now
 * comes from size, weight, tracking and space.
 *
 * The other three licensed files (Psychlone Straight, Impact Label SWL, Marseloup) stay in
 * `src/assets/fonts/` — purchased, subset, documented in LICENSE-COMMERCIAL.txt — but nothing loads
 * them. `npm run audit:fonts` fails if a stylesheet ever reaches for them again.
 *
 * Both binaries in use are static, single-weight 400 faces:
 *   1. `weight: "400"` on each loader — declaring a range a static file does not have makes the
 *      browser synthesise the missing weights;
 *   2. `font-synthesis: none` in globals.css — a `font-weight: 600` in a stylesheet therefore asks
 *      for the one true cut, and the browser renders the real 400 rather than a fake bold when a
 *      weight is missing. Every weight declaration on the site is therefore 400, and hierarchy
 *      comes from size, tracking, case and colour — the Swiss discipline, not a synthesised bold.
 *
 * Filenames keep the licensed names exactly as delivered (spaces included): next/font hashes the
 * emitted URL, so the space never reaches the network path.
 */
export const displayFont = localFont({
  src: "../assets/fonts/Excess V Straight.woff2",
  variable: "--font-display",
  display: "swap",
  preload: true,
  weight: "400",
  fallback: ["Haettenschweiler", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

/**
 * The reading face. `preload: false` and the @font-face rule is still inlined in the document, so
 * the browser finds it immediately without a <link rel=preload> competing with the hero photograph
 * for the first 200 KB of a mobile connection (D-072).
 */
export const bodyFont = localFont({
  src: "../assets/fonts/Relidux.woff2",
  variable: "--font-body",
  display: "swap",
  preload: false,
  weight: "400",
  fallback: ["ui-sans-serif", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});
