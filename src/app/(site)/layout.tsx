import type { ReactNode } from "react";

import { GrainOverlay } from "@/components/effects/GrainOverlay";
import { InkPress } from "@/components/print/InkPress";
import { LoadingCurtain } from "@/components/zine/LoadingCurtain";
import { PerfSwitches } from "@/components/zine/PerfSwitches";
import { ImageFade } from "@/components/zine/ImageFade";
import { TouchPress } from "@/components/zine/TouchPress";
import { RouteCurtain } from "@/components/zine/RouteCurtain";
import { SmoothScroll } from "@/components/zine/SmoothScroll";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader, type DrawerLatest } from "@/components/layout/SiteHeader";
import { resolveCover, resolveSleeve } from "@/content/covers";
import { releaseEyebrow, releases } from "@/content/releases";
import { designAttributes } from "@/studio/design";
import { getPublicDesign } from "@/studio/public";

// Design settings come from the published Studio state, so this layout is read per request.
export const dynamic = "force-dynamic";

/**
 * Shared chrome for the artist website: header, main landmark and footer. The wrapper carries only
 * approved design attributes (see src/studio/design.ts); CSS for each value lives in globals.css.
 *
 * Round 36 — the custom cursor is unmounted, on the owner's instruction. It was a dot and a ring
 * lerping after the pointer, and the lerp is exactly what "kursor rusak" describes: every frame the
 * decoration was a little behind the hand, so aiming at a 40px button felt like dragging something.
 * The reference site this page is measured against uses the pointer the operating system draws, at
 * the refresh rate of the display, with no JavaScript in the path — so that is what ships. The
 * component file and its stylesheet are still in the tree (with the round-35 pointer-events and
 * touch-disarm fixes in them) should the owner ever want it back; nothing imports it.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const design = await getPublicDesign();

  /*
   * The phone drawer shows the newest release rather than only linking to the catalogue. It is the
   * owner's own first entry, not a computed "latest" by date: the list order is theirs, and half the
   * catalogue has no confirmed date to sort by.
   */
  const newest = releases[0];
  const latest: DrawerLatest | null = newest
    ? {
        title: newest.title,
        href: `/music/${newest.slug}`,
        meta: releaseEyebrow(newest),
        // Real artwork first, then the generated sleeve — the same waterfall the catalogue uses.
        cover: newest.cover ?? resolveCover(newest.slug) ?? resolveSleeve(newest.slug),
      }
    : null;

  return (
    <div className="site-root" {...designAttributes(design)}>
      <PerfSwitches />
      <LoadingCurtain />
      <SmoothScroll />
      <RouteCurtain />
      <ImageFade />
      <TouchPress />
      <a href="#main" className="skip-link">
        Lompat ke konten
      </a>
      <SiteHeader latest={latest} />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter />
      <GrainOverlay />
      <InkPress />
    </div>
  );
}
