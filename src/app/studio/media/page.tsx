import { assets } from "@/assets/manifest";
import { coverCandidates, resolveCover } from "@/content/covers";
import { releases } from "@/content/releases";
import { requireAdmin } from "@/studio/auth";
import { getMediaStorageStatus, R2_REQUIRED_ENV } from "@/studio/media/storage";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media" };

export default async function StudioMedia() {
  await requireAdmin();
  const status = getMediaStorageStatus();

  return (
    <>
      <h1 className={styles.heading}>Pustaka media</h1>
      <p className={styles.lead}>
        Dua sumber terpisah. Aset repositori adalah bagian dari kode dan tercatat di manifest aset. Media unggahan nantinya berasal dari object storage.
      </p>

      <section className={styles.section} aria-labelledby="uploads-heading">
        <h2 id="uploads-heading" className={styles.sectionTitle}>Media unggahan</h2>
        <div className={styles.notice}>
          <p>
            <strong style={{ color: "var(--color-fg)" }}>Belum tersedia.</strong>{" "}
            {status.configured
              ? "Variabel penyimpanan terpasang, tetapi pengunggah belum dibuat, jadi tidak ada kontrol unggah di sini."
              : `Object storage belum terhubung. ${status.missing.length} dari ${R2_REQUIRED_ENV.length} variabel penyimpanan belum diisi (hanya nama, lihat docs/nawa-studio.md).`}
          </p>
          <p className={styles.hint}>Setelah diaktifkan, unggahan akan terdaftar di sini terpisah dari aset repositori.</p>
        </div>
      </section>

      {/*
        The owner's artwork workflow (D-027): drop <slug>.webp into public/assets/covers/ and the
        card and release page pick it up with no code change and no database edit. This panel is the
        checklist for that, so it is obvious which of the six releases still has no file.
      */}
      <section className={styles.section} aria-labelledby="covers-heading">
        <h2 id="covers-heading" className={styles.sectionTitle}>
          Artwork rilis
        </h2>
        <p className={styles.lead}>
          Letakkan file 1:1 bernama <code>&lt;slug&gt;.webp</code> (atau .avif/.jpg/.png) di{" "}
          <code>public/assets/covers/</code>. Tidak perlu mengubah kode atau database: kartu rilis dan
          halaman detail langsung memakainya. Di produksi file baru ikut terpasang saat deploy
          berikutnya (commit filenya seperti biasa).
        </p>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <caption className="sr-only">Status artwork per rilis</caption>
            <thead>
              <tr>
                <th scope="col">Rilis</th>
                <th scope="col">Slug</th>
                <th scope="col">Artwork</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => {
                const cover = resolveCover(release.slug);
                return (
                  <tr key={release.slug}>
                    <td>{release.title}</td>
                    <td>
                      <code>{release.slug}</code>
                    </td>
                    <td>
                      {cover ? (
                        <code>{cover}</code>
                      ) : (
                        <span className={styles.muted}>
                          belum ada — {coverCandidates(release.slug)[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="repo-heading">
        <h2 id="repo-heading" className={styles.sectionTitle}>Aset repositori ({assets.length}, hanya baca)</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <caption className="sr-only">Aset dari manifest yang sudah ditinjau</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Berkas</th>
                <th scope="col">Status</th>
                <th scope="col">Peran</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td><code>{asset.id}</code></td>
                  <td>{asset.file.replace(/^AKBAR-NAWASUNDA-ASSETS\//, "")}</td>
                  <td>{asset.status}</td>
                  <td>{asset.roles.length ? asset.roles.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
