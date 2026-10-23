/**
 * Cover artwork lookup — the four-level waterfall from the final brief.
 *
 * 1. MANUAL   public/assets/covers/<slug>.webp: the owner drops a file in, nothing else to do.
 * 2. AUTO     Spotify oEmbed thumbnail, downloaded by scripts/fetch-spotify-artwork.mjs. That script
 *             writes level 1's file, so the site never fetches a third party at request time.
 * 3. GENERATED a typographic sleeve rendered from real brand parts (AN mark at 10%, the release
 *             title, a 4px #0087FF → #7800FF rule). No stock photo, no invented artwork.
 * 4. MANUAL   an override file with the same slug but a different extension, e.g. an AVIF master.
 *
 * Naming convention: public/assets/covers/<slug>.<ext>, where ext is one of COVER_EXTENSIONS.
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

export type CoverArtwork = { kind: "image"; src: string } | { kind: "generated" };

/**
 * What a card should render for this slug.
 *
 * The generated sleeve is a deliberate design object, not a placeholder to be embarrassed about:
 * every verified release has a title, a mark and a palette, which is enough for a 1:1 sleeve that
 * looks intentional. A card is never shipped empty and never borrows someone else's artwork.
 */
export function coverArtwork(slug: string, publicDir?: string): CoverArtwork {
  const src = resolveCover(slug, publicDir);
  return src ? { kind: "image", src } : { kind: "generated" };
}
