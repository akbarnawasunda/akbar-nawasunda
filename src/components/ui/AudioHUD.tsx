"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "./AudioHUD.module.css";

/**
 * Bottom audio deck — the 48px fixed bar at the foot of every public page.
 *
 * Round 33 (visual self-audit): this component used to be mounted with no props at all, and its
 * first line was `if (!trackTitle) return null` — so the HUD was never in the DOM, on any route.
 * It also shipped a play/pause button and a volume slider for a stream this static site does not
 * own: there is no audio asset in `public/`, no `<audio>` element and no Web Audio graph anywhere.
 * Rather than fake a player, the deck is now honest about what it can actually do:
 *
 * - the ▶ control and the platform label open the verified external stream in a new tab;
 * - the title links to the release page in the archive;
 * - the level slider is a REAL control — it writes `--vu-peak`, which scales the four-bar VU
 *   meter in the header (see SiteHeader.module.css);
 * - × dismisses the deck; the [data-audio-hud] hook lets globals.css reserve its 48px and lift the
 *   phone "Indeks" tab, so the bar never covers the footer or the tab.
 *
 * Everything is derived: the title comes from the same verified release list as the header drawer.
 */
interface AudioHUDProps {
  /** Release currently presented on the deck. */
  trackTitle: string;
  /** In-site destination for the title. */
  trackHref: string;
  /** Verified external stream. */
  listenHref: string;
}

export function AudioHUD({ trackTitle, trackHref, listenHref }: AudioHUDProps) {
  const [level, setLevel] = useState(0.75);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const changeLevel = (value: number) => {
    setLevel(value);
    /* The meter lives in the header, outside this component: one custom property on the root is
       cheaper and more honest than a context for what is a single scalar. The pixel value is
       computed here so the keyframe only has to read a plain length. */
    document.documentElement.style.setProperty("--vu-peak", `${(2 + 14 * value).toFixed(1)}px`);
  };

  return (
    <div
      className={styles.hud}
      data-audio-hud="on"
      role="region"
      aria-label="Dek siaran audio"
      data-level={level.toFixed(2)}
    >
      <div className={styles.hudInner}>
        <a
          className={styles.playPauseBtn}
          href={listenHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Putar ${trackTitle} di platform resmi (membuka tab baru)`}
        >
          <span aria-hidden="true" className={styles.playIcon}>
            ▶
          </span>
        </a>

        <span className={styles.divider} aria-hidden="true">
          {"//"}
        </span>

        <div className={styles.nowPlaying}>
          <span className={styles.nowPlayingLabel}>Siaran:</span>
          <Link href={trackHref} className={styles.trackTitle}>
            {trackTitle}
          </Link>
        </div>

        <span className={styles.divider} aria-hidden="true">
          {"//"}
        </span>

        <div className={styles.volume}>
          <label className={styles.volumeLabel} htmlFor="audio-deck-level">
            [VOL]
          </label>
          <input
            id="audio-deck-level"
            type="range"
            className={styles.volumeSlider}
            min="0"
            max="1"
            step="0.01"
            value={level}
            onChange={(event) => changeLevel(Number(event.target.value))}
            aria-label="Tingkat VU meter"
          />
        </div>

        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setDismissed(true)}
          aria-label="Tutup dek siaran"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
