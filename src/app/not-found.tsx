import { NotFoundView } from "@/components/content/NotFoundView";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { notFoundMetadata } from "@/lib/not-found";

/**
 * Root 404: this file answers URLs that match no route at all, so it renders outside the (site)
 * group and has to bring the chrome with it. Without this file Next falls back to its own
 * unstyled white "404 — This page could not be found", which is what shipped before.
 */
export const metadata = notFoundMetadata;

export default function NotFound() {
  return (
    <div className="site-root">
      <a href="#main" className="skip-link">
        Lompat ke konten
      </a>
      <SiteHeader />
      <main id="main" className="site-main">
        <NotFoundView />
      </main>
      <SiteFooter />
    </div>
  );
}
