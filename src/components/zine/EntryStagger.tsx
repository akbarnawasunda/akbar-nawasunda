"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import "./EntryStagger.module.css";

/**
 * FASE 4b, Proposal 1 — "Tangga". Satu pengamat untuk seluruh halaman.
 *
 * Anotasi `data-stagger="on"` ditaruh di wadah daftar (lihat CataloguePin, ReleaseLedger,
 * VisualRail, PaperAbout, dan timeline /artist); komponen ini hanya menulis satu atribut keadaan:
 *
 *   armed  → grup masih di bawah layar, CSS menyembunyikan anak-anaknya sambil menunggu
 *   in     → grup terlihat, CSS menjalankan tangga 90 ms
 *
 * Tiga hal yang dijaga, dan ketiganya berasal dari kegagalan mode yang sudah pernah terjadi di
 * proyek ini:
 *
 * 1. **Yang sudah terlihat tidak pernah disembunyikan.** Pada mount, setiap grup diperiksa lebih
 *    dulu; kalau sudah beririsan dengan viewport ia dilewati sama sekali. Tanpa ini, grup pertama
 *    berkedip (tampil → hilang → naik) karena IntersectionObserver baru menjawab satu frame
 *    kemudian — dan pada halaman dengan LCP dari teks, kedip itu lebih mahal daripada animasinya.
 * 2. **Reduced motion berarti tidak ada yang berjalan.** Efeknya berhenti sebelum satu atribut pun
 *    ditulis; tidak ada observer, tidak ada delay, tidak ada keadaan tersembunyi.
 * 3. **Rute baru, grup baru.** `usePathname` jadi dependensi: layout bertahan saat pembaca pindah
 *    halaman, jadi tanpa itu ledger /music tidak akan pernah diamati.
 */
export function EntryStagger() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const groups = [...document.querySelectorAll<HTMLElement>("[data-stagger]")].filter((group) => {
      const rect = group.getBoundingClientRect();
      const onScreen = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      return !onScreen;
    });
    if (groups.length === 0) return;

    for (const group of groups) group.dataset.staggerState = "armed";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.staggerState = "in";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    for (const group of groups) observer.observe(group);
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
