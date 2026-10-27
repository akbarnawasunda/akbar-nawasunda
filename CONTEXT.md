# CONTEXT — peta repo `akbar-nawasunda`

Dibuat dari pembacaan langsung kode di branch `arena/e02160ef-akbar-nawasunda` (HEAD `11f5ee8`).
Dokumen ini **peta**, bukan spesifikasi: angka & perilaku diambil dari `package.json`, konfigurasi,
dan header setiap modul. Untuk keputusan desain lihat `docs/08-IMPLEMENTATION/DECISION_LOG.md`.

## 1. Stack & konfigurasi

| Berkas | Isi |
| --- | --- |
| `package.json` | Next **16.4** (App Router), React **19.3**, TypeScript 5.9. Runtime: `@libsql/client` + `drizzle-orm` (Turso), `lenis` (smooth scroll), `three` (satu canvas). Dev: `tsx`, `axe-core`, `puppeteer-core`, `sharp`, `d3-contour` (hanya pembuat aset). |
| `tsconfig.json` | `strict` + `noUncheckedIndexedAccess`, `target ES2022`, alias `@/* → src/*`. Tidak ada `baseUrl` terpisah. |
| `next.config.ts` | `reactStrictMode`, tanpa `inlineCss`; `outputFileTracingIncludes` untuk `/og`; redirect 308 `/about → /artist`; header keamanan dari `src/lib/security-headers.ts` untuk semua route. |
| `tailwind.config` | **Tidak ada.** Tidak ada Tailwind, tidak ada PostCSS. Styling = CSS Modules + CSS variables. |
| `eslint.config.mjs` | `eslint-config-next` (flat config). |
| `vercel.json` / `drizzle.config.ts` | Deploy Vercel; drizzle menunjuk `drizzle/` + `src/studio/schema.ts`. |

Script npm penting: `dev`, `build` (menyuntik `NEXT_PUBLIC_BUILD_REV` dari short SHA), `typecheck`,
`lint`, `test` (unit), `test:db`, `a11y`, `qa:motion`, `check:web`, `smoke`, `audit:tokens`,
`review:shots`, `assets:check`, `covers:fetch`, `covers:sleeves`, `db:*`.

## 2. Struktur folder

```
src/app            route App Router (dua grup: (site) publik, studio admin)
src/components     content | layout | media | ui | zine | print | three | effects
src/lib            utilitas non-UI (font, metadata, JSON-LD, keamanan, env DB)
src/config         site, navigation, socials, build (identitas & tautan)
src/content        data katalog statis (releases, artist, visuals, covers, stats)
src/studio         mesin CMS: db, repository, store, actions, auth, validasi, UI
src/styles         tokens.css (semua nilai desain) + globals.css (residu & utilitas)
src/assets         font lokal (3 keluarga), manifest aset, bentuk AN, checksum
public             aset statis: covers, foto, EPK zip, font OG
scripts            build aset, QA browser, review screenshot
tests              node:test — tests/studio (unit) & tests/database (alur publish)
docs               audit, desain, arsitektur, review per ronde, runbook deploy
drizzle            migrasi + seed
```
**Tidak ada `src/hooks/`** — semua hook kustom hidup di dalam komponen pemiliknya
(`scroll-engine.ts`, `Plate3D`, `CatalogueIndex`, dll).

## 3. Route publik — `src/app/(site)`

| Route | Fungsi | Library / catatan |
| --- | --- | --- |
| `layout.tsx` | Chrome situs: header, footer, grain, kursor, scroll progress, curtain loader, `InkPress`, `ImageFade`. `force-dynamic` | React server component; membaca `getPublicDesign()` |
| `page.tsx` | Beranda 5 band: hero, ticker, indeks katalog, band malam, tentang/kertas, rail visual, monogram 3D, press sheet, EPK | `three` (lazy, via `AnMonogram`), CSS Modules |
| `music/page.tsx` | Katalog: kepala halaman biru + `CatalogueWall` (wall 3D ikut pointer) | React client state; `force-dynamic` |
| `music/[slug]/page.tsx` | Satu rilis sebagai sampul: judul, artwork di `Plate3D`, baris dengar, lembar data, rilis tetangga | `force-dynamic`, `notFound()`, waterfall cover |
| `visuals/page.tsx` | Arsip visual: `PageMasthead` + `VisualGrid`/`VisualRail` (aset asli, lightbox ringan) | CSS Modules |
| `artist/page.tsx` | Profil: potret di piring biru, fakta terverifikasi, timeline, platform | `force-dynamic`; baca `getPublicPage("about")` |
| `contact/page.tsx` | Satu alamat email 5vw di atas bidang biru + daftar jenis pekerjaan | statis |
| `epk/page.tsx` | Press kit: dokumen + cap merah + unduhan zip | statis |
| `not-found.tsx` | 404 di dalam chrome situs | `NotFoundView` |

## 4. Route non-publik

| Route | Fungsi | Catatan |
| --- | --- | --- |
| `app/og/route.tsx` | Kartu sosial 1200×630 dibuat saat request (`ImageResponse`) | Membaca font & sampul dari disk → butuh `outputFileTracingIncludes` |
| `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` | robots, sitemap, PWA manifest | Metadata API |
| `app/layout.tsx` | Root: `<html>` bahasa `id`, font lokal, JSON-LD | `next/font/local` |
| `studio/layout.tsx` + `studio/login` | Kerangka admin + login (cookie sesi, lockout) | Server actions, tanpa API route |
| `studio/page.tsx`, `studio/music/*`, `studio/pages/*`, `studio/design`, `studio/media` | CRUD rilis & halaman, pengaturan desain, status penyimpanan media | `force-dynamic`; semua mutasi lewat `src/studio/actions.ts` |
| `studio/preview/*` | Pratinjau draf (halaman & rilis) memakai renderer publik | `requireAdmin()` |

**Tidak ada `src/app/api/**`** kecuali `/og`. Semua tulisan melewati server action.

## 5. Komponen — fungsi & library

**content/** (blok isi)
- `CatalogueIndex` — katalog sebagai indeks tipografis dengan pratinjau sampul mengikuti kursor; React state + rAF.
- `CatalogueWall` — katalog sebagai *wall* 3D; sleeve di bawah pointer naik 44 px (`pointerType`, bukan `hover`).
- `ReleasePlate` — satu rilis sebagai sampul: bidang biru, `Plate3D`, baris dengar; dipakai route rilis.
- `ReleaseCover` — satu sleeve 1:1/16:9 dari file asli, sleeve desain, atau komponen; `next/image` untuk aset terverifikasi.
- `ReleaseTicker` — kepala berjalan berisi judul-judul rilis di bidang biru.
- `ReleaseView` — tampilan rilis versi CMS (dipakai halaman publik & pratinjau studio).
- `PaperAbout` — bagian tentang di atas kertas, timeline digambar sebagai garis.
- `SectionsView` — renderer section terkelola (menyembunyikan section `hidden`).
- `PageIntro` / `NotFoundView` / `ContentRequirement` — blok kepala halaman, isi 404, dan empty-state jujur `[NEEDS OWNER]`.

**layout/**
- `SiteHeader` — bar 72→56 px, hide-on-scroll, drawer ponsel (portal + fokus + scroll lock), memakai `next/navigation` `usePathname`.
- `SiteFooter` — empat kolom tautan (Navigasi, Sosial, Rilis, Kontak) dengan efek glitch saat hover.
- `PageMasthead` — kepala halaman biru (dipakai /music, /visuals) + tanda register.
- `SectionHeader`, `Container`, `PlatformRow`, `GenreTape` — kepala section seragam, pembatas lebar, baris 10 platform, tape genre.

**zine/** (gerak)
- `scroll-engine.ts` — satu loop rAF + satu listener scroll untuk seluruh situs (read→write berkelompok).
- `SmoothScroll` — Lenis `lerp 0.08`, mati untuk sentuh & reduced motion. **Satu-satunya pemakai `lenis`.**
- `Plate3D` — panggung 3D: `perspective` + `preserve-3d`, menulis `--plate-rx/ry/…` untuk lapisan-lapisannya.
- `Depth`, `Tilt3D`, `Reveal`, `DrawOnView`, `Magnetic`, `ImageFade` — parallax scroll, tilt pointer, reveal (opacity 0 → 1, `translateY(30px)`, 600 ms), animasi sekali jalan, tarikan magnetik, fade-in gambar setelah decode.
- `LoadingCurtain` — title sequence: dua baris nama, penghitung 000→100, dua lembar keluar, sekali per sesi.
- `CursorDot`, `ScrollProgress` — kursor titik+cincin, bar progres 2 px.

**print/** (ronde 9)
- `InkPress` — menulis `--ink-x/--ink-y` dari pointer (rAF ber-lerp, berhenti saat settle, batal di reduced motion).
- `Registration` — tanda register + nama cetakan, murni dekoratif (`aria-hidden`).

**three/** — `AnMonogram`: satu-satunya `<canvas>`. Round 33: `PlaneGeometry` + fragmen shader kustom (simplex noise, tekstur logo AN sebagai `uTexture`, chrome + neon blue, alpha 0 di luar logo), diimpor dinamis setelah band mendekat, `dpr` maksimal 1.5, `frameloop` parkir saat keluar layar.

**media/** — `VisualGrid` (kisi 2×2 + lightbox), `VisualRail` (rail horizontal, rasio asli).
**ui/** — `ButtonLink` (satu-satunya tautan-berbentuk-tombol), `PlatformIcon` (ikon platform 20 px buatan sendiri).
**effects/** — `GrainOverlay` (grain 2–3 % di seluruh halaman).

## 6. Pola yang teridentifikasi

**Styling** — CSS Modules per komponen + `src/styles/tokens.css` sebagai satu-satunya sumber warna,
spasi, tipografi, easing, z-index. `globals.css` hanya untuk residu dokumen & utilitas lintas
komponen (`.ink`, `.sr-only`, `.skip-link`, scroll lock `html[data-menu|data-sheet]`). Nilai mentah
(hex, px ajaib) dilarang di modul dan **dijaga** `scripts/token-audit.mjs` + `tests/studio/css-tokens.test.ts`.

**State** — tidak ada Redux/Zustand/Context global. Tiga lapis saja: (1) server component membaca
data, (2) `useState`/`useRef` lokal untuk interaksi (drawer, dengar dengar, wall, verso), (3) state
persisten di database untuk konten & desain. Sinkronisasi lintas komponen lewat atribut pada
`<html>`/`<header>` (`data-menu`, `data-sheet`, `--ink-*`), bukan provider.

**Data** — dua sumber, satu arah baca:
1. **Statis** di `src/content/*` (`releases`, `artist`, `visuals`, `stats`) — fallback yang selalu ada.
2. **Turso/libSQL** lewat `src/studio`: `db.ts` (client) → `repository.ts` (SQL) → `store.ts`
   (dokumen draf/publish) → `public.ts` (pembaca **hanya published**, aman-gagal → jatuh ke statis).
Semua route yang bisa berubah `force-dynamic`; tidak ada `fetch()` ke API sendiri, tidak ada
`revalidate` manual selain `revalidatePath()` di server action. Gambar diselesaikan di server
(`src/content/covers.ts` memakai `node:fs`, karena itu `server-only`).

**Tulisan/mutasi** — hanya `src/studio/actions.ts` (`"use server"`): validasi → simpan draf →
`publish*` → `revalidatePath`. Auth: cookie sesi ber-hash (`auth.ts`, `security.ts`, `password.ts`),
tanpa library auth eksternal.

**Gambar & aset** — `src/assets/manifest.ts` mendaftarkan setiap aset dengan status & peran; hanya
`approved` yang boleh tampil. Pipeline skrip: `build-web-assets.sh`, `build-an-shape.mjs`,
`generate-placeholder-covers.mjs`, `covers:fetch` (butuh jaringan, dijalankan pemilik/CI).

**Pengujian & QA** — `node:test` + `tsx` untuk unit (`tests/studio`, 121 kasus) dan alur DB
(`tests/database`). QA browser dijalankan dengan `puppeteer-core` + Chromium sistem:
`a11y-audit.mjs` (axe, 16 pemuatan), `qa-motion.mjs` (21 asersi perilaku), `check-web.mjs` (berat
JS/CSS + tautan), `smoke-test.mjs`, `review/shots.mjs` (screenshot review per ronde).

## 7. Konvensi yang mudah terlewat

- **Tidak ada Tailwind** dan tidak boleh ditambahkan tanpa keputusan baru.
- `(site)` dan `studio` punya layout terpisah; jangan taruh komponen publik di `studio`.
- Efek pointer **jangan** digerbangi `matchMedia("(hover: none)")` — headless Chromium melaporkannya
  salah; pakai `event.pointerType`.
- `perspective`/`filter`/`will-change` pada ancestor mematikan `position: fixed` anaknya; overlay
  perlu portal ke `<body>`.
- Teks `[NEEDS OWNER]` bukan placeholder: angka/rilis/penghargaan tidak boleh dikarang.
- `/privacy` belum ada dan sengaja tidak ditautkan.
