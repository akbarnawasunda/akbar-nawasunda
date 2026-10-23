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
  return { title: isPageSlug(slug) ? `Sunting ${PAGE_CONFIG[slug].label}` : "Tidak ditemukan" };
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
        <Link href="/studio/pages" className={styles.link}>← Halaman</Link>
      </p>
      <h1 className={styles.heading}>Sunting {PAGE_CONFIG[slug].label}</h1>
      <p className={styles.lead}>
        Perubahan tetap privat sampai diterbitkan. Halaman publik di <code>{PAGE_CONFIG[slug].path}</code> hanya menampilkan versi terbit terakhir.
      </p>

      <PageEditorForm slug={slug} initial={record.draft} initialUnpublishedChanges={unpublished} />

      <section className={styles.section} aria-label="Pratinjau">
        <div className={styles.actions}>
          <Link href={`/studio/preview/${slug}`} className={styles.link}>Pratinjau draf</Link>
          {record.published ? <Link href={PAGE_CONFIG[slug].path} className={styles.link}>Lihat halaman terbit</Link> : null}
        </div>
      </section>
    </>
  );
}
