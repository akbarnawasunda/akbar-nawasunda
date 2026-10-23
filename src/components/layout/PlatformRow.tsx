import { socialLinks } from "@/config/socials";

import { platformIcons, type PlatformKey } from "@/components/ui/PlatformIcon";
import styles from "./PlatformRow.module.css";

/**
 * Platform row (reference 2: the "Auth / Unity / Western Union" strip under the hero).
 *
 * Only the four verified platforms appear. Each item is icon + mono label, linking out in a new tab.
 * On phones the row scrolls horizontally rather than wrapping into a ragged second line.
 */
export function PlatformRow() {
  return (
    <section className={styles.row} aria-label="Dengarkan di">
      <ul className={styles.list}>
        {socialLinks.map((link) => {
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
