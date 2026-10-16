"use client";

import { useActionState } from "react";

import { testAdminPasswordAction } from "../setup-actions";
import { initialFormState } from "../form-state";
import { PasswordInput } from "./PasswordInput";
import styles from "./studio.module.css";

/**
 * Checks a typed password against the stored hash without signing in. Shares the sign-in lockout, so
 * it cannot be used to guess the password any faster than the sign-in form.
 */
export function SetupPasswordTest() {
  const [state, formAction, pending] = useActionState(testAdminPasswordAction, initialFormState);

  return (
    <form action={formAction} className={styles.section}>
      <div className={styles.field}>
        <label htmlFor="test-password" className={styles.label}>Check the password against the stored hash</label>
        <PasswordInput
          id="test-password"
          name="password"
          autoComplete="current-password"
          required
          className={styles.input}
        />
        <p className={styles.hint}>Five wrong tries lock sign-in for 15 minutes, as usual.</p>
      </div>

      {state.status === "ok" && state.message ? (
        <p role="status" className={`${styles.notice} ${styles.noticeOk}`}>{state.message}</p>
      ) : null}
      {state.status === "error" && state.message ? (
        <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>{state.message}</p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" className={`${styles.button} ${styles.buttonSecondary}`} disabled={pending}>
          {pending ? "Checking…" : "Check password"}
        </button>
      </div>
    </form>
  );
}
