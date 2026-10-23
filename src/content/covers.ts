/**
 * Cover artwork lookup.
 *
 * The owner uploads 1:1 artwork to public/assets/covers/ later (approved 2026-10-23). Until a file
 * exists, a release renders as a typographic card — no generated or borrowed artwork.
 *
 * Naming convention: public/assets/covers/<slug>.<ext>, where ext is one of COVER_EXTENSIONS.
 * Dropping the file in is enough; no code change and no database edit is needed.
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
