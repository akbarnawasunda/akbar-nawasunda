"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { clearPhotoAction, savePhotoAction } from "@/studio/actions";
import type { FormState } from "@/studio/form-state";
import { PHOTO_SLOTS, type PhotoMeta } from "@/studio/photos";

import styles from "./studio.module.css";

/**
 * Round 26 — the photo slot desk. Three named photograph positions on the public site; each row
 * shows whether the slot carries an owner upload (served at /api/public/foto/<slot>) or is empty,
 * and takes a file or empties the slot again. Everything validates on the server again; the
 * messages here are the same FormState the rest of the studio speaks.
 */

const IDLE: FormState = { status: "idle", message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.button} disabled={pending}>
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

function SlotRow({ slot, meta }: { slot: (typeof PHOTO_SLOTS)[number]; meta: PhotoMeta | undefined }) {
  const [saveState, saveAction] = useActionState(savePhotoAction, IDLE);
  const [clearState, clearAction] = useActionState(clearPhotoAction, IDLE);
  const state = saveState.status !== "idle" ? saveState : clearState;

  return (
    <li className={styles.photoRow}>
      <div>
        <p className={styles.photoName}>
          {slot.label} <code>{slot.id}</code>
        </p>
        <p className={styles.hint}>
          {slot.place} — {meta ? `terisi ${meta.mime}, ${(meta.updatedAt / 1000) | 0 ? new Date(meta.updatedAt).toLocaleDateString("id-ID") : ""}` : "kosong, situs memakai fallback"}
        </p>
      </div>
      <div className={styles.photoForms}>
        <form action={saveAction} className={styles.photoForm}>
          <input type="hidden" name="slot" value={slot.id} />
          <input
            type="file"
            name="file"
            accept="image/webp,image/png,image/jpeg,image/avif"
            required
            className={styles.fileInput}
          />
          <SubmitButton label="Unggah" />
        </form>
        {meta ? (
          <form action={clearAction} className={styles.photoForm}>
            <input type="hidden" name="slot" value={slot.id} />
            <SubmitButton label="Kosongkan" />
          </form>
        ) : null}
      </div>
      {state.status !== "idle" ? (
        <p className={state.status === "ok" ? styles.noticeOk : styles.noticeError} role="status">
          {state.message}
        </p>
      ) : null}
    </li>
  );
}

export function PhotoSlotsForm({ meta }: { meta: readonly PhotoMeta[] }) {
  const bySlot = new Map(meta.map((row) => [row.slot, row]));
  return (
    <ul className={styles.photoList}>
      {PHOTO_SLOTS.map((slot) => (
        <SlotRow key={slot.id} slot={slot} meta={bySlot.get(slot.id)} />
      ))}
    </ul>
  );
}
