export interface NavItem {
  href: string;
  label: string;
}

/** Primary site navigation. Add a route here only once the page has real content. */
export const primaryNav: readonly NavItem[] = [
  { href: "/music", label: "Music" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
