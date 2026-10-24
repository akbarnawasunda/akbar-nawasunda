export interface NavItem {
  href: string;
  label: string;
}

/**
 * Primary navigation — the final sitemap (SITEMAP.md): Music / Visuals / Artist / EPK.
 *
 * Every entry points at a route that exists (D-016): /visuals and /artist are real pages since
 * Phase 5, and /about is a 308 to /artist (D-024), so it is no longer linked anywhere.
 */
export const primaryNav: readonly NavItem[] = [
  { href: "/music", label: "Music" },
  { href: "/visuals", label: "Visuals" },
  { href: "/artist", label: "Artist" },
  { href: "/epk", label: "EPK" },
];

/**
 * The phone menu: the four primary routes plus Kontak.
 *
 * A drawer has room for one more line than a 72 px bar does, and on a phone the contact page is the
 * second most useful destination after the music — leaving it only in the footer means scrolling to
 * the bottom of a nine-release catalogue to find the one address that books the artist.
 */
export const drawerNav: readonly NavItem[] = [...primaryNav, { href: "/contact", label: "Kontak" }];

/** Secondary links, shown in the footer. */
export const footerNav: readonly NavItem[] = [
  { href: "/music", label: "Music" },
  { href: "/visuals", label: "Visuals" },
  { href: "/artist", label: "Artist" },
  { href: "/epk", label: "Press kit" },
  { href: "/contact", label: "Kontak" },
];
