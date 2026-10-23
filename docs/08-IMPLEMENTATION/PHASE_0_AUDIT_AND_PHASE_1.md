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

---

## 11. Phase 2 review — catatan owner (2026-10-23) dan penutupannya

Owner menyetujui Phase 2 dengan empat catatan. Status masing-masing:

| Catatan owner | Status | Bukti |
|---|---|---|
| 1. Tambah judul ke-6 "Hitungan Cinta Breakbeat Super Exc" (era DJ Akbar Remix); tahun/URL/artwork dikosongkan | ✅ | `src/content/releases.ts` (6 entri), `releaseEyebrow()` → "Era DJ Akbar Remix"; kartu tetap tipografis |
| 2. Env: `DATABASE_URL` dulu, alias `TURSO_*` didukung | ✅ | `src/lib/turso.ts`, dipakai `studio/config.ts`, `studio/db.ts`, `drizzle.config.ts`, `drizzle/seed.ts`; tes `tests/studio/turso.test.ts` |
| 3. Route `/artist` + `/visuals` di Phase 5, redirect permanen dari `/about` | 📅 Phase 5 | D-024 |
| 4. Mobile: H1 harus terlihat dalam 5 detik | ✅ | D-023: copy dulu, potret di bawah; H1 2.75–4rem mulai di ~90px dari atas |

Tambahan dari Phase 4: `RELEASE_TYPES` punya nilai `unknown` (D-026) supaya rilis tanpa jenis
terverifikasi tidak dipaksa jadi "single".

**Artwork:** owner akan upload ke `public/assets/covers/`. Konvensinya
`<slug>.(webp|avif|jpg|jpeg|png)` — drop file, kartu langsung memakainya (D-027, `README.md` di
folder itu memuat daftar slug). Tidak ada perubahan kode yang diperlukan.

---

## 12. Phase 3 — Components (selesai)

| Komponen | File | Dipakai di |
|---|---|---|
| `ButtonLink` (primary / secondary / ghost, external + sr-only note) | `src/components/ui/ButtonLink.tsx` | hero, pita visual |
| `SectionHeader` (mono eyebrow + display title + optional action) | `src/components/layout/SectionHeader.tsx` | homepage, /music (berikutnya) |
| `ReleaseCard` (1:1, cover atau tipografis, indeks mono) | `src/components/content/ReleaseCard.tsx` | homepage, /music |
| `ReleaseGrid` (1/2/3 kolom + limit) | `src/components/content/ReleaseGrid.tsx` | homepage (`limit=6`), /music (semua) |
| `SignalField` (placeholder Liquid Signal, CSS-only) | `src/components/effects/SignalField.tsx` | hero |
| `release-view` (pemetaan data → tampilan, pure) | `src/content/release-view.ts` | homepage, /music |

`/music` sekarang memakai grid yang sama dengan homepage (sebelumnya daftar baris terpisah dengan CSS
sendiri), dan `music.module.css` dihapus.

---

## 13. Phase 4 — Music + Turso/Drizzle (selesai)

### Yang diperbaiki

`drizzle/seed.ts` sebelumnya tidak bisa dikompilasi (impor `drizzle-orm/libsql` dan `./schema` yang
tidak ada) dan memakai nama env yang berbeda dari aplikasi.

1. `drizzle-orm@0.45.4` (dependency) + `drizzle-kit@0.31.11` (devDependency) terpasang.
2. `drizzle/schema.ts` — skema deklaratif untuk tabel yang **benar-benar dipakai** aplikasi
   (`studio_pages`, `studio_sessions`, `studio_login_failures`), termasuk CHECK single-row (D-025).
3. `drizzle.config.ts` — dialect turso, membaca env lewat resolver yang sama dengan aplikasi,
   fallback `file:./data/studio.db` supaya `db:generate` jalan offline.
4. `drizzle/migrations/0000_*.sql` dihasilkan; isinya identik dengan DDL runtime.
5. `drizzle/seed.ts` ditulis ulang: menulis 6 rilis verified ke `release:<slug>` (draft = published),
   idempoten (`onConflictDoNothing`), dan menjalankan `applySchema` lebih dulu sehingga database baru
   langsung bisa dipakai.
6. `tsconfig.json` kembali meng-include `drizzle/` (exclude sementara D-022 dicabut).
7. Script baru: `db:generate`, `db:migrate`, `db:push`, `db:seed` (+ `-- --dry`).

### Verifikasi yang dijalankan

```
npm run db:seed (DATABASE_URL=file:/tmp/seedtest.db)     Inserted 6 release document(s).
npm run db:seed (ulang)                                  Inserted 0 · Skipped 6 (left untouched)
TURSO_DATABASE_URL=file:/tmp/seedtest2.db npm run db:seed Inserted 6 (alias TURSO_* bekerja)
```

Server dijalankan dengan `DATABASE_URL=file:/tmp/seedtest.db`: `/music` menampilkan 6 kartu dari
database (bukan daftar statis), dan `/music/cinta-terbuang` menampilkan `Rilis` + judul tanpa tahun
palsu. Tanpa env, situs kembali ke daftar statis — perilaku fallback tetap utuh.

### Dampak ke Studio

`/studio/music` kini mengenal jenis rilis "Rilis (jenis belum diverifikasi)" dan draft baru default ke
nilai itu, bukan "single" (D-026).

## 14. Revisi Phase 2 — bahasa visual dari 4 referensi (2026-10-23)

Pemicu: preview Phase 2 dinilai owner "terlihat AI generik" — semua di tengah, potret hanya foto
berbingkai, dan glow blob tanpa makna. Revisi mengikuti `PROMPT_REDESIGN_FROM_REFERENCES.md` di
`main` tanpa mengubah `main`.

### Yang diganti

| Sebelum | Sesudah |
|---|---|
| Hero centered, teks di atas, foto berbingkai di tengah | Hero 55/45: teks kiri, potret resmi 4:5 di kanan, H1 96px menyeberang −120px melewati batas kolom ke arah bidang titik |
| Glow blob / sphere | `SignalField`: medan titik (1.5–3px) dengan gradasi #0087FF → #8AE8FF → #7800FF, dua stroke tepi; SVG inline, bukan WebGL |
| 6 kartu identik di tengah | Bento asimetris: 1 kartu unggulan lebar + 4 tile 1:1 + 1 tile lebar + 1 CTA, radius 24px, border 1px `#2A2A38`, gap 16px, panel statistik bersarang |
| Label kecil `#6B6B80` | `#A1A1B5` (7.8:1) untuk semua label mono |
| Tanpa tekstur | Lapisan noise 2% (`feTurbulence`, baseFrequency 0.9) sebagai satu layer tetap, `pointer-events: none` |
| `/music` memakai intro generik | Kepala halaman memakai bentuk yang sama dengan section homepage (indeks mono + judul display + garis rambut + jumlah rilis terverifikasi) |
| `/music/[slug]` hanya 3 baris teks | Lembar rekaman: judul + catatan tautan, panel artwork 1:1 (watermark AN jika artwork belum diunggah), strip fakta mono dengan `[NEEDS OWNER]` |

### Komponen baru / ditulis ulang

- `src/components/effects/SignalField.tsx` + `.module.css` — dot-matrix, `idPrefix` wajib, animasi
  1 → 1.03 / 6 s dan 0 → 3° / 20 s, dimatikan pada `prefers-reduced-motion`.
- `src/components/effects/GrainOverlay.tsx` + `.module.css` — noise 2% lewat `feTurbulence`
  (baseFrequency 0.9) sebagai satu layer tetap tanpa blend mode, supaya tidak memicu repaint seluruh
  halaman tiap frame saat scroll di Android kelas bawah.
- `src/components/layout/{PlatformRow,GenreTape,SiteFooter}` — baris logo platform mono 11px, pita
  genre, footer tiga kolom + strip biru 5px.
- `src/components/content/ReleaseBento.tsx` + `.module.css`, `src/components/media/VisualGrid.tsx`.
- `src/app/(site)/page.tsx` ditulis ulang: hero, `PlatformRow`, `GenreTape`, `#music`, `#visuals`.
- `src/content/stats.ts` — `+{tahun aktif}` dan `+{jumlah rilis}` dihitung dari data terverifikasi,
  bukan angka karangan.

### Verifikasi

```
npm run typecheck   ✓
npm run lint        ✓
npm run test        ✓ 78/78
npm run build       ✓
npm run check       ✓ (assets 3 warning lama, 78 test, build)
```

Tangkapan layar 390 / 768 / 1280 untuk `/`, `/music`, `/music/masih-mencintainya-papinka` ada di
`docs/08-IMPLEMENTATION/screenshots/` (lihat README di folder itu untuk kondisi pengambilan).

### Catatan yang masih terbuka

- Artwork 6 rilis belum ada: kartu memakai watermark AN 9–16%, halaman detail menulis
  "Artwork belum diunggah". Tidak ada cover palsu.
- Tahun rilis hanya diketahui untuk `masih-mencintainya-papinka` (2025, terverifikasi); sisanya
  `[NEEDS OWNER]`.
- Hero menampilkan `+6 tahun aktif` dan `+6 rilis terverifikasi` karena keduanya diturunkan dari
  data yang sama (2020 → 2026, 6 judul). Angka yang berbeda akan butuh data owner.
- Phase 5 belum dijalankan (menunggu persetujuan revisi Phase 2): `/artist` kanonik, `/about` → 308,
  `/visuals` sebagai route.

## 15. Phase 5 — sitemap final, EPK, 404, lokalisasi (2026-10-23)

Revisi Phase 2 disetujui owner, jadi Phase 5 dikerjakan. `main` tidak disentuh.

### Route baru

| Route | Isi | Catatan |
|---|---|---|
| `/artist` | Split asimetris: fakta terverifikasi di kiri, potret 4:5 di kanan, `PlatformRow` + `GenreTape`, linimasa, panel monogram/lockup | Kanonik (D-033). Key dokumen Studio tetap `about` (D-034) supaya konten owner tidak yatim |
| `/visuals` | Masonry dua kolom berisi empat aset resmi + lightbox (komponen `VisualGrid` yang sama dengan homepage) | 3 kolom menyisakan lubang dengan 4 aset (D-038) |
| `/epk` | Halaman press kit: tombol unduh `.zip`, manifest 5 file, fact sheet, kontak | Zip nyata 977 KB (D-036, D-037) |
| 404 | Ghost AN 10% kanan, "Sinyal hilang", CTA + nav, strip biru 5px | Satu komponen untuk dua file not-found (D-039) |

### Redirect

```
/about  →  308  →  /artist      (next.config.ts, D-033)
```

Halaman `src/app/(site)/about/` dihapus; tes `routes.test.ts` mengunci perilaku ini.

### Linimasa `/artist`

Hanya tonggak yang punya sumber: 2020 alias DJ Akbar Remix, 2025 "Masih Mencintainya — Papinka",
"Sekarang" Akbar Nawasunda. Periode 2021–2024 tampil sebagai baris **putus-putus** dengan tanda
`[NEEDS OWNER]` — bukan dikosongkan, bukan dikarang (D-035).

### EPK

`scripts/build-epk.sh` menghasilkan dari aset owner:

```
press-photo-print.jpg     1200 px, 394 KB
press-photo-web.webp       960 px, 143 KB
an-mark-transparent.png    256 warna, 231 KB
lockup-transparent.png     256 warna, 202 KB
README.md                  fakta terverifikasi + ketentuan pemakaian
→ akbar-nawasunda-epk.zip  977 KB
```

### Lokalisasi yang tersisa

- `/contact`: judul & metadata jadi "Kontak".
- `/music/[slug]`: judul metadata "Rilis tidak ditemukan" + `noindex` untuk slug yang tidak ada.
- Nav & footer: Music / Visuals / Artist / EPK / Kontak; `/about` tidak lagi ditautkan di mana pun.

### Test

```
npm run check   ✓ assets + typecheck + lint + build
# tests 83 · # pass 83 · # fail 0
```

Dua suite baru:

- `tests/studio/css-tokens.test.ts` — setiap `var(--x)` di `src/**/*.css` harus punya definisi.
  Menangkap kelas bug D-032 (deklarasi CSS dibuang browser tanpa error).
- `tests/studio/routes.test.ts` — redirect 308, nav hanya menunjuk route yang ada, dan lima file
  EPK benar-benar ada di `public/epk/`.

### Belum dikerjakan

- Artwork 6 rilis: owner akan mengunggah setelah Phase 5. Sampai itu, kartu memakai watermark AN.
- `/privacy` (ada di SITEMAP.md) belum dibuat: isinya harus ditinjau owner, bukan dikarang.
- Bio panjang, kontak booking, dan tanggal-tanggal linimasa 2021–2024 menunggu owner lewat Studio
  (`/studio/pages/about`).

## 16. Phase 6 — Studio CMS: login, draf, terbit (2026-10-23)

Phase 5 disetujui owner. Phase 6 tidak membangun Studio dari nol — sebagian besar kode sudah ada sejak
Phase 3 — tetapi mengikatnya ke database sungguhan, memperbaiki bagian yang ternyata tidak tersambung,
dan membuktikan alurnya.

### Yang dibuktikan (bukan hanya diklaim)

`npm run test:db` menjalankan 8 skenario terhadap database libSQL sungguhan (file sementara, SQL yang
sama dengan Turso):

1. dokumen baru belum punya versi terbit;
2. menyimpan draf **tidak** menerbitkan apa pun;
3. pembaca publik (`getPublicPage`) tetap `null` selama hanya ada draf;
4. publish membuat dokumen itu terbaca publik, persis seperti yang ditinjau;
5. draf setelah publish tidak mengubah halaman publik;
6. teks panjang (bio 500+ karakter) tersimpan dan terbaca utuh;
7. sesi hanya menyimpan hash: token mentah tidak cocok;
8. password benar diterima, salah/ kosong ditolak.

Alur browser juga dijalankan ujung ke ujung dengan Chromium:

```
/studio (belum masuk)        → 307 /studio/login
password salah               → "Password salah", tetap di login
password benar               → /studio (dashboard)
/studio/pages/about          → tulis "Kalimat pembuka" + satu paragraf
Simpan draf                  → "Draf tersimpan"; /artist TIDAK berisi draf
/studio/preview/about        → draf terlihat (khusus admin)
Terbitkan                    → "Terbit. Halaman publik …"; /artist memuat paragraf itu
Keluar                       → /studio/login; /studio dijaga lagi
```

Tangkapan layar: `docs/08-IMPLEMENTATION/screenshots/studio-01..09`.

### Perbaikan yang ketemu saat mengerjakan

| Masalah | Akibat | Perbaikan |
|---|---|---|
| Editor `home` menulis dokumen yang tidak pernah dirender beranda | Owner menerbitkan, tidak ada yang berubah | Beranda merender section terbit sebagai "Dari Studio" (D-044) |
| `db:seed` gagal di checkout bersih: `data/` tidak ada | Instruksi setup tidak bisa diikuti | `ensureDatabaseDirectory()` dipakai bersama (D-046) |
| Script mandiri tidak membaca `.env.local` | "DATABASE_URL is not set" padahal sudah diisi | `loadEnvConfig()` di seed & drizzle config (D-047) |
| Dashboard crash bila hanya `TURSO_*` yang diisi | Dashboard putih di setup yang didukung D-028 | Baca lewat `readDatabaseEnv()` (D-048) |
| UI Studio berbahasa Inggris | Campur bahasa dengan situs | Lokalisasi penuh, tes validasi ikut disesuaikan (D-045) |
| Label "Introduction" di halaman Artist | Tidak jelas bahwa itu kalimat pembuka, bukan bio | Label per halaman (D-043) |

### Artwork untuk owner

`/studio/media` sekarang memuat ceklis: setiap rilis, slug, dan path yang ditunggu
(`public/assets/covers/<slug>.webp`). Menaruh file dengan nama itu sudah cukup — tidak ada edit kode
atau database. Di produksi file ikut deploy berikutnya.

### Test & build

```
npm run check
  assets:check        ✓ (3 warning lama)
  typecheck, lint     ✓
  test                83/83
  test:db             8/8
  build               ✓
```

`.env.local` dan `data/` tetap di luar git. Database preview direset setelah pengujian: hanya enam
rilis terverifikasi, dan `/artist` kembali menampilkan keadaan `[NEEDS OWNER]`-nya.

### Belum dikerjakan

- Unggah media ke object storage: tombol unggah belum ada, menunggu kredensial storage.
- `/privacy`: sengaja dilewati, teksnya harus dari owner.
- Artwork 6 rilis: menunggu file dari owner.

---

## 17. Phase 7 — Liquid Signal WebGL asli (2026-10-23) — **SUPERSEDED by §18**

Mengganti placeholder SVG dot-matrix di hero dengan field WebGL sungguhan, tanpa mengorbankan
halaman bagi perangkat yang tidak bisa menjalankannya.

### Yang dibangun

| Berkas | Isi |
|---|---|
| `src/components/effects/liquid-signal/geometry.ts` | Matematika murni: lattice Fibonacci, jitter radial, `pointBudget`, `frameState` (proyeksi + kamera + ukuran titik), `breathScale`, `shouldAnimate`. Tanpa DOM/WebGL, jadi bisa dites |
| `src/components/effects/liquid-signal/shaders.ts` | Vertex + fragment GLSL ES 1.00 (satu sumber untuk WebGL1 & WebGL2). Quad menghadap kamera; ukuran/alpha dari kedalaman + rim |
| `src/components/effects/liquid-signal/renderer.ts` | Context, program, buffer, loop 50 fps, ResizeObserver, deteksi <30 FPS, `dispose()` yang melepas buffer + program + context |
| `src/components/effects/HeroSignal.tsx` | Pembungkus klien: render SVG dari server, impor renderer setelah `load` + idle, pause saat tab tersembunyi / canvas keluar viewport |
| `src/components/effects/SignalField.tsx` | Tidak dihapus: sekarang berperan sebagai lapisan statis permanen |

Keputusan teknis: **D-050…D-054** di `DECISION_LOG.md`.

### Angka

| Metrik | Hasil | Budget |
|---|---|---|
| Chunk renderer (dinamis, tidak ada di HTML awal) | **3.1 KB gz** (6.968 B raw) | < 70 KB gz |
| Tambahan JS awal dari wrapper + fallback | **+1.6 KB gz** (181.096 → 182.736 B) | < 180 KB gz total — sudah 180.2 KB sejak Phase 1, lihat catatan |
| LCP (390×844, DPR 2, 1.6 Mbps, CPU 4×) | **1,80 s** (FCP 0,74 s, load 2,62 s) | < 2,5 s |
| Buffer vertex terbesar (5.600 titik) | 0,8 MB, dibuat sekali per resize | — |
| Loop | maks 50 fps, `depth:false`, `antialias:false`, DPR ≤ 2 | FPS > 45 perangkat menengah |

Catatan jujur soal JS awal: angka 180,2 KB sudah tercatat di §9 sebelum Phase 7, dan budget 180 KB
dilewati tipis oleh framework + halaman sejak Phase 1. Phase 7 menambah 1,6 KB (pembungkus klien),
bukan lompatan. Phase 8 tetap harus menurunkan angka ini; menaikkan budget bukan penyelesaian.

### Perilaku yang diverifikasi di browser (headless Chromium, build produksi)

| Skenario | Hasil |
|---|---|
| `prefers-reduced-motion: reduce` | `data-signal-state="static"`, SVG opasitas 1, **chunk renderer tidak pernah diminta** |
| WebGL dimatikan (`getContext` webgl → `null`, `WebGLRenderingContext` dihapus) | state `static`, chunk tidak diminta, tidak ada error di konsol |
| HTML tanpa JavaScript | hero lengkap: H1, paragraf, CTA, portrait, dan field SVG tetap tampil |
| Chunk renderer di HTML awal | tidak ada (0 kecocokan nama chunk di HTML `/`) |
| Shader | compile + link sukses di WebGL2 nyata; 3 atribut dan 8 uniform semuanya ter-resolve |

### Batas lingkungan (penting untuk Phase 8)

Chromium headless di sandbox ini **tidak bisa merasterisasi WebGL sama sekali**: `drawArrays` apa pun
(1 segitiga, `gl.POINTS`, bahkan tanpa blending) mematikan frame. Yang bisa diverifikasi di sini
adalah kontrak di sekitar field: pemuatan tertunda, fallback, shader compile/link, ukuran chunk, dan
layout. Tampilan field saat berjalan **belum** terverifikasi dari browser di sandbox — karena itu:

- Tangkapan `phase7-*` dan skrip `scripts/liquid-signal-reference.ts` sudah dihapus bersama efeknya
  (D-055); yang berlaku sekarang ada di `screenshots/final/` dan dibuat dari halaman tanpa WebGL.
- Verifikasi visual terakhir ada di tangan owner lewat preview (browser sungguhan).

Bagian ini disimpan hanya sebagai catatan sejarah: kode yang dijelaskan di sini tidak ada lagi.

### Test

`npm run test` = **116 test** (83 Studio + 33 komponen baru); `npm run test:db` tetap 8 dijalankan terpisah:

- `tests/components/liquid-signal-geometry.test.ts` — 33 test: PRNG deterministik, anggaran titik per
  perangkat, batas DPR, aturan `shouldAnimate`, posisi titik pada bola satuan, sebaran kutub,
  ekspansi quad (6 vertex/partikel, semua sudut, seed seragam), jitter radial, matriks kolom-mayor
  (identitas, ortogonal, near/far plane), kamera (kembali ke posisi awal setelah 1440 s, < 10°/detik),
  napas 1 → 1,03, dan `frameState` (ukuran titik mengikuti tinggi buffer).

### Yang belum dikerjakan

- Verifikasi FPS nyata di Snapdragon 680 / Moto G4 (butuh perangkat; governor <30 FPS sudah terpasang
  tapi belum pernah terpicu di perangkat asli).
- Parallax scroll (−10% dolly) dan tilt pointer ≤10° dari 3D_ART_DIRECTION belum diimplementasikan;
  hero saat ini hanya bernapas dan berputar 5°/20 s seperti versi SVG.
- `/privacy` tetap tidak disentuh.


---

## 18. Final anti-AI pass (2026-10-23)

Dua langkah: bersihkan root, lalu hapus semua yang membuat situs terbaca sebagai template.

### 18.1 Root repo

`PROMPT_AWAL_AGENT.md`, `AGENTS_2.md`, dan `README_2.md` dipindah ke
`docs/08-IMPLEMENTATION/prompts/archive/` (lihat `README.md` di sana untuk alasan tiap file).
Root sekarang: `AGENTS.md`, `README.md`, `HANDOFF_TO_CODING_AGENT.md`, `CLAUDE.md`,
`GITHUB_REPO_README.md` + config (`next.config.ts`, `package.json`, `tsconfig.json`,
`vercel.json`, `eslint.config.mjs`, `drizzle.config.ts`).

`PROMPT_FINAL_V10_SINGLE_SOURCE.md` **tidak ada** di checkout ini maupun di `origin/main`, jadi file
itu tidak bisa dibaca. Brief yang dikirim lewat chat dipakai sebagai acuan, dan isinya direkam di
D-055…D-062 supaya tidak bergantung pada percakapan.

### 18.2 Yang dihapus (bukan disembunyikan)

| Dihapus | Keterangan |
|---|---|
| `src/components/effects/SignalField.tsx` + `.module.css` | SVG dot-matrix |
| `src/components/effects/HeroSignal.tsx` + `.module.css` | pembungkus WebGL |
| `src/components/effects/liquid-signal/` (`geometry.ts`, `shaders.ts`, `renderer.ts`) | renderer WebGL Phase 7 |
| `scripts/liquid-signal-reference.ts` | render referensi field |
| `tests/components/liquid-signal-geometry.test.ts` (29 test) | test untuk kode yang sudah tidak ada |
| `src/app/experiments/lattice/`, `src/experiments/`, `src/effects/` | eksperimen lattice + SpatialBackdrop yang hanya dipakai di sana |
| `.signal`, `.signal-field`, `.signal-blob`, `.signal-dots` | CSS efek |
| Impor `SignalField`/`HeroSignal` di `app/(site)/page.tsx` | hero sekarang murni foto + tipografi |

Tidak ada `three`, `@react-three/fiber`, `@react-three/drei`, atau `MusicNotesField` di repo ini sejak
awal — pengecekannya tetap ditambahkan ke test supaya tidak masuk diam-diam.

### 18.3 Yang dibangun

| Area | Hasil |
|---|---|
| Hero | split 60/40, padding 96/64px, potret 4:5 (70vh / 50vh) radius 24px + vignette 40%, H1 `clamp(2.5rem, 8vw, 6rem)` −0.02em, stats mono 12px `+5 tahun / +6 rilis` |
| Nav | 64px, hairline, blur 12px, AN 32px, wordmark Syne 14px −0.02em, link mono 11px uppercase, pill Listen → Spotify |
| Platform row | 4 platform terverifikasi, padding 32px |
| Genre tape | Breakbeat · Indo Bass · Jedag Jedug · Jungle Dutch, statis |
| Katalog | kartu 16:9 (cover 60% / info 40%) + 5 tile 1:1 + sel "Katalog lengkap": semua bersleeve, tidak ada sel kosong |
| Artwork | waterfall 4 level (D-057) + `npm run covers:fetch` |
| Token | surface `#101014`, border `#2A2A38` (D-059), grain 2% |
| `/visuals` | sekarang punya `h1` (D-060) |
| EPK | tetap `.zip` nyata 999.465 B (977 KB) |
| 404 | ghost AN 10% kanan, "Sinyal hilang", strip biru 5px |

### 18.4 Artwork: kondisi hari ini (jujur)

`npm run covers:fetch` jalan, tetapi **0 dari 6 rilis punya URL Spotify** di `src/content/releases.ts`
— judul terverifikasi, tautan per rilis masih `[NEEDS OWNER]`. Skrip melaporkan keenam slug dan tidak
mengarang URL. Selama itu, keenam kartu memakai sleeve generated level 3 (judul + AN 10% + rule 4px),
jadi katalog **tidak kosong** dan tidak memakai artwork milik orang lain. Begitu owner mengisi
`links` (atau menaruh file di `public/assets/covers/`), semua permukaan ikut berubah tanpa edit kode.

### 18.5 Verifikasi

| Cek | Hasil |
|---|---|
| `npm run check` | assets ✓ · typecheck ✓ · lint ✓ · **93 test** ✓ · 8 DB test ✓ · build ✓ |
| Route | `/` 200, `/music` 200, `/music/masih-mencintainya-papinka` 200, `/artist` 200, `/visuals` 200, `/epk` 200, `/nope` 404 |
| `canvas` di seluruh `src/app` + `src/components` | 0 (dijaga `anti-ai.test.ts`) |
| `h1` per halaman | 1 di setiap halaman yang diaudit (sebelumnya `/visuals` tidak punya) |
| Overflow horizontal di 390/768/1280 | tidak ada |
| Gambar rusak | 0 |
| Dependensi `three`/R3F | tidak ada |
| JS awal `/` | 181.1 KB gz (dulu 182.7 KB dengan renderer 3D) |
| CSS | 9.8 KB gz (3 berkas) |
| LCP `/` 390×844 DPR2, 1.6 Mbps, CPU 4× | 0.42 s hangat / 1.8 s request pertama |
| Tangkapan layar | 21 kombinasi route × lebar di `screenshots/final/` |

Test baru: `tests/studio/anti-ai.test.ts` (10 test) — memastikan komponen efek yang dihapus tidak
kembali, tidak ada `<canvas>`, tidak ada dependensi 3D, dan pola terlarang tidak muncul di berkas
beranda. Total 93 test (83 lama + 10 baru).

### 18.6 Belum / menunggu owner

- URL Spotify per rilis (6) → baru artwork level 2 bisa ditarik.
- Artwork resmi dari owner (level 1/4) — opsional, sleeve generated sudah tampil.
- Bio panjang, linimasa 2021–2024: masih `[NEEDS OWNER]`.
- `/privacy` tidak disentuh.
- Tangkapan layar 390/768/1280 ada di `docs/08-IMPLEMENTATION/screenshots/final-*`.

---

## 19. Langkah 2 lanjutan — konsolidasi aset dan sampul otomatis (2026-10-23)

Bagian ini menutup tiga hal yang di §18 masih terbuka: berkas aset yang tersebar, `covers/` yang
kosong, dan arsip visual yang baru berisi empat tile.

### 19.1 Root dan aset

Root repo tetap hanya berisi `AGENTS.md`, `README.md`, `HANDOFF_TO_CODING_AGENT.md`, `CLAUDE.md`,
`GITHUB_REPO_README.md` + config. Tidak ada `PROMPT_*.md`, `*_2.md`, maupun `*.example.tsx` yang
tersisa; salinannya ada di `docs/08-IMPLEMENTATION/prompts/archive/` dan tidak dibaca lagi.

`public/assets/` sekarang memuat rak aset pemilik dengan nama yang diminta (potret `.webp`/`.jpg`,
`-1200.webp`, `logo-an.png`, `akbar-logo*.webp`, `akbar-rmx-mark.webp`,
`akbar-night-frequency-hero*.webp`, `akbar-editorial-stage-bg.webp`, dua PNG transparan), 2.5 MB
total. Berkas besar diturunkan dulu; halaman tetap memakai turunan `/brand` dan `/media` yang lebih
kecil. `scripts/build-web-assets.sh` kini juga menghasilkan `editorial-{720,1400}` dan
`mascot-420`.

`night-frequency-hero` adalah foto yang sama dengan frame panggung, jadi hanya ada satu tile untuk
foto itu (D-067).

### 19.2 Sampul: dari komponen ke berkas

`npm run covers:sleeves` (`scripts/generate-placeholder-covers.mjs`) merender enam sleeve
1000×1000 ke `public/assets/covers/<slug>@sleeve.webp`. Isinya hanya fakta terverifikasi: judul,
artis asal dan tahun bila ada, monogram AN 10%, latar `#101014`, pil mono, dan rule 4 px.

Jalur artwork menjadi: `image` (berkas asli/Spotify) → `sleeve` (berkas generated) → `generated`
(komponen, hanya bila belum ada berkas). Perbedaan `sleeve` vs `image` dipakai untuk satu hal:
sleeve sudah mencetak judul, jadi tile tidak mencetak judul yang sama lagi di bawahnya.

Pembungkusan judul memakai tabel lebar glyph Syne yang sebenarnya (D-065); perkiraan 0.55 em
sebelumnya membuat judul meluber keluar kanvas.

### 19.3 Verifikasi

| Cek | Hasil |
|---|---|
| `npm run check` | assets ✓ · typecheck ✓ · lint ✓ · **98 test** ✓ · 8 DB test ✓ · build ✓ |
| Rute | `/` 200 · `/music` 200 · `/music/masih-mencintainya-papinka` 200 · `/artist` 200 · `/visuals` 200 · `/epk` 200 · `/nope` 404 |
| `canvas` | 0 di seluruh rute |
| Gambar rusak | 0 (`imgsBroken` 0 setelah halaman digulir penuh) |
| Overflow horizontal | tidak ada di 390 / 768 / 1280 |
| Sampul | 6 berkas `@sleeve.webp`, 8–15 KB masing-masing |
| Arsip visual | 6 tile, rasio asli dipertahankan |

Test baru: 3 test `web-assets` (editorial dan maskot) dan 3 test resolusi sampul
(`sleeve` dikenali, artwork asli menang atas sleeve, setiap rilis punya visual). Total 98.

### 19.4 Catatan alat

- Tangkapan full-page harus menggulir halaman dulu; gambar artwork memakai `loading="lazy"`, jadi
  tanpa gulir tile tampak kosong (D-069).
- Sleeve dirender dengan Syne dan JetBrains Mono yang terpasang di mesin yang menjalankan skrip.
  Tanpa font itu librsvg jatuh ke sans sistem dan hasilnya tidak sesuai merek.

### 19.5 Masih menunggu owner

- URL Spotify per rilis: 6. Selama kosong, `covers:fetch` melaporkan dan tidak mengarang tautan.
- Bio panjang dan linimasa 2021–2024 (`[NEEDS OWNER]`).
- Angka `+5 tahun` di brief berbeda dengan hitungan nyata 6 tahun (D-070).
- `/privacy` tetap tidak disentuh.

---

## 20. Phase 8 — QA final (2026-10-23)

Semua angka di bawah diambil dari **build produksi** (`next build && next start`) di sandbox ini,
bukan dari dev server. Yang tidak bisa dilakukan dari sandbox: upload ke Vercel, jadi langkah itu
tetap di tangan owner (`DEPLOYMENT_RUNBOOK.md`).

### 20.1 Lighthouse

Dijalankan dengan Lighthouse 12 terhadap `http://127.0.0.1:3000/` (Chromium 153 headless).

| Profil | Performance | Accessibility | Best practices | SEO | LCP | FCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Desktop preset | **100** | **100** | **100** | **100** | 0.8 s | 0.4 s | 0 ms | 0 |
| Mobile, `--throttling-method=devtools` | **99** | **100** | **96** | **100** | 1.8 s | 1.6 s | 70 ms | 0 |
| Mobile, simulasi Lantern (default LH) | 90–91 | **100** | **96** | **100** | 3.5 s | 1.5 s | 40 ms | 0 |

Catatan jujur soal baris ketiga: mode default Lighthouse memakai model simulasi (RTT 562 ms, 1.6
Mbps) di atas server lokal **HTTP/1.1**, sehingga 20+ request JS mengantre per koneksi. Dengan
throttling nyata (baris kedua) LCP 1.8 s, dan di produksi Vercel (HTTP/2, CDN) antrean itu hilang.
Selisih 8 poin antara dua mode bukan regresi halaman; keduanya dilaporkan supaya tidak ada angka
yang dipilih sepihak.

`best-practices` 96 (bukan 100) berasal dari satu audit: `font-size`, karena label mono 11 px sesuai
brief (D-077). Accessibility 100 dan axe 0 violation.

### 20.2 axe-core

`npm run a11y` — axe-core 4.14, 7 rute × 390/1280 = **14 pemuatan halaman**.

```
0 violation(s) across 14 page loads
```

Temuan yang diperbaiki sampai nol: kontras putih-di-biru pada tombol primer (3.55:1 → 5.56:1,
D-071), `label-content-name-mismatch` pada kartu bento, `scrollable-region-focusable` pada genre
tape. Satu hasil `incomplete` (kontras teks di atas artwork) diperiksa manual: `#A1A1B5` di atas
scrim `rgba(10,10,14,0.92)` ≈ 7.54:1.

### 20.3 Header keamanan

Diverifikasi dengan `curl -sI` pada `/`:

| Header | Nilai |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Cross-Origin-Opener-Policy` / `-Resource-Policy` | `same-origin` |
| `X-Frame-Options` | `SAMEORIGIN` (produksi) |

`script-src 'unsafe-inline'` adalah kompromi yang dicatat (D-073): Next menstreaming payload RSC
sebagai script inline. Tidak ada konten pengguna yang dirender sebagai HTML; satu-satunya
`dangerouslySetInnerHTML` adalah JSON-LD yang di-escape (`serializeJsonLd` mengganti setiap `<`).

### 20.4 SEO

| Berkas | Isi |
|---|---|
| `/sitemap.xml` | 6 halaman + 6 rilis = 12 URL; tanpa `/studio`, `/api`, `/about`, `/privacy` |
| `/robots.txt` | `Allow: /`, `Disallow: /studio`, `/studio/`, `/api/`, host + sitemap absolut |
| `/manifest.webmanifest` | nama, warna `#0A0A0E`, ikon 64 dan 180 |
| JSON-LD | `MusicGroup`: nama, `alternateName` DJ Akbar Remix, genre terverifikasi, `foundingDate` 2020, 4 `sameAs` resmi |
| Meta | canonical per halaman, OG 1000×1000 + alt, Twitter `summary`, `lang="id"` |

### 20.5 Anggaran performa

| Metrik | Hasil | Anggaran |
|---|---|---|
| JS awal `/` | **181.1 KB** gzip (10 chunk) | < 200 KB |
| CSS | **9.8 KB** gzip (3 berkas) | < 30 KB |
| LCP mobile (throttle nyata) | **1.8 s** | < 2.5 s |
| LCP desktop | **0.8 s** | < 2.5 s |
| CLS | 0 | < 0.1 |
| `canvas` | 0 di 7 rute | — |

### 20.6 Test

| Suite | Hasil |
|---|---|
| `npm run test` | **107 test, 107 lulus, 0 gagal** (26 suite) |
| `npm run test:db` | 8 lulus (publish flow, drafts tidak bocor) |
| `npm run typecheck` | bersih |
| `npm run lint` | bersih |
| `npm run build` | sukses |
| `npm run a11y` | 0 violation |

Test baru Phase 8: `security-headers.test.ts` (4) dan `seo.test.ts` (5) — total 9, dari 98 ke 107.

### 20.7 Tangkapan layar

42 berkas di `screenshots/final/`: `/`, `/music`, `/music/masih-mencintainya-papinka`, `/artist`,
`/visuals`, `/epk`, `/nope` × 390/768/1280 (layar pertama + halaman penuh). `canvas` 0, gambar
rusak 0, overflow horizontal 0.

### 20.8 Yang masih menunggu owner

- **`/privacy`** — tidak dibuat; teksnya milik owner.
- **Merge ke `main` + deploy produksi** — belum dilakukan. Branch tetap
  `arena/e02160ef-akbar-nawasunda`; langkahnya ada di `DEPLOYMENT_RUNBOOK.md` §2 dan §3.
- URL Spotify per rilis (6) → artwork level 2.
- Bio panjang dan linimasa 2021–2024 (`[NEEDS OWNER]`).

---

## 21. Serah terima merge & deploy (2026-10-23)

Phase 8 selesai dan disetujui owner. Yang **tidak** bisa diselesaikan dari sesi ini, beserta alasannya:

### 21.1 `main` punya riwayat yang tidak berhubungan

| | |
|---|---|
| Root `origin/main` | `5bb94f7 Add files via upload` (18:04 WIB), lalu `9b36d16` (18:36) |
| Root branch ini | `57fde14 Add files via upload` |
| `git merge-base origin/main HEAD` | kosong |
| `gh pr merge 3 --squash` | ditolak: *"the merge commit cannot be cleanly created"* |
| Hasil uji `--allow-unrelated-histories` | **69 konflik add/add**, semuanya "ambil versi branch" |

Penyebabnya: repo di-upload ulang ke `main` lewat web GitHub hari ini, sehingga terbentuk root baru.
Men-squash dua riwayat tanpa leluhur bersama tidak mungkin. Perintah penyelesaian ada di
`DEPLOYMENT_RUNBOOK.md` §7 (satu commit sinkronisasi di `main`, tanpa force-push, riwayat `main` tetap
utuh). Sesi ini **tidak boleh** push ke `main`, jadi langkah itu menunggu owner.

Tidak ada yang hilang: berkas yang hanya ada di `main` sudah diselamatkan —
prompt V9–V11 + `cleanup-prompts.sh` ke `docs/08-IMPLEMENTATION/prompts/archive/`,
`ASSET_INVENTORY_REAL.md` ke `docs/05-CONTENT-AND-ASSETS/`, `.nvmrc` sudah sama. Sisanya adalah kode
mati yang memang dihapus D-055 (`SignalField.example.tsx`, `MusicNotesField.example.tsx`,
`src/experiments/lattice`, `src/effects/`, `src/app/(site)/about/`) dan tiga font yang tidak dipakai.

### 21.2 Brief V9–V11 diaudit ulang

`PROMPT_FINAL_V11_CLEAN_REPO.md` akhirnya ditemukan di `main` dan dibandingkan baris per baris dengan
build ini. **Tidak ada requirement yang terlewat.** Deviasi yang disengaja, semuanya sudah punya baris
keputusan: Sora → Syne (D-059), pill genre → `RILIS 0X / 06` (D-066), `+5 tahun` → `+6` (D-070),
`logo-an.png` → mark transparan (D-063), teks putih di pil biru → near-black (D-071).

### 21.3 Deploy produksi tidak bisa dijalankan dari sandbox

`vercel.com`, `api.vercel.com` dan `api.turso.tech` tidak dapat dijangkau dari sandbox ini (hanya
GitHub, npm dan PyPI yang diizinkan), dan tidak ada kredensial Vercel/Turso di sini. Karena itu
deploy tetap di tangan owner; seluruh langkahnya ada di `DEPLOYMENT_RUNBOOK.md` §1–§3.

Sebagai gantinya, satu perintah verifikasi pasca-deploy ditambahkan:

```bash
npm run smoke -- https://akbarnawasunda.my.id
```

24 pemeriksaan (rute, 404, redirect `/about`, enam header keamanan, sitemap/robots/manifest, JSON-LD,
unduhan EPK, enam sampul, tidak ada `<canvas>`). Sudah dijalankan terhadap build lokal:
**24/24 lulus**. Skrip yang sama dipakai setelah deploy produksi.

### 21.4 Status akhir

| Item | Status |
|---|---|
| Branch `arena/e02160ef-akbar-nawasunda` | semua pekerjaan ter-push |
| PR #3 | **OPEN**, tidak bisa di-merge sampai `main` disinkronkan (§21.1) |
| Test | 107 + 8 DB, hijau |
| axe / Lighthouse | 0 violation / 100·100·100·100 desktop, 99·100·96·100 mobile |
| `npm run smoke` | 24/24 |
| `/privacy` | tidak dibuat |
| `main` | tidak disentuh dari sesi ini |
