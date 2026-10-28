/**
 * The data the Bottom Release HUD prints, derived from one `Release` and nothing else.
 *
 * DESIGN.md §5 asks for a HUD whose content comes from real release data instead of a literal
 * typed into the component — "jangan komponen ada tapi selalu `null` karena props tidak dikirim".
 * The way that requirement actually fails in practice is a component with a hard-coded default
 * title behind the prop, so the surface looks right in a demo and silently stops tracking the
 * catalogue. Keeping the derivation in a pure function here means a test can feed it a fixture
 * release and prove every printed field moved, and that no field can ever come back `null`.
 *
 * The action is the only branch:
 *
 *   links[] present → the release's own first link, in the owner's order, opened on the platform.
 *   links[] empty   → the release page on this site, labelled "Halaman rilis".
 *
 * What the second branch deliberately does NOT say: anything about distribution. Three releases in
 * this catalogue carry `links: []` and `docs/PRD.md` §2 is explicit that "tautan belum diisi" and
 * "tidak didistribusikan ke DSP" are different facts, and only the owner can tell them apart. So the
 * fallback label is neutral and points at the release page, never at a claim.
 */
import { releaseDisplayTitle, releaseEyebrow, type Release } from "./releases";

export interface ReleaseHudAction {
  href: string;
  label: string;
  /** `true` → an external platform. `false` → a route on this site. */
  external: boolean;
}

export interface ReleaseHudModel {
  title: string;
  eyebrow: string;
  action: ReleaseHudAction;
  /** Slug of the release the sleeve belongs to; the page resolves the artwork from it. */
  slug: string;
}

/** Neutral, non-claiming label for a release with no recorded links. */
export const RELEASE_HUD_FALLBACK_LABEL = "Halaman rilis";

export function releaseHudModel(release: Release): ReleaseHudModel {
  const first = release.links[0];
  return {
    slug: release.slug,
    title: releaseDisplayTitle(release),
    eyebrow: releaseEyebrow(release),
    action: first
      ? { href: first.href, label: first.label, external: true }
      : { href: `/music/${release.slug}`, label: RELEASE_HUD_FALLBACK_LABEL, external: false },
  };
}
