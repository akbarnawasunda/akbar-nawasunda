import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/content/PageIntro";
import { ReleaseView } from "@/components/content/ReleaseView";
import { Container } from "@/components/layout/Container";
import { resolveCover } from "@/content/covers";
import { getReleaseBySlug, releaseDisplayTitle, releaseEyebrow } from "@/content/releases";
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
  if (!release) return { title: "Release not found" };
  return pageMetadata({
    title: release.title,
    description: release.description ?? `${releaseDisplayTitle(release)} — a verified release by Akbar Nawasunda.`,
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

  const coverUrl = release.cover ?? resolveCover(release.slug);

  return (
    <Container>
      <PageIntro
        eyebrow={releaseEyebrow(release)}
        title={releaseDisplayTitle(release)}
        lead={release.description}
      />

      {coverUrl ? (
        <figure className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded 1:1 file, served as-is */}
          <img src={coverUrl} alt="" width={800} height={800} />
        </figure>
      ) : null}

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
        <p className={styles.empty}>Tautan mendengarkan untuk rilis ini belum tersedia.</p>
      )}

      <p className={styles.back}>
        <Link href="/music">← Semua musik</Link>
      </p>
    </Container>
  );
}
