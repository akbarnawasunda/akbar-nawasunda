import { notFound } from "next/navigation";

import { requireAdmin } from "@/studio/auth";
import { isPageSlug, PAGE_LABELS } from "@/studio/content-model";
import { getPageRecord } from "@/studio/store";
import { PageDocumentBody } from "@/components/content/PageDocumentBody";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Draft preview", robots: { index: false, follow: false } };

/** Admin-only preview of the unpublished draft. Never linked from the public site. */
export default async function DraftPreview({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();

  const record = await getPageRecord(slug);
  const doc = record.draft;

  return (
    <>
      <div className={styles.previewBanner} role="status">
        Draft preview. Only signed-in administrators can see this. It is not published.
      </div>
      <article className={styles.preview}>
        <p className={styles.muted}>{PAGE_LABELS[slug]} · draft</p>
        <h1 className={styles.heading} style={{ textTransform: "uppercase", marginTop: "0.5rem" }}>{doc.title}</h1>
        {doc.lead ? <p className={styles.lead} style={{ marginBottom: "2rem" }}>{doc.lead}</p> : null}
        <PageDocumentBody doc={doc} />
      </article>
    </>
  );
}
