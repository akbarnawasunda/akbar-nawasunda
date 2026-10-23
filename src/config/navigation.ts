export interface NavItem {
  href: string;
  label: string;
}

/**
 * Primary navigation.
 *
 * The final sitemap is Music / Visuals / Artist / EPK. Visuals already exists as a homepage section
 * (Phase 2) and Artist is served by /about until Phase 5 renames the route (D-024). EPK is not
 * linked yet: a nav item that 404s is a broken promise, and the audit rule is no dead links (D-016).
 */
export const primaryNav: readonly NavItem[] = [
  { href: "/music", label: "Music" },
  { href: "/#visuals", label: "Visuals" },
  { href: "/about", label: "Artist" },
];

/** Secondary links, shown in the footer. */
export const footerNav: readonly NavItem[] = [
  { href: "/music", label: "Music" },
  { href: "/#visuals", label: "Visuals" },
  { href: "/about", label: "Artist" },
  { href: "/contact", label: "Kontak" },
];
