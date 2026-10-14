import { requireAdmin } from "@/studio/auth";
import { getDesignRecord } from "@/studio/store";
import { DesignForm } from "@/studio/ui/DesignForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design" };

export default async function DesignPage() {
  await requireAdmin();
  const record = await getDesignRecord();
  const unpublished =
    record.published === null || JSON.stringify(record.published) !== JSON.stringify(record.draft);

  return (
    <>
      <h1 className={styles.heading}>Design settings</h1>
      <p className={styles.lead}>
        A small set of approved options. Layout, the homepage hero and the logo are not editable here.
      </p>
      <DesignForm initial={record.draft} initialUnpublishedChanges={unpublished} />
    </>
  );
}
