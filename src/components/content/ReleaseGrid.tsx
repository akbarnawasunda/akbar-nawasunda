import type { ReleaseView } from "@/content/release-view";

import { ReleaseCard } from "./ReleaseCard";
import styles from "./ReleaseGrid.module.css";

interface ReleaseGridProps {
  items: readonly ReleaseView[];
  /** Show at most this many tiles (homepage shows the newest few). */
  limit?: number;
}

/** Ordered grid of release tiles: 1 column on phones, 2 on tablets, 3 from 900px. */
export function ReleaseGrid({ items, limit }: ReleaseGridProps) {
  const shown = typeof limit === "number" ? items.slice(0, limit) : items;
  return (
    <ol className={styles.grid}>
      {shown.map((item, index) => (
        <li key={item.slug}>
          <ReleaseCard release={item} index={index + 1} />
        </li>
      ))}
    </ol>
  );
}
