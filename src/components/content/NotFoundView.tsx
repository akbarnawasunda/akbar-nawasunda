import Image from "next/image";
import Link from "next/link";

import { anMark } from "@/assets/web";
import { Container } from "@/components/layout/Container";
import { footerNav } from "@/config/navigation";
import styles from "./NotFoundView.module.css";

/**
 * 404 content (PAGE_SPECIFICATIONS_2: AN mark at 10% as a ghost, a display heading, a way home,
 * blue strip at the bottom). The mark is decorative and carries no alt text; the heading and links
 * are the only things a screen reader needs.
 *
 * Shared by the two not-found files Next needs: `app/not-found.tsx` answers URLs that match no
 * route at all, and `app/(site)/not-found.tsx` answers a notFound() call inside the site group.
 * One view, so the two can never drift apart.
 */
export function NotFoundView() {
  return (
    <Container>
      <div className={styles.wrap}>
        <Image
          className={styles.ghost}
          src={anMark.src}
          alt=""
          width={anMark.width}
          height={anMark.height}
          sizes="(min-width: 768px) 30vw, 70vw"
        />

        <div className={styles.copy}>
          <p className={styles.code}>Error 404</p>
          <h1 className={`${styles.title} ink`}>
            Sinyal <span className={styles.faded}>terputus</span>
          </h1>
          <p className={styles.lead}>
            Halaman yang Anda cari tidak ditemukan. Silakan kembali ke jalur utama.
          </p>

          <nav aria-label="Jalur alternatif" className={styles.links}>
            <Link href="/" className={styles.primary}>
              Kembali ke beranda <span aria-hidden="true">→</span>
            </Link>
            <ul>
              {footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className={styles.strip} aria-hidden="true" />
    </Container>
  );
}
