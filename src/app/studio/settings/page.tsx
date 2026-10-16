import { requireAdmin } from "@/studio/auth";
import { getSettingsRecord } from "@/studio/store";
import { SettingsForm } from "@/studio/ui/SettingsForm";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Artist settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const record = await getSettingsRecord();
  const unpublished =
    record.published === null || JSON.stringify(record.published) !== JSON.stringify(record.draft);

  return (
    <>
      <h1 className={styles.heading}>Artist settings</h1>
      <p className={styles.lead}>
        Name, role line, and social links. Nothing is filled in for you: blank fields keep the current site wording.
      </p>
      <SettingsForm initial={record.draft} initialUnpublishedChanges={unpublished} />
    </>
  );
}
