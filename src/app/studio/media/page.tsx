import { assets } from "@/assets/manifest";
import { requireAdmin } from "@/studio/auth";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media" };

export default async function StudioMedia() {
  await requireAdmin();

  return (
    <>
      <h1 className={styles.heading}>Media library</h1>
      <p className={styles.lead}>
        Files listed here are part of the code repository (the reviewed asset manifest). They are read-only.
      </p>

      <section className={styles.section} aria-labelledby="uploads-heading">
        <h2 id="uploads-heading" className={styles.sectionTitle}>Uploads</h2>
        <div className={styles.notice}>
          <p>
            <strong style={{ color: "var(--color-fg)" }}>Not connected.</strong> Uploading new files needs object storage,
            which is not configured. No upload controls are shown until storage is set up. Uploaded files will be listed
            separately from repository assets.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="repo-heading">
        <h2 id="repo-heading" className={styles.sectionTitle}>Repository assets ({assets.length})</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <caption className="sr-only">Assets from the reviewed manifest</caption>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">File</th>
                <th scope="col">Status</th>
                <th scope="col">Roles</th>
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
