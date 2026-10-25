import styles from "./PageMasthead.module.css";

/**
 * The head of an inner page.
 *
 * Four routes share it, so it carries the whole "where am I" job: a numbered mono eyebrow in the
 * accent, the section name at display size, one short line of lead, and a ruled row holding the
 * count and the provenance note. Nothing here is a sheet, a plate or a sticker — it is a page head,
 * and the restraint is the point: the archive below it is the content.
 *
 * The giant figure is decorative (the same count is stated in words in the note), so it is
 * `aria-hidden` — a number read out before the heading is a number with no noun.
 */
export function PageMasthead({
  index,
  title,
  lead,
  figure,
  note,
}: {
  index: string;
  title: string;
  lead?: string;
  figure?: string;
  note?: string;
}) {
  return (
    <header className={styles.head}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{index}</p>
        <h1 className={`${styles.title} ink`}>{title}</h1>

        {lead ? <p className={styles.lead}>{lead}</p> : null}

        {figure || note ? (
          <div className={styles.noteBar}>
            {figure ? (
              <p className={styles.figure} aria-hidden="true">
                {figure} <span>berkas</span>
              </p>
            ) : null}
            {note ? <p className={styles.note}>{note}</p> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
