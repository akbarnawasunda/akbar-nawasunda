import type { ReactNode } from "react";

import { GrainOverlay } from "@/components/effects/GrainOverlay";
import { BackSide, type SheetData } from "@/components/print/BackSide";
import { InkPress } from "@/components/print/InkPress";
import { LoadingCurtain } from "@/components/zine/LoadingCurtain";
import { PerfSwitches } from "@/components/zine/PerfSwitches";
import { MagneticCursor } from "@/components/zine/MagneticCursor";
import { TouchPress } from "@/components/zine/TouchPress";
import { RouteCurtain } from "@/components/zine/RouteCurtain";
import { SmoothScroll } from "@/components/zine/SmoothScroll";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader, type DrawerLatest } from "@/components/layout/SiteHeader";
import { resolveCover, resolveSleeve } from "@/content/covers";
import { releaseEyebrow, releases } from "@/content/releases";
import { buildLabel } from "@/config/build";
import { contactEmail, listenLinks, socialLinks } from "@/config/socials";
import { designAttributes } from "@/studio/design";
import { getPublicDesign } from "@/studio/public";

export const dynamic = "force-static";

/**
 * Shared chrome for the artist website: header, main landmark and footer. The wrapper carries only
 * approved design attributes (see src/studio/design.ts); CSS for each value lives in globals.css.
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
  /*
   * The verso is built here, once, from the same data the pages print: the catalogue with its real
   * links, the platforms, and what is still missing. Nothing on the back side is written by hand —
   * a back cover that drifts out of sync with the front is worse than no back cover.
   */
  const sheet: SheetData = {
    run: buildLabel,
    releases: releases.map((release, index) => ({
      index: String(index + 1).padStart(2, "0"),
      title: release.title,
      meta: releaseEyebrow(release),
      links: release.links,
    })),
    platforms: [...listenLinks, ...socialLinks].map((link) => ({ label: link.label, href: link.href })),
    email: contactEmail,
    open: [
      "Tujuh sampul asli masih menunggu `covers:fetch` di mesin pemilik.",
      "Teks halaman kebijakan privasi belum diserahkan.",
      "Milestone 2021–2023 belum dikonfirmasi.",
    ],
    totalLinks: releases.reduce((total, release) => total + release.links.length, 0),
  };

  return (
    <div className="site-root" {...designAttributes(design)}>
      <PerfSwitches />
      <LoadingCurtain />
      <SmoothScroll />
      <RouteCurtain />
      <MagneticCursor />
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
      <BackSide data={sheet} />
    </div>
  );
}
