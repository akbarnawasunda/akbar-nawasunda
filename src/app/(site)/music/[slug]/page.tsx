import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReleasePlate, type ReleaseNeighbour } from "@/components/content/ReleasePlate";
import { coverArtwork, resolveCover, type CoverArtwork } from "@/content/covers";
import {
  getReleaseBySlug,
  releaseDisplayTitle,
  releaseTypeLabel,
  releases,
} from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";

export const dynamic = "force-static";

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

/** Generate static params for all static catalogue releases. */
export async function generateStaticParams() {
  return releases.map((release) => ({ slug: release.slug }));
}

/** Static metadata for static catalogue releases. */
export async function generateMetadata({ params }: ReleasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) return { title: "Rilis tidak ditemukan", robots: { index: false, follow: true } };
  return pageMetadata({
    ogSlug: release.slug,
    title: releaseDisplayTitle(release),
    description:
      release.description ??
      `${releaseDisplayTitle(release)} — rilis terverifikasi Akbar Nawasunda.`,
    path: `/music/${release.slug}`,
  });
}

/** The catalogue in the owner's own order, for the counter and for the two neighbours. */
function neighbours(slug: string): { prev: ReleaseNeighbour | null; next: ReleaseNeighbour | null } {
  const index = releases.findIndex((release) => release.slug === slug);
  if (index < 0) return { prev: null, next: null };
  const build = (entry: (typeof releases)[number] | undefined): ReleaseNeighbour | null =>
    entry
      ? {
          slug: entry.slug,
          title: entry.title,
          artwork: entry.cover ? ({ kind: "image", src: entry.cover } as const) : resolveArtwork(entry.slug),
        }
      : null;
  return {
    prev: build(releases[index - 1]),
    next: build(releases[index + 1]),
  };
}

function resolveArtwork(slug: string): CoverArtwork {
  const cover = resolveCover(slug);
  return cover ? { kind: "image", src: cover } : coverArtwork(slug);
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;

  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  const index = releases.findIndex((entry) => entry.slug === release.slug);
  const { prev, next } = neighbours(release.slug);

  return (
    <ReleasePlate
      title={release.title}
      titleTail={release.source ?? null}
      ordinal={index >= 0 ? String(index + 1).padStart(2, "0") : null}
      total={String(releases.length).padStart(2, "0")}
      meta={[
        release.type ? releaseTypeLabel[release.type] : null,
        release.year ? String(release.year) : null,
        release.era ? `Era ${release.era}` : null,
      ].filter((part): part is string => part !== null)}
      description={release.description ?? null}
      artwork={resolveArtwork(release.slug)}
      links={release.links}
      facts={[
        // Type and year always print: an unconfirmed one shows an em dash rather than vanishing.
        { label: "Jenis", value: release.type ? releaseTypeLabel[release.type] : null },
        { label: "Tahun", value: release.year ? String(release.year) : null },
        // These two only exist when the owner supplied them, so they are absent, not empty.
        ...(release.source ? [{ label: "Karya asli", value: release.source }] : []),
        ...(release.era ? [{ label: "Era", value: release.era }] : []),
      ]}
      prev={prev}
      next={next}
    />
  );
}