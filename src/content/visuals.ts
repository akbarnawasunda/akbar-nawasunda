import {
  anMarkLarge,
  editorialFrame,
  lockupLarge,
  mascotFrame,
  portraitAlt,
  stageFrame,
} from "@/assets/web";
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
/**
 * Langkah 3k — sizes and shapes are now carried by the item, and every tile is fed the largest file
 * that actually exists.
 *
 * What was wrong: the rail rendered each tile into a 439 x 549 box (`aspect-ratio: 4 / 5`,
 * `object-fit: cover`) and every item was fed a file built for a smaller job, so at 2x the browser
 * was stretching between 1.5x and 3.6x. The 4:5 crop is also wrong for the two landscape marks: an
 * AN monogram and the full lockup have their own aspect ratio, and cutting a 1.55:1 logo to 4:5 was
 * cropping nothing but was still declaring the wrong box.
 *
 * So: `width`/`height` are the real pixel size of the file, `shape` says whether the *frame* is the
 * photograph ratio (4:5, cropped deliberately) or the artwork's own ratio (landscape marks, shown
 * whole). The rail reads both; nothing is forced into one box any more.
 *
 * Residual, and honest: `mascot` has no larger source than 420x420 anywhere in the repository, so it
 * is still stretched — flagged to the owner rather than upscaled into a blurry file.
 */
export const visualItems: readonly VisualItem[] = [
  {
    id: "portrait",
    src: "/media/portrait-960.webp",
    full: "/media/portrait-960.webp",
    width: 960,
    height: 1199,
    caption: "Potret resmi",
    alt: portraitAlt,
  },
  {
    id: "mark",
    src: anMarkLarge.src,
    width: anMarkLarge.width,
    height: anMarkLarge.height,
    shape: "landscape",
    caption: "Monogram AN",
    alt: "Monogram AN Akbar Nawasunda, garis putih dengan ujung biru",
    onSurface: true,
  },
  {
    id: "lockup",
    src: lockupLarge.src,
    width: lockupLarge.width,
    height: lockupLarge.height,
    shape: "landscape",
    caption: "Lockup resmi",
    alt: "Lockup Akbar Nawasunda RMX dengan monogram dan wordmark",
    onSurface: true,
  },
  {
    id: "stage",
    src: stageFrame.hires.webp,
    full: stageFrame.webp,
    width: stageFrame.hires.width,
    height: stageFrame.hires.height,
    caption: "Jalan malam",
    alt: "Akbar Nawasunda dari belakang di jalan kota dengan lampu neon",
  },
  {
    id: "editorial",
    src: editorialFrame.webp,
    full: editorialFrame.webp,
    width: editorialFrame.width,
    height: editorialFrame.height,
    caption: "Panggung",
    alt: "Panggung kosong dengan satu lampu sorot hangat dan lantai kayu",
  },
  {
    id: "mascot",
    src: mascotFrame.webp,
    width: mascotFrame.width,
    height: mascotFrame.height,
    caption: "Maskot",
    alt: "Karakter maskot AN putih dengan topi dan jaket biru bermonogram AN",
  },
];

/** Homepage shows the newest four in a 2x2 block; /visuals shows all six in a masonry. */
export const homepageVisuals = visualItems.slice(0, 4);
