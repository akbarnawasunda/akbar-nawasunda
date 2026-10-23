import Link from "next/link";

import { readDatabaseEnv } from "@/lib/turso";
import { requireAdmin } from "@/studio/auth";
import { getMediaStorageStatus } from "@/studio/media/storage";
import { getStudioConfigStatus } from "@/studio/config";
import { PAGE_SLUGS, PAGE_CONFIG } from "@/studio/content-model";
import { publicationCounts, pingDatabase } from "@/studio/store";
import { SetupRequired } from "@/studio/ui/SetupRequired";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

type Check = { label: string; state: "ok" | "warn" | "bad"; detail: string };

export default async function StudioDashboard() {
  await requireAdmin();

  const config = getStudioConfigStatus();
  const media = getMediaStorageStatus();
  const checks: Check[] = [];
  let counts: { pages: number; releases: number; draftReleases: number } | null = null;

  if (config.ready) {
    // Read through the resolver, not process.env directly: the database may be configured under the
    // TURSO_* alias (D-028), in which case DATABASE_URL is undefined and a direct read would throw.
    const isLocal = (readDatabaseEnv().url ?? "").startsWith("file:");
    checks.push({
      label: "Database",
      state: "ok",
      detail: isLocal ? "Database file lokal (pengembangan)." : "Database libSQL jarak jauh terpasang.",
    });
    try {
      await pingDatabase();
      checks.push({ label: "Koneksi database", state: "ok", detail: "Terhubung." });
      counts = await publicationCounts();
    } catch {
      checks.push({
        label: "Koneksi database",
        state: "bad",
        detail: "Database tidak bisa dihubungi. Periksa log server.",
      });
    }
  } else {
    checks.push({ label: "Database", state: "bad", detail: "Belum dikonfigurasi." });
  }

  const passwordMissing = config.missing.includes("STUDIO_ADMIN_PASSWORD_HASH");
  checks.push({
    label: "Password admin",
    state: passwordMissing ? "bad" : "ok",
    detail: passwordMissing ? "Belum dikonfigurasi." : "Terpasang.",
  });
  checks.push({
    label: "Unggah media",
    state: media.uploadsAvailable ? "ok" : "warn",
    detail: media.uploadsAvailable
      ? "Tersedia."
      : media.configured
        ? "Variabel penyimpanan terpasang, tetapi pengunggah belum dibuat. Unggahan belum tersedia."
        : `Belum terhubung. Kurang ${media.missing.length} variabel penyimpanan. Unggahan belum tersedia.`,
  });

  return (
    <>
      <h1 className={styles.heading}>Dashboard</h1>
      <p className={styles.lead}>
        Keadaan Studio saat ini. Yang ditandai belum terhubung memang belum berfungsi.
      </p>

      {!config.ready ? <SetupRequired missing={config.missing} /> : null}

      <section className={styles.section} aria-labelledby="status-heading">
        <h2 id="status-heading" className={styles.sectionTitle}>
          Status sistem
        </h2>
        <ul className={styles.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checks.map((check) => (
            <li key={check.label} className={styles.card}>
              <p className={styles.status}>
                <span
                  className={`${styles.dot} ${check.state === "ok" ? styles.dotOk : check.state === "warn" ? styles.dotWarn : styles.dotBad}`}
                  aria-hidden="true"
                />
                <strong style={{ color: "var(--color-fg)", fontWeight: 600 }}>{check.label}</strong>
                <span className="sr-only">
                  ({check.state === "ok" ? "OK" : check.state === "warn" ? "peringatan" : "masalah"})
                </span>
              </p>
              <p className={styles.muted}>{check.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {counts ? (
        <section className={styles.section} aria-labelledby="content-heading">
          <h2 id="content-heading" className={styles.sectionTitle}>
            Konten
          </h2>
          <ul className={styles.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li className={styles.card}>
              <p className={styles.label}>Halaman dengan konten terbit</p>
              <p>
                {counts.pages} dari {PAGE_SLUGS.length}
              </p>
            </li>
            <li className={styles.card}>
              <p className={styles.label}>Rilis terbit</p>
              <p>
                {counts.releases} · draf: {counts.draftReleases}
              </p>
            </li>
          </ul>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="actions-heading">
        <h2 id="actions-heading" className={styles.sectionTitle}>
          Kerjakan
        </h2>
        <div className={styles.actions}>
          <Link
            href="/studio/pages"
            className={styles.button}
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Halaman ({Object.values(PAGE_CONFIG).length})
          </Link>
          <Link
            href="/studio/music"
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Musik
          </Link>
          <Link
            href="/studio/design"
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Desain
          </Link>
          <Link
            href="/studio/media"
            className={`${styles.button} ${styles.buttonSecondary}`}
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Media
          </Link>
        </div>
      </section>
    </>
  );
}
