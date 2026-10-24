"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { anMark } from "@/assets/web";
import { primaryNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { listenUrl } from "@/config/socials";
import styles from "./SiteHeader.module.css";

/**
 * Site header: 64px sticky bar, AN mark at 32px with 8px clear space, mono navigation, Listen pill.
 *
 * Below 720px the links move into a full-screen drawer that traps Tab inside it, closes on Escape,
 * closes after navigation, and returns focus to the toggle.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  /**
   * Two states, one listener, no layout reads per frame: the bar is 72px at rest and 56px once the
   * page has moved, and it hides while the reader is scrolling down and returns on the first upward
   * tick. `data-*` on the header drives the CSS; the positions are written once inside a rAF.
   */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      header.dataset.state = y > 24 ? "compact" : "rest";
      if (y < 96) {
        header.dataset.hidden = "false";
      } else if (delta > 6) {
        header.dataset.hidden = "true";
      } else if (delta < -4) {
        header.dataset.hidden = "false";
      }
      last = y;
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("a, button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      // Focus trap: keep Tab inside the drawer while it is open.
      const focusable = panel.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isActive = (href: string) => {
    const path = href.split("#")[0] ?? href;
    if (path === "/" || path === "") return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <header ref={headerRef} className={styles.header} data-state="rest" data-hidden="false">
      <div className={styles.bar}>
        {/* The accessible name is the visible text (mark + wordmark + RMX tag), so aria-label would
            make axe's label-content-name-mismatch fail. The link target is obvious from the mark. */}
        <Link href="/" className={styles.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB static mark, exact bytes */}
          <img
            src={anMark.src}
            alt=""
            width={anMark.width}
            height={anMark.height}
            className={styles.mark}
            decoding="async"
          />
          <span className={styles.wordmarkWrap}>
            <span className={styles.wordmark}>{siteConfig.name}</span>
            <span className={styles.rmx}>RMX</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className={styles.desktopNav}>
          <ul>
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <a className={styles.listen} href={listenUrl} target="_blank" rel="noopener noreferrer">
            Listen
            <span className="sr-only"> di Spotify (membuka tab baru)</span>
            <span aria-hidden="true" className={styles.listenArrow}>
              ↗
            </span>
          </a>

          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Tutup menu" : "Buka menu"}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <path d="M3 6h14M3 13h14" stroke="currentColor" strokeWidth="1.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div id={menuId} ref={panelRef} className={styles.drawer} role="dialog" aria-modal="true" aria-label="Menu">
          <ul className={styles.drawerList}>
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            className={styles.drawerCta}
            href={listenUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Listen di Spotify <span aria-hidden="true">↗</span>
          </a>
          <p className={styles.drawerMeta}>
            {siteConfig.origin} • Sejak {siteConfig.since}
          </p>
        </div>
      ) : null}
    </header>
  );
}
