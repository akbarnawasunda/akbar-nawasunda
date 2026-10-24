import { Depth } from "@/components/zine/Depth";

import styles from "./content.module.css";

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  lead?: string;
}

/** Standard heading block for inner pages. */
export function PageIntro({ eyebrow, title, lead }: PageIntroProps) {
  return (
    <Depth y={-26} fade={0.1} style={{}}>
    <header className={styles.intro}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={`${styles.title} page-title`}>{title}</h1>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </header>
    </Depth>
  );
}
