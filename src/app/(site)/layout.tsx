import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteConfig } from "@/config/site";
import { resolveArtistIdentity } from "@/studio/artist-settings";
import { designAttributes } from "@/studio/design";
import { getPublicArtistSettings, getPublicDesign } from "@/studio/public";

// Design and artist settings come from the published Studio state, so this layout is read per request.
export const dynamic = "force-dynamic";

/**
 * Shared chrome for the artist website: header, main landmark and footer. The wrapper carries only
 * approved design attributes (see src/studio/design.ts); CSS for each value lives in globals.css.
 * Name, role line and social links come from the published Artist settings; blank fields keep the
 * current site wording, and nothing is shown until the owner publishes it.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [design, artist] = await Promise.all([getPublicDesign(), getPublicArtistSettings()]);
  const identity = resolveArtistIdentity(artist, { name: siteConfig.name, role: siteConfig.role });
  return (
    <div className="site-root" {...designAttributes(design)}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader name={identity.name} />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter identity={identity} />
    </div>
  );
}
