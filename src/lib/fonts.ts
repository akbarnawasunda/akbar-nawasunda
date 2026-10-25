import localFont from "next/font/local";

/**
 * Five type roles, five licensed files, all self-hosted. Nothing is fetched from a third-party font
 * host and nothing is installed from npm at build time.
 *
 * ---------------------------------------------------------------------------------------------
 * THE ROLE MAP (round 17)
 *
 *   --font-display  Excess V Straight    H1 and the giant hero type (the site's own name)
 *   --font-heading  Psychlone Straight   H2 and every section title: MUSIK, ARSIP, PRESS KIT
 *   --font-body     Relidux              body copy, navigation, buttons, every meta label —
 *                                        always with the open tracking in tokens.css
 *   --font-label    Impact Label SWL     release and track titles, play/listen links, anything
 *                                        that should read as a printed stamp or a cassette label
 *   --font-accent   Marseloup            quotes and decorative lines
 *
 * Every one of the five is a **static, single-weight (400) face**. That has two consequences the
 * stylesheets have to respect, and both are enforced below rather than hoped for:
 *
 *   1. `weight: "400"` on every loader. Declaring a range a static file does not have makes the
 *      browser synthesise the missing weights — the smeared, over-inked look the owner rejected in
 *      round 15.
 *   2. `font-synthesis: none` in globals.css. Any `font-weight: 700` left in a stylesheet therefore
 *      renders as the real 400 instead of a fake bold. Hierarchy on this site is carried by size,
 *      tracking and space, never by weight.
 *
 * Filenames keep the licensed names exactly as delivered (`Excess V Straight.woff2`, with spaces):
 * next/font hashes the emitted URL, so the space never reaches the network path, and the file in the
 * repo is still identifiable as the file that was purchased.
 *
 * Licences for these five are held by the site owner; the OFL files that shipped previously are
 * still in this folder with their licence texts.
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
 * Section titles. A separate family from the hero on purpose: the owner's map gives the site's own
 * name and its section titles different voices, and both are visible at 12vw.
 */
export const headingFont = localFont({
  src: "../assets/fonts/Psychlone Straight.woff2",
  variable: "--font-heading",
  display: "swap",
  preload: true,
  weight: "400",
  fallback: ["Arial Narrow", "Helvetica Neue", "sans-serif"],
  adjustFontFallback: false,
});

/**
 * Body, navigation, every label. `preload: false` and the @font-face rule is still inlined in the
 * document, so the browser finds it immediately without a <link rel=preload> competing with the hero
 * photograph for the first 200 KB of a mobile connection (D-072).
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

/**
 * The stamp face — release and track titles. A label-maker face is a *material*: it is not asked to
 * set a paragraph, and it is never given a weight it does not ship.
 */
export const labelFont = localFont({
  src: "../assets/fonts/Impact Label SWL.woff2",
  variable: "--font-label",
  display: "swap",
  preload: false,
  weight: "400",
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

/**
 * Quotes and decorative lines.
 *
 * The heaviest file on the site by a distance (~340 KB subset): it is a decorative outline face and
 * its contours are simply dense. It is therefore the one slot with `preload: false` *and* no
 * above-the-fold consumer — the quote sits below the fold, renders in the serif fallback first and
 * swaps when the file lands. That keeps it off the critical path entirely.
 */
export const accentFont = localFont({
  src: "../assets/fonts/Marseloup.woff2",
  variable: "--font-accent",
  display: "swap",
  preload: false,
  weight: "400",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});
