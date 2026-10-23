import { anMark, lockup, portraitAlt, stageFrame } from "@/assets/web";
import type { VisualItem } from "@/components/media/VisualGrid";

/**
 * Visual archive: the four official assets that actually exist today (portrait, stage frame, AN
 * monogram, lockup). Shared by the homepage preview and /visuals so the two can never drift.
 *
 * No stock photographs, no generated artwork, no video thumbnails pulled from YouTube: those are
 * not owner-supplied files, and the archive is only worth having if every tile is real.
 */
export const visualItems: readonly VisualItem[] = [
  {
    id: "portrait",
    src: "/media/portrait-480.webp",
    full: "/media/portrait-960.webp",
    caption: "Potret resmi",
    alt: portraitAlt,
  },
  {
    id: "mark",
    src: anMark.src,
    caption: "Monogram AN",
    alt: "Monogram AN Akbar Nawasunda, garis putih dengan ujung biru",
    onSurface: true,
  },
  {
    id: "lockup",
    src: lockup.src,
    caption: "Lockup resmi",
    alt: "Lockup Akbar Nawasunda RMX dengan monogram dan wordmark",
    onSurface: true,
  },
  {
    id: "stage",
    src: stageFrame.thumb.webp,
    full: stageFrame.webp,
    caption: "Panggung",
    alt: "Akbar Nawasunda dari belakang di jalan kota dengan lampu neon",
  },
];

/** Homepage shows the same four assets in a 2x2 block; /visuals shows them in a masonry. */
export const homepageVisuals = visualItems;
