import Link from "next/link";

import { SETUP_ENV_NAMES } from "../setup";
import styles from "./studio.module.css";

/** Shown instead of Studio features when required settings are missing. Names only, never values. */
export function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <section className={styles.section} aria-labelledby="setup-heading">
      <h2 id="setup-heading" className={styles.sectionTitle}>Setup required</h2>
      <p className={styles.lead}>
        NAWA STUDIO is not connected yet. Pages on the public site still show their current content.
        Add the following environment variables on the server, then restart the app:
      </p>
      <ul className={styles.card} style={{ listStyle: "none" }}>
        {missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>
        Values are never shown in this screen. The activation page checks each setting, tests the database
        connection, and can generate the password hash without a terminal:
      </p>
      <div className={styles.actions}>
        <Link href="/studio/setup" className={styles.button} style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          Open activation
        </Link>
      </div>
      <p className={styles.hint}>
        Variable names: <code>{SETUP_ENV_NAMES.join("</code>, <code>")}</code>. See <code>.env.example</code> for
        the full list and <code>docs/activate-nawa-studio.md</code> for the steps.
      </p>
    </section>
  );
}
