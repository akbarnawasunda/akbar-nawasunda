import styles from "./PageMasthead.module.css";

/**
 * The page head, printed on the identity colour.
 *
 * Four inner pages used to open with the same three lines — a mono eyebrow, a serif title, a grey
 * paragraph — inside a container, on the same near-black as everything else. That is the definition
 * of a generic inner page: the only thing telling you which section you are in was the word at the
 * top. This head is a *sleeve*: a full-bleed sheet of the brand blue with ink type, the section
 * number, and one figure printed at display size. Arrive at /music and the page is blue; arrive at
 * /visuals and the number changes. You know where you are before you read anything.
 *
 * Black on #0087FF is 5.7:1, which is why the type here is ink and never white (3.4:1). It is also
 * the reason the page below can go back to ink without the transition feeling like a mistake: two
 * grounds, one edge.
 *
 * `figure` is decorative (the same count is stated in `note`), so it is `aria-hidden` — a giant "10"
 * read out before the heading would be a number with no noun.
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
        <h1 className={styles.title}>{title}</h1>

        {figure ? (
          <p className={styles.figure} aria-hidden="true">
            {figure}
          </p>
        ) : null}

        {lead ? <p className={styles.lead}>{lead}</p> : null}
        {note ? <p className={styles.note}>{note}</p> : null}
      </div>
    </header>
  );
}
