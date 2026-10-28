"use client";

import { useEffect, useRef, useState } from "react";

import { contactEmail } from "@/config/socials";
import styles from "./BookingCopy.module.css";

/**
 * The header's booking control (DESIGN.md §5): one click copies the contact address and the button
 * says so. No mail client, no form, no modal.
 *
 * The address is `contactEmail` from `src/config/socials.ts` — the same published address booking,
 * press and licensing already share. There is no separate booking inbox in this repo, so nothing
 * here invents one; if the owner ever splits it, this component takes an `email` prop and the call
 * site passes the new field.
 *
 * Three states, and the third one is the reason this is not a five-line component:
 *
 *   idle    — "BOOKING" (a copy glyph on phones).
 *   copied  — "✓ EMAIL DISALIN" for 1.8 s, then back to idle. Only `opacity` and `transform`
 *             move; both labels share one grid cell, so the button never changes width and the
 *             bar never reflows. Under `prefers-reduced-motion` the swap is instant.
 *   failed  — the Clipboard API is missing, blocked, or the write was rejected. The button says
 *             nothing changed and a hairline panel under the bar shows the address as selectable
 *             text (`user-select: all`), so the visitor can still copy it by hand. Silently
 *             pretending to have copied would be the worst outcome of the three.
 *
 * Accessibility: the visible label and the accessible name always match (WCAG 2.5.3 — a screen
 * reader user and a voice-control user hear/say the same word), the copied state is announced
 * through a polite live region, and the failure is announced the same way.
 */

/** How long "EMAIL DISALIN" stays up before the button returns to its resting label. */
const CONFIRM_MS = 1800;

type CopyState = "idle" | "copied" | "failed";

export function BookingCopy({ email = contactEmail }: { email?: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);

  /* One timer, always cancelled: a double click must not leave a stale run behind that flips the
     label back to idle 200 ms after the second copy. */
  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => clear, []);

  /* The failure panel is dismissable, because it is the one state that does not expire. */
  useEffect(() => {
    if (state !== "failed") return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setState("idle");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setState("idle");
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [state]);

  const copy = async () => {
    clear();
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("clipboard-api-unavailable");
      }
      await navigator.clipboard.writeText(email);
      setState("copied");
      timer.current = window.setTimeout(() => {
        setState("idle");
        timer.current = null;
      }, CONFIRM_MS);
    } catch {
      setState("failed");
    }
  };

  /*
   * The name follows the visible label, per state. `label-content-name-mismatch` is the axe rule
   * that catches a name which drops the words on screen; keeping them in every branch means the
   * rule cannot pass by accident on load and fail in the state the user actually sees.
   */
  const name =
    state === "copied"
      ? `Email disalin: ${email}`
      : state === "failed"
        ? `Booking — clipboard diblokir, salin manual: ${email}`
        : `Booking — salin alamat email ke clipboard: ${email}`;

  /*
   * `data-copy-state`, not `data-state`: `data-state` already means "which phase of its own machine
   * is this element in" for the loading curtain, the monogram and the header bar, and
   * `scripts/qa-motion.mjs` finds the curtain with `[data-state="playing"], [data-state="idle"]`.
   * An idle booking button carrying `data-state="idle"` was therefore selected as the curtain and
   * the monogram check went red while the monogram was fine. One attribute, one meaning.
   */
  return (
    <div ref={wrap} className={styles.wrap} data-copy-state={state}>
      <button
        type="button"
        className={styles.control}
        data-booking-copy=""
        data-copy-state={state}
        aria-label={name}
        onClick={() => {
          void copy();
        }}
      >
        <span aria-hidden="true" className={styles.glyph}>
          <span className={styles.glyphIdle} />
          <span className={styles.glyphDone}>{"\u2713"}</span>
        </span>
        <span className={styles.labels}>
          <span className={styles.labelIdle}>Booking</span>
          <span className={styles.labelDone}>
            <span aria-hidden="true">{"\u2713"} </span>Email disalin
          </span>
        </span>
      </button>

      <span role="status" aria-live="polite" className="sr-only" data-booking-status="">
        {state === "copied"
          ? `Email booking disalin ke clipboard: ${email}`
          : state === "failed"
            ? "Clipboard diblokir di browser ini. Alamat email ditampilkan di bawah tombol untuk disalin manual."
            : ""}
      </span>

      {state === "failed" ? (
        <div className={styles.fallback} data-booking-fallback="">
          <p className={styles.fallbackLine}>
            <span className={styles.fallbackLabel}>Salin manual:</span>{" "}
            <span className={styles.fallbackEmail}>{email}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
