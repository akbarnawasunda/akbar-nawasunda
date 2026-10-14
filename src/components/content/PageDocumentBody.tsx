import type { PageDocument } from "@/studio/content-model";
import styles from "./content.module.css";

/** Renders the sections of a page document. Used for published content and draft previews. */
export function PageDocumentBody({ doc }: { doc: PageDocument }) {
  return (
    <div className={styles.body}>
      {doc.sections.map((section) =>
        section.type === "paragraph" ? (
          <p key={section.id} className={styles.paragraph}>{section.text}</p>
        ) : null,
      )}
    </div>
  );
}
