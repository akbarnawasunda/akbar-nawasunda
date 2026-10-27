import { requireAdmin } from "@/studio/auth";
import { getDesignRecord } from "@/studio/store";
import { DesignForm } from "@/studio/ui/DesignForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Desain" };

export default async function DesignPage() {
  await requireAdmin();
  const record = await getDesignRecord();
  const unpublished =
    record.published === null || JSON.stringify(record.published) !== JSON.stringify(record.draft);

  return (
    <>
      <h1 className={styles.heading}>Pengaturan desain</h1>
      <p className={styles.lead}>
        Hanya beberapa opsi yang sudah disetujui. Tata letak, hero beranda, dan logo tidak bisa diubah di sini.
      </p>
      <DesignForm initial={record.draft} initialUnpublishedChanges={unpublished} />
    </>
  );
}
