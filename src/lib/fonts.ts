import localFont from "next/font/local";

/**
 * Three vendored families, self-hosted so the build never depends on a third-party font host.
 * Files and their OFL licences live in src/assets/fonts.
 *
 * Round 15 replaced the display face again, and this time the reason is the whole art direction,
 * not one detail. The zine pass set everything in Anton — a 19th-century poster grotesque, one
 * weight, tight, uppercase. At 144 px it shouted, which was the point then and is the problem now:
 * a page built out of poster type has no room to breathe, and the owner's verdict on the result was
 * "font looks cheap, text hard to read". A premium high-tech interface is set in a *geometric*
 * sans with real letterforms and a full weight range, and it whispers rather than shouts.
 *
 * - display: **Space Grotesk** (variable 300–700, 22 KB latin). Geometrically constructed, slightly
 *   quirky terminals, designed for interfaces and headlines rather than posters. It reads as
 *   technical without cosplay — the register the 3D monogram is already in.
 * - body: **Inter** (variable 100–900, 48 KB latin). The most legible UI sans there is; at 15–17 px
 *   it is the reason long copy in this design can be *longer* than the zine's and still read.
 * - mono: **JetBrains Mono** for labels, indices and metadata.
 *
 * Anton stays in `src/assets/fonts` (real asset, licence committed) but is no longer loaded: one
 * fewer family on the critical path.
 *
 * preload: false on the two text faces — their @font-face rules are inlined in the document, so the
 * browser still finds them immediately, but without a <link rel=preload> they stop competing with
 * the hero photograph for the first 200 KB of a mobile connection (D-072). The display face keeps
 * its preload: the H1 is the largest text on the page, and a geometric sans flashing a fallback is
 * more obvious than a condensed one was.
 */
export const displayFont = localFont({
  src: "../assets/fonts/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
  /* A geometric sans before a condensed one: if Space Grotesk never arrives the page should still
     look like an interface, not like a newspaper. */
  fallback: ["Helvetica Neue", "Inter", "Arial", "sans-serif"],
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

export const monoFont = localFont({
  src: "../assets/fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  display: "swap",
  preload: false,
  weight: "100 800",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
  adjustFontFallback: false,
});
