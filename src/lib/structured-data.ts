/**
 * JSON-LD for the artist, built only from facts that are already verified and rendered on the page:
 * name, roles, genres, origin, the year the alias started, the fourteen confirmed platform URLs and
 * the canonical site URL. Nothing here is guessed — no awards, no labels, no members, no record
 * sales. `sameAs` is what lets a search engine reconcile the artist across services, so it carries
 * both the listening services and the social profiles.
 *
 * Rendered as `<script type="application/ld+json">` in the homepage. React does not escape inside a
 * script tag, so the payload is serialised and every `<` is replaced: a `</script>` can never appear.
 */
import { genres, siteConfig } from "@/config/site";
import { allLinks } from "@/config/socials";

export interface JsonLd {
  "@context": "https://schema.org";
  "@type": "MusicGroup";
  name: string;
  alternateName: string;
  url: string;
  description: string;
  genre: readonly string[];
  foundingDate: string;
  foundingLocation: { "@type": "Place"; name: string };
  image?: string;
  sameAs: readonly string[];
}

export function artistJsonLd(imageUrl?: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: siteConfig.name,
    alternateName: "DJ Akbar Remix",
    url: siteConfig.url,
    description: siteConfig.description,
    genre: [...genres],
    foundingDate: String(siteConfig.since),
    foundingLocation: { "@type": "Place", name: "Bandung Barat, Indonesia" },
    ...(imageUrl ? { image: imageUrl } : {}),
    sameAs: allLinks.map((link) => link.href),
  };
}

/** Serialise for a <script> tag: `<` is escaped so the payload cannot close the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/* ------------------------------------------------------------------ release pages (round 40) */

/**
 * Structured data for a single release.
 *
 * Round 40 (audit P1-4): all fourteen release pages shipped with zero JSON-LD. The homepage had a
 * `MusicGroup` block and nothing else, so a search engine had the artist but no idea the artist had
 * records — the one piece of markup that turns a list of pages into a discography.
 *
 * The same rule as the homepage block applies, and it is the reason this is a builder instead of a
 * literal: **only facts the page itself prints**. A release with no confirmed date gets no
 * `datePublished`; a release with no artwork gets no `image`; a release with no streaming link gets
 * no `sameAs`. Emitting a plausible-but-unverified `datePublished` would be the structured-data
 * equivalent of the `Tahun —` rows the plate used to print, and this audit removed those.
 */
export interface MusicRecordingJsonLd {
  "@context": "https://schema.org";
  "@type": "MusicRecording";
  name: string;
  url: string;
  byArtist: { "@type": "MusicGroup"; name: string; url: string };
  datePublished?: string;
  image?: string;
  sameAs?: readonly string[];
}

export interface ReleaseJsonLdInput {
  /** The name the page prints as its title. */
  name: string;
  /** Canonical path, e.g. "/music/lali-dalane". */
  path: string;
  /** ISO 8601 date, only when the release date is verified. */
  datePublished?: string | null;
  /** Artwork path as the page renders it ("/assets/covers/…"). */
  image?: string | null;
  /** Official listening links; anything not a URL is dropped rather than guessed. */
  links?: readonly { href: string }[];
}

const absolute = (path: string): string =>
  path.startsWith("http")
    ? path
    : `${siteConfig.url.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;

export function releaseJsonLd({
  name,
  path,
  datePublished,
  image,
  links = [],
}: ReleaseJsonLdInput): MusicRecordingJsonLd {
  const sameAs = links
    .map((link) => link.href)
    .filter((href) => /^https:\/\//.test(href));
  return {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name,
    url: absolute(path),
    byArtist: {
      "@type": "MusicGroup",
      name: siteConfig.name,
      url: absolute("/"),
    },
    ...(datePublished ? { datePublished } : {}),
    ...(image ? { image: absolute(image) } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export interface BreadcrumbJsonLd {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
}

/**
 * Breadcrumb trail, written positionally so the markup can never disagree with the links on screen.
 *
 * "Diskografi" is the label the site uses for `/music` (the route keeps its old path; the visible
 * word is the one in the nav), and the last crumb is the release itself — the current page, which
 * schema.org still expects in the list.
 */
export function breadcrumbJsonLd(path: string, name: string): BreadcrumbJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Beranda",
        item: absolute("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Diskografi",
        item: absolute("/music"),
      },
      { "@type": "ListItem", position: 3, name, item: absolute(path) },
    ],
  };
}
