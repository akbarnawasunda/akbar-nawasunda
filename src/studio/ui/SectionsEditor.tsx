"use client";

import { useState } from "react";

import {
  MUSIC_LIST_COUNTS,
  PAGE_CONFIG,
  SECTION_TYPE_LABELS,
  type PageSection,
  type PageSlug,
  type SectionType,
} from "../content-model";
import styles from "./studio.module.css";

/** Editor-side row. `key` is only for React; it is never sent to the server. */
interface Row {
  key: string;
  type: SectionType;
  visible: boolean;
  text: string;
  heading: string;
  count: (typeof MUSIC_LIST_COUNTS)[number];
}

let counter = 0;
function nextKey(): string {
  counter += 1;
  return `row-${Date.now().toString(36)}-${counter}`;
}

function toRow(section: PageSection): Row {
  return {
    key: nextKey(),
    type: section.type,
    visible: section.visible,
    text: section.type === "music-list" ? "" : section.text,
    heading: section.type === "music-list" ? section.heading : "",
    count: section.type === "music-list" ? section.count : 6,
  };
}

function emptyRow(type: SectionType): Row {
  return { key: nextKey(), type, visible: true, text: "", heading: "", count: 6 };
}

function serialize(rows: Row[]): string {
  return JSON.stringify(
    rows.map((row) => {
      if (row.type === "music-list") {
        return { type: row.type, visible: row.visible, heading: row.heading, count: row.count };
      }
      return { type: row.type, visible: row.visible, text: row.text };
    }),
  );
}

interface SectionsEditorProps {
  slug: PageSlug;
  initial: PageSection[];
  errors: Record<string, string>;
  disabled?: boolean;
  /** Per-page label and hint from PAGE_CONFIG.editor (e.g. "Bio panjang" on /artist). */
  label?: string;
  hint?: string;
}

/**
 * Structured section editor. Adds, reorders, hides and removes sections. Only the section types the
 * page supports are offered. The browser sends JSON; the server validates every field again.
 */
export function SectionsEditor({
  slug,
  initial,
  errors,
  disabled = false,
  label,
  hint,
}: SectionsEditorProps) {
  const config = PAGE_CONFIG[slug];
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [newType, setNewType] = useState<SectionType>(config.sectionTypes[0]);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const move = (index: number, delta: -1 | 1) =>
    setRows((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const a = current[index];
      const b = current[target];
      if (!a || !b) return current;
      return current.map((row, i) => (i === index ? b : i === target ? a : row));
    });

  const remove = (index: number) => setRows((current) => current.filter((_, i) => i !== index));

  const add = () => {
    if (rows.length >= config.maxSections) return;
    setRows((current) => [...current, emptyRow(newType)]);
  };

  const sectionsError = errors.sections;

  return (
    <div className={styles.field}>
      <input type="hidden" name="sections" value={serialize(rows)} />
      <p className={styles.label} id="sections-label">
        {label ?? "Sections"} ({rows.length} dari {config.maxSections})
      </p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {rows.length === 0 ? (
        <p className={styles.hint}>
          Belum ada bagian. Tambahkan di bawah. Halaman publik tetap memakai konten bawaannya sampai
          ada yang diterbitkan.
        </p>
      ) : null}
      {sectionsError ? <p className={styles.error} role="alert">{sectionsError}</p> : null}

      <ol className={styles.sectionList} aria-labelledby="sections-label">
        {rows.map((row, index) => {
          const error = errors[`section-${index}`];
          const position = index + 1;
          const id = `section-${index}`;
          return (
            <li key={row.key} className={styles.sectionItem}>
              <div className={styles.row}>
                <p className={styles.sectionTitle}>
                  {position}. {SECTION_TYPE_LABELS[row.type]}
                  {!row.visible ? <span className={styles.muted}> · disembunyikan</span> : null}
                </p>
                <div className={styles.actions}>
                  <button type="button" className={styles.smallButton} onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Pindahkan bagian ${position} ke atas`}>↑</button>
                  <button type="button" className={styles.smallButton} onClick={() => move(index, 1)} disabled={disabled || index === rows.length - 1} aria-label={`Pindahkan bagian ${position} ke bawah`}>↓</button>
                  <button type="button" className={styles.smallButton} onClick={() => remove(index)} disabled={disabled} aria-label={`Hapus bagian ${position}`}>Hapus</button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`${id}-type`}>Jenis</label>
                <select
                  id={`${id}-type`}
                  className={styles.input}
                  value={row.type}
                  disabled={disabled}
                  onChange={(event) => update(index, { type: event.target.value as SectionType })}
                >
                  {config.sectionTypes.map((type) => (
                    <option key={type} value={type}>{SECTION_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </div>

              {row.type === "heading" ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${id}-text`}>Teks judul</label>
                  <input
                    id={`${id}-text`}
                    className={styles.input}
                    value={row.text}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(event) => update(index, { text: event.target.value })}
                  />
                </div>
              ) : null}

              {row.type === "paragraph" ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`${id}-text`}>Paragraf</label>
                  <textarea
                    id={`${id}-text`}
                    className={styles.textarea}
                    style={{ minHeight: "8rem" }}
                    value={row.text}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(event) => update(index, { text: event.target.value })}
                  />
                </div>
              ) : null}

              {row.type === "music-list" ? (
                <>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`${id}-heading`}>Judul di atas daftar (opsional)</label>
                    <input
                      id={`${id}-heading`}
                      className={styles.input}
                      value={row.heading}
                      disabled={disabled}
                      onChange={(event) => update(index, { heading: event.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={`${id}-count`}>Jumlah rilis</label>
                    <select
                      id={`${id}-count`}
                      className={styles.input}
                      value={row.count}
                      disabled={disabled}
                      onChange={(event) => update(index, { count: Number(event.target.value) as Row["count"] })}
                    >
                      {MUSIC_LIST_COUNTS.map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                    <p className={styles.hint}>Menampilkan rilis terbit terbaru. Tidak ada yang muncul bila belum ada rilis terbit.</p>
                  </div>
                </>
              ) : null}

              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={row.visible}
                  disabled={disabled}
                  onChange={(event) => update(index, { visible: event.target.checked })}
                />
                <span>Tampilkan bagian ini di situs publik</span>
              </label>

              {error ? <p id={`${id}-error`} className={styles.error}>{error}</p> : null}
            </li>
          );
        })}
      </ol>

      <div className={styles.addRow}>
        <label className={styles.label} htmlFor="new-section-type">Jenis bagian baru</label>
        <select
          id="new-section-type"
          className={styles.input}
          value={newType}
          disabled={disabled}
          onChange={(event) => setNewType(event.target.value as SectionType)}
        >
          {config.sectionTypes.map((type) => (
            <option key={type} value={type}>{SECTION_TYPE_LABELS[type]}</option>
          ))}
        </select>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={add}
          disabled={disabled || rows.length >= config.maxSections}
        >
          Tambah bagian
        </button>
      </div>
    </div>
  );
}
