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
 * The action comes from `releaseStreamingStatus()` — the single helper that decides what a release's
 * streaming state says (Langkah 3m). It is not re-derived here: this file used to answer the same
 * question with its own label ("Halaman rilis"), which is how one fact ended up with three sentences
 * across three surfaces. A recorded link opens on its platform; an unrecorded one prints the
 * catalogue-wide status and points at the release page.
 *
 * What it deliberately does NOT say: anything about distribution. Three releases carry `links: []`,
 * which proves only that no link was recorded — never that the record is undistributed.
 * `docs/PRD.md` §2 has the reasoning; `BANNED_COPY_TERMS` has the enforcement.
 */
import {
  releaseDisplayTitle,
  releaseEyebrow,
  releaseStreamingStatus,
  type Release,
} from "./releases";

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

export function releaseHudModel(release: Release): ReleaseHudModel {
  const status = releaseStreamingStatus(release);
  return {
    slug: release.slug,
    title: releaseDisplayTitle(release),
    eyebrow: releaseEyebrow(release),
    action: { href: status.href, label: status.label, external: status.external },
  };
}
