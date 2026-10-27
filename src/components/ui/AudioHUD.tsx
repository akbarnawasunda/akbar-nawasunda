"use client";

import styles from "./AudioHUD.module.css";

/**
 * Bottom Audio HUD — full-width bar at 48px, shows when a track is playing.
 * Content: [▶] // NOW STREAMING: <track title> // <BPM if available> // [VOL]
 *
 * The HUD is driven entirely by props: there is no local state and no effect, so
 * it never causes a cascading render. Visibility is the parent's decision: pass a
 * `trackTitle` when a track is playing and omit it when nothing is. The playback
 * system (context, localStorage, URL) owns that state and hands it down.
 */
interface AudioHUDProps {
  /** Currently playing track title, or null if nothing is playing */
  trackTitle?: string | null;
  /** Optional BPM */
  bpm?: number | null;
  /** Current volume 0-1 */
  volume?: number;
  /** Whether audio is currently playing */
  isPlaying?: boolean;
  /** Callback when play/pause is toggled */
  onPlayPause?: () => void;
  /** Callback when volume changes */
  onVolumeChange?: (vol: number) => void;
  /** Callback to close/hide the HUD */
  onClose?: () => void;
}

export function AudioHUD({
  trackTitle = null,
  bpm = null,
  volume = 1,
  isPlaying = false,
  onPlayPause,
  onVolumeChange,
  onClose,
}: AudioHUDProps) {
  if (!trackTitle) return null;

  return (
    <div
      className={styles.hud}
      data-playing={isPlaying}
      role="region"
      aria-label="Audio player"
      aria-live="polite"
    >
      <div className={styles.hudInner}>
        <button
          type="button"
          className={styles.playPauseBtn}
          onClick={onPlayPause}
          aria-label={isPlaying ? "Jeda" : "Putar"}
          aria-pressed={isPlaying}
        >
          {isPlaying ? (
            <span aria-hidden="true" className={styles.pauseIcon}>
              ⏸
            </span>
          ) : (
            <span aria-hidden="true" className={styles.playIcon}>
              ▶
            </span>
          )}
        </button>

        <span className={styles.divider} aria-hidden="true">{"//"}</span>

        <div className={styles.nowPlaying}>
          <span className={styles.nowPlayingLabel}>NOW STREAMING:</span>
          <span className={styles.trackTitle}>{trackTitle}</span>
        </div>

        {bpm ? (
          <>
            <span className={styles.divider} aria-hidden="true">{"//"}</span>
            <span className={styles.bpm}>{bpm} BPM</span>
          </>
        ) : null}

        <span className={styles.divider} aria-hidden="true">{"//"}</span>

        <div className={styles.volume}>
          <span className={styles.volumeLabel}>[VOL]</span>
          <input
            type="range"
            className={styles.volumeSlider}
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => onVolumeChange?.(Number(event.target.value))}
            aria-label="Volume"
          />
        </div>

        {onClose ? (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup pemutar"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}