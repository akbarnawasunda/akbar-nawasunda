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

/** Secondary links, shown in the footer. */
export const footerNav: readonly NavItem[] = [
  { href: "/music", label: "Music" },
  { href: "/visuals", label: "Visuals" },
  { href: "/artist", label: "Artist" },
  { href: "/epk", label: "Press kit" },
  { href: "/contact", label: "Kontak" },
];
