import type { SVGProps } from "react";

/**
 * Simplified monochrome platform marks, drawn in-house at 20px.
 *
 * They are deliberately geometric reductions, not reproductions of the official brand assets: the
 * real logos are trademarks with usage rules, and redrawing them badly is worse than a clean
 * abstraction. When the owner supplies the official SVGs, replace the paths here and nothing else
 * changes (D-031).
 *
 * The set covers the ten listening services and the four social profiles in `src/config/socials.ts`.
 * Every mark uses the same 24px grid, 1.4 stroke and currentColor, so a row of ten still reads as
 * one system rather than fourteen logos in a fight.
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

/** A note inside a rounded square: the shape Apple Music uses for "library". */
function AppleMusic(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5" />
      <path d="M10.4 16.6a1.9 1.9 0 1 0 1.9 1.9V8.2l4.2-.9v6.2" />
      <path d="M12.3 10.4l4.2-.9" />
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

/** Three stacked rows of bars — the Deezer equaliser grid, reduced. */
function Deezer(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3.5 7.5h4M9.5 7.5h4M15.5 7.5h4" />
      <path d="M3.5 12h4M9.5 12h4M15.5 12h4" />
      <path d="M9.5 16.5h4M15.5 16.5h4" />
    </Frame>
  );
}

/** A waveform under an arc: listening, without borrowing Amazon's smile. */
function Amazon(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 13.5V10" />
      <path d="M7.5 16V8" />
      <path d="M11 17.5V6.5" />
      <path d="M14.5 15.5V9" />
      <path d="M18 12.5V11" />
      <path d="M4.5 19.5c4.6 1.6 10.4 1.6 15 0" />
    </Frame>
  );
}

/** Tidal's mark is a diamond; the inner diamond keeps it from reading as a generic gem. */
function Tidal(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 3.5l8.5 8.5L12 20.5 3.5 12z" />
      <path d="M12 8.6l3.4 3.4-3.4 3.4-3.4-3.4z" />
    </Frame>
  );
}

/** Rising bars inside a rounded square. */
function Anghami(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="5" />
      <path d="M7.5 15.5v-3" />
      <path d="M12 15.5V8.5" />
      <path d="M16.5 15.5v-5" />
    </Frame>
  );
}

/** A Q: circle plus its tail. */
function Qobuz(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="11.2" cy="11.2" r="7.7" />
      <path d="M14.6 14.6l4.4 4.4" />
    </Frame>
  );
}

/** Two interlocking arcs with ticks — the "listening" pulse, reduced. */
function Shazam(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M8.2 5.4a6 6 0 0 0 0 13.2" />
      <path d="M15.8 5.4a6 6 0 0 1 0 13.2" />
      <path d="M9.6 9.2l4.8 2.8-4.8 2.8" />
    </Frame>
  );
}

function Instagram(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" stroke="none" />
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

function X(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4.5 4.5l15 15" />
      <path d="M19.5 4.5l-15 15" />
    </Frame>
  );
}

function Facebook(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M14.6 8.2h-1.5a2 2 0 0 0-2 2v9" />
      <path d="M9.7 12.6h4.6" />
    </Frame>
  );
}

export const platformIcons = {
  spotify: Spotify,
  appleMusic: AppleMusic,
  youtube: YouTube,
  soundcloud: SoundCloud,
  deezer: Deezer,
  amazon: Amazon,
  tidal: Tidal,
  anghami: Anghami,
  qobuz: Qobuz,
  shazam: Shazam,
  instagram: Instagram,
  tiktok: TikTok,
  x: X,
  facebook: Facebook,
} as const;

export type PlatformKey = keyof typeof platformIcons;
