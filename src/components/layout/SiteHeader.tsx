"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { anMark } from "@/assets/web";
import { primaryNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { listenUrl } from "@/config/socials";
import styles from "./SiteHeader.module.css";

/**
 * Site header: 64px sticky bar, AN mark at 32px, mono navigation and the primary listen action.
 * Desktop shows inline links; below 720px the links move into a disclosure panel that closes on
 * Escape, on navigation, and when the viewport grows.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label={`${siteConfig.name} — beranda`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 13 KB static logo, no need to optimise */}
          <img
            src={anMark.src}
            alt=""
            width={anMark.width}
            height={anMark.height}
            className={styles.mark}
            decoding="async"
          />
          <span className={styles.wordmark}>{siteConfig.name}</span>
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
          <a
            className={styles.listen}
            href={listenUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Dengar
            <span aria-hidden="true">↗</span>
          </a>

          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Tutup menu" : "Buka menu"}</span>
            <span aria-hidden="true" className={styles.toggleGlyph}>
              {open ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      <nav id={menuId} aria-label="Navigasi seluler" className={styles.mobileNav} hidden={!open}>
        <ul>
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
      </nav>
    </header>
  );
}
