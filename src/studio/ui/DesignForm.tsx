"use client";

import { useActionState, useState } from "react";

import { saveDesignAction } from "../actions";
import { ACCENT_OPTIONS, TITLE_CASE_OPTIONS, type DesignSettings } from "../design";
import { initialFormState } from "../form-state";
import styles from "./studio.module.css";

interface DesignFormProps {
  initial: DesignSettings;
  initialUnpublishedChanges: boolean;
}

/** Closed set of options only. There are no free-text, colour-code or CSS fields. */
export function DesignForm({ initial, initialUnpublishedChanges }: DesignFormProps) {
  const [state, formAction, pending] = useActionState(saveDesignAction, initialFormState);
  const [accent, setAccent] = useState<DesignSettings["accent"]>(initial.accent);
  const [titleCase, setTitleCase] = useState<DesignSettings["titleCase"]>(initial.titleCase);
  const errors = state.status === "error" ? state.errors ?? {} : {};
  const unpublished = state.unpublishedChanges ?? initialUnpublishedChanges;

  return (
    <form action={formAction} className={styles.section} noValidate>
      <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={styles.label}>Warna aksen</legend>
        <p className={styles.hint}>Dipakai untuk hover, garis fokus, dan seleksi teks. Hero beranda dan logo tidak berubah.</p>
        <div className={styles.optionGrid}>
          {Object.values(ACCENT_OPTIONS).map((option) => (
            <label key={option.value} className={styles.optionCard}>
              <input
                type="radio"
                name="accent"
                value={option.value}
                checked={accent === option.value}
                onChange={() => setAccent(option.value)}
              />
              <span className={styles.swatch} style={{ background: option.hex }} aria-hidden="true" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.accent ? <p className={styles.error}>{errors.accent}</p> : null}
      </fieldset>

      <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={styles.label}>Gaya judul halaman</legend>
        <p className={styles.hint}>Berlaku untuk judul halaman dalam (Artist, Music, rilis, kontak).</p>
        <div className={styles.optionGrid}>
          {Object.values(TITLE_CASE_OPTIONS).map((option) => (
            <label key={option.value} className={styles.optionCard}>
              <input
                type="radio"
                name="titleCase"
                value={option.value}
                checked={titleCase === option.value}
                onChange={() => setTitleCase(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.titleCase ? <p className={styles.error}>{errors.titleCase}</p> : null}
      </fieldset>

      {state.status === "error" && state.message ? (
        <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>{state.message}</p>
      ) : null}
      {state.status === "ok" && state.message ? (
        <p role="status" className={`${styles.notice} ${styles.noticeOk}`}>{state.message}</p>
      ) : null}

      <p className={styles.muted} aria-live="polite">
        {unpublished ? "Draf berbeda dari yang dipakai situs publik." : "Draf sama dengan yang dipakai situs publik."}
      </p>

      <div className={styles.actions}>
        <button type="submit" name="intent" value="save" className={`${styles.button} ${styles.buttonSecondary}`} disabled={pending}>
          Simpan draf
        </button>
        <button type="submit" name="intent" value="publish" className={styles.button} disabled={pending}>
          Terbitkan
        </button>
      </div>
    </form>
  );
}
