import { anMark, editorialFrame, lockup, mascotFrame, portraitAlt, stageFrame } from "@/assets/web";
import type { VisualItem } from "@/components/media/VisualGrid";

/**
 * Visual archive: the six official assets that actually exist (portrait, night street frame, empty
 * stage, mascot, AN monogram, lockup). Shared by the homepage preview and /visuals so the two can
 * never drift.
 *
 * No stock photographs, no generated artwork, no video thumbnails pulled from YouTube: those are
 * not owner-supplied files, and the archive is only worth having if every tile is real. The
 * night-frequency hero file is the same photograph as the street frame, so it is not listed twice.
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
    caption: "Jalan malam",
    alt: "Akbar Nawasunda dari belakang di jalan kota dengan lampu neon",
  },
  {
    id: "editorial",
    src: editorialFrame.thumb.webp,
    full: editorialFrame.webp,
    caption: "Panggung",
    alt: "Panggung kosong dengan satu lampu sorot hangat dan lantai kayu",
  },
  {
    id: "mascot",
    src: mascotFrame.webp,
    caption: "Maskot",
    alt: "Karakter maskot AN putih dengan topi dan jaket biru bermonogram AN",
  },
];

/** Homepage shows the newest four in a 2x2 block; /visuals shows all six in a masonry. */
export const homepageVisuals = visualItems.slice(0, 4);
