import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/studio/auth";
import { releaseArtworkOptions } from "@/studio/artwork";
import { getReleaseRecord } from "@/studio/store";
import { ReleaseEditorForm } from "@/studio/ui/ReleaseEditorForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Edit release ${slug}` };
}

export default async function EditRelease({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const { created } = await searchParams;
  const record = await getReleaseRecord(slug);
  if (!record) notFound();

  const unpublished = record.published === null || JSON.stringify(record.published) !== JSON.stringify(record.draft);

  return (
    <>
      <p className={styles.muted}>
        <Link href="/studio/music" className={styles.link}>← Music</Link>
      </p>
      <h1 className={styles.heading}>{record.draft?.title || "Release"}</h1>
      {created === "1" ? (
        <p role="status" className={`${styles.notice} ${styles.noticeOk}`}>Draft created. It is private until you publish.</p>
      ) : null}
      {record.draft ? (
        <ReleaseEditorForm
          mode="edit"
          slug={slug}
          initial={record.draft}
          artwork={releaseArtworkOptions()}
          publishedNow={record.published !== null}
          unpublishedChanges={unpublished}
        />
      ) : (
        <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>
          The stored draft for this release could not be read, so it cannot be edited here. Contact the site developer.
        </p>
      )}
    </>
  );
}
