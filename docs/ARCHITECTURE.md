# ARCHITECTURE — akbarnawasunda.my.id

- Status: **aktif** (2026-10-28), branch `arena/13d0ccf1-akbar-nawasunda`
- Dokumen ini mencatat arsitektur **dan** aturan deployment yang mengikat. Angka di sini diambil
  dari output perintah nyata, bukan perkiraan.

---

## 1. Stack

| Lapisan | Nilai aktual | Bukti |
| --- | --- | --- |
| Framework | **Next.js 16.4.0** (App Router), Turbopack build | `package.json` `"next": "^16.4.0"`; `next build` mencetak `▲ Next.js 16.4.0 (Turbopack)` |
| React | 19.3.x | `package.json` |
| Bahasa | TypeScript 5.9.3 (`tsc --noEmit` gate) | `npm run typecheck` |
| Node | `.nvmrc` = `22`; `engines.node >=20.9.0` | `.nvmrc`, `package.json` |
| Styling | CSS Modules + token CSS (`src/styles/tokens.css`) | `src/**/*.module.css` |
| Data publik | Static content (`src/content/*.ts`) + Turso/libSQL opsional via `src/studio/public.ts` | `getPublicPage()`, `getPublishedReleases()` |
| CMS | `/studio/*` (privat, di luar scope publik) | `src/app/studio/**` |
| Host | Vercel, project `akbar-nawasunda`, domain `akbarnawasunda.my.id` | `src/config/site.ts` → `url`; `vercel.json` |
| 3D/WebGL | `three`, `@react-three/fiber`, `@react-three/drei` **terpasang** | `package.json`; lihat `docs/DESIGN.md` §4 — target rebuild adalah **keluar** dari jalur ini |

### Route yang ada

| Route | Tipe render sekarang | Keterangan |
| --- | --- | --- |
| `/` | `ƒ` dynamic | ada `export const revalidate = 60` **dan** pembacaan DB (`getPublicPage`, `getPublicPhotos`) |
| `/music` | `ƒ` dynamic | `export const dynamic = "force-dynamic"` |
| `/music/[slug]` | `ƒ` dynamic | `export const dynamic = "force-dynamic"` |
| `/artist` | `ƒ` dynamic | membaca content/DB |
| `/visuals` | `ƒ` dynamic | membaca `getPublicPhotos()` |
| `/contact` | `ƒ` dynamic | — |
| `/epk` | `ƒ` dynamic | — |
| `/about` | `ƒ` dynamic | 308 → `/artist` di config |
| `/api/public/foto/[slot]` | `ƒ` | memang harus dynamic |
| `/og` | `ƒ` | memang harus dynamic |
| `/studio/*` (10 route) | `ƒ` | memang harus dynamic |
| `/_not-found`, `/icon.png`, `/apple-icon.png`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`, `/experiments/lattice` | `○` static | — |

---

## 2. Struktur folder

```
src/app        route publik (site) + /studio (CMS) + /og (social card) + /api
src/components layout/ content/ media/ ui/ zine/ three/ print/ effects/
src/content    data rilis, artist, visuals, covers (waterfall artwork), release-view
src/config     site identity, navigation, socials
src/lib        metadata, fonts, security headers, structured data, turso
src/studio     repository, content model, db, auth, media (server-only)
src/styles     tokens.css (satu-satunya sumber hex) + globals.css
scripts/       gate & tooling: a11y, qa-motion, check-web, token-audit, dll.
tests/         node:test — studio/* (unit) dan database/* (integrasi)
docs/          dokumentasi (38 MB, mayoritas screenshot .webp) — TIDAK boleh ke bundle
artifacts/     output screenshot lokal, .gitignored
```

`artifacts/` di-`.gitignore` (`/artifacts/`). Bila ada file bukti yang harus bertahan lintas sesi,
**force-add file spesifik** (`git add -f artifacts/visual-check/...`), jangan mengubah ignore rule
menjadi membuka seluruh folder.

---

## 3. ATURAN DEPLOYMENT (MENGIKAT — mencegah insiden storage terulang)

Latar: insiden storage Vercel **19.36 GB** pernah terjadi dan memaksa owner menghapus total project
lama. Penyebabnya adalah Next.js File Tracing (NFT) menyeret seluruh isi project ke bundle
serverless.

### 3.1 Bukti bahwa risiko ini AKTIF di repo ini (diukur 2026-10-28)

`npm run build` mencetak **2 warning**:

```
./src/content/covers.ts:33:9
Warning: Dynamic filesystem access causes tracing of the whole project
> 33 |     if (existsSync(join(publicDir, candidate))) return candidate;

Static analysis determined that this filesystem access causes the whole project to be traced
Import traces:
  App Route:        ./src/content/covers.ts → ./src/app/og/route.tsx
  Server Component: ./src/content/covers.ts → ./src/app/(site)/music/[slug]/page.tsx
```

Konsekuensinya terukur. Trace file untuk satu route publik
(`.next/server/app/(site)/music/[slug]/page.js.nft.json`) berisi **1171 entri**:

| Bucket | Jumlah file ter-trace |
| --- | --- |
| `docs/` | **515** |
| `node_modules/` | 273 |
| `src/` | 188 |
| `other` | 96 |
| `public/` | 62 |
| `scripts/` | 19 |
| `tests/` | 18 |

`docs/` sendirian **38 MB** (screenshot `.webp` hasil review round 11–18). Karena 8 route publik
semuanya dynamic, trace yang sama diulang per route, dan setiap redeploy menulis ulang semuanya ke
storage deployment. Inilah mekanisme yang dulu berujung 19.36 GB.

**Status: SUDAH DIPERBAIKI (commit `90c2b1f`, Langkah 3a).** Angka sesudah, diukur pada build yang sama:

| Bucket | Sebelum | Sesudah |
| --- | --- | --- |
| total entri traced | 1189 | **316** (−73.4%) |
| `docs/` | 520 | **0** |
| `src/` | 188 | 0 (ter-bundle jadi `.js`, benar) |
| `node_modules/` | 263 | 263 (tidak berubah, memang dependensi) |
| `other` | 117 | 42 |
| `public/` | 62 | **11** — tepat isi `public/assets/covers/` |
| `scripts/` | 21 | **0** |
| `tests/` | 18 | **0** |

`Warning: Dynamic filesystem access…` → **0** (dari 2). Ukuran `.next` 75 MB → 72 MB.

Akar masalah dan bentuk perbaikannya ada di komentar kepala `src/content/covers.ts`; ringkasnya:
parameter `publicDir` membuat `existsSync(join(publicDir, …))` tidak bisa dianalisis statis, dan
satu-satunya `fs` call sekarang memakai segmen path **literal** sehingga tracer berhenti di
`public/assets/covers/`. Eksperimen pembanding membuktikan segmen literal itu yang mematikan
warning; varian yang mempertahankan parameter tetap menghasilkan 2 warning.

### 3.2 Perbaikan yang WAJIB (Langkah 3a)

Urutan kerja, jangan dibalik:

1. ✅ **SELESAI.** Akar masalah di `src/content/covers.ts` diperbaiki dengan opsi kedua dari dua opsi
   di bawah: scope path ke subfolder **literal** (`join(process.cwd(), "public", "assets", "covers")`),
   bukan map statis. Map statis ditolak karena menambah risiko basi: file cover baru yang di-drop
   owner (atau diambil workflow `covers.yml`) tidak akan muncul sampai manifest di-generate ulang.
   Scoping literal tidak punya masalah itu — ia tetap membaca disk saat runtime, hanya dengan batas
   yang bisa dibuktikan tracer. `/*turbopackIgnore*/` tidak dipakai sama sekali.
2. **TIDAK DIPAKAI (keputusan sadar).** Rencana awal menambahkan `outputFileTracingExcludes` seperti
   di bawah. Setelah akar masalah diperbaiki, exclude hanya akan **menutupi** sinyal: kalau suatu hari
   ada dynamic `fs` baru, warning tracing seharusnya muncul dan gagal, bukan tertelan. Exclude tetap
   dicatat di sini sebagai opsi darurat bila perbaikan akar tidak memungkinkan:

   <details><summary>isi rencana exclude (tidak diterapkan)</summary>

   ```ts
   outputFileTracingExcludes: {
     "*": [
       "docs/**",
       "artifacts/**",
       "scripts/**",
       "tests/**",
       "*.md",
       // aset besar yang tidak diimpor langsung
       "public/assets/covers/*.webp",
     ],
   }
   ```

   (`outputFileTracingIncludes: { "/og": [...] }` yang sudah ada jangan dihapus — `/og` memang
   membaca font & cover saat request.)

   </details>
3. ✅ **SELESAI.** `.vercelignore` sekarang ada di root repo — lapisan kedua (batas ukuran upload),
   bukan perbaikan. Isinya:`

   ```
   docs/
   artifacts/
   scripts/
   tests/
   coverage/
   *.md
   !README.md
   **/*.test.ts
   **/*.test.mjs
   .next/cache/
   ```

4. ✅ **SELESAI.** `npm run build` mencetak **0** warning tracing, dan trace route publik turun
   1189 → 316 entri (tabel di §3.1). Sisa 316 = `node_modules` 263 + `other` 42 (chunk build) +
   11 file `public/assets/covers/`, yaitu batas statis yang diminta.

**Catatan untuk gate CI:** warning tracing tidak menggagalkan pipeline. Setelah perbaikan ini
jumlahnya nol, jadi aman menambahkan pemeriksaan eksplisit (`grep -q "Dynamic filesystem access"
&& exit 1`) sebagai penjaga regresi — belum dikerjakan, masuk daftar usulan.

### 3.3 Route publik wajib static

- Semua route publik harus tercetak **`○` (Static)** atau **`●` (SSG)** di output `next build`.
- Pengecualian yang sah: `/api/*`, `/og`, `/studio/*`.
- **Status sekarang: FAIL.** 8 route publik tercetak `ƒ`, daftar lengkap di §1. Penyebab: kombinasi
  `force-dynamic`, `revalidate = 60` + pembacaan DB, dan pembacaan DB tanpa `cache` di
  `src/studio/public.ts`.
- Arah perbaikan (Langkah 3a, setelah tracing): pisahkan **jalur build dari jalur CMS**. Saat build,
  publik membaca `src/content/*` (murni statis, tanpa DB, tanpa `fs`). CMS tetap jalan, tapi
  publikasi lewat `revalidatePath` pada route ISR — bukan `force-dynamic` di seluruh situs.
  Ini perubahan perilaku produk (maks. 1 menit keterlambatan publish) → **konfirmasi ke owner
  sebelum dikerjakan.**

### 3.4 Gate sebelum push ke branch yang terhubung Vercel

- Branch kerja sesi ini (`arena/…`) **tidak** terhubung ke deployment produksi. Commit checkpoint ke
  branch ini tidak memicu build produksi.
- Sebelum push ke `main` (atau branch yang di-track Vercel): jalankan `npm run build`, baca **seluruh**
  output, pastikan 0 warning tracing dan semua route publik `○`/`●`.
- **Cek manual di dashboard Vercel** (tidak bisa diverifikasi dari repo): Settings → Git → *Ignored
  Build Step*, isi:

  ```
  if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; else exit 1; fi
  ```

  Status: **BELUM DIVERIFIKASI — BUTUH OWNER.** Tidak ada bukti di repo bahwa ini sudah dipasang.

---

## 4. CI/CD — isi pipeline yang ADA SAAT INI

### `.github/workflows/ci.yml` (audit, bukan usulan)

Trigger: `push` ke `main` dan `arena/**`, semua `pull_request`, `workflow_dispatch`.
Job tunggal `quality · budgets · a11y` (timeout 20 menit) — sengaja satu job karena
`required-server-files.json` menyimpan path absolut sehingga `.next` tidak bisa dipindah antar job.

Gate berurutan:

| # | Step | Perintah | Efek |
| --- | --- | --- | --- |
| 1 | Typecheck | `npm run typecheck` | `tsc --noEmit` |
| 2 | Lint | `npm run lint` | eslint |
| 3 | Unit tests | `npm run test` | `tests/studio/*.test.ts` via `tsx --test` |
| 4 | Design tokens | `npm run audit:tokens` | hex di luar `tokens.css`, token tak terdefinisi/tak terpakai |
| 5 | Build | `npm run build` (`PREVIEW_FRAMING=1`) | **tidak** mendeteksi warning tracing sebagai kegagalan |
| 6 | Install Chrome | `browser-actions/setup-chrome@v1` | browser untuk axe |
| 7 | Start site | `npx next start -H 127.0.0.1 -p 3000` | tunggu sampai `curl` sukses (maks 40×1s) |
| 8 | Budget + link | `npm run check:web` | budget JS/CSS, link internal, anchor |
| 9 | A11y | `npm run a11y` (`CHROME_PATH` dari step 6) | axe-core, 14 page load (7 route × 2 lebar: 390/1280) |
| 10 | Smoke | `npm run smoke` | — |
| 11 | Motion | `npm run qa:motion` (`CHROME_PATH`) | perilaku scroll, reveal, drawer focus-trap, reduced-motion, **kontrak 0 canvas di scroll 0** |

Job kedua `external-links` hanya `workflow_dispatch` (14 tautan platform, host eksternal).

### `.github/workflows/covers.yml`

`workflow_dispatch` + cron mingguan (`0 3 * * 1`): resolusi artwork dari tautan rilis, lalu buka PR
otomatis bila ada perubahan. Bukan gate kualitas.

### Catatan gap CI

- `npm run audit:tokens` dijalankan, tapi **belum ada** gate yang memeriksa `border-radius: 0`.
  Assertion radius perlu ditambahkan ke `scripts/token-audit.mjs` atau test baru (Langkah 3g).
- Gate build tidak menggagalkan pipeline saat ada warning tracing. Setelah Langkah 3a, tambahkan
  pemeriksaan eksplisit (mis. `grep -q "Dynamic filesystem access" && exit 1`).

---

## 5. Status PR & branch (diverifikasi 2026-10-28)

- **Tidak ada PR aktif.** `gh pr list --state open` → kosong.
- PR lama ditutup manual oleh owner: #16, #15, #14, #13, #12, #11, #10, #9, #8, #7 (dan seterusnya) —
  semua `CLOSED`. Ringkasan terakhir yang closed: #16 "Overhaul: static export publik, sistem UI
  industrial, & visual QA tooling".
- Branch kerja sesi ini: **`arena/13d0ccf1-akbar-nawasunda`**, dibuat dari `main` @ `ca74742`.
- Catatan penting soal penamaan branch: master prompt meminta branch `rebuild/garrix-tier-v1`.
  Itu **tidak bisa** dipenuhi di sesi ini — platform Arena mengikat sesi ke branch
  `arena/13d0ccf1-akbar-nawasunda` dan melarang membuat/mendorong branch lain. Branch ini
  berfungsi setara: branch kerja terpisah dari `main`, di-push ke remote, dan aman dari reset
  sandbox. PR di Langkah 4 dibuka dari branch ini.
- `main` adalah satu-satunya branch yang di-deploy Vercel (aturan §3.4).

---

## 6. Risiko dependensi (npm audit, 2026-10-28)

`npm audit` → **5 kerentanan: 1 critical, 0 high, 4 moderate**.

| Paket | Severity | Advisory | Dampak |
| --- | --- | --- | --- |
| `next` 16.4.0 | **critical** | GHSA-2464-fhr4-w9xw — RCE tanpa autentikasi di Image Optimization API saat SVG dipakai | produksi |
| `next` 16.4.0 | **critical** | GHSA-673q-mjm6-r5xr — RCE di `use cache` yang mengembalikan typed array | produksi |
| `next` 16.4.0 | high | GHSA-p3m5-59mp-jv5r — DoS di App Router via Server Actions | produksi |
| `drizzle-kit` → `@esbuild-kit/esm-loader` → `esbuild` | moderate | GHSA-67mh-4wv8-2f99 — dev server esbuild menerima request sembarang | dev-only |

Versi terbaru `next` di registry saat audit: **16.4.3** (di luar rentang rentan `16.0.0 - 16.4.0`).
**Rekomendasi: naikkan `next` ke 16.4.3 sebelum deploy berikutnya.** Belum dikerjakan karena
Langkah 0 hanya dokumentasi; ini perlu keputusan owner + verifikasi build ulang.

---

## 7. Gate yang dipakai tiap langkah

```
npm run typecheck     tsc --noEmit
npm run lint          eslint
npm run test          tests/studio
npm run audit:tokens  hex/token audit
npm run build         build + route table + warning tracing
npm run check:web     budget JS/CSS + link internal (butuh next start)
npm run a11y          axe-core (butuh Chrome)
npm run smoke
npm run qa:motion     perilaku + kontrak 0 canvas (butuh Chrome)
```

`npm run check` menjalankan: `assets:check → typecheck → lint → test → test:db → build`.
`test:db` butuh konfigurasi database; di sandbox tanpa `.env` ia bisa gagal — catat hasilnya apa
adanya, jangan disembunyikan.
