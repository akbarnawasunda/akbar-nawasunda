import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageIntro } from "@/components/content/PageIntro";
import { Container } from "@/components/layout/Container";
import { getReleaseBySlug, releaseTypeLabel, releases } from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import styles from "./release.module.css";

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return releases.map((release) => ({ slug: release.slug }));
}

export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) return { title: "Release not found" };

  return pageMetadata({
    title: release.title,
    description:
      release.description ?? `${releaseTypeLabel[release.type]} by Akbar Nawasunda, ${release.year}.`,
    path: `/music/${release.slug}`,
  });
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;
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
