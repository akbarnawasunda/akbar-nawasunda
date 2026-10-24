import { listenLinks } from "@/config/socials";

import { platformIcons, type PlatformKey } from "@/components/ui/PlatformIcon";
import styles from "./PlatformRow.module.css";

/**
 * Platform row (reference 2: the "Auth / Unity / Western Union" strip under the hero).
 *
 * Ten listening services, every URL supplied by the owner (D-090). Each item is icon + mono label,
 * linking out in a new tab. On phones the row scrolls horizontally; from 1024px it wraps into two
 * tidy lines, because ten items never fit one line of a 1280px container and a scrollbar on a
 * desktop strip reads as broken rather than as depth.
 */
export function PlatformRow() {
  return (
    <section className={styles.row} aria-label="Dengarkan di">
      <ul className={styles.list}>
        {listenLinks.map((link) => {
          const Icon = platformIcons[link.platform as PlatformKey];
          return (
            <li key={link.platform}>
              <a
                className={styles.item}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon className={styles.icon} />
                <span>{link.label}</span>
                <span className="sr-only">(membuka tab baru)</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className={styles.note}>Tautan resmi</p>
    </section>
  );
}
