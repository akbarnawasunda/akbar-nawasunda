"use client";

import { useActionState } from "react";

import { loginAction } from "../actions";
import { initialFormState } from "../form-state";
import styles from "./studio.module.css";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialFormState);

  return (
    <form action={formAction} className={styles.section} style={{ maxWidth: 420 }}>
      <div className={styles.field}>
        <label htmlFor="password" className={styles.label}>Password admin</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={state.status === "error" ? "login-error" : undefined}
        />
      </div>

      {state.status === "error" && state.message ? (
        <p id="login-error" role="alert" className={styles.error}>{state.message}</p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Memproses…" : "Masuk"}
        </button>
      </div>
    </form>
  );
}
