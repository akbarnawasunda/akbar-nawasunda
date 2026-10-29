import localFont from "next/font/local";

/**
 * TWO families. That is the whole type system (round 19).
 *
 *   --font-display  Excess V Straight  the site's own name, set giant: the hero H1, the footer
 *                                      wordmark, the loading curtain. Nothing else, ever.
 *   --font-body     Gohan              every other glyph on the site: H2/H3, release and track
 *                                      titles, paragraphs, buttons, navigation, meta labels.
 *
 * Gohan replaced Relidux in the reading slot (2026-10-29). Nothing about the two-role contract
 * changed — one voice for the identity, one voice for reading — only which binary fills the second
 * voice.
 *
 * Relidux.woff2 is **deleted**, and the reason is measured, not assumed: after the swap it was
 * referenced by exactly zero `font-family` declarations, zero `localFont` loaders and zero fallback
 * stacks, so the binary was 11,584 bytes of licence-controlled weight serving no pixel.
 * `LICENSE-COMMERCIAL.txt` still records the purchase — the licence is held by the owner whether or
 * not the binary sits in the repo — and the file itself is recoverable from history
 * (`git show <parent>~1:src/assets/fonts/Relidux.woff2`). The three other retired faces (Psychlone,
 * Impact Label, Marseloup) stay on disk because that was the decision recorded when *they* were
 * retired; this is a different, later decision for a different file.
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
  /**
   * Langkah 3k — this was `false`, and that is where the homepage's CLS of 0.189 came from.
   *
   * `false` emits the raw fallback stack with no metric override, so the fallback's advance widths
   * are whatever Haettenschweiler/Arial Narrow happen to be. On swap the two hero buttons grew from
   * 190.1 + 144.7 to ~209 + ~159 px and stopped fitting one row: `heroActions` went 46.6 → 104.8 px,
   * the hero grew 60 px and the whole page below it moved. Measured with the woff2 requests aborted:
   * hero 419.3 px vs 479.3 px — the entire shift.
   *
   * `"Arial"` asks next/font to emit an extra metric-adjusted face
   * (`@font-face{font-family:displayFont Fallback; src:local(Arial); size-adjust:13.47%; …}`) built
   * from Excess V's own metrics, placed before the raw fallbacks.
   *
   * What it does NOT do — measured, not assumed (see the note in `heroActions`, page.module.css):
   * the adjusted face is `src: local(Arial)`, so it only applies where Arial is actually installed.
   * On this Linux/CI box and on Android it fails to load and the raw stack wins. The flag is kept
   * because it is free and it does help on Windows/macOS/iOS, but it is NOT what closed the CLS.
   * The layout fix below is. `display: "swap"` also stays: `optional` scores 0 CLS too, but it
   * permanently drops the face on a slow connection, and a wordmark in Arial Narrow is worse than a
   * late wordmark.
   */
  adjustFontFallback: "Arial",
});

/**
 * The reading face. `preload: false` and the @font-face rule is still inlined in the document, so
 * the browser finds it immediately without a <link rel=preload> competing with the hero photograph
 * for the first 200 KB of a mobile connection (D-072).
 */
export const bodyFont = localFont({
  src: "../assets/fonts/Gohan.woff2",
  variable: "--font-body",
  display: "swap",
  preload: false,
  weight: "400",
  fallback: ["ui-sans-serif", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
  /*
   * Same story as the display face: `false` shipped an unadjusted fallback, every text block
   * reflowed on swap, and `local(Arial)` only helps where Arial exists (see the note above).
   *
   * Measured on Gohan itself, not copied over from Relidux (100 px, 47 glyphs, browser
   * `measureText`): Gohan 3365 px vs Relidux 3708 px — the new face is **9.25% narrower**, so the
   * mismatch against an unadjusted fallback is a different number, not the old 19%. Word-level, at
   * 100 px: "Dengar Sekarang" 989 (Relidux 1042), "LIHAT KATALOG" 756 (898), "Tidak tercatat" 792
   * (880). `adjustFontFallback` derives its `size-adjust` from the binary that is actually wired,
   * so it recomputes automatically; the CLS measurement in `artifacts/font-gohan/` is what shows
   * whether the raw stack (where `local(Arial)` is unavailable) got worse.
   *
   * Vertical metrics barely move and cannot shift a line box anyway: Gohan ascent/descent 77/20 vs
   * Relidux 84/20, and `line-height: var(--leading-body)` is the unitless 1.6, so the line box is
   * 1.6 x font-size regardless of what the face reports.
   */
  adjustFontFallback: "Arial",
});
