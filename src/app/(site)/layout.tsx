import type { ReactNode } from "react";

import { GrainOverlay } from "@/components/effects/GrainOverlay";
import { CursorDot } from "@/components/zine/CursorDot";
import { ScrollProgress } from "@/components/zine/ScrollProgress";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { designAttributes } from "@/studio/design";
import { getPublicDesign } from "@/studio/public";

// Design settings come from the published Studio state, so this layout is read per request.
export const dynamic = "force-dynamic";

/**
 * Shared chrome for the artist website: header, main landmark and footer. The wrapper carries only
 * approved design attributes (see src/studio/design.ts); CSS for each value lives in globals.css.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const design = await getPublicDesign();
  return (
    <div className="site-root" {...designAttributes(design)}>
      <ScrollProgress />
      <a href="#main" className="skip-link">
        Lompat ke konten
      </a>
      <SiteHeader />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter />
      <GrainOverlay />
      <CursorDot />
    </div>
  );
}
