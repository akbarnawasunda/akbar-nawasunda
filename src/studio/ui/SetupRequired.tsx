import styles from "./studio.module.css";

/** Shown instead of Studio features when required settings are missing. Names only, never values. */
export function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <section className={styles.section} aria-labelledby="setup-heading">
      <h2 id="setup-heading" className={styles.sectionTitle}>Perlu pengaturan</h2>
      <p className={styles.lead}>
        NAWA STUDIO belum terhubung. Halaman publik masih memakai konten yang ada sekarang. Tambahkan variabel lingkungan berikut di server, lalu jalankan ulang aplikasi:
      </p>
      <ul className={styles.card} style={{ listStyle: "none" }}>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>
        Nilai variabel tidak pernah ditampilkan di layar ini. Lihat <code>.env.example</code> untuk nama variabel dan README untuk langkah pemasangannya.
      </p>
    </section>
  );
}
