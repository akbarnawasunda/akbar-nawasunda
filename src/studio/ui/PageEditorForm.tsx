"use client";

import { useActionState, useState } from "react";

import { saveOrPublishAction } from "../actions";
import { initialFormState } from "../form-state";
import { LIMITS } from "../validation";
import type { PageDocument, PageSlug } from "../content-model";
import styles from "./studio.module.css";

interface PageEditorFormProps {
  slug: PageSlug;
  initial: PageDocument;
  initialUnpublishedChanges: boolean;
}

function bodyFromSections(doc: PageDocument): string {
  return doc.sections.map((section) => section.text).join("\n\n");
}

export function PageEditorForm({ slug, initial, initialUnpublishedChanges }: PageEditorFormProps) {
  const [state, formAction, pending] = useActionState(saveOrPublishAction, initialFormState);

  // Controlled fields keep their values after a save; the form is not reset by React.
  const [title, setTitle] = useState(initial.title);
  const [lead, setLead] = useState(initial.lead);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [body, setBody] = useState(bodyFromSections(initial));

  const errors = state.status === "error" ? state.errors ?? {} : {};
  const unpublished = state.unpublishedChanges ?? initialUnpublishedChanges;

  return (
    <form action={formAction} className={styles.section} noValidate>
      <input type="hidden" name="slug" value={slug} />

      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>Title</label>
        <input
          id="title"
          name="title"
          className={styles.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby="title-hint title-error"
        />
        <p id="title-hint" className={styles.hint}>{title.trim().length} / {LIMITS.title} characters</p>
        {errors.title ? <p id="title-error" className={styles.error}>{errors.title}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="lead" className={styles.label}>Introduction</label>
        <textarea
          id="lead"
          name="lead"
          className={styles.textarea}
          style={{ minHeight: "6rem" }}
          value={lead}
          onChange={(event) => setLead(event.target.value)}
          aria-invalid={errors.lead ? true : undefined}
          aria-describedby="lead-hint lead-error"
        />
        <p id="lead-hint" className={styles.hint}>Shown under the page title. {lead.length} / {LIMITS.lead}</p>
        {errors.lead ? <p id="lead-error" className={styles.error}>{errors.lead}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="body" className={styles.label}>Body</label>
        <textarea
          id="body"
          name="body"
          className={styles.textarea}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby="body-hint body-error"
        />
        <p id="body-hint" className={styles.hint}>
          Separate paragraphs with a blank line. Up to {LIMITS.paragraphs} paragraphs, {LIMITS.paragraphLength} characters each.
        </p>
        {errors.body ? <p id="body-error" className={styles.error}>{errors.body}</p> : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="seoDescription" className={styles.label}>Search description</label>
        <textarea
          id="seoDescription"
          name="seoDescription"
          className={styles.textarea}
          style={{ minHeight: "5rem" }}
          value={seoDescription}
          onChange={(event) => setSeoDescription(event.target.value)}
          aria-invalid={errors.seoDescription ? true : undefined}
          aria-describedby="seo-hint seo-error"
        />
        <p id="seo-hint" className={styles.hint}>Used by search engines and link previews. Optional. {seoDescription.length} / {LIMITS.seoDescription}</p>
        {errors.seoDescription ? <p id="seo-error" className={styles.error}>{errors.seoDescription}</p> : null}
      </div>

      {errors.form ? <p role="alert" className={styles.error}>{errors.form}</p> : null}

      {state.status === "error" && state.message && !errors.form ? (
        <p role="alert" className={`${styles.notice} ${styles.noticeError}`}>{state.message}</p>
      ) : null}
      {state.status === "ok" && state.message ? (
        <p role="status" className={`${styles.notice} ${styles.noticeOk}`}>{state.message}</p>
      ) : null}

      <p className={styles.muted} aria-live="polite">
        {unpublished ? "The draft differs from the published page." : "The draft matches the published page."}
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
