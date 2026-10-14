/**
 * Asset manifest: the single registry for files in AKBAR-NAWASUNDA-ASSETS/.
 *
 * - Originals stay in AKBAR-NAWASUNDA-ASSETS/. Nothing is copied into public/.
 * - Each `image` is a static import, so width/height/src come from the real file at build time.
 * - Roles and statuses are decisions recorded from visual inspection in the audit. Filenames were
 *   not trusted on their own: where a name disagrees with the content, the note says so.
 * - Run `node scripts/check-assets.mjs` to verify the directory against asset-checksums.json.
 */
import type { StaticImageData } from "next/image";

import akbarLogo from "../../AKBAR-NAWASUNDA-ASSETS/akbar-logo.webp";
import akbarLogoFallback from "../../AKBAR-NAWASUNDA-ASSETS/akbar-logo-fallback.webp";
import akbarRmxMark from "../../AKBAR-NAWASUNDA-ASSETS/akbar-rmx-mark.webp";
import akbarRmxMarkFallback from "../../AKBAR-NAWASUNDA-ASSETS/akbar-rmx-mark-fallback.jpg";
import akbarFavicon from "../../AKBAR-NAWASUNDA-ASSETS/akbar-favicon.jpg";
import akbarMascotWebp from "../../AKBAR-NAWASUNDA-ASSETS/akbar-mascot-doodle.webp";
import portraitFullWebp from "../../AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-official-portrait.webp";
import portraitFullJpg from "../../AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-official-portrait.jpg";
import portrait1000 from "../../AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-official-portrait-1000.webp";
import portraitOptimized from "../../AKBAR-NAWASUNDA-ASSETS/akbar-official-portrait-optimized.webp";
import portraitStandard from "../../AKBAR-NAWASUNDA-ASSETS/akbar-official-portrait.webp";
import heroDesktop from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-hero.webp";
import heroDesktopOptimized from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-hero-optimized.webp";
import heroMobile from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-hero-mobile.webp";
import heroMobileOptimized from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-hero-mobile-optimized.webp";
import stageDesktop from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-stage.webp";
import stageDesktopOptimized from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-stage-optimized.webp";
import stageMobileOptimized from "../../AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-stage-mobile-optimized.webp";
import editorialStageBg from "../../AKBAR-NAWASUNDA-ASSETS/akbar-editorial-stage-bg.webp";
import futureRed from "../../AKBAR-NAWASUNDA-ASSETS/akbar-future-red.webp";
import futureYellow from "../../AKBAR-NAWASUNDA-ASSETS/akbar-future-yellow.webp";
import socialPreview from "../../AKBAR-NAWASUNDA-ASSETS/akbar-social-preview.webp";
import socialPreviewOptimized from "../../AKBAR-NAWASUNDA-ASSETS/akbar-social-preview-optimized.webp";
import faviconPng from "../../AKBAR-NAWASUNDA-ASSETS/favicon.png";
import logoAnPng from "../../AKBAR-NAWASUNDA-ASSETS/logo-an.png";

/** What the asset is for. An asset can be approved for several roles. */
export type AssetRole =
  | "primary-logo"
  | "rmx-identity"
  | "favicon-source"
  | "portrait"
  | "hero"
  | "hero-mobile"
  | "stage-background"
  | "mascot"
  | "social-preview"
  | "release-artwork";

/** How the file relates to the others. */
export type AssetKind = "original" | "optimized" | "variant" | "fallback" | "duplicate" | "unclassified" | "invalid";

/**
 * - approved:  verified, safe to use on the public site for the listed roles
 * - candidate: suitable with a stated limitation (see notes); needs confirmation before use
 * - hold:      do not publish until provenance or rights are confirmed
 * - invalid:   not a usable asset
 */
export type AssetStatus = "approved" | "candidate" | "hold" | "invalid";

export interface AssetEntry {
  /** Stable identifier. Code refers to assets by this id, never by filename. */
  id: string;
  /** Path relative to AKBAR-NAWASUNDA-ASSETS/. */
  file: string;
  /** Variant group. Files in the same group depict the same subject or artwork. */
  group: string;
  kind: AssetKind;
  status: AssetStatus;
  roles: readonly AssetRole[];
  /** Alt text for informative use. Purely decorative assets set `decorative: true` instead. */
  alt?: string;
  decorative?: boolean;
  /** Set when the file is byte-identical to another entry. */
  duplicateOf?: string;
  notes?: string;
  /** Build-time import; undefined for files that are not images. */
  image?: StaticImageData;
}

export const assets = [
  // Logo: monogram
  {
    id: "logo-monogram",
    file: "akbar-logo.webp",
    group: "logo-monogram",
    kind: "original",
    status: "candidate",
    roles: ["primary-logo"],
    alt: "Akbar Nawasunda monogram",
    notes: "AN monogram on an opaque white background. A transparent version is needed before use on the dark site.",
    image: akbarLogo,
  },
  // RMX identity lockups (same artwork, several encodings)
  {
    id: "rmx-lockup",
    file: "akbar-rmx-mark.webp",
    group: "rmx-lockup",
    kind: "original",
    status: "candidate",
    roles: ["rmx-identity"],
    alt: "Akbar Nawasunda RMX logo",
    notes: "Wordmark with RMX tag on an opaque white background. Needs a transparent version for dark use.",
    image: akbarRmxMark,
  },
  {
    id: "rmx-lockup-webp-fallback",
    file: "akbar-logo-fallback.webp",
    group: "rmx-lockup",
    kind: "variant",
    status: "candidate",
    roles: ["rmx-identity"],
    alt: "Akbar Nawasunda RMX logo",
    notes: "Name suggests a logo fallback, but the content is the RMX wordmark, not the monogram.",
    image: akbarLogoFallback,
  },
  {
    id: "rmx-lockup-jpg-fallback",
    file: "akbar-rmx-mark-fallback.jpg",
    group: "rmx-lockup",
    kind: "fallback",
    status: "candidate",
    roles: ["rmx-identity"],
    alt: "Akbar Nawasunda RMX logo",
    notes: "JPEG fallback of the RMX wordmark. Byte-identical to logo-an.png.",
    image: akbarRmxMarkFallback,
  },
  {
    id: "logo-an-png",
    file: "logo-an.png",
    group: "rmx-lockup",
    kind: "duplicate",
    status: "invalid",
    roles: [],
    duplicateOf: "rmx-lockup-jpg-fallback",
    notes: "Name says AN monogram, but it is the RMX wordmark, and the content is JPEG under a .png extension. Do not reference it; kept as found.",
    image: logoAnPng,
  },
  // Favicon
  {
    id: "favicon-source",
    file: "akbar-favicon.jpg",
    group: "favicon",
    kind: "original",
    status: "approved",
    roles: ["favicon-source"],
    notes: "512x512 AN monogram, opaque. Source for the generated app icons in src/app (icon.png, apple-icon.png).",
    image: akbarFavicon,
  },
  {
    id: "favicon-png",
    file: "favicon.png",
    group: "favicon",
    kind: "duplicate",
    status: "invalid",
    roles: [],
    duplicateOf: "favicon-source",
    notes: "Byte-identical to akbar-favicon.jpg, but the content is JPEG under a .png extension. Do not reference it; kept as found.",
    image: faviconPng,
  },
  // Mascot
  {
    id: "mascot-webp",
    file: "akbar-mascot-doodle.webp",
    group: "mascot",
    kind: "original",
    status: "approved",
    roles: ["mascot"],
    decorative: true,
    notes: "Cartoon character in a blue cap with the AN mark, on a dark background. Decorative only.",
    image: akbarMascotWebp,
  },
  {
    id: "mascot-avif",
    file: "akbar-mascot-doodle.avif",
    group: "mascot",
    kind: "variant",
    status: "approved",
    roles: ["mascot"],
    decorative: true,
    notes: "AVIF encoding of the same mascot (valid AVIF, reported as HEIC by ImageMagick). Smaller than the WebP. Not imported: the current Turbopack build does not support AVIF, so this entry is file-only.",
  },
  // Portrait (one photograph, several sizes)
  {
    id: "portrait-optimized",
    file: "akbar-official-portrait-optimized.webp",
    group: "portrait",
    kind: "optimized",
    status: "approved",
    roles: ["portrait"],
    alt: "Akbar Nawasunda in a dark jacket, standing in a dimly lit studio with a purple light behind him",
    notes: "Web variant, 720x900. Recommended for the public site.",
    image: portraitOptimized,
  },
  {
    id: "portrait-standard",
    file: "akbar-official-portrait.webp",
    group: "portrait",
    kind: "variant",
    status: "approved",
    roles: [],
    notes: "Same 720x900 crop as portrait-optimized, larger file. Superseded by the optimized variant.",
    image: portraitStandard,
  },
  {
    id: "portrait-1000",
    file: "akbar-nawasunda-official-portrait-1000.webp",
    group: "portrait",
    kind: "variant",
    status: "approved",
    roles: [],
    alt: "Akbar Nawasunda in a dark jacket, standing in a dimly lit studio with a purple light behind him",
    notes: "800x1000 crop of the same photograph. A higher-resolution option for large layouts.",
    image: portrait1000,
  },
  {
    id: "portrait-full-webp",
    file: "akbar-nawasunda-official-portrait.webp",
    group: "portrait",
    kind: "original",
    status: "approved",
    roles: [],
    alt: "Akbar Nawasunda in a dark jacket, standing in a dimly lit studio with a purple light behind him",
    notes: "Full-resolution 1122x1402 master for print and EPK use. Not for web delivery.",
    image: portraitFullWebp,
  },
  {
    id: "portrait-full-jpg",
    file: "akbar-nawasunda-official-portrait.jpg",
    group: "portrait",
    kind: "original",
    status: "approved",
    roles: [],
    notes: "Full-resolution 1122x1402 JPEG of the same photograph, 1.26 MB. Kept as a master copy.",
    image: portraitFullJpg,
  },
  // Night Frequency hero (artwork with baked-in text; not used by the homepage yet)
  {
    id: "hero-optimized",
    file: "akbar-night-frequency-hero-optimized.webp",
    group: "night-frequency-hero",
    kind: "optimized",
    status: "candidate",
    roles: ["hero"],
    alt: "Akbar Nawasunda seen from behind in a dark jacket in a neon-lit city street, with the name in stylised lettering",
    notes: "1800x1800, 665 KB. The artwork includes its own name lettering, which would repeat the homepage name.",
    image: heroDesktopOptimized,
  },
  {
    id: "hero",
    file: "akbar-night-frequency-hero.webp",
    group: "night-frequency-hero",
    kind: "original",
    status: "candidate",
    roles: [],
    notes: "Original 1800x1800 master of the hero artwork, 810 KB. Superseded by the optimized variant.",
    image: heroDesktop,
  },
  {
    id: "hero-mobile-optimized",
    file: "akbar-night-frequency-hero-mobile-optimized.webp",
    group: "night-frequency-hero",
    kind: "optimized",
    status: "candidate",
    roles: ["hero-mobile"],
    alt: "Akbar Nawasunda seen from behind in a dark jacket in a neon-lit city street",
    notes: "900x900, 155 KB. Mobile variant of the hero artwork.",
    image: heroMobileOptimized,
  },
  {
    id: "hero-mobile",
    file: "akbar-night-frequency-hero-mobile.webp",
    group: "night-frequency-hero",
    kind: "variant",
    status: "candidate",
    roles: [],
    notes: "Unoptimized 900x900 mobile variant, 161 KB. Superseded by the optimized variant.",
    image: heroMobile,
  },
  // Stage imagery
  {
    id: "stage-optimized",
    file: "akbar-night-frequency-stage-optimized.webp",
    group: "night-frequency-stage",
    kind: "optimized",
    status: "candidate",
    roles: ["stage-background"],
    alt: "Akbar Nawasunda seen from behind in a dark jacket in a neon-lit city street",
    notes: "1440x1440, 426 KB. Contains a figure, so it is not a neutral background.",
    image: stageDesktopOptimized,
  },
  {
    id: "stage",
    file: "akbar-night-frequency-stage.webp",
    group: "night-frequency-stage",
    kind: "original",
    status: "candidate",
    roles: [],
    notes: "Original 1440x1440 master, 468 KB. Superseded by the optimized variant.",
    image: stageDesktop,
  },
  {
    id: "stage-mobile-optimized",
    file: "akbar-night-frequency-stage-mobile-optimized.webp",
    group: "night-frequency-stage",
    kind: "optimized",
    status: "candidate",
    roles: [],
    notes: "900x900, 138 KB. Mobile variant of the stage artwork.",
    image: stageMobileOptimized,
  },
  {
    id: "editorial-stage-bg",
    file: "akbar-editorial-stage-bg.webp",
    group: "editorial-stage",
    kind: "original",
    status: "approved",
    roles: ["stage-background"],
    decorative: true,
    notes: "1600x900 empty stage with a single warm light and no people. The neutral background of the set; suitable for decorative use.",
    image: editorialStageBg,
  },
  // Illustrated posters: subject and provenance not established
  {
    id: "future-red",
    file: "akbar-future-red.webp",
    group: "future-posters",
    kind: "unclassified",
    status: "hold",
    roles: [],
    notes: "667x1000 stylised poster of a figure with the AN mark. Provenance and rights are not confirmed, and the file does not establish the subject. Hold until confirmed.",
    image: futureRed,
  },
  {
    id: "future-yellow",
    file: "akbar-future-yellow.webp",
    group: "future-posters",
    kind: "unclassified",
    status: "hold",
    roles: [],
    notes: "800x1000 stylised poster of a figure with the AN mark. Provenance and rights are not confirmed. Hold until confirmed.",
    image: futureYellow,
  },
  // Social sharing preview
  {
    id: "social-preview-optimized",
    file: "akbar-social-preview-optimized.webp",
    group: "social-preview",
    kind: "optimized",
    status: "candidate",
    roles: ["social-preview"],
    alt: "Akbar Nawasunda RMX promotional graphic",
    notes: "1000x1000 square, which suits the summary card, not a 1.91:1 large card. The image shows a URL, social icons and genre text; confirm each before publishing.",
    image: socialPreviewOptimized,
  },
  {
    id: "social-preview",
    file: "akbar-social-preview.webp",
    group: "social-preview",
    kind: "original",
    status: "candidate",
    roles: [],
    notes: "Original 1000x1000 master, 166 KB. Superseded by the optimized variant.",
    image: socialPreview,
  },
  // Not an asset
  {
    id: "edan",
    file: "edan",
    group: "unknown",
    kind: "invalid",
    status: "invalid",
    roles: [],
    notes: "1 byte: a single newline, no extension, not an image. Probably created by mistake through the GitHub web uploader. Kept as found; confirm before deleting.",
  },
] as const satisfies readonly AssetEntry[];

export type AssetId = (typeof assets)[number]["id"];

export function getAsset(id: AssetId): AssetEntry {
  const entry = assets.find((asset) => asset.id === id);
  if (!entry) throw new Error(`Unknown asset id: ${id}`);
  return entry;
}

/** Image entries ready for next/image. Throws at build time if an entry is not an image. */
export function getImage(id: AssetId): StaticImageData {
  const entry = getAsset(id);
  if (!entry.image) throw new Error(`Asset ${id} is not an image`);
  return entry.image;
}
