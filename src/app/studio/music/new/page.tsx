import Link from "next/link";

import { requireAdmin } from "@/studio/auth";
import { releaseArtworkOptions } from "@/studio/artwork";
import { ReleaseEditorForm } from "@/studio/ui/ReleaseEditorForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "New release" };

export default async function NewRelease() {
  await requireAdmin();
  return (
    <>
      <p className={styles.muted}>
        <Link href="/studio/music" className={styles.link}>← Music</Link>
      </p>
      <h1 className={styles.heading}>New release</h1>
      <p className={styles.lead}>Creates a private draft. Nothing is public until you publish it from the editor.</p>
      <ReleaseEditorForm mode="create" slug="" initial={null} artwork={releaseArtworkOptions()} publishedNow={false} unpublishedChanges={true} />
    </>
  );
}
