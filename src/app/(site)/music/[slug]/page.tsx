import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/content/PageIntro";
import { ReleaseView } from "@/components/content/ReleaseView";
import { Container } from "@/components/layout/Container";
import { getReleaseBySlug, releaseTypeLabel } from "@/content/releases";
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
    description: release.description ?? `${releaseTypeLabel[release.type]} by Akbar Nawasunda, ${release.year}.`,
    path: `/music/${release.slug}`,
  });
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;

  const managed = await getPublishedRelease(slug);
  if (managed) {
    return (
      <Container>
        <ReleaseView doc={managed} />
        <p className={styles.back}>
          <Link href="/music">← All music</Link>
        </p>
      </Container>
    );
  }

  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  return (
    <Container>
      <PageIntro
        eyebrow={`${releaseTypeLabel[release.type]} · ${release.year}`}
        title={release.title}
        lead={release.description}
      />

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
        <p className={styles.empty}>Listening links for this release are not available yet.</p>
      )}

      <p className={styles.back}>
        <Link href="/music">← All music</Link>
      </p>
    </Container>
  );
}
