import type { ReactNode } from "react";

import styles from "./ButtonLink.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  /** primary = signal-blue pill, secondary = outlined pill, ghost = text with arrow. */
  variant?: ButtonVariant;
  /** Adds target/rel and a screen-reader note for links that leave the site. */
  external?: boolean;
  className?: string;
}

/**
 * The only link-as-button in the design system. Renders an <a> so it keeps native link behaviour
 * (middle-click, "open in new tab", status bar); a <button> would break all three.
 */
export function ButtonLink({ href, children, variant = "primary", external = false, className }: ButtonLinkProps) {
  const classes = [styles.base, styles[variant], className].filter(Boolean).join(" ");
  return (
    <a
      href={href}
      className={classes}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external ? (
        <>
          <span className={styles.arrow} aria-hidden="true">
            ↗
          </span>
          <span className="sr-only"> (membuka tab baru)</span>
        </>
      ) : null}
    </a>
  );
}
