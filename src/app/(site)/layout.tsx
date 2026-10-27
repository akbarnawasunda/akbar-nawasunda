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

/**
 * Round 40 (audit P1-5) — this used to be `force-dynamic`, to keep published design settings fresh,
 * and that one line made *every* page on the site uncacheable: twenty-one routes answering
 * `Cache-Control: private, no-cache`, a DB round-trip per visitor for a document that changes when
 * the owner presses publish and at no other time.
 *
 * The site was already written for the other contract — every publish action in
 * src/studio/actions.ts calls `revalidatePath("/", "layout")` (design, photos) or
 * `revalidatePath("/music/<slug>")` (releases), which did nothing at all on a dynamic route. So: the
 * layout is cached, and publishing invalidates it immediately. `revalidate` is only the safety net
 * for a write that happened without going through an action.
 */
export const revalidate = 3600;

/**
 * Shared chrome for the artist website: header, main landmark and footer. The wrapper carries only
 * approved design attributes (see src/studio/design.ts); CSS for each value lives in globals.css.
 *
 * Round 36 — the custom cursor is unmounted, on the owner's instruction. It was a dot and a ring
 * lerping after the pointer, and the lerp is exactly what "kursor rusak" describes: every frame the
 * decoration was a little behind the hand, so aiming at a 40px button felt like dragging something.
 * The reference site this page is measured against uses the pointer the operating system draws, at
 * the refresh rate of the display, with no JavaScript in the path — so that is what ships. Round 40
 * removed the component and its stylesheet, along with the four tokens they were the only readers
 * of: a comment is not a reason to keep a file nothing can reach.
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
