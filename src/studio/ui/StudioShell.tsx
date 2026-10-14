import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "../actions";
import styles from "./studio.module.css";

interface StudioShellProps {
  signedIn: boolean;
  children: ReactNode;
}

/** Chrome for every Studio screen. Navigation wraps and scrolls horizontally on narrow phones. */
export function StudioShell({ signedIn, children }: StudioShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href={signedIn ? "/studio" : "/studio/login"} className={styles.brand}>
          NAWA STUDIO
        </Link>

        {signedIn ? (
          <>
            <nav aria-label="Studio" className={styles.nav}>
              <Link href="/studio" className={styles.navLink}>Dashboard</Link>
              <Link href="/studio/pages" className={styles.navLink}>Pages</Link>
              <Link href="/studio/media" className={styles.navLink}>Media</Link>
              <Link href="/" className={styles.navLink}>View site</Link>
            </nav>
            <form action={logoutAction}>
              <button type="submit" className={styles.linkButton}>Sign out</button>
            </form>
          </>
        ) : null}
      </header>
      <div className={styles.main}>{children}</div>
    </div>
  );
}
