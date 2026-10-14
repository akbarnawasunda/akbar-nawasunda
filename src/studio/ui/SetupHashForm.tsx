"use client";

import { useActionState } from "react";

import { generateAdminHashAction } from "../setup-actions";
import { initialFormState } from "../form-state";
import { MIN_ADMIN_PASSWORD_LENGTH } from "../setup";
import styles from "./studio.module.css";

/**
 * Generates the STUDIO_ADMIN_PASSWORD_HASH value without a terminal, so activation can be done from
 * a phone. The server refuses to run this once a hash is already configured.
 */
export function SetupHashForm() {
  const [state, formAction, pending] = useActionState(generateAdminHashAction, initialFormState);
  const result = state.status === "ok" ? state.result : undefined;

  return (
    <form action={formAction} className={styles.section}>
      <p className={styles.lead}>
        Choose the password you will sign in with, and generate the value the server stores. The password itself
        never leaves this form; only the hash below is shown, and only to you.
      </p>

      <div className={styles.field}>
        <label htmlFor="setup-password" className={styles.label}>New administrator password</label>
        <input
          id="setup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_ADMIN_PASSWORD_LENGTH}
          required
          className={styles.input}
        />
        <p className={styles.hint}>At least {MIN_ADMIN_PASSWORD_LENGTH} characters. Three or four words in a row work well.</p>
      </div>

      <div className={styles.field}>
        <label htmlFor="setup-confirmation" className={styles.label}>Type it again</label>
        <input
          id="setup-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={MIN_ADMIN_PASSWORD_LENGTH}
          required
          className={styles.input}
        />
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className={styles.error}>{state.message}</p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Generating…" : "Generate hash"}
        </button>
        <span className={styles.hint}>Takes about a second.</span>
      </div>

      {result ? (
        <div className={`${styles.notice} ${styles.noticeOk}`}>
          <label htmlFor="setup-result" className={styles.label}>{result.label}</label>
          <textarea
            id="setup-result"
            readOnly
            rows={4}
            value={result.value}
            className={styles.codeBlock}
            onFocus={(event) => event.currentTarget.select()}
          />
          <p className={styles.hint}>{result.note}</p>
          <p className={styles.hint}>Tap the box above to select the whole value, copy it, then paste it as the value of the variable on your host.</p>
        </div>
      ) : null}
    </form>
  );
}
