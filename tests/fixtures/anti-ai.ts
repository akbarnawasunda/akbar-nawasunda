/**
 * Source files that make up the homepage's visual language, and the patterns that must never
 * reappear in them.
 *
 * Kept out of the test file so the list is easy to extend when a new component joins the homepage —
 * a rule that only covers the page shell is a rule that gets bypassed by the next card component.
 */
export function homepageSourceFiles(): string[] {
  return [
    "src/app/(site)/page.tsx",
    "src/app/(site)/page.module.css",
    "src/components/content/ReleaseCover.tsx",
    "src/components/content/ReleaseCover.module.css",
    /* R8 moved the homepage's movement into these three; the rule follows the surface, not the
       file that happened to be on it in round 5 (D-121). ReleaseBento/ReleaseGrid/ReleaseCard were
       deleted with the card grid they belonged to. */
    "src/components/content/CatalogueIndex.tsx",
    "src/components/content/CatalogueIndex.module.css",
    "src/components/content/ReleaseTicker.tsx",
    "src/components/content/ReleaseTicker.module.css",
    "src/components/zine/Plate3D.tsx",
    "src/components/zine/Plate3D.module.css",
  ];
}

export const BANNED_HOMEPAGE_PATTERNS: readonly { pattern: RegExp; why: string }[] = [
  {
    pattern: /radial-gradient/i,
    why: "radial gradients are how the glowing-blob look crept in; use a flat surface step",
  },
  {
    pattern: /backdrop-filter|glassmorphism/i,
    why: "no glass panels on the page (the header bar is the only blur, and it lives elsewhere)",
  },
  {
    pattern: /mix-blend-mode/i,
    why: "blend modes force full-page repaints on low-end Android",
  },
  {
    pattern: /lorem ipsum/i,
    why: "no placeholder copy — unverified content is marked [NEEDS OWNER] instead",
  },
  {
    pattern: /filter:\s*blur\(/i,
    why: "no blur filters; they are the usual way a glow effect is faked",
  },
  {
    pattern: /<canvas|getContext\(/i,
    why: "no canvas in the hero or the catalogue",
  },
  {
    pattern: /animation:\s*[^;]*infinite/i,
    why: "no endless decoration (MOTION_DESIGN.md)",
  },
];
