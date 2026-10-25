"use client";

import { useEffect, useId, useRef, useState } from "react";

import styles from "./BackSide.module.css";

export interface SheetRelease {
  index: string;
  title: string;
  meta: string;
  links: readonly { label: string; href: string }[];
}

export interface SheetData {
  /** Build stamp, printed as the run number. */
  run: string;
  releases: readonly SheetRelease[];
  platforms: readonly { label: string; href: string }[];
  email: string;
  /** Everything the site still needs from the owner, in the owner's terms. */
  open: readonly string[];
  totalLinks: number;
}

/**
 * The back of the sheet.
 *
 * A printed sheet has two sides, and a website never does: you get the designed face and nothing
 * else. This one has a verso, and it is not a menu, a cookie panel or an "about this site" modal —
 * it is the other side of the same print run: the whole catalogue as an index with its real links,
 * every platform, the inks by name, the run number, and the list of things still missing. The
 * unglamorous side of the object, printed in the same ink.
 *
 * Mechanically it is one fixed sheet hinged on its left edge. Turning it is the whole interaction:
 * `rotateY(-104deg)` → `rotateY(0)` with the transform origin at the spine, so the paper swings in
 * from the left the way a page does. Under `prefers-reduced-motion` the sheet arrives without the
 * swing — the state change is the point, the motion is the flourish.
 *
 * It behaves like a dialog: `inert` while closed (so its ten release rows and fourteen platform
 * links are out of the tab order), Escape closes it, focus goes in on open and back to the tab on
 * close, and the page behind it cannot scroll.
 */
export function BackSide({ data }: { data: SheetData }) {
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.dataset.sheet = "open";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      delete root.dataset.sheet;
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className={styles.tab}
        aria-expanded={open}
        aria-controls={sheetId}
        onClick={() => setOpen((value) => !value)}
        data-sheet-toggle
      >
        <span className={styles.tabWord}>Indeks</span>
        <span className={styles.tabMark} aria-hidden="true" />
      </button>

      <div
        id={sheetId}
        ref={sheetRef}
        className={styles.sheet}
        data-open={open ? "true" : "false"}
        role="dialog"
        aria-modal="true"
        aria-label="Indeks — katalog dan lembar data"
        inert={!open}
      >
        <div className={styles.sheetInner}>
          {/* A <div>, not a <header>: a <header> outside main/article is a banner landmark, and the
              site already has one. The sheet is a surface, not a page. */}
          <div className={styles.head}>
            <div className={styles.headBar}>
              <p className={styles.kicker}>
                <span>Indeks</span>
                <span className={styles.kickerRule} aria-hidden="true" />
                <span>lembar data</span>
              </p>
              <button ref={closeRef} type="button" className={styles.close} onClick={close}>
                Tutup lembar <span aria-hidden="true">↺</span>
              </button>
            </div>
            <h2 className={`${styles.title} ink`}>
              Indeks<span aria-hidden="true">.</span>
            </h2>
            <p className={styles.lead}>
              Seluruh katalog dengan tautan aslinya, daftar platform, dan nomor edisi situs ini.
            </p>
            <p className={styles.run}>{data.run}</p>
          </div>

          <div className={styles.columns}>
            <section className={styles.column} aria-labelledby="sheet-katalog">
              <h3 className={styles.columnTitle} id="sheet-katalog">
                Katalog <span className={styles.count}>{String(data.releases.length).padStart(2, "0")}</span>
              </h3>
              <ol className={styles.catalog}>
                {data.releases.map((release) => (
                  <li key={release.index} className={styles.release}>
                    <span className={styles.releaseIndex} aria-hidden="true">
                      {release.index}
                    </span>
                    <span className={styles.releaseBody}>
                      <span className={styles.releaseTitle}>{release.title}</span>
                      <span className={styles.releaseMeta}>{release.meta}</span>
                      {release.links.length > 0 ? (
                        <span className={styles.releaseLinks}>
                          {release.links.map((link) => (
                            <a key={link.href} href={link.href} rel="noopener noreferrer" target="_blank">
                              {link.label}
                              <span aria-hidden="true">↗</span>
                            </a>
                          ))}
                        </span>
                      ) : (
                        <span className={styles.releaseMissing}>Tautan belum ada</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.column} aria-labelledby="sheet-platform">
              <h3 className={styles.columnTitle} id="sheet-platform">
                Platform <span className={styles.count}>{String(data.platforms.length).padStart(2, "0")}</span>
              </h3>
              <ul className={styles.list}>
                {data.platforms.map((platform) => (
                  <li key={platform.href}>
                    <a href={platform.href} rel="noopener noreferrer" target="_blank">
                      <span>{platform.label}</span>
                      <span aria-hidden="true" className={styles.listArrow}>
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
                <li>
                  <a href={`mailto:${data.email}`}>
                    <span>Email · {data.email}</span>
                    <span aria-hidden="true" className={styles.listArrow}>
                      ↗
                    </span>
                  </a>
                </li>
              </ul>

              <h3 className={`${styles.columnTitle} ${styles.spaced}`} id="sheet-open">
                Menunggu pemilik
              </h3>
              <ul className={styles.open} aria-labelledby="sheet-open">
                {data.open.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className={styles.column} aria-labelledby="sheet-colophon">
              <h3 className={styles.columnTitle} id="sheet-colophon">
                Kolofon
              </h3>
              <dl className={styles.colophon}>
                <div>
                  <dt>Tinta</dt>
                  <dd className={styles.inks}>
                    <span className={styles.swatch} data-ink="brand" aria-hidden="true" />
                    <span>Cyan cetak #2E8C86</span>
                  </dd>
                </div>
                <div>
                  <dt>&nbsp;</dt>
                  <dd className={styles.inks}>
                    <span className={styles.swatch} data-ink="red" aria-hidden="true" />
                    <span>Merah poster #C93A22</span>
                  </dd>
                </div>
                <div>
                  <dt>&nbsp;</dt>
                  <dd className={styles.inks}>
                    <span className={styles.swatch} data-ink="ink" aria-hidden="true" />
                    <span>Tinta hitam #050507</span>
                  </dd>
                </div>
                <div>
                  <dt>Kertas</dt>
                  <dd>#E8E6E1</dd>
                </div>
                <div>
                  <dt>Huruf</dt>
                  <dd>Excess-V-Straight · Psychlone-Straight · Relidux · Impact-Label · Marse-loup</dd>
                </div>
                <div>
                  <dt>Tautan</dt>
                  <dd>{data.totalLinks} tautan resmi, semuanya menuju kanal pemilik</dd>
                </div>
                <div>
                  <dt>Cetakan</dt>
                  <dd className={styles.run}>{data.run}</dd>
                </div>
              </dl>
              <p className={styles.footnote}>
                Tidak ada angka pendengar, tidak ada penghargaan, tidak ada rilis yang tidak
                diserahkan pemiliknya. Yang belum ada ditulis apa adanya.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
