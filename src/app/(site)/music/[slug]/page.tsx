import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  ReleasePlate,
  type ReleaseNeighbour,
} from "@/components/content/ReleasePlate";
import {
  coverArtwork,
  resolveCover,
  type CoverArtwork,
} from "@/content/covers";
import {
  getReleaseBySlug,
  releaseDisplayTitle,
  releaseTypeLabel,
  releases,
} from "@/content/releases";
import { pageMetadata } from "@/lib/metadata";
import {
  breadcrumbJsonLd,
  releaseJsonLd,
  serializeJsonLd,
} from "@/lib/structured-data";
import { getReleaseArtwork } from "@/studio/artwork";
import { publicReleaseDate, RELEASE_TYPE_LABELS } from "@/studio/releases";
import { getPublishedRelease, getPublishedReleases } from "@/studio/public";

/**
 * Round 40 (audit P1-5) — the release pages are prerendered.
 *
 * Every route on this site answered `Cache-Control: private, no-cache` because the root site layout
 * reads published design settings per request, and `force-dynamic` was copied onto this page for the
 * same reason even though its own data never needed a request: the catalogue is a static list, and a
 * published Studio release is a row that changes when the owner presses publish, not per visitor.
 *
 * `generateStaticParams` enumerates the whole parameter space up front — the ten catalogue slugs and
 * every published Studio release — so each release is a file at build time. `dynamicParams = false`
 * makes that list the contract: a slug that is not in it is genuinely not a release (404 at the
 * edge, no render), instead of a per-request render that ends in `notFound()`.
 *
 * The Studio half is evaluated at build. A release published *after* the build appears on the next
 * deploy — the same freshness the rest of the content already has, and a deploy is what publishing
 * in this repo has always meant.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const managed = await getPublishedReleases();
  const slugs = new Set<string>([
    ...releases.map((release) => release.slug),
    ...managed.map((item) => item.slug),
  ]);
  return [...slugs].map((slug) => ({ slug }));
}

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

/** Published Studio release first; otherwise the verified static entry; otherwise 404. Drafts never show. */
export async function generateMetadata({
  params,
}: ReleasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const managed = await getPublishedRelease(slug);
  if (managed) {
    return pageMetadata({
      ogSlug: slug,
      title: managed.seoTitle || managed.title,
      description: managed.seoDescription || managed.description || undefined,
      path: `/music/${slug}`,
    });
  }
  const release = getReleaseBySlug(slug);
  // No such release: the page calls notFound(), so keep the title neutral and out of the index.
  if (!release)
    return {
      title: "Rilis tidak ditemukan",
      robots: { index: false, follow: true },
    };
  return pageMetadata({
    ogSlug: release.slug,
    title: releaseDisplayTitle(release),
    description:
      release.description ??
      `${releaseDisplayTitle(release)} — rilis terverifikasi Akbar Nawasunda.`,
    path: `/music/${release.slug}`,
  });
}

/**
 * The catalogue in the owner's own order, for the counter and for the two neighbours.
 *
 * The ordinal printed on the page is a *position*, not a label catalogue number: this catalogue has
 * no such number, and inventing one would be exactly the kind of fiction the content rules forbid.
 * "Katalog 03 / 10" is a statement about the list, and it is true.
 */
function neighbours(slug: string): {
  prev: ReleaseNeighbour | null;
  next: ReleaseNeighbour | null;
} {
  const index = releases.findIndex((release) => release.slug === slug);
  if (index < 0) return { prev: null, next: null };
  const build = (
    entry: (typeof releases)[number] | undefined,
  ): ReleaseNeighbour | null =>
    entry
      ? {
          slug: entry.slug,
          title: entry.title,
          artwork: entry.cover
            ? ({ kind: "image", src: entry.cover } as const)
            : resolveArtwork(entry.slug),
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

  /* ------------------------------------------------------------------ Studio */
  const managed = await getPublishedRelease(slug);
  if (managed) {
    const cover = resolveCover(slug);
    const asset = getReleaseArtwork(managed.artworkId);
    const artwork: CoverArtwork = cover
      ? { kind: "image", src: cover }
      : asset
        ? { kind: "image", src: asset.image.src }
        : coverArtwork(slug);
    const date = publicReleaseDate(managed);

    return (
      <>
        <ReleaseJsonLd
          name={managed.title}
          path={`/music/${slug}`}
          date={date}
          image={artwork.kind === "image" ? artwork.src : null}
          links={managed.links}
        />
        <ReleasePlate
          title={managed.title}
          ordinal={null}
          meta={[RELEASE_TYPE_LABELS[managed.type], date].filter(
            (part): part is string => Boolean(part),
          )}
          description={managed.description || null}
          artwork={artwork}
          links={managed.links.map((link) => ({
            label: link.label,
            href: link.href,
          }))}
          facts={[
            { label: "Judul", value: managed.title },
            { label: "Jenis", value: RELEASE_TYPE_LABELS[managed.type] },
            { label: "Tanggal", value: date },
          ]}
        />
      </>
    );
  }

  /* ---------------------------------------------------------------- catalogue */
  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  const index = releases.findIndex((entry) => entry.slug === release.slug);
  const { prev, next } = neighbours(release.slug);

  return (
    <>
      <ReleaseJsonLd
        name={releaseDisplayTitle(release)}
        path={`/music/${release.slug}`}
        date={null}
        image={artworkSrc(release.slug)}
        links={release.links}
      />
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
          // Round 40 (audit P0-2): a fact without a confirmed value is not passed at all. The plate
          // drops anything null, and drops the whole data sheet when every fact is null.
          ...(release.type
            ? [{ label: "Jenis", value: releaseTypeLabel[release.type] }]
            : []),
          ...(release.year
            ? [{ label: "Tahun", value: String(release.year) }]
            : []),
          ...(release.source
            ? [{ label: "Karya asli", value: release.source }]
            : []),
          ...(release.era ? [{ label: "Era", value: release.era }] : []),
        ]}
        prev={prev}
        next={next}
      />
    </>
  );
}

/**
 * The two `<script type="application/ld+json">` blocks a release page now carries. Serialised through
 * `serializeJsonLd`, which escapes every `<` — React does not escape inside a script element, so a
 * release title containing markup could otherwise close the tag.
 */
function ReleaseJsonLd({
  name,
  path,
  date,
  image,
  links,
}: {
  name: string;
  path: string;
  date: string | null;
  image: string | null;
  links: readonly { href: string }[];
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(
            releaseJsonLd({
              name,
              path,
              datePublished: date,
              image,
              links,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd(path, name)),
        }}
      />
    </>
  );
}

/** The artwork the page actually renders, as a path — null when the sleeve is generated type. */
function artworkSrc(slug: string): string | null {
  const artwork = resolveArtwork(slug);
  return artwork.kind === "image" ? artwork.src : null;
}
