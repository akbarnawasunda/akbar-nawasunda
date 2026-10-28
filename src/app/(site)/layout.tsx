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
import { AudioHUD } from "@/components/ui/AudioHUD";
import { resolveCover, resolveSleeve } from "@/content/covers";
import { releaseEyebrow, releases } from "@/content/releases";
import { buildLabel } from "@/config/build";
import { contactEmail, listenLinks, listenUrl, socialLinks } from "@/config/socials";
import { designAttributes, DEFAULT_DESIGN } from "@/studio/design";

// Static layout — no database calls. Design attributes use defaults; Studio preview
// overrides are handled via the preview route, not the public layout.
export const dynamic = "force-static";

/**
 * Shared chrome for the artist website: header, main landmark and footer.
 * The wrapper carries approved design attributes (see src/studio/design.ts);
 * CSS for each value lives in globals.css.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  const design = DEFAULT_DESIGN;

  /* The phone drawer shows the newest release rather than only linking to the catalogue.
     It is the owner's own first entry, not a computed "latest" by date. */
  const newest = releases[0];
  const latest: DrawerLatest | null = newest
    ? {
        title: newest.title,
        href: `/music/${newest.slug}`,
        meta: releaseEyebrow(newest),
        cover: newest.cover ?? resolveCover(newest.slug) ?? resolveSleeve(newest.slug),
      }
    : null;

  /* The verso is built from the same data the pages print: the catalogue with its real
     links, the platforms, and what is still missing. */
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
      {/* Round 33: the deck is driven by the same verified first release as the header drawer.
          Mounting it with no props made it return null on every route — the HUD never existed. */}
      <AudioHUD
        trackTitle={newest?.title ?? "Arsip Nawasunda"}
        trackHref={newest ? `/music/${newest.slug}` : "/music"}
        listenHref={listenUrl}
      />
      <SiteFooter />
      <GrainOverlay />
      <InkPress />
      <BackSide data={sheet} />
    </div>
  );
}