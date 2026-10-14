import localFont from "next/font/local";

/**
 * Display + text family. The font file is vendored in src/assets/fonts so the build never
 * depends on a third-party font host. Exposed as the CSS variable `--font-display`.
 */
export const displayFont = localFont({
  src: "../assets/fonts/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "300 700",
});
