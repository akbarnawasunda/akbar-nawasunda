"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import styles from "./ReleaseHud.module.css";

/**
 * Bottom Release HUD (DESIGN.md §5) — a release card that stays at the bottom of the homepage.
 *
 * It is **informational**. There is no `<audio>`, no play glyph, no progress bar and no volume
 * control, and that is a product decision recorded in DESIGN.md §5 together with the two documents
 * that forbid a player (`docs/PRD.md` §5 non-goal, `docs/00-PROJECT-FOUNDATION/PROJECT_SCOPE.md`
 * Out of Scope v1). What it does is name the release the homepage is already featuring and hand the
 * reader the one link that release actually has.
 *
 * Why this is a client component, when the owner asked for server-determined content:
 *
 *   The **content** is decided on the server. `page.tsx` reads `releases[0]`, runs it through
 *   `releaseHudModel()` and passes finished strings down as props — this file never touches the
 *   catalogue and cannot invent a title, an eyebrow or a destination.
 *
 *   The **presence** has to be decided at the breakpoint, and the owner was explicit that below
 *   720px the HUD must not exist in the document at all, not merely be hidden with `display: none`.
 *   A server component cannot know the viewport (Next.js does not expose it to RSC without a client
 *   hint header that browsers do not send by default), so the mount is gated here with
 *   `useSyncExternalStore` over `matchMedia`. `getServerSnapshot` returns `false`, which means the
 *   server HTML contains no HUD at ANY width — no flash of a bar at 390px, no hydration mismatch.
 *   The trade-off, stated plainly: with JavaScript disabled, the HUD does not appear on desktop
 *   either. It is a complementary card, not content the page depends on, so losing it is safe.
 *
 * Accessibility: `<aside>` is a complementary landmark with a name, so it is reachable with a
 * landmark jump and skippable with the rest of the chrome. It adds exactly one tab stop (the action
 * link) and it is appended at the end of the page's own DOM order, so the existing focus order above
 * it is untouched.
 *
 * Why it is not on screen at scroll 0 (measured, not guessed): at 1440×900 the card is 70px tall and
 * sits 16px off the bottom, so it occupies y=814–884 — exactly where the hero's logistics strip
 * lands (strip bottom 873.24px, the deliverable of Langkah 3c). A fixed bar that eats the first
 * fold's most deliberate line is a regression dressed as a feature. So the card mounts once the
 * reader has moved past half a screen, and before that it is not in the document at all. It is a
 * complementary extra, which is the one kind of surface that can afford to arrive late.
 */

/** Reveal threshold, as a fraction of the viewport: half a screen of scrolling. */
const REVEAL_AT = 0.5;

/*
 * The reveal gate is a second external store, not an effect that calls `setState`.
 *
 * The first version subscribed in an effect and flipped state inside it; `react-hooks/set-state-in-
 * effect` rejected it, correctly — a synchronous `setState` in an effect body schedules a second
 * render before paint. `useSyncExternalStore` subscribes and reads, so React owns the render and the
 * scroll position is just another source of truth about the outside world.
 */
function subscribePastFold(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

function isPastFold() {
  return window.scrollY > window.innerHeight * REVEAL_AT;
}

function isPastFoldOnServer() {
  return false;
}

export interface ReleaseHudProps {
  /** `releaseDisplayTitle()` of the release, e.g. "Masih Mencintainya — Papinka". */
  title: string;
  /** `releaseEyebrow()`, e.g. "Remix · 2025". */
  eyebrow: string;
  actionHref: string;
  actionLabel: string;
  /** `true` opens the platform in a new tab; `false` is a route on this site. */
  actionExternal: boolean;
  /** Resolved sleeve/cover URL, or `null` when the catalogue has no file for the slug. */
  coverSrc: string | null;
}

const WIDE = "(min-width: 720px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(WIDE);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function isWide() {
  return window.matchMedia(WIDE).matches;
}

/** No HUD in the server HTML: below 720px it must not be in the document, and the server cannot know. */
function isWideOnServer() {
  return false;
}

export function ReleaseHud({
  title,
  eyebrow,
  actionHref,
  actionLabel,
  actionExternal,
  coverSrc,
}: ReleaseHudProps) {
  const wide = useSyncExternalStore(subscribe, isWide, isWideOnServer);
  const revealed = useSyncExternalStore(subscribePastFold, isPastFold, isPastFoldOnServer);

  /* Below 720px, and before the reader has moved past the first fold, this returns null: not in the
     DOM, not in the layout, not in the accessibility tree, not in the tab order. `display: none`
     would keep all four. */
  if (!wide || !revealed) return null;

  const arrow = actionExternal ? "\u2197" : "\u2192";

  return (
    <aside className={styles.hud} aria-label="Rilis sorotan" data-release-hud="">
      {coverSrc ? (
        /* Decorative: the sleeve carries no type (round 19) and the title is set beside it. */
        <Image className={styles.sleeve} src={coverSrc} alt="" width={96} height={96} sizes="48px" />
      ) : (
        <span className={styles.sleeveEmpty} aria-hidden="true" />
      )}

      <div className={styles.body}>
        <p className={styles.eyebrow}>
          <span className={styles.kicker}>Sorotan</span>
          <span aria-hidden="true" className={styles.dot}>
            {"\u00b7"}
          </span>
          {eyebrow}
        </p>
        <p className={styles.title}>{title}</p>
      </div>

      {actionExternal ? (
        <a className={styles.action} href={actionHref} target="_blank" rel="noopener noreferrer">
          {actionLabel}
          <span className="sr-only"> (membuka tab baru)</span>
          <span aria-hidden="true" className={styles.arrow}>
            {arrow}
          </span>
        </a>
      ) : (
        <Link className={styles.action} href={actionHref}>
          {actionLabel}
          <span aria-hidden="true" className={styles.arrow}>
            {arrow}
          </span>
        </Link>
      )}
    </aside>
  );
}
