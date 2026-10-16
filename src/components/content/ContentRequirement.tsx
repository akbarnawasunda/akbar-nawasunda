import styles from "./content.module.css";

interface ContentRequirementProps {
  title: string;
  description: string;
}

/**
 * Public empty state for a section with no published content yet. It says only what a visitor needs
 * to know. The owner's checklist of what is still missing stays in NAWA STUDIO, never on the site.
 */
export function ContentRequirement({ title, description }: ContentRequirementProps) {
  return (
    <section className={styles.requirement} aria-label={title}>
      <h2 className={styles.requirementTitle}>{title}</h2>
      <p className={styles.requirementText}>{description}</p>
    </section>
  );
}
