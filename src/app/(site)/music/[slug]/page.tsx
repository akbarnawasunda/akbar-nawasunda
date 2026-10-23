import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReleaseCover } from "@/components/content/ReleaseCover";
import { ReleaseView } from "@/components/content/ReleaseView";
import { Container } from "@/components/layout/Container";
import { coverArtwork, resolveCover } from "@/content/covers";
import {
  getReleaseBySlug,
  releaseDisplayTitle,
  releaseEyebrow,
  releaseTypeLabel,
} from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import { getPublishedRelease } from "@/studio/public";
import styles from "./release.module.css";

export const dynamic = "force-dynamic";

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

/** Published Studio release first; otherwise the verified static entry; otherwise 404. Drafts never show. */
export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const managed = await getPublishedRelease(slug);
  if (managed) {
    return pageMetadata({
      title: managed.seoTitle || managed.title,
      description: managed.seoDescription || managed.description || undefined,
      path: `/music/${slug}`,
    });
  }
  const release = getReleaseBySlug(slug);
  // No such release: the page calls notFound(), so keep the title neutral and out of the index.
  if (!release) return { title: "Rilis tidak ditemukan", robots: { index: false, follow: true } };
  return pageMetadata({
    title: release.title,
    description:
      release.description ??
      `${releaseDisplayTitle(release)} — rilis terverifikasi Akbar Nawasunda.`,
    path: `/music/${release.slug}`,
  });
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;

  const managed = await getPublishedRelease(slug);
  if (managed) {
    return (
      <Container>
        <ReleaseView doc={managed} coverUrl={resolveCover(slug)} />
        <p className={styles.back}>
          <Link href="/music">← Semua musik</Link>
        </p>
      </Container>
    );
  }

  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  const artwork = release.cover ? ({ kind: "image", src: release.cover } as const) : coverArtwork(slug);

  return (
    <Container>
      <div className={styles.record}>
        <div className={styles.main}>
          <p className={styles.eyebrow}>{releaseEyebrow(release)}</p>
          <h1 className={styles.title}>{releaseDisplayTitle(release)}</h1>
          {release.description ? <p className={styles.lead}>{release.description}</p> : null}

          {release.links.length > 0 ? (
            <ul className={styles.links}>
              {release.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.note}>
              <span className={styles.noteLabel}>Tautan</span>
              Tautan mendengarkan untuk rilis ini belum tersedia.
            </p>
          )}
        </div>

        <aside className={styles.artwork} aria-label="Artwork">
          <ReleaseCover artwork={artwork} title={releaseDisplayTitle(release)} />
        </aside>
      </div>

      <p className={styles.back}>
        <Link href="/music">← Semua musik</Link>
      </p>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Judul</dt>
          <dd>{release.title}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Jenis</dt>
          <dd>{release.type ? releaseTypeLabel[release.type] : "[NEEDS OWNER]"}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Tahun</dt>
          <dd>{release.year ? String(release.year) : "[NEEDS OWNER]"}</dd>
        </div>
        {release.source ? (
          <div className={styles.fact}>
            <dt>Karya asli</dt>
            <dd>{release.source}</dd>
          </div>
        ) : null}
        {release.era ? (
          <div className={styles.fact}>
            <dt>Era</dt>
            <dd>{release.era}</dd>
          </div>
        ) : null}
      </dl>
    </Container>
  );
}
