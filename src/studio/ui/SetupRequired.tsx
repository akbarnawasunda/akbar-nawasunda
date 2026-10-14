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
        Values are never shown in this screen. See <code>.env.example</code> for the variable names and
        the README for setup steps.
      </p>
    </section>
  );
}
