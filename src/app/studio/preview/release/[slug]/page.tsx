import { notFound } from "next/navigation";

import { ReleaseView } from "@/components/content/ReleaseView";
import { requireAdmin } from "@/studio/auth";
import { getReleaseRecord } from "@/studio/store";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pratinjau draf rilis", robots: { index: false, follow: false } };

/** Admin-only preview of a release draft. Never linked from the public site. */
export default async function ReleaseDraftPreview({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const record = await getReleaseRecord(slug);
  if (!record) notFound();

  return (
    <>
      <div className={styles.previewBanner} role="status">
        Pratinjau draf. Hanya administrator yang masuk yang bisa melihat ini. Belum diterbitkan.
      </div>
      <div className={styles.preview}>
        {record.draft ? <ReleaseView doc={record.draft} preview /> : <p className={styles.error}>Draf ini tidak bisa dibaca.</p>}
      </div>
    </>
  );
}
