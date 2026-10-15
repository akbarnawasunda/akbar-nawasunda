import { assets } from "@/assets/manifest";
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
      <h1 className={styles.heading}>Media library</h1>
      <p className={styles.lead}>
        Two separate sources. Repository assets are part of the code and reviewed in the asset manifest. Uploaded media would come from object storage.
      </p>

      <section className={styles.section} aria-labelledby="uploads-heading">
        <h2 id="uploads-heading" className={styles.sectionTitle}>Uploaded media</h2>
        <div className={styles.notice}>
          <p>
            <strong style={{ color: "var(--color-fg)" }}>Not available.</strong>{" "}
            {status.configured
              ? "Storage variables are set, but the upload handler is not built yet, so no upload controls are shown."
              : `Object storage is not connected. ${status.missing.length} of ${R2_REQUIRED_ENV.length} storage variables are missing (names only, see docs/nawa-studio.md).`}
          </p>
          <p className={styles.hint}>Uploads will be listed here separately from repository assets once enabled.</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="repo-heading">
        <h2 id="repo-heading" className={styles.sectionTitle}>Repository assets ({assets.length}, read-only)</h2>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Repository asset table, scrolls sideways">
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
                  <td data-label="ID"><code>{asset.id}</code></td>
                  <td data-label="File">{asset.file.replace(/^AKBAR-NAWASUNDA-ASSETS\//, "")}</td>
                  <td data-label="Status">{asset.status}</td>
                  <td data-label="Roles">{asset.roles.length ? asset.roles.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
