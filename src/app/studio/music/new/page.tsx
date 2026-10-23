import Link from "next/link";

import { requireAdmin } from "@/studio/auth";
import { releaseArtworkOptions } from "@/studio/artwork";
import { ReleaseEditorForm } from "@/studio/ui/ReleaseEditorForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rilis baru" };

export default async function NewRelease() {
  await requireAdmin();
  return (
    <>
      <p className={styles.muted}>
        <Link href="/studio/music" className={styles.link}>← Musik</Link>
      </p>
      <h1 className={styles.heading}>Rilis baru</h1>
      <p className={styles.lead}>Membuat draf privat. Belum ada yang publik sampai diterbitkan dari editor.</p>
      <ReleaseEditorForm mode="create" slug="" initial={null} artwork={releaseArtworkOptions()} publishedNow={false} unpublishedChanges={true} />
    </>
  );
}
