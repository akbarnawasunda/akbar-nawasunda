/**
 * JSON-LD for the artist, built only from facts that are already verified and rendered on the page:
 * name, roles, genres, origin, the year the alias started, the four confirmed platform URLs and the
 * canonical site URL. Nothing here is guessed — no awards, no labels, no members, no record sales.
 *
 * Rendered as `<script type="application/ld+json">` in the homepage. React does not escape inside a
 * script tag, so the payload is serialised and every `<` is replaced: a `</script>` can never appear.
 */
import { siteConfig } from "@/config/site";
import { socialLinks } from "@/config/socials";

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
    genre: ["Breakbeat", "Indo Bass"],
    foundingDate: String(siteConfig.since),
    foundingLocation: { "@type": "Place", name: "Bandung Barat, Indonesia" },
    ...(imageUrl ? { image: imageUrl } : {}),
    sameAs: socialLinks.map((link) => link.href),
  };
}

/** Serialise for a <script> tag: `<` is escaped so the payload cannot close the element. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
