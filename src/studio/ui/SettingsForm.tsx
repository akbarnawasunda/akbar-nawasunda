"use client";

import { useActionState } from "react";

import { saveSettingsAction } from "../actions";
import { ARTIST_LIMITS, socialLinksToText, type ArtistSettings } from "../artist-settings";
import { initialFormState } from "../form-state";
import styles from "./studio.module.css";

interface SettingsFormProps {
  initial: ArtistSettings;
  initialUnpublishedChanges: boolean;
}

/** Artist name, role line, and social links. Blank fields keep the current site wording. */
export function SettingsForm({ initial, initialUnpublishedChanges }: SettingsFormProps) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, initialFormState);
  const errors = state.status === "error" ? state.errors ?? {} : {};
  const unpublished = state.unpublishedChanges ?? initialUnpublishedChanges;

  return (
    <form action={formAction} className={styles.section} noValidate>
      <div className={styles.field}>
        <label htmlFor="artistName" className={styles.label}>Artist name</label>
        <p className={styles.hint}>Leave blank to keep the current site name. Up to {ARTIST_LIMITS.artistName} characters.</p>
        <input
          id="artistName"
          name="artistName"
          type="text"
          className={styles.input}
          defaultValue={initial.artistName}
          maxLength={ARTIST_LIMITS.artistName}
          autoComplete="off"
          aria-invalid={errors.artistName ? "true" : undefined}
          aria-describedby={errors.artistName ? "artistName-error" : undefined}
        />
        {errors.artistName ? <p id="artistName-error" className={styles.error}>{errors.artistName}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="role" className={styles.label}>Role line</label>
        <p className={styles.hint}>Leave blank to keep the current wording. Up to {ARTIST_LIMITS.role} characters.</p>
        <input
          id="role"
          name="role"
          type="text"
          className={styles.input}
          defaultValue={initial.role}
          maxLength={ARTIST_LIMITS.role}
          autoComplete="off"
          aria-invalid={errors.role ? "true" : undefined}
          aria-describedby={errors.role ? "role-error" : undefined}
        />
        {errors.role ? <p id="role-error" className={styles.error}>{errors.role}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="socialLinks" className={styles.label}>Social links</label>
        <p className={styles.hint}>
          One per line, in the form <strong>Label | https://address</strong>. Only https:// addresses are accepted. Up to {ARTIST_LIMITS.socialLinks} links.
        </p>
        <textarea
          id="socialLinks"
          name="socialLinks"
          className={styles.textarea}
          defaultValue={socialLinksToText(initial.socialLinks)}
          rows={6}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-invalid={errors.socialLinks ? "true" : undefined}
          aria-describedby={errors.socialLinks ? "socialLinks-error" : undefined}
        />
        {errors.socialLinks ? <p id="socialLinks-error" className={styles.error}>{errors.socialLinks}</p> : null}
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>{state.message}</p>
      ) : null}
      {state.status === "ok" && state.message ? (
        <p role="status" className={`${styles.notice} ${styles.noticeOk}`}>{state.message}</p>
      ) : null}

      <p className={styles.muted} aria-live="polite">
        {unpublished ? "The draft differs from what is published." : "The draft matches what is published."}
      </p>

      <div className={styles.actions}>
        <button type="submit" name="intent" value="save" className={`${styles.button} ${styles.buttonSecondary}`} disabled={pending}>
          Save draft
        </button>
        <button type="submit" name="intent" value="publish" className={styles.button} disabled={pending}>
          Publish
        </button>
      </div>
    </form>
  );
}
