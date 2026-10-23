import Link from "next/link";

import { requireAdmin } from "@/studio/auth";
import { RELEASE_TYPE_LABELS, type ReleaseKind } from "@/studio/releases";
import { listReleaseRecords } from "@/studio/store";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Musik" };

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
}

export default async function StudioMusic() {
  await requireAdmin();
  const records = await listReleaseRecords();
  records.sort((a, b) => b.draftUpdatedAt - a.draftUpdatedAt);

  return (
    <>
      <h1 className={styles.heading}>Musik</h1>
      <p className={styles.lead}>
        Rilis dimulai sebagai draf privat. Rilis baru muncul di halaman Music setelah diterbitkan.
      </p>
      <div className={styles.actions}>
        <Link href="/studio/music/new" className={styles.button} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Rilis baru
        </Link>
      </div>

      <section className={styles.section} aria-label="Daftar rilis">
        {records.length === 0 ? (
          <p className={styles.muted}>Belum ada rilis. Halaman Music publik menampilkan pemberitahuan &ldquo;Katalog menyusul&rdquo; sampai ada yang diterbitkan.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Rilis</th>
                  <th scope="col">Status</th>
                  <th scope="col">Draf terakhir</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const title = record.draft?.title || record.published?.title || record.slug;
                  const type = (record.draft ?? record.published)?.type;
                  const status =
                    record.published === null
                      ? "Draf (privat)"
                      : JSON.stringify(record.published) === JSON.stringify(record.draft)
                        ? "Terbit"
                        : "Terbit · draf berubah";
                  return (
                    <tr key={record.slug}>
                      <td>
                        {title}
                        <br />
                        <span className={styles.muted}>
                          {type ? RELEASE_TYPE_LABELS[type as ReleaseKind] : "Tidak terbaca"} · /music/{record.slug}
                        </span>
                      </td>
                      <td>{status}</td>
                      <td>{formatTime(record.draftUpdatedAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <Link href={`/studio/music/${record.slug}`} className={styles.link}>Sunting</Link>
                          <Link href={`/studio/preview/release/${record.slug}`} className={styles.link}>Pratinjau</Link>
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
