import { requireAdmin } from "@/studio/auth";
import Link from "next/link";

import { getStudioConfigStatus } from "@/studio/config";
import { getReadyDb, StudioNotConfiguredError } from "@/studio/db";
import { buildSetupChecks, isActivated, withConnectionResult, type SetupCheck } from "@/studio/setup";
import { pingDatabase } from "@/studio/store";
import { SetupHashForm } from "@/studio/ui/SetupHashForm";
import { SetupPasswordTest } from "@/studio/ui/SetupPasswordTest";
import styles from "@/studio/ui/studio.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activation" };

const EXPECTED_TABLES = ["studio_pages", "studio_sessions", "studio_login_failures"] as const;

/**
 * Probes the configured database. Reports which of the Studio's tables exist. Secrets are never
 * returned: the URL and token are stripped out of any error text before it is shown.
 */
async function probeConnection(): Promise<{ level: "ok" | "bad"; detail: string }> {
  try {
    await pingDatabase();
    const db = await getReadyDb();
    const result = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (?, ?, ?)",
      args: [...EXPECTED_TABLES],
    });
    const present = new Set(result.rows.map((row) => String(row.name)));
    const missing = EXPECTED_TABLES.filter((table) => !present.has(table));
    return missing.length === 0
      ? { level: "ok", detail: "Connected. All three Studio tables exist, so content and sessions can be written." }
      : { level: "bad", detail: `Connected, but these tables are missing: ${missing.join(", ")}.` };
  } catch (error) {
    if (error instanceof StudioNotConfiguredError) {
      return { level: "bad", detail: `Not configured yet. Missing: ${error.missing.join(", ")}.` };
    }
    return {
      level: "bad",
      detail: `Could not connect: Database unavailable — check the URL, the token, and that the token can write (creating the tables needs write access).`,
    };
  }
}

const dotClass: Record<SetupCheck["level"], string> = {
  ok: styles.dotOk ?? "",
  warn: styles.dotWarn ?? "",
  bad: styles.dotBad ?? "",
  todo: "",
};

const levelWord: Record<SetupCheck["level"], string> = {
  ok: "ready",
  warn: "note",
  bad: "problem",
  todo: "still to do",
};

export default async function StudioSetupPage() {
  // Once a credential exists, diagnostics are administrator-only, even if the DB is down.
  if (process.env.STUDIO_ADMIN_PASSWORD_HASH?.trim()) await requireAdmin();
  if (process.env.NODE_ENV !== "development" && !process.env.STUDIO_ADMIN_PASSWORD_HASH?.trim()) {
    return <><h1 className={styles.heading}>Activation</h1><p className={styles.notice}>Browser bootstrap is disabled on this deployment. Generate an administrator hash in a trusted local development environment or with the CLI, then configure the host. Diagnostics require sign-in.</p></>;
  }
  const config = getStudioConfigStatus();
  let checks = buildSetupChecks(process.env, { isProduction: process.env.NODE_ENV === "production" });

  if (config.ready) {
    const probe = await probeConnection();
    checks = withConnectionResult(checks, probe.level, probe.detail);
  }

  const activated = isActivated(checks);
  const hashMissing = checks.some((check) => check.id === "password" && check.level === "todo");
  const connectionOk = checks.some((check) => check.id === "connection" && check.level === "ok");

  return (
    <>
      <h1 className={styles.heading}>Activation</h1>
      <p className={styles.lead}>
        What this page checks: whether NAWA STUDIO has everything it needs on this deployment, and whether the
        database answers. It shows the names of settings, never their values.
      </p>

      <section className={styles.section} aria-labelledby="checks-heading">
        <h2 id="checks-heading" className={styles.sectionTitle}>Settings on this deployment</h2>
        <ul className={styles.grid} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {checks.map((check) => (
            <li key={check.id} className={styles.card}>
              <p className={styles.status}>
                <span className={`${styles.dot} ${dotClass[check.level]}`} aria-hidden="true" />
                <strong style={{ color: "var(--color-fg)", fontWeight: 600 }}>{check.label}</strong>
                <span className="sr-only">({levelWord[check.level]})</span>
              </p>
              <p className={styles.muted}>{check.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {activated ? (
        <section className={styles.section} aria-labelledby="active-heading">
          <h2 id="active-heading" className={styles.sectionTitle}>The Studio is active</h2>
          <p className={`${styles.notice} ${styles.noticeOk}`}>
            Everything above is in place. Sign in to manage pages, music, homepage sections, and design.
          </p>
          <div className={styles.actions}>
            <Link
              href="/studio/login"
              className={styles.button}
              style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            >
              Go to sign in
            </Link>
            <Link
              href="/"
              className={`${styles.button} ${styles.buttonSecondary}`}
              style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            >
              View the public site
            </Link>
          </div>
          <p className={styles.hint}>
            Image uploads are still switched off, so the Media page stays read-only. That is a separate piece of work.
          </p>
        </section>
      ) : null}

      {hashMissing ? (
        <section className={styles.section} aria-labelledby="password-heading">
          <h2 id="password-heading" className={styles.sectionTitle}>1. Create the administrator password</h2>
          <p className={styles.muted}>
            This tool disappears by itself once the hash exists in the environment, so nobody else can use this page
            to generate one.
          </p>
          <SetupHashForm />
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="how-heading">
        <h2 id="how-heading" className={styles.sectionTitle}>{hashMissing ? "2. Finish the setup" : "How to activate"}</h2>
        <ol>
          <li>
            Create a free libSQL database (Turso is the candidate) in its web dashboard, in the region closest to
            your visitors. Copy the database URL and create a token with write access.
          </li>
          <li>
            On the host (Vercel: Project → Settings → Environment Variables), add <code>DATABASE_URL</code>,{" "}
            <code>DATABASE_AUTH_TOKEN</code>, and <code>STUDIO_ADMIN_PASSWORD_HASH</code>. Use separate database credentials for Production and Preview.
          </li>
          <li>
            Redeploy the project. Environment variables are only read when a new deployment starts, so an existing
            deployment keeps the old values until it is redeployed.
          </li>
          <li>Reload this page. Every row above should be green, and the database check should say it connected.</li>
          <li>Sign in at <Link href="/studio/login" className={styles.link}>/studio/login</Link>.</li>
        </ol>
        <p className={styles.hint}>
          The same steps, with the phone-specific details and the error table, are in{" "}
          <code>docs/activate-nawa-studio.md</code> in the repository.
        </p>
      </section>

      {config.ready && connectionOk ? (
        <section className={styles.section} aria-labelledby="test-heading">
          <h2 id="test-heading" className={styles.sectionTitle}>Not sure the password is the right one?</h2>
          <p className={styles.muted}>
            Check it here without signing in. If it does not match, generate a replacement hash offline and update the host setting without removing the existing value first.
          </p>
          <SetupPasswordTest />
        </section>
      ) : null}
    </>
  );
}
