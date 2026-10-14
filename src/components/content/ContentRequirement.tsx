import styles from "./content.module.css";

interface ContentRequirementProps {
  title: string;
  description: string;
  /** What must be supplied before this section can be published. */
  items: readonly string[];
}

/**
 * Honest empty state for content that has not been verified yet.
 * Replaces invented copy with a clear list of what is still needed.
 */
export function ContentRequirement({ title, description, items }: ContentRequirementProps) {
  return (
    <section className={styles.requirement} aria-label={title}>
      <h2 className={styles.requirementTitle}>{title}</h2>
      <p className={styles.requirementText}>{description}</p>
      <p className={styles.label}>Needed before publishing</p>
      <ul className={styles.requirementList}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
