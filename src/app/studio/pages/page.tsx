import Link from "next/link";

import { requireAdmin } from "@/studio/auth";
import { PAGE_LABELS, PAGE_SLUGS } from "@/studio/content-model";
import { getPageRecord } from "@/studio/store";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

function formatTime(ms: number | null): string {
  if (ms === null) return "Never";
  return new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
}

export default async function StudioPages() {
  await requireAdmin();
  const records = await Promise.all(PAGE_SLUGS.map((slug) => getPageRecord(slug)));

  return (
    <>
      <h1 className={styles.heading}>Pages</h1>
      <p className={styles.lead}>Edit a page, save drafts, and publish when the content is ready.</p>

      <section className={styles.section} aria-label="Page list">
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Last draft</th>
                <th scope="col">Last published</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.slug}>
                  <td>{PAGE_LABELS[record.slug]}<br /><span className={styles.muted}>/{record.slug}</span></td>
                  <td>{formatTime(record.draftUpdatedAt)}</td>
                  <td>{formatTime(record.publishedAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/studio/pages/${record.slug}`} className={styles.link}>Edit</Link>
                      <Link href={`/studio/preview/${record.slug}`} className={styles.link}>Preview draft</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
