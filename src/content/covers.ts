/**
 * Cover artwork lookup — the four-level waterfall, in the order a file is actually found.
 *
 * 1. MANUAL    public/assets/covers/<slug>.webp — the owner drops a file in, nothing else to do.
 * 2. AUTO      Real cover art, downloaded by scripts/fetch-release-artwork.mjs from the streaming
 *              link the owner already published (Apple iTunes lookup, or SoundCloud/Spotify/YouTube
 *              oEmbed). That script writes level 1's file, so the site never calls a third party
 *              while rendering.
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
 * ---------------------------------------------------------------------------------------------
 * WHY THIS FILE IS SHAPED THIS WAY (Langkah 3a, 2026-10-28)
 *
 * It used to be:
 *
 *     export function resolveCover(slug, publicDir = join(process.cwd(), "public")) {
 *       for (const candidate of coverCandidates(slug)) {
 *         if (existsSync(join(publicDir, candidate))) return candidate;   // ← line 33
 *       }
 *     }
 *
 * `publicDir` is an ordinary parameter, so Next.js's file tracer cannot prove which directory
 * `existsSync` will touch. It gives up and traces **the entire project** into every server bundle:
 * 1189 entries for one route, 520 of them files under `docs/` (38 MB of screenshots). Repeated per
 * route, re-uploaded on every deploy — that is the mechanism behind the 19.36 GB storage incident.
 *
 * The fix is not an exclude, it is the missing static scope. The waterfall is now a pure function of
 * a probe (`CoverProbe`), and the only `fs` call in the file builds its path from **literal
 * segments** — `join(process.cwd(), "public", "assets", "covers", name)` — which the tracer accepts
 * as "statically scoped to a subfolder", so it stops at that directory instead of walking the repo.
 *
 * Behaviour is unchanged: same candidate order, same first-hit wins, same `image` / `sleeve` /
 * `generated` result for every slug. Tests inject their own probe (a temp directory, or a plain
 * set of names) instead of a directory string, which also removes the temp-directory plumbing from
 * the unit suite.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

export const COVER_EXTENSIONS = ["webp", "avif", "jpg", "jpeg", "png"] as const;

/** Where a slug's artwork lives, as public URLs, most preferred first. */
const COVER_DIR = "/assets/covers/";

/** Public URL candidates for a release slug, most preferred first. Pure, so it is unit-tested. */
export function coverCandidates(slug: string): string[] {
  return COVER_EXTENSIONS.map((extension) => `${COVER_DIR}${slug}.${extension}`);
}

/**
 * "Does this public file exist?" — the one thing the waterfall actually needs to know.
 *
 * Injected rather than hard-coded so the waterfall is a pure function: production passes the disk
 * probe below, tests pass a directory of their own or a literal set of names. Nothing about the
 * ordering rules changes.
 */
export type CoverProbe = (publicPath: string) => boolean;

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

/** First candidate the probe confirms, or null. The whole waterfall, with no I/O of its own. */
export function resolveCoverWith(slug: string, probe: CoverProbe): string | null {
  for (const candidate of coverCandidates(slug)) {
    if (probe(candidate)) return candidate;
  }
  return null;
}

/** Where scripts/generate-placeholder-covers.mjs writes, and where the resolver looks for it. */
export function sleeveCandidate(slug: string): string {
  return `${COVER_DIR}${slug}@sleeve.webp`;
}

/** The generated sleeve for the slug, or null when the script has not run for it. */
export function resolveSleeveWith(slug: string, probe: CoverProbe): string | null {
  const candidate = sleeveCandidate(slug);
  return probe(candidate) ? candidate : null;
}

/**
 * What a card should render for this slug.
 *
 * The generated sleeve is a deliberate design object, not a placeholder to be embarrassed about:
 * every verified release has a title, a mark and a palette, which is enough for a 1:1 sleeve that
 * looks intentional. A card is never shipped empty and never borrows someone else's artwork.
 */
export function coverArtworkWith(slug: string, probe: CoverProbe): CoverArtwork {
  const src = resolveCoverWith(slug, probe);
  if (src) return { kind: "image", src };

  const sleeve = resolveSleeveWith(slug, probe);
  return sleeve ? { kind: "sleeve", src: sleeve } : { kind: "generated" };
}

/**
 * The production probe: does the file exist under public/assets/covers/?
 *
 * Literal path segments, on purpose. This is the line that keeps the tracer inside one directory;
 * see the header. Do not refactor it back into a parameterised `join(dir, …)` — that is what made
 * every route carry the whole repository.
 */
function existsInPublic(publicPath: string): boolean {
  if (!publicPath.startsWith(COVER_DIR)) return false;
  const name = publicPath.slice(COVER_DIR.length);
  return existsSync(join(process.cwd(), "public", "assets", "covers", name));
}

/** First existing cover for the slug, or null. */
export function resolveCover(slug: string): string | null {
  return resolveCoverWith(slug, existsInPublic);
}

/** Generated sleeve for the slug, or null when the script has not run for it. */
export function resolveSleeve(slug: string): string | null {
  return resolveSleeveWith(slug, existsInPublic);
}

/** What a card should render for this slug, read from the real covers directory. */
export function coverArtwork(slug: string): CoverArtwork {
  return coverArtworkWith(slug, existsInPublic);
}
