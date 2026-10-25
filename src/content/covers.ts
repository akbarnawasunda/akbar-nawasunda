/**
 * Cover artwork lookup — the four-level waterfall, in the order a file is actually found.
 *
 * 1. MANUAL    public/assets/covers/<slug>.webp — the owner drops a file in, nothing else to do.
 * 2. AUTO      Spotify oEmbed thumbnail, downloaded by scripts/fetch-spotify-artwork.ts. That script
 *              writes level 1's file, so the site never calls a third party while rendering.
 * 3. GENERATED public/assets/covers/<slug>@sleeve.webp, rendered by
 *              scripts/generate-placeholder-covers.mjs from the title, the original artist, the AN
 *              mark and the palette. It is a designed sleeve, never an empty card and never
 *              someone else's artwork. The `@sleeve` suffix is what lets the site tell it apart from
 *              a real cover; since round 19 the sleeve carries no type, so the card under it does
 *              print the same words again.
 * 4. MANUAL    an override with the same slug but another extension, e.g. an AVIF master.
 *
 * The component-level sleeve in ReleaseCover.tsx remains as the last resort for a slug that has no
 * file at all (a release added to the catalogue before the script is run).
 *
 * This module touches the filesystem, so it is imported by server components only.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

export const COVER_EXTENSIONS = ["webp", "avif", "jpg", "jpeg", "png"] as const;

/** Public URL candidates for a release slug, most preferred first. Pure, so it is unit-tested. */
export function coverCandidates(slug: string): string[] {
  return COVER_EXTENSIONS.map((extension) => `/assets/covers/${slug}.${extension}`);
}

/** First existing cover for the slug, or null. `publicDir` is injectable so tests stay hermetic. */
export function resolveCover(slug: string, publicDir: string = join(process.cwd(), "public")): string | null {
  for (const candidate of coverCandidates(slug)) {
    if (existsSync(join(publicDir, candidate))) return candidate;
  }
  return null;
}

/**
 * What a card has to render.
 *
 * `image` is real artwork (owner file or Spotify download).
 * `sleeve` is a generated placeholder file; it carries no type, the card prints the title.
 * `generated` means no file at all: the component draws the sleeve itself.
 */
export type CoverArtwork =
  | { kind: "image"; src: string }
  | { kind: "sleeve"; src: string }
  | { kind: "generated" };

/** Where scripts/generate-placeholder-covers.mjs writes, and where the resolver looks for it. */
export function sleeveCandidate(slug: string): string {
  return `/assets/covers/${slug}@sleeve.webp`;
}

/** Generated sleeve for the slug, or null when the script has not run for it. */
export function resolveSleeve(slug: string, publicDir: string = join(process.cwd(), "public")): string | null {
  const candidate = sleeveCandidate(slug);
  return existsSync(join(publicDir, candidate)) ? candidate : null;
}

/**
 * What a card should render for this slug.
 *
 * The generated sleeve is a deliberate design object, not a placeholder to be embarrassed about:
 * every verified release has a title, a mark and a palette, which is enough for a 1:1 sleeve that
 * looks intentional. A card is never shipped empty and never borrows someone else's artwork.
 */
export function coverArtwork(slug: string, publicDir?: string): CoverArtwork {
  const src = resolveCover(slug, publicDir);
  if (src) return { kind: "image", src };

  const sleeve = resolveSleeve(slug, publicDir);
  return sleeve ? { kind: "sleeve", src: sleeve } : { kind: "generated" };
}
