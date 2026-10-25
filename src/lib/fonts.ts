import localFont from "next/font/local";

/**
 * Five type roles, five files, all self-hosted. Nothing is fetched from a third-party font host and
 * nothing is loaded from npm at build time.
 *
 * ---------------------------------------------------------------------------------------------
 * THE ROLE MAP (round 17)
 *
 *   --font-display  Excess-V-Straight      H1 and the giant hero type (the site's own name)
 *   --font-heading  Psychlone-Straight     H2 and every section title: MUSIK, ARSIP, PRESS KIT
 *   --font-body     Relidux                body copy, navigation, meta, buttons — everything read at
 *                                          normal size, always with open letter-spacing
 *   --font-label    Impact-Label-SWL       release and track titles, play/listen links, anything that
 *                                          should read as a printed stamp or a cassette label
 *   --font-accent   Marse-loup             quotes and decorative lines
 *
 * ---------------------------------------------------------------------------------------------
 * STATUS OF THE BINARIES — read this before touching a path below.
 *
 * The five files named in the map above are NOT in `src/assets/fonts` yet: the folder holds the
 * previous set (Anton, Instrument Sans/Serif, Inter, JetBrains Mono, Space Grotesk). The loader is
 * therefore wired to the closest available face in each slot so the build stays green and the
 * layout can be reviewed:
 *
 *   display  → Space Grotesk 700     (geometric, wide, stands in for Excess-V-Straight)
 *   heading  → Instrument Sans       (stands in for Psychlone-Straight)
 *   body     → Inter                 (stands in for Relidux)
 *   label    → Anton                 (heavy condensed, stands in for Impact-Label-SWL)
 *   accent   → Instrument Serif      (stands in for Marse-loup, italic included)
 *
 * Dropping the real five files in and changing the five `src:` paths (and `weight` where the face is
 * single-weight) is the whole migration. No other file needs to change: every component asks for a
 * role token (`--font-label-stack`), never for a family name.
 *
 * Everything except the display face is `preload: false`: their @font-face rules are already inlined
 * in the document, so the browser still finds them immediately, but without a <link rel=preload> they
 * stop competing with the hero photograph for the first 200 KB of a mobile connection (D-072). The
 * display face keeps its preload — the H1 is the largest object on the page and a display face
 * flashing a fallback is more visible than a text face doing it.
 */
export const displayFont = localFont({
  src: "../assets/fonts/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

/**
 * Section titles. Instrument Sans while Psychlone-Straight is pending: a neo-grotesque with a
 * genuine 400–700 range, tight at display sizes, and clearly a different face from the hero — which
 * matters, because a role map nobody can see is a role map nobody will maintain.
 */
export const headingFont = localFont({
  src: "../assets/fonts/instrument-sans-latin-wght.woff2",
  variable: "--font-heading",
  display: "swap",
  preload: false,
  weight: "400 700",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

export const bodyFont = localFont({
  src: "../assets/fonts/inter-latin-wght-normal.woff2",
  variable: "--font-body",
  display: "swap",
  preload: false,
  weight: "100 900",
  fallback: ["ui-sans-serif", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

/**
 * The stamp face. Single weight on purpose: Impact-Label-SWL ships one cut, and a label maker has
 * no bold — asking for 700 would only ask the browser to smear the 400 (see `font-synthesis: none`
 * in globals.css, which turns that smear off rather than letting it happen).
 */
export const labelFont = localFont({
  src: "../assets/fonts/anton-latin-400.woff2",
  variable: "--font-label",
  display: "swap",
  preload: false,
  weight: "400",
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow", "sans-serif"],
  adjustFontFallback: false,
});

/** Quotes and decorative lines. Roman + italic: a quote without an italic is a paragraph. */
export const accentFont = localFont({
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
  variable: "--font-accent",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});
