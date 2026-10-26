"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { anMark } from "@/assets/web";
import { drawerNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { listenUrl } from "@/config/socials";
import styles from "./SiteHeader.module.css";

/** The newest release, so the phone menu can show the catalogue rather than only link to it. */
export interface DrawerLatest {
  title: string;
  href: string;
  meta: string;
  cover: string | null;
}

/**
 * Site header: 64px sticky bar, AN mark at 32px with 8px clear space, mono navigation, Listen pill.
 *
 * Below 720px the links move into a full-screen drawer that traps Tab inside it, closes on Escape,
 * closes after navigation, returns focus to the toggle, and locks the page behind it.
 */
export function SiteHeader({ latest = null }: { latest?: DrawerLatest | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  /** Height of the bar at the moment the drawer opens — the drawer hangs directly below it. */
  const [barHeight, setBarHeight] = useState<number | null>(null);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  /*
   * Round 26, owner's bug: after choosing a page from the menu, the new page could open mid-scroll
   * (Lenis still coasting at the old position) with the bar hidden — the menu button "disappeared".
   * A route change now lands at the top, at rest, bar visible, every time.
   */
  const firstRoute = useRef(true);
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const header = headerRef.current;
    if (header) {
      header.dataset.hidden = "false";
      header.dataset.state = "rest";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

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
      /* An open menu is a dialog: the bar that closes it may never hide behind the scroll. */
      if (document.documentElement.dataset.menu === "open") {
        header.dataset.hidden = "false";
        last = y;
        return;
      }
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

  /**
   * While the drawer is open it owns the screen: the page behind must not scroll, or a thumb drag
   * moves the artwork underneath the menu and the menu stops feeling like a surface.
   */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.dataset.menu = "open";
    setBarHeight(headerRef.current?.getBoundingClientRect().height ?? null);
    return () => {
      delete root.dataset.menu;
    };
  }, [open]);

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

        <div className={styles.actions}>
          <a className={styles.listen} href={listenUrl} target="_blank" rel="noopener noreferrer">
            Listen
            <span className="sr-only"> di Spotify (membuka tab baru)</span>
            <span aria-hidden="true" className={styles.listenArrow}>
              {"\u2197"}
            </span>
          </a>

          {/*
            One control, at every width.

            The old bar carried four text links on desktop and a hamburger below 720px. The
            reference has a mark on the left and the word MENU on the right, and it does that at
            1440px as well as at 390px — which is not a phone compromise, it is the decision: a
            full-screen index is a better catalogue than four 11px labels fighting a 5rem bar, and
            it is the same interaction with a trackpad and with a thumb. `aria-expanded` still
            drives the drawer, the focus trap and Escape, unchanged.
          */}
          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Tutup menu" : "Buka menu"}</span>
            <span aria-hidden="true" className={styles.menuWord}>
              {open ? "Tutup" : "Menu"}
            </span>
            <span aria-hidden="true" className={styles.burger}>
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/*
        The drawer is portalled to <body>: the bar above it has `backdrop-filter`, and any filter
        makes an element a containing block for its fixed-position children. Inside the header the
        drawer was laid out against a 72 px tall bar and rendered as an 81 px sliver the page
        scrolled over — tapping the hamburger looked like nothing happened, on every phone.
      */}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              id={menuId}
              ref={panelRef}
              className={styles.drawer}
              style={{ "--drawer-top": barHeight ? `${barHeight}px` : "var(--header-height)" } as CSSProperties}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <nav aria-label="Menu utama">
                <ul className={styles.drawerList}>
                  {drawerNav.map((item, index) => (
                    <li key={item.href} style={{ "--i": index } as CSSProperties}>
                      <Link
                        href={item.href}
                        aria-current={isActive(item.href) ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <span className={styles.drawerIndex} aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.drawerLabel}>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {latest ? (
                <div className={styles.drawerLatest}>
                  <p className={styles.drawerLatestLabel}>Rilis terbaru</p>
                  <Link
                    className={styles.drawerLatestLink}
                    href={latest.href}
                    onClick={() => setOpen(false)}
                  >
                    {latest.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 96px thumbnail, already a file on disk
                      <img
                        src={latest.cover}
                        alt=""
                        width={96}
                        height={96}
                        className={styles.drawerLatestCover}
                        decoding="async"
                      />
                    ) : null}
                    <span className={styles.drawerLatestText}>
                      <span className={styles.drawerLatestTitle}>{latest.title}</span>
                      <span className={styles.drawerLatestMeta}>{latest.meta}</span>
                    </span>
                  </Link>
                </div>
              ) : null}

              <a
                className={styles.drawerCta}
                href={listenUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
              >
                Listen di Spotify <span aria-hidden="true">{"\u2197"}</span>
              </a>

              <p className={styles.drawerMeta}>
                {siteConfig.origin} {"\u2022"} Sejak {siteConfig.since}
              </p>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
