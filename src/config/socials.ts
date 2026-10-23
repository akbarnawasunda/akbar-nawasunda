/**
 * Verified platform links only (docs/01-BRAND-IDENTITY/FACTS_AND_VERIFICATION.md v3 and
 * PROMPT_AWAL_AGENT.md). Apple Music, Instagram and any booking address are NOT verified: do not
 * add them until the owner confirms the exact URL. Placeholder links would ship broken buttons.
 */
export type SocialPlatform = "spotify" | "youtube" | "soundcloud" | "tiktok";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
}

export const socialLinks: readonly SocialLink[] = [
  {
    platform: "spotify",
    label: "Spotify",
    href: "https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw",
  },
  { platform: "youtube", label: "YouTube", href: "https://www.youtube.com/@akbarnawasunda" },
  { platform: "soundcloud", label: "SoundCloud", href: "https://soundcloud.com/akbarnawasunda" },
  { platform: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@akbarnawasunda" },
] as const;

export function getSocialLink(platform: SocialPlatform): SocialLink {
  const link = socialLinks.find((item) => item.platform === platform);
  if (!link) throw new Error(`Unknown social platform: ${platform}`);
  return link;
}

/** Primary call to action: the verified Spotify artist page. */
export const listenUrl = getSocialLink("spotify").href;
