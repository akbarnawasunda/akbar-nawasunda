import type { Metadata } from "next";

import { VisualGrid, type VisualItem } from "@/components/media/VisualGrid";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { visualItems } from "@/content/visuals";
import { getSocialLink } from "@/config/socials";
import { pageMetadata } from "@/lib/metadata";
import styles from "./visuals.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Visuals",
  description:
    "Arsip visual resmi Akbar Nawasunda: potret, monogram AN, lockup, dan foto panggung.",
  path: "/visuals",
});

const youtube = getSocialLink("youtube");

/**
 * /visuals — the archive as its own route (SITEMAP.md). The masonry keeps each asset's own aspect
 * ratio; the lightbox and keyboard behaviour come from the same VisualGrid used on the homepage.
 *
 * Only four owner-supplied files exist today. The page says so instead of padding the wall with
 * stock photos or video thumbnails scraped from YouTube.
 */
export default function VisualsPage() {
  return (
    <Container>
      <SectionHeader
        eyebrow="02 — Visual"
        title="Arsip visual"
        id="visuals-title"
        action={{ href: youtube.href, label: "YouTube" }}
      />

      <div className={styles.body}>
        <VisualGrid items={visualItems as readonly VisualItem[]} variant="masonry" />

        <aside className={styles.note} aria-label="Catatan arsip">
          <p className={styles.noteLabel}>Isi arsip</p>
          <p className={styles.noteText}>
            Empat aset resmi: potret studio, foto panggung, monogram AN, dan lockup penuh. Semua file
            berasal dari pemilik, bukan stok atau hasil generate.
          </p>
          <p className={styles.noteLabel}>Menyusul</p>
          <p className={styles.noteText}>
            Foto panggung lain, still video, dan artwork rilis. Kirim lewat Studio atau letakkan di{" "}
            <code>public/assets/covers/</code> untuk artwork. <span className={styles.needs}>[NEEDS OWNER]</span>
          </p>
        </aside>
      </div>
    </Container>
  );
}
