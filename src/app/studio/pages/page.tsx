import Link from "next/link";

import { requireAdmin } from "@/studio/auth";
import { PAGE_CONFIG, PAGE_SLUGS } from "@/studio/content-model";
import { getPageRecord } from "@/studio/store";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

function formatTime(ms: number | null): string {
  if (ms === null) return "Belum pernah";
  return new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB";
}

export default async function StudioPages() {
  await requireAdmin();
  const rows = await Promise.all(PAGE_SLUGS.map(async (slug) => ({ slug, record: await getPageRecord(slug) })));

  return (
    <>
      <h1 className={styles.heading}>Halaman</h1>
      <p className={styles.lead}>Sunting halaman, simpan draf, lalu terbitkan saat kontennya siap. Draf tidak pernah tampil di situs publik.</p>

      <section className={styles.section} aria-label="Daftar halaman">
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Halaman</th>
                <th scope="col">Draf terakhir</th>
                <th scope="col">Terbit terakhir</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ slug, record }) => {
                return (
                  <tr key={slug}>
                    <td>{PAGE_CONFIG[slug].label}<br /><span className={styles.muted}>{PAGE_CONFIG[slug].path}</span></td>
                    <td>{formatTime(record.draftUpdatedAt)}</td>
                    <td>{formatTime(record.publishedAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/studio/pages/${slug}`} className={styles.link}>Sunting</Link>
                        <Link href={`/studio/preview/${slug}`} className={styles.link}>Pratinjau draf</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
