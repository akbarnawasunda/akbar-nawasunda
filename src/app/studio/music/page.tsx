import Link from "next/link";

import { requireAdmin } from "@/studio/auth";
import { RELEASE_TYPE_LABELS, type ReleaseKind } from "@/studio/releases";
import { listReleaseRecords } from "@/studio/store";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Music" };

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
}

export default async function StudioMusic() {
  await requireAdmin();
  const records = await listReleaseRecords();
  records.sort((a, b) => b.draftUpdatedAt - a.draftUpdatedAt);

  return (
    <>
      <h1 className={styles.heading}>Music</h1>
      <p className={styles.lead}>
        Releases start as private drafts. A release appears on the public Music page only after you publish it.
      </p>
      <div className={styles.actions}>
        <Link href="/studio/music/new" className={styles.button} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          New release
        </Link>
      </div>

      <section className={styles.section} aria-label="Release list">
        {records.length === 0 ? (
          <p className={styles.muted}>No releases yet. Public Music page shows its &ldquo;Catalogue pending&rdquo; notice until one is published.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Release</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last draft</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const title = record.draft?.title || record.published?.title || record.slug;
                  const type = (record.draft ?? record.published)?.type;
                  const status =
                    record.published === null
                      ? "Draft (private)"
                      : JSON.stringify(record.published) === JSON.stringify(record.draft)
                        ? "Published"
                        : "Published · draft has changes";
                  return (
                    <tr key={record.slug}>
                      <td>
                        {title}
                        <br />
                        <span className={styles.muted}>
                          {type ? RELEASE_TYPE_LABELS[type as ReleaseKind] : "Unreadable"} · /music/{record.slug}
                        </span>
                      </td>
                      <td>{status}</td>
                      <td>{formatTime(record.draftUpdatedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <Link href={`/studio/music/${record.slug}`} className={styles.link}>Edit</Link>
                          <Link href={`/studio/preview/release/${record.slug}`} className={styles.link}>Preview</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
