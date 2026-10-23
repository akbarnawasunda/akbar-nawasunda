"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createReleaseAction, saveReleaseAction } from "../actions";
import { initialFormState } from "../form-state";
import { MAX_RELEASE_LINKS, RELEASE_LIMITS, RELEASE_TYPE_LABELS, RELEASE_TYPES, slugify, type ReleaseDocument, type ReleaseKind } from "../releases";
import type { ReleaseArtworkOption } from "../artwork";
import styles from "./studio.module.css";

interface LinkRow {
  key: number;
  label: string;
  href: string;
}

interface ReleaseEditorFormProps {
  mode: "create" | "edit";
  slug: string;
  initial: ReleaseDocument | null;
  artwork: ReleaseArtworkOption[];
  publishedNow: boolean;
  unpublishedChanges: boolean;
}

const EMPTY: ReleaseDocument = {
  title: "",
  type: "unknown",
  releaseDate: null,
  dateVerified: false,
  description: "",
  artworkId: null,
  links: [],
  seoTitle: "",
  seoDescription: "",
};

let linkCounter = 0;
const newLink = (label = "", href = ""): LinkRow => ({ key: ++linkCounter, label, href });

export function ReleaseEditorForm({ mode, slug, initial, artwork, publishedNow, unpublishedChanges }: ReleaseEditorFormProps) {
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createReleaseAction : saveReleaseAction,
    initialFormState,
  );
  const doc = initial ?? EMPTY;

  const [title, setTitle] = useState(doc.title);
  const [newSlug, setNewSlug] = useState("");
  const [type, setType] = useState<ReleaseKind>(doc.type);
  const [releaseDate, setReleaseDate] = useState(doc.releaseDate ?? "");
  const [dateVerified, setDateVerified] = useState(doc.dateVerified);
  const [description, setDescription] = useState(doc.description);
  const [artworkId, setArtworkId] = useState(doc.artworkId ?? "");
  const [links, setLinks] = useState<LinkRow[]>(() => doc.links.map((link) => newLink(link.label, link.href)));
  const [seoTitle, setSeoTitle] = useState(doc.seoTitle);
  const [seoDescription, setSeoDescription] = useState(doc.seoDescription);

  const errors = state.status === "error" ? state.errors ?? {} : {};
  const isUnpublished = state.unpublishedChanges ?? unpublishedChanges;

  const linksJson = JSON.stringify(links.map((link) => ({ label: link.label, href: link.href })));

  return (
    <form action={formAction} className={styles.section} noValidate>
      {mode === "edit" ? <input type="hidden" name="slug" value={slug} /> : null}
      <input type="hidden" name="links" value={linksJson} />

      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>Title</label>
        <input id="title" name="title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby="title-error" />
        {errors.title ? <p id="title-error" className={styles.error}>{errors.title}</p> : null}
      </div>

      {mode === "create" ? (
        <div className={styles.field}>
          <label htmlFor="slug" className={styles.label}>Address (slug)</label>
          <input
            id="slug"
            name="slug"
            className={styles.input}
            value={newSlug}
            placeholder={title ? `Leave empty to use: ${slugify(title) || "(enter a title)"}` : "e.g. night-frequency-remix"}
            onChange={(e) => setNewSlug(e.target.value)}
            aria-invalid={errors.slug ? true : undefined}
            aria-describedby="slug-hint slug-error"
          />
          <p id="slug-hint" className={styles.hint}>Public address: /music/&lt;slug&gt;. Lowercase letters, numbers and hyphens. It cannot be changed after creation.</p>
          {errors.slug ? <p id="slug-error" className={styles.error}>{errors.slug}</p> : null}
        </div>
      ) : (
        <div className={styles.field}>
          <p className={styles.label}>Address</p>
          <p className={styles.hint}>/music/{slug} (fixed after creation)</p>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="type" className={styles.label}>Type</label>
          <select id="type" name="type" className={styles.input} value={type} onChange={(e) => setType(e.target.value as ReleaseKind)} aria-invalid={errors.type ? true : undefined}>
            {RELEASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "unknown" ? "Rilis (jenis belum diverifikasi)" : RELEASE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {errors.type ? <p className={styles.error}>{errors.type}</p> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="releaseDate" className={styles.label}>Release date (only if verified)</label>
          <input id="releaseDate" name="releaseDate" type="date" className={styles.input} value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} aria-invalid={errors.releaseDate ? true : undefined} aria-describedby="date-hint date-error" />
          <label className={styles.checkRow}>
            <input type="checkbox" name="dateVerified" checked={dateVerified} onChange={(e) => setDateVerified(e.target.checked)} />
            <span>Date verified against an official source</span>
          </label>
          <p id="date-hint" className={styles.hint}>Leave empty if unknown. The date is shown publicly only when verified.</p>
          {errors.releaseDate ? <p id="date-error" className={styles.error}>{errors.releaseDate}</p> : null}
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="description" className={styles.label}>Description</label>
        <textarea id="description" name="description" className={styles.textarea} style={{ minHeight: "7rem" }} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={errors.description ? true : undefined} aria-describedby="description-hint description-error" />
        <p id="description-hint" className={styles.hint}>{description.length} / {RELEASE_LIMITS.description}</p>
        {errors.description ? <p id="description-error" className={styles.error}>{errors.description}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="artworkId" className={styles.label}>Artwork</label>
        <select id="artworkId" name="artworkId" className={styles.input} value={artworkId} onChange={(e) => setArtworkId(e.target.value)} aria-describedby="artwork-hint" aria-invalid={errors.artworkId ? true : undefined}>
          <option value="">No artwork</option>
          {artwork.map((option) => (
            <option key={option.id} value={option.id}>{option.label} (repository asset)</option>
          ))}
        </select>
        <p id="artwork-hint" className={styles.hint}>
          {artwork.length === 0
            ? "No repository artwork is approved for releases yet. Uploading new artwork needs object storage, which is not connected."
            : "Only repository assets approved for release artwork are listed. Uploaded media is not available yet."}
        </p>
        {errors.artworkId ? <p className={styles.error}>{errors.artworkId}</p> : null}
      </div>

      <fieldset className={styles.field} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={styles.label}>Listening and purchase links (https only)</legend>
        {links.length === 0 ? <p className={styles.hint}>No links yet. Add official links only.</p> : null}
        {links.map((link, index) => (
          <div key={link.key} className={styles.linkRow}>
            <input className={styles.input} aria-label={`Link ${index + 1} label`} placeholder="Label, e.g. Streaming" value={link.label} onChange={(e) => setLinks((c) => c.map((l) => (l.key === link.key ? { ...l, label: e.target.value } : l)))} />
            <input className={styles.input} aria-label={`Link ${index + 1} address`} placeholder="https://" value={link.href} inputMode="url" onChange={(e) => setLinks((c) => c.map((l) => (l.key === link.key ? { ...l, href: e.target.value } : l)))} />
            <button type="button" className={styles.smallButton} onClick={() => setLinks((c) => c.filter((l) => l.key !== link.key))} aria-label={`Remove link ${index + 1}`}>Remove</button>
          </div>
        ))}
        {errors.links ? <p className={styles.error}>{errors.links}</p> : null}
        <div>
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={() => setLinks((c) => [...c, newLink()])} disabled={links.length >= MAX_RELEASE_LINKS}>
            Add link
          </button>
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="seoTitle" className={styles.label}>Search title (optional)</label>
        <input id="seoTitle" name="seoTitle" className={styles.input} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} aria-invalid={errors.seoTitle ? true : undefined} />
        <p className={styles.hint}>{seoTitle.length} / {RELEASE_LIMITS.seoTitle}</p>
        {errors.seoTitle ? <p className={styles.error}>{errors.seoTitle}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="releaseSeoDescription" className={styles.label}>Search description (optional)</label>
        <textarea id="releaseSeoDescription" name="seoDescription" className={styles.textarea} style={{ minHeight: "5rem" }} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} aria-invalid={errors.seoDescription ? true : undefined} />
        <p className={styles.hint}>{seoDescription.length} / {RELEASE_LIMITS.seoDescription}</p>
        {errors.seoDescription ? <p className={styles.error}>{errors.seoDescription}</p> : null}
      </div>

      {errors.form ? <p role="alert" className={styles.error}>{errors.form}</p> : null}
      {state.status === "error" && state.message && !errors.form ? (
        <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>{state.message}</p>
      ) : null}
      {state.status === "ok" && state.message ? (
        <p role="status" className={`${styles.notice} ${styles.noticeOk}`}>{state.message}</p>
      ) : null}

      {mode === "edit" ? (
        <p className={styles.muted} aria-live="polite">
          {publishedNow
            ? isUnpublished ? "Published, with unpublished draft changes." : "Published. The draft matches the public page."
            : "Not published. Only you can see this release."}
        </p>
      ) : null}

      {mode === "create" ? (
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={pending}>Create draft</button>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="submit" name="intent" value="save" className={`${styles.button} ${styles.buttonSecondary}`} disabled={pending}>Save draft</button>
          <button type="submit" name="intent" value="publish" className={styles.button} disabled={pending}>Publish</button>
          {publishedNow ? (
            <button type="submit" name="intent" value="unpublish" className={`${styles.button} ${styles.buttonSecondary}`} disabled={pending}>Unpublish</button>
          ) : null}
          <Link href={`/studio/preview/release/${slug}`} className={styles.link}>Preview draft</Link>
        </div>
      )}
    </form>
  );
}
