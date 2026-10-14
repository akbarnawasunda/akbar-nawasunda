import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionsView } from "@/components/content/SectionsView";
import { requireAdmin } from "@/studio/auth";
import { isPageSlug, PAGE_CONFIG } from "@/studio/content-model";
import { getPublishedReleases } from "@/studio/public";
import { getPageRecord } from "@/studio/store";
import styles from "@/studio/ui/studio.module.css";
import content from "@/components/content/content.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Draft preview", robots: { index: false, follow: false } };

/**
 * Admin-only preview of a page DRAFT, clearly separated from the public page by the banner.
 * Music lists show published releases, exactly as on the public site.
 */
export default async function DraftPreview({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();

  const record = await getPageRecord(slug);
  const doc = record.draft;
  const releases = await getPublishedReleases();
  const hidden = doc.sections.filter((section) => !section.visible).length;

  return (
    <>
      <div className={styles.previewBanner} role="status">
        Draft preview of {PAGE_CONFIG[slug].label}. Only signed-in administrators can see this. It is not published.{" "}
        <Link href={`/studio/pages/${slug}`} className={styles.link}>Back to editor</Link>
      </div>
      <article className={styles.preview}>
        <p className={styles.muted}>{PAGE_CONFIG[slug].label} · draft</p>
        {PAGE_CONFIG[slug].fields.title ? (
          <h1 className={`${styles.heading} page-title`} style={{ marginTop: "0.5rem" }}>{doc.title}</h1>
        ) : null}
        {doc.lead ? <p className={styles.lead} style={{ marginBottom: "2rem" }}>{doc.lead}</p> : null}
        <div className={content.body}>
          <SectionsView sections={doc.sections} releases={releases} />
        </div>
        {hidden > 0 ? (
          <p className={styles.hint} style={{ marginTop: "2rem" }}>
            {hidden} hidden section{hidden === 1 ? " is" : "s are"} not shown here or on the public site.
          </p>
        ) : null}
      </article>
    </>
  );
}
