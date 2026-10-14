import Link from "next/link";

import { getStudioConfigStatus } from "@/studio/config";
import { requireAdmin } from "@/studio/auth";
import { PAGE_LABELS } from "@/studio/content-model";
import { countPublishedPages, pingDatabase } from "@/studio/store";
import { SetupRequired } from "@/studio/ui/SetupRequired";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

type Check = { label: string; state: "ok" | "warn" | "bad"; detail: string };

export default async function StudioDashboard() {
  await requireAdmin();

  const config = getStudioConfigStatus();
  const checks: Check[] = [];

  if (config.ready) {
    const isLocal = (process.env.DATABASE_URL as string).startsWith("file:");
    checks.push({
      label: "Database",
      state: "ok",
      detail: isLocal ? "Local file database (development)." : "Remote libSQL database configured.",
    });
    try {
      await pingDatabase();
      checks.push({ label: "Database connection", state: "ok", detail: "Reachable." });
      const published = await countPublishedPages();
      checks.push({
        label: "Published pages",
        state: "ok",
        detail: `${published} of ${Object.keys(PAGE_LABELS).length} page(s) have published content.`,
      });
    } catch {
      checks.push({ label: "Database connection", state: "bad", detail: "The database could not be reached. Check the server logs." });
    }
  } else {
    checks.push({ label: "Database", state: "bad", detail: "Not configured." });
  }

  checks.push({
    label: "Admin password",
    state: config.missing.includes("STUDIO_ADMIN_PASSWORD_HASH") ? "bad" : "ok",
    detail: config.missing.includes("STUDIO_ADMIN_PASSWORD_HASH") ? "Not configured." : "Configured.",
  });
  checks.push({ label: "Session", state: "ok", detail: "Signed in. Sessions last 7 days." });
  checks.push({
    label: "Media uploads",
    state: "warn",
    detail: "Not connected. No object storage is configured, so uploads are unavailable.",
  });

  return (
    <>
      <h1 className={styles.heading}>Dashboard</h1>
      <p className={styles.lead}>Current state of the Studio. Anything marked as not connected is not working yet.</p>

      {!config.ready ? <SetupRequired missing={config.missing} /> : null}

      <section className={styles.section} aria-labelledby="status-heading">
        <h2 id="status-heading" className={styles.sectionTitle}>System status</h2>
        <ul className={styles.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checks.map((check) => (
            <li key={check.label} className={styles.card}>
              <p className={styles.status}>
                <span className={`${styles.dot} ${check.state === "ok" ? styles.dotOk : check.state === "warn" ? styles.dotWarn : styles.dotBad}`} aria-hidden="true" />
                <strong style={{ color: "var(--color-fg)", fontWeight: 600 }}>{check.label}</strong>
                <span className="sr-only">({check.state === "ok" ? "OK" : check.state === "warn" ? "warning" : "problem"})</span>
              </p>
              <p className={styles.muted}>{check.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="actions-heading">
        <h2 id="actions-heading" className={styles.sectionTitle}>Work</h2>
        <div className={styles.actions}>
          <Link href="/studio/pages" className={styles.button} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Edit pages
          </Link>
          <Link href="/studio/media" className={`${styles.button} ${styles.buttonSecondary}`} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Media library
          </Link>
        </div>
      </section>
    </>
  );
}
