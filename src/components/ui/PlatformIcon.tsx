import type { SVGProps } from "react";

/**
 * Simplified monochrome platform marks, drawn in-house at 20px for the platform row.
 *
 * They are deliberately geometric reductions, not reproductions of the official brand assets: the
 * real logos are trademarks with usage rules, and redrawing them badly is worse than a clean
 * abstraction. When the owner supplies the official SVGs, replace the paths here and nothing else
 * changes (D-031).
 */
type IconProps = SVGProps<SVGSVGElement>;

function Frame({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

function Spotify(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M7.4 9.1c3.2-.9 6.6-.6 9.2 1" />
      <path d="M8 12.1c2.6-.7 5.4-.4 7.5.8" />
      <path d="M8.6 15c2.1-.55 4.3-.3 6 .65" />
    </Frame>
  );
}

function YouTube(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.4 9.4l4.4 2.6-4.4 2.6z" fill="currentColor" stroke="none" />
    </Frame>
  );
}

function SoundCloud(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3 15.2v-3" />
      <path d="M6 16.4V10" />
      <path d="M9 17V8.2" />
      <path d="M12 17V6.6" />
      <path d="M15 17v-6.1c1-1 2.2-1.5 3.4-1.2 1.5.35 2.6 1.6 2.6 3.1 0 1.7-1.35 3.1-3 3.1H15" />
    </Frame>
  );
}

function TikTok(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M14.2 3.5v10.9a3.15 3.15 0 1 1-3.15-3.15" />
      <path d="M14.2 5.4c.9 1.7 2.4 2.6 4.3 2.7" />
    </Frame>
  );
}

export const platformIcons = {
  spotify: Spotify,
  youtube: YouTube,
  soundcloud: SoundCloud,
  tiktok: TikTok,
} as const;

export type PlatformKey = keyof typeof platformIcons;
