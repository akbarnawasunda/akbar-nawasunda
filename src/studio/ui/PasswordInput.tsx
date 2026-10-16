"use client";

import { useState, type InputHTMLAttributes } from "react";

import styles from "./studio.module.css";

/**
 * Password field with a "show" toggle. Phone keyboards often capitalize the first letter or
 * auto-correct a password, and a hidden typo can't be seen. Showing it and turning those
 * features off makes the typed value match what the person meant. The value is never sent anywhere
 * except the form it belongs to.
 */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <label className={styles.hint} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.currentTarget.checked)} />
        Tampilkan password
      </label>
    </>
  );
}
