/**
 * Music catalogue data model.
 *
 * `releases` must only contain verified entries supplied by the artist or their team.
 * It is intentionally empty until that information is confirmed; do not add placeholder
 * releases, dates or streaming links.
 */

export type ReleaseType = "single" | "ep" | "album" | "remix" | "mix";

export interface ReleaseLink {
  label: string;
  /** Official URL only (streaming, purchase or label page). */
  href: string;
}

export interface Release {
  /** URL segment under /music. Must be unique and URL-safe. */
  slug: string;
  title: string;
  type: ReleaseType;
  year: number;
  description?: string;
  links: readonly ReleaseLink[];
}

export const releases: readonly Release[] = [];

export function getReleaseBySlug(slug: string): Release | undefined {
  return releases.find((release) => release.slug === slug);
}

export const releaseTypeLabel: Record<ReleaseType, string> = {
  single: "Single",
  ep: "EP",
  album: "Album",
  remix: "Remix",
  mix: "Mix",
};
