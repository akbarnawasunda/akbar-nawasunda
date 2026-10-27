/**
 * Official platform links.
 *
 * Source: the owner's own content files, supplied 2026-10-24 (`content.json` → `socials` and
 * `platforms`, `artistPlatform.ts` → `platformLinks` / `allPlatformLinks`). Every URL below is
 * copied from that data, not composed here. Three of them are also already in JSON-LD `sameAs`,
 * which is how search engines reconcile the artist identity.
 *
 * Two lists on purpose:
 * - `listenLinks`  — services that play the music. These are the "Dengarkan di" row.
 * - `socialLinks`  — profiles that are followed rather than played. These are the footer/social row.
 *
 * Neither list may contain a URL that the owner has not supplied. If a service is missing, add it
 * only together with its real URL: a guessed deep link ships a broken button (SOCIAL_LINKS.md).
 */
export type ListenPlatform =
  | "spotify"
  | "appleMusic"
  | "youtube"
  | "soundcloud"
  | "deezer"
  | "amazon"
  | "tidal"
  | "anghami"
  | "qobuz"
  | "shazam";

export type SocialPlatform = "instagram" | "tiktok" | "x" | "facebook";

export type PlatformKey = ListenPlatform | SocialPlatform;

export interface PlatformLink {
  platform: PlatformKey;
  label: string;
  href: string;
}

export const listenLinks: readonly PlatformLink[] = [
  {
    platform: "spotify",
    label: "Spotify",
    href: "https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw",
  },
  {
    platform: "appleMusic",
    label: "Apple Music",
    href: "https://music.apple.com/id/album/masih-dihatiku-single/1816312737",
  },
  { platform: "youtube", label: "YouTube", href: "https://www.youtube.com/@akbarnawasunda" },
  { platform: "soundcloud", label: "SoundCloud", href: "https://soundcloud.com/akbarnawasunda" },
  { platform: "deezer", label: "Deezer", href: "https://www.deezer.com/us/artist/322209491" },
  { platform: "amazon", label: "Amazon Music", href: "https://music.amazon.com/albums/B0G4GBYQKJ" },
  { platform: "tidal", label: "Tidal", href: "https://tidal.com/track/443331782" },
  { platform: "anghami", label: "Anghami", href: "https://play.anghami.com/artist/24468665" },
  {
    platform: "qobuz",
    label: "Qobuz",
    href: "https://www.qobuz.com/us-en/interpreter/akbar-nawasunda/26865092",
  },
  {
    platform: "shazam",
    label: "Shazam",
    href: "https://www.shazam.com/artist/akbar-nawasunda/1816312738",
  },
] as const;

export const socialLinks: readonly PlatformLink[] = [
  { platform: "instagram", label: "Instagram", href: "https://www.instagram.com/akbarnawasunda/" },
  { platform: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@akbarnawasunda" },
  { platform: "x", label: "X", href: "https://x.com/akbarnawasunda" },
  { platform: "facebook", label: "Facebook", href: "https://facebook.com/akbarnawasunda" },
] as const;

/** Every official profile, in the order they are rendered. 14 links, nothing inferred. */
export const allLinks: readonly PlatformLink[] = [...listenLinks, ...socialLinks];

/** Booking, press and licensing all go to the same address the owner publishes. */
export const contactEmail = "akbarnawasunda@gmail.com";
export const contactHref = `mailto:${contactEmail}`;

export function getPlatformLink(platform: PlatformKey): PlatformLink {
  const link = allLinks.find((item) => item.platform === platform);
  if (!link) throw new Error(`Unknown platform: ${platform}`);
  return link;
}

/** Back-compat helper: pages that asked for one platform by name (e.g. YouTube on /visuals). */
export function getSocialLink(platform: PlatformKey): PlatformLink {
  return getPlatformLink(platform);
}

/** Primary call to action: the verified Spotify artist page. */
export const listenUrl = getPlatformLink("spotify").href;
