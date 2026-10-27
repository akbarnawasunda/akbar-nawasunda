/**
 * Where a release's artwork comes from.
 *
 * Every release in the catalogue carries the links the owner actually published (SoundCloud, Apple
 * Music, Spotify, YouTube). Each of those platforms exposes a **public, unauthenticated** endpoint
 * that returns a thumbnail for a track/album URL: Apple through the iTunes lookup API, the other
 * three through oEmbed. That means the site can use the real cover art without an API key, without a
 * Spotify developer app, and without ever calling a third party at render time — `scripts/
 * fetch-release-artwork.mjs` resolves the links once, writes `public/assets/covers/<slug>.webp`, and
 * the site reads that file like any other asset.
 *
 * This module is deliberately pure and network-free so `tests/studio/artwork-source.test.ts` can pin
 * the mapping. The fetching lives in the script.
 */

export type ArtworkProvider = "apple" | "soundcloud" | "spotify" | "youtube";

export interface ReleaseLinkLike {
  label: string;
  href: string;
}

export interface ArtworkSource {
  provider: ArtworkProvider;
  /** The link the artwork was resolved from — kept for the log line, not for the request. */
  href: string;
  /** The URL the script fetches JSON from. */
  endpoint: string;
  /** Provider id where one exists (Apple's numeric id is what makes the lookup work). */
  id?: string;
}

const APPLE_ID = /\/\d+\/(?:album|song)\/[^/]+\/(\d+)/;
const APPLE_ID_ALT = /\/(?:album|song)\/[^/]+\/(\d+)/;
const YOUTUBE_ID = /(?:v=|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/;

export function providerOf(href: string): ArtworkProvider | null {
  if (/music\.apple\.com|itunes\.apple\.com/.test(href)) return "apple";
  if (/open\.spotify\.com/.test(href)) return "spotify";
  if (/soundcloud\.com/.test(href)) return "soundcloud";
  if (/youtube\.com|youtu\.be/.test(href)) return "youtube";
  return null;
}

/** Apple's numeric id, from either an album or a song URL. */
export function appleId(href: string): string | null {
  return APPLE_ID.exec(href)?.[1] ?? APPLE_ID_ALT.exec(href)?.[1] ?? null;
}

export function youtubeId(href: string): string | null {
  return YOUTUBE_ID.exec(href)?.[1] ?? null;
}

/**
 * The iTunes lookup URL for an Apple id. `entity=song` returns the album entry first, which is the
 * one carrying `artworkUrl100` at 1200 px after the size substitution.
 */
export function appleLookup(id: string, country = "id"): string {
  return `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&entity=song&country=${country}`;
}

export function oEmbed(provider: Exclude<ArtworkProvider, "apple">, href: string): string {
  const target = encodeURIComponent(href);
  switch (provider) {
    case "spotify":
      return `https://open.spotify.com/oembed?url=${target}`;
    case "soundcloud":
      return `https://soundcloud.com/oembed?format=json&url=${target}`;
    case "youtube":
      return `https://www.youtube.com/oembed?url=${target}&format=json`;
  }
}

/**
 * Apple serves `.../100x100bb.jpg`; asking for the same path at 1200 px is the documented trick for
 * getting print-sized art out of the lookup API, and it is what the script downloads.
 */
export function upgradeAppleArtwork(url: string, size = 1200): string {
  return url.replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.$1`);
}

/**
 * Pick the first link that can actually yield artwork. Order matters: Apple first because its art is
 * the release's own master (and the catalogue already points at album pages), SoundCloud second
 * because that is where most of this artist's uploads live.
 */
export function artworkSource(links: readonly ReleaseLinkLike[]): ArtworkSource | null {
  const candidates = links
    .map((link) => ({ link, provider: providerOf(link.href) }))
    .filter((entry): entry is { link: ReleaseLinkLike; provider: ArtworkProvider } => entry.provider !== null);

  const order: ArtworkProvider[] = ["apple", "soundcloud", "spotify", "youtube"];
  for (const provider of order) {
    for (const candidate of candidates) {
      if (candidate.provider !== provider) continue;
      const { href } = candidate.link;
      if (provider === "apple") {
        const id = appleId(href);
        if (!id) continue;
        return { provider, href, id, endpoint: appleLookup(id) };
      }
      if (provider === "youtube" && !youtubeId(href)) continue;
      return { provider, href, endpoint: oEmbed(provider, href) };
    }
  }
  return null;
}
