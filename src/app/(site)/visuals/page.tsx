import type { Metadata } from "next";

import { VisualGrid, type VisualItem } from "@/components/media/VisualGrid";
import { Container } from "@/components/layout/Container";
import { PageMasthead } from "@/components/layout/PageMasthead";
import { visualItems } from "@/content/visuals";
import { pageMetadata } from "@/lib/metadata";
import styles from "./visuals.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Visuals",
  description:
    "Arsip visual Akbar Nawasunda: potret, jalan malam, panggung, maskot, monogram AN, dan lockup.",
  path: "/visuals",
});

/**
 * /visuals — the archive as its own route (SITEMAP.md). The masonry keeps each asset's own aspect
 * ratio; the lightbox and keyboard behaviour come from the same VisualGrid used on the homepage.
 *
 * Only six owner-supplied files exist today. The page says so instead of padding the wall with
 * stock photos or video thumbnails scraped from YouTube.
 */
export default function VisualsPage() {
  const count = String(visualItems.length).padStart(2, "0");

  return (
    <>
      <PageMasthead
        index="Visual"
        title="Arsip"
        figure={count}
        lead="Potret, panggung, jalan malam, maskot, monogram, dan lockup."
        note={`${count} aset`}
      />

      <Container>
        <div className={styles.body}>
          <VisualGrid items={visualItems as readonly VisualItem[]} variant="masonry" />

          <aside className={styles.aside} aria-label="Catatan arsip">
            <p className={styles.noteLabel}>Untuk apa</p>
            <ul className={styles.uses}>
              <li>
                <span>Potret studio</span> pers, press kit, halaman artis
              </li>
              <li>
                <span>Panggung kosong</span> latar lebar beranda
              </li>
              <li>
                <span>Jalan malam</span> suasana, satu-satunya foto tempat
              </li>
              <li>
                <span>Maskot · monogram · lockup</span> tanda, dari ikon sampai panggung
              </li>
            </ul>


          </aside>
        </div>
      </Container>
    </>
  );
}
