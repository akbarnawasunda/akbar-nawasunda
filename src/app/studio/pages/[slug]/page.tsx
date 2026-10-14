import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/studio/auth";
import { isPageSlug, PAGE_CONFIG } from "@/studio/content-model";
import { getPageRecord } from "@/studio/store";
import { PageEditorForm } from "@/studio/ui/PageEditorForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: isPageSlug(slug) ? `Edit ${PAGE_CONFIG[slug].label}` : "Not found" };
}

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();

  const record = await getPageRecord(slug);
  const unpublished =
    record.published === null || JSON.stringify(record.published) !== JSON.stringify(record.draft);

  return (
    <>
      <p className={styles.muted}>
        <Link href="/studio/pages" className={styles.link}>← Pages</Link>
      </p>
      <h1 className={styles.heading}>Edit {PAGE_CONFIG[slug].label}</h1>
      <p className={styles.lead}>
        Changes stay private until you publish. The public page at <code>{PAGE_CONFIG[slug].path}</code> shows the last published version only.
      </p>

      <PageEditorForm slug={slug} initial={record.draft} initialUnpublishedChanges={unpublished} />

      <section className={styles.section} aria-label="Preview">
        <div className={styles.actions}>
          <Link href={`/studio/preview/${slug}`} className={styles.link}>Preview draft</Link>
          {record.published ? <Link href={PAGE_CONFIG[slug].path} className={styles.link}>View published page</Link> : null}
        </div>
      </section>
    </>
  );
}
