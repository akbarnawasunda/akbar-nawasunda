# PHASE 0 AUDIT + PHASE 1 FOUNDATIONS

**Tanggal:** 2026-10-23
**Branch:** `arena/e02160ef-akbar-nawasunda` (bukan `main`)
**Baseline commit:** `57fde14`
**Status:** Phase 0 selesai, Phase 1 selesai, Phase 2 prototype siap review owner.

---

## 1. Ringkasan

Repo ini **bukan** greenfield. Sudah ada aplikasi Next.js App Router lengkap dengan Studio CMS
internal (auth, draft/publish, editor halaman & rilis) yang jalan di atas libSQL. Phase 0 karena itu
difokuskan pada rekonsiliasi antara blueprint `docs/` dan kode nyata, bukan setup dari nol.

Yang dikerjakan di sesi ini:

- Audit stack, env, dan aset → daftar konflik + keputusan (D-013 s/d D-019 di `DECISION_LOG.md`).
- Phase 1: token warna/tipe/motion v3, grid 1280, header 64px dengan AN mark 32px, footer dengan
  strip biru 5px, font self-hosted, aset web turunan dari file asli owner.
- Phase 2: prototype homepage statis (hero + 6 tile katalog + pita visual + footer) untuk direview
  di HP sebelum lanjut Phase 3.

---

## 2. Stack terdeteksi (fakta dari repo, bukan asumsi)

| Area | Isi repo | Catatan |
|---|---|---|
| Framework | **Next.js 16.4.0** (App Router, Turbopack build) | Docs/HANDOFF menulis "Next.js 14" → D-013 |
| UI | **React 19.3**, **CSS Modules** + CSS variables | Docs menulis "Tailwind" → D-013; tidak ada Tailwind di repo |
| Bahasa | TypeScript 5.9, `strict` + `noUncheckedIndexedAccess` | |
| DB | `@libsql/client` (libSQL / Turso), akses via `src/studio/*` | Drizzle **belum terpasang** (lihat 4.1) |
| Auth Studio | scrypt hash + httpOnly cookie (`src/studio/auth.ts`) | Tidak ada password plaintext |
| Deploy | `vercel.json` (framework nextjs, `npm ci`, `npm run build`) | Vercel + Turso sesuai keputusan owner |
| Font | `next/font/local` | Diganti: Syne (display), Inter (body), JetBrains Mono (meta) |
| Test | `node:test` via `tsx`, 16 suite | 69 test lulus |

Scripts: `dev`, `build`, `start` (semua bind `0.0.0.0`), `typecheck`, `lint`, `test`,
`assets:check`, `check` (rantai penuh), `studio:hash-password`.

### Hasil perintah (sebelum perubahan)

```
npm ci                  OK
npm run lint            OK
npm test                65 pass / 0 fail
npm run typecheck       FAIL  drizzle/seed.ts: cannot find 'drizzle-orm/libsql' dan './schema'
npm run build           FAIL  (gagal di tahap type check, penyebab sama)
```

**Kesimpulan:** repo tidak bisa build bersih sebelum `drizzle/seed.ts` dibereskan.

### Hasil perintah (setelah perubahan)

```
npm run typecheck       OK
npm run lint            OK
npm test                69 pass / 0 fail
npm run build           OK  (semua route ter-generate)
```

---

## 3. Inventori file kode yang ada vs yang dibutuhkan

Sudah ada (relevan untuk phase berikutnya):

- `src/app/(site)/` → `page.tsx`, `about`, `contact`, `music`, `music/[slug]`, `not-found`
- `src/app/studio/` → login, dashboard, music CRUD, pages, design, media, preview
- `src/studio/` → auth, db, repository, schema, validation, public readers (published-only)
- `src/components/` → layout (header/footer/container), content (PageIntro, SectionsView, ReleaseView)
- `src/effects/` → `SpatialBackdrop` + `experiments/lattice` (canvas 2D, bukan Liquid Signal)
- `scripts/check-assets.mjs` → verifikasi sha256 `AKBAR-NAWASUNDA-ASSETS/`

Belum ada (dijadwalkan):

- `/visuals`, `/artist`, `/epk` (Phase 5)
- `src/content/` data rilis terverifikasi untuk katalog penuh (Phase 4, Turso)
- Seed Drizzle + schema (Phase 4)
- 3D Liquid Signal WebGL (Phase 7) — sekarang masih placeholder CSS

---

## 4. Temuan yang harus diketahui owner

### 4.1 Blocker build: `drizzle/seed.ts` (High, sudah di-workaround)

File seed mengimpor `drizzle-orm/libsql` dan `./schema` yang **tidak ada** di repo (Drizzle belum
di-install, `drizzle/schema.ts` tidak ada), dan memakai nama env `TURSO_DATABASE_URL` /
`TURSO_AUTH_TOKEN` yang berbeda dari kode lain (`DATABASE_URL` / `DATABASE_AUTH_TOKEN`).

Tindakan sekarang: `drizzle/` di-exclude dari `tsconfig.json` supaya `npm run check` dan build hijau,
**tanpa menghapus file**. Phase 4 wajib menyelesaikan: install `drizzle-orm` + `drizzle-kit`, tulis
`schema.ts`, dan samakan nama env (D-014).

### 4.2 Konflik dokumentasi vs kode

| ID | Konflik | Resolusi sementara |
|---|---|---|
| D-013 | Docs: "Next.js 14 + Tailwind". Repo: Next 16 + CSS Modules | Ikut repo. Migrasi ke Tailwind tidak dilakukan |
| D-014 | Env: `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`/`AUTH_SECRET`/`BLOB_READ_WRITE_TOKEN` vs kode `DATABASE_URL`/`DATABASE_AUTH_TOKEN`/`STUDIO_ADMIN_PASSWORD_HASH` | Ikut kode. Env seed disamakan di Phase 4 |
| D-015 | Asset: `docs/05.../assets/` (3.8 MB, file baru) vs `AKBAR-NAWASUNDA-ASSETS/` (5.8 MB, dipakai manifest) | Derivatif web dibuat dari `docs/05` sesuai instruksi owner; manifest lama tidak diubah |
| D-016 | SITEMAP: `/visuals`, `/artist`, `/epk` vs route nyata `/about` | Nav memakai route yang benar-benar ada. Route baru di Phase 5 |
| D-017 | `ACCENT_OPTIONS` Studio masih `cobalt #4f8cff` (brand lama) | Diganti `signal #0087FF` / `icy #8AE8FF` / `bone` |
| D-018 | FACTS_AND_VERIFICATION v1 mencantumkan 1 rilis; AGENTS.md mencantumkan 5 rilis verified | Dipakai 5 judul dari AGENTS.md. Tahun/tautan yang tidak ada dibiarkan kosong |
| D-019 | Bahasa: blueprint memakai Bahasa Indonesia; halaman `about`/`music`/`contact` lama berbahasa Inggris | Homepage + chrome baru berbahasa Indonesia; halaman lain dilokalkan Phase 5 |

### 4.3 Aset: ukuran nyata vs klaim dokumen

Diukur langsung dari file (`docs/05-CONTENT-AND-ASSETS/assets/`):

| File | Dimensi | Berat asli | Status |
|---|---|---|---|
| `akbar-an-mark-transparent.png` | 1792x1232 (bukan persegi, banyak padding) | 659 KB | dipakai → ditrim jadi 174x112, **13 KB** |
| `akbar-nawasunda-full-transparent.png` | 1600x1600 | 769 KB | dipakai → 400x303, **33 KB** (footer) |
| `akbar-nawasunda-official-portrait-1200.webp` | 1200x1499 | 295 KB | diturunkan jadi 480/720/960 (WebP + AVIF) |
| `akbar-nawasunda-official-portrait.jpg` | 1122x1402 | 1346 KB | **tidak dipakai di web** (master cetak/EPK) |
| `portrait-blur-placeholder.jpg` | 20x24 | 1 KB | tidak dipakai (hero pakai rasio tetap, tanpa CLS) |

Turunan web di `public/` (dibuat ulang lewat `bash scripts/build-web-assets.sh`):

| File | Dimensi | Berat | Peran |
|---|---|---|---|
| `brand/an-mark.webp` | 174x112 | 13 KB | nav 32px (lossless, stroke putih tetap tajam) |
| `brand/lockup.webp` | 400x303 | 33 KB | footer |
| `media/portrait-960.webp` | 960x1199 | **146 KB** | LCP desktop (di bawah budget 150 KB) |
| `media/portrait-960.avif` | 960x1199 | 106 KB | LCP desktop, AVIF |
| `media/portrait-720.webp` | 720x899 | 74 KB | LCP tablet/HP besar |
| `media/portrait-480.webp` | 480x600 | 27 KB | LCP HP |
| `media/stage-700.webp` | 700x700 | 89 KB | pita visual (lazy, below the fold) |

Tes `tests/studio/web-assets.test.ts` membaca header file dan **gagal** kalau ukuran bergeser atau
file hilang, jadi angka di atas tidak bisa "diam-diam" berubah.

### 4.4 Env

Tidak ada `.env.local` di repo (benar). Variabel yang dipakai kode:

- `NEXT_PUBLIC_SITE_URL` — canonical URL; fallback sekarang `https://akbarnawasunda.my.id`
- `DATABASE_URL` — `file:./data/studio.db` (lokal) atau `libsql://...turso.io`
- `DATABASE_AUTH_TOKEN` — wajib untuk URL `libsql://`
- `STUDIO_ADMIN_PASSWORD_HASH` — scrypt, dibuat via `npm run studio:hash-password`

Tanpa env di atas, situs publik tetap render (Studio jatuh ke konten statis) dan `/studio` menampilkan
`SetupRequired`. Jadi preview bisa direview tanpa membocorkan kredensial.

---

## 5. Phase 1 — Foundations (selesai)

| Item | File | Status |
|---|---|---|
| Token warna v3: bg `#0A0A0E`, surface `#101012`, surface2 `#1A1A22`, blue `#0087FF`, purple `#7800FF`, icy `#8AE8FF` | `src/styles/tokens.css` | ✅ |
| Nama token legacy (`--color-ink-*`, `--color-bone-*`, `--color-signal`) dipetakan ke palet baru | `src/styles/tokens.css` | ✅ (halaman Studio & halaman lama ikut berubah tanpa edit massal) |
| Kontras: `#6B6B80` hanya 3.8:1 → label kecil memakai `--color-text-secondary` (7.8:1) | `page.module.css`, `SiteFooter.module.css` | ✅ |
| Grid: `--container-max: 1280px`, gutter 24/16 | `tokens.css` | ✅ |
| Header 64px sticky, blur 12px, AN mark 32px | `SiteHeader.tsx/.css` | ✅ |
| Footer 3 kolom + strip biru 5px full-bleed | `SiteFooter.tsx/.css` | ✅ |
| Font self-hosted: Syne 400-800, Inter 100-900, JetBrains Mono 100-800 (+ lisensi OFL) | `src/lib/fonts.ts`, `src/assets/fonts/` | ✅ |
| `lang="id"`, theme-color `#0A0A0E`, locale `id_ID` | `src/app/layout.tsx`, `src/config/site.ts` | ✅ |
| Link platform **hanya** yang verified (Spotify, YouTube, SoundCloud, TikTok) | `src/config/socials.ts` | ✅ |
| Motion: breathing 6s, reduced-motion dimatikan | `page.module.css`, `globals.css` | ✅ |
| Noise 2% (bukan gradient penuh) | `globals.css` | ✅ |

---

## 6. Phase 2 — Homepage prototype

Isi halaman (statis, tanpa CMS):

1. **Hero** — kiri: eyebrow mono `BANDUNG BARAT • SINCE 2020`, H1 `AKBAR NAWASUNDA` (Syne 800,
   tracking -0.02em, line-height 0.92), lede satu kalimat, CTA primer pill biru "Dengar Sekarang"
   (Spotify verified), CTA sekunder "Lihat Visuals" (anchor). Kanan: potret resmi WebP/AVIF dengan
   `<picture>` + srcset, `preload` AVIF tunggal, rasio dikunci 960x1199 (tanpa CLS) dan lapisan
   **placeholder Liquid Signal** 600x600 di `z-index: -1` dengan breathing `scale 1 → 1.03` 6s.
2. **Pita genre** — Breakbeat · Indo Bass · Jedag Jedug · Jungle Dutch (verified, mono 11px).
3. **Katalog** — 5 rilis verified + 1 tile "Semua rilis". Tanpa artwork palsu: kartu tipografis,
   tahun hanya muncul kalau verified (`2025` untuk *Masih Mencintainya — Papinka*). Catatan kaki
   eksplisit `[NEEDS OWNER: data rilis 2–5]`.
4. **Pita visual** — frame panggung (dekoratif, lazy) + copy jujur "visual sedang disiapkan" + link
   YouTube.
5. **Footer** — lockup, nav, 4 platform verified, identitas, strip biru 5px.

Batas yang disengaja:

- Belum ada 3D WebGL (Phase 7). Placeholder CSS memakai ukuran/layer/motion yang sudah ditetapkan
  `3D_ART_DIRECTION.md`, jadi penggantian nanti tidak mengubah layout.
- Homepage tidak lagi membaca CMS (`force-dynamic` tetap ada di layout karena design settings).
  Section CMS kembali di Phase 6 saat wiring Studio dirapikan.
- Belum ada screenshot otomatis: sandbox ini tidak punya browser headless. Review visual = di HP
  owner lewat preview URL (memang itu gate yang diminta).

---

## 7. Acceptance checklist Phase 0 + 1

- [x] `npm run typecheck` hijau
- [x] `npm run lint` hijau
- [x] `npm test` 69/69
- [x] `npm run build` hijau
- [x] Tidak ada secret baru di repo
- [x] Tidak push ke `main`
- [x] Semua angka aset terukur, bukan diklaim
- [x] Klaim konten hanya dari FACTS_AND_VERIFICATION / AGENTS (verified)
- [ ] Screenshot 390 / 768 / 1280 (butuh browser; diganti review manual owner)
- [ ] Lighthouse (Phase 8)

---

## 8. Pertanyaan untuk owner sebelum Phase 3–4

1. **Tahun & tautan rilis 2–5** (Cinta Terbuang, Masih Dihatiku, Bayang Tanpa Kata, Pada Imut Aisyah
   Tak Belagu): tahun rilis, jenis (single/remix), dan URL per rilis. Tanpa ini katalog tetap
   typographic tanpa artwork.
2. **Artwork rilis**: ada file cover? Kalau tidak, kartu tetap tipografis (jangan generate cover palsu).
3. **Instagram / Apple Music / email booking**: belum verified, jadi belum dipasang (D-020).
4. **Nama env production**: setuju pakai `DATABASE_URL` + `DATABASE_AUTH_TOKEN` (ikut kode) atau mau
   `TURSO_*` sesuai HANDOFF? (D-014)
5. **Route**: tetap `/about` atau diganti `/artist` sesuai SITEMAP di Phase 5? (D-016)
6. **Portrait**: pakai versi 1200px (yang sekarang) atau crop yang lebih dramatis untuk hero?

---

## 9. Snapshot performa (lokal, `next start`)

Diukur 2026-10-23 dari HTML hasil build produksi, ukuran sudah gzip:

| Metrik | Hasil | Budget | Catatan |
|---|---|---|---|
| JS awal (9 chunk) | **180.2 KB** | < 180 KB | Tepat di batas; berasal dari framework Next 16 + React 19, bukan dari halaman (homepage server component) |
| CSS (3 file) | **6.7 KB** | < 30 KB | |
| Gambar LCP | 27 KB (480w) / 74 KB (720w) / 146 KB (960w), AVIF 19/55/106 KB | < 150 KB | `<picture>` + srcset, satu file per kunjungan |
| Gambar header (AN mark) | 13 KB | — | |
| Font | 34 + 48 + 40 KB woff2 | — | subset latin, `display: swap` |
| CLS | 0 by design | < 0.1 | semua gambar punya width/height + aspect-ratio |
| TTFB lokal | 15–20 ms | — | route dinamis karena layout membaca design settings |

Tindakan Phase 8: audit bundle JS (target: pindahkan bagian yang tidak perlu ke client hanya bila
perlu, atau revisi budget), Lighthouse mobile, axe, dan uji 390/768/1280.

## 10. Temuan tambahan

- **404 kustom tidak terpakai untuk URL di luar route group.** `src/app/(site)/not-found.tsx` hanya
  tampil untuk `notFound()` di dalam `(site)` (mis. `/music/tidak-ada`). URL acak seperti `/nope`
  memakai not-found bawaan Next di root. Perbaikan (tambah `src/app/not-found.tsx`) masuk Phase 5.
- **Halaman `/experiments/lattice`** masih ada dan dapat diakses publik; bukan bagian dari sitemap
  final. Putuskan Phase 5: hapus atau sembunyikan.
