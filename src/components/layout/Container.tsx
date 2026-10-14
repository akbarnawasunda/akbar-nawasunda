import type { ElementType, ReactNode } from "react";

import styles from "./Container.module.css";

interface ContainerProps {
  children: ReactNode;
  /** Element to render; defaults to a plain div. */
  as?: ElementType;
  className?: string;
}

/** Constrains content width and applies the shared horizontal gutter. */
export function Container({ children, as: Tag = "div", className }: ContainerProps) {
  const classes = className ? `${styles.container} ${className}` : styles.container;
  return <Tag className={classes}>{children}</Tag>;
}
