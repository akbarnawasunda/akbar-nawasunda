# AUDIT Langkah 2 — state repo vs DESIGN.md

- Tanggal: 2026-10-28 · branch `arena/13d0ccf1-akbar-nawasunda` · commit audit: `96dc873`
- Sifat: **audit murni. Tidak ada satu baris kode produk yang diubah di langkah ini.**
  Satu-satunya perubahan yang di-commit adalah dokumen ini + screenshot bukti.
- Metode: baca kode + **ukur DOM di Chromium sungguhan** (bukan tafsir CSS).
  Angka diambil dari `artifacts/visual-check/audit/*.json` dan screenshot
  `artifacts/visual-check/audit-evidence/`.

---

## 1. State repo

```
$ git log --oneline -20
96dc873 evidence(visual): baseline hero + ledger, force-add agar tahan reset sandbox
8372085 docs(visual): hasil terukur Langkah 1 + baseline situs sebelum perbaikan
8e2c739 tools(visual): visual-check.mjs + setup-visual-tools.sh yang jalan di sandbox tanpa CDN
3862d22 docs: PRD, DESIGN, ARCHITECTURE, VISUAL-VERIFICATION untuk rebuild garrix-tier
ca74742 Merge pull request #3 from akbarnawasunda/arena/e02160ef-akbar-nawasunda

$ git status
On branch arena/13d0ccf1-akbar-nawasunda
Your branch is up to date with 'origin/arena/13d0ccf1-akbar-nawasunda'.
nothing to commit, working tree clean

$ git diff --stat ca74742..HEAD
13 files changed, 1485 insertions(+), 1 deletion(-)
  (4 docs/*.md, 2 scripts, package.json+lock, 4 PNG baseline, 1 README)
```

Tidak ada perubahan pada `src/` sejak `ca74742`. Semua isi di bawah ini adalah kondisi `main`.

---

## 2. Build

`npm run build` → exit 0. **2 warning**, identik dengan Langkah 1:

```
Warning: Dynamic filesystem access causes tracing of the whole project
  ./src/content/covers.ts:33:9  dan  :33:20
  Import traces: App Route ./src/app/og/route.tsx
                 Server Component ./src/app/(site)/music/[slug]/page.tsx
```

Tabel route (re-run, sama persis dengan Langkah 1):

| Tipe | Route |
| --- | --- |
| `○` Static (7) | `/_not-found`, `/apple-icon.png`, `/experiments/lattice`, `/icon.png`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` |
| `ƒ` Dynamic (21) | `/`, `/about`, `/artist`, `/contact`, `/epk`, `/music`, `/music/[slug]`, `/visuals`, `/api/public/foto/[slot]`, `/og`, `/studio/*` (11) |

**8 route publik `ƒ`** — `PRD.md` P3 tetap **FAIL**.

---

## 3. Baseline visual

14 shot di `artifacts/visual-check/baseline/` (7 route × 1440×900 / 390×844), 14/14 PNG valid,
0 console error, 0 axe violation. Empat file utama sudah di-commit di `96dc873` (home, music).
Lengkapnya: `/music/[slug]`, `/artist`, `/visuals`, `/contact`, `/epk` — semuanya terambil.

Bukti terarah tambahan (di-commit bersama dokumen ini):
`audit-evidence/music-wall-1440.png`, `music-wall-390.png`.

---

## 4. Tabel audit — item konkret DESIGN.md

Kolom "Bukti" berisi angka hasil pengukuran DOM pada 1440×900 dan 390×844.

| # | Item (DESIGN.md) | Sesuai? | Bukti terukur |
| --- | --- | --- | --- |
| 1 | **Logistics strip hero** `KATALOG: N ITEM // STATUS: AKTIF // LOC: …` | **TIDAK** | `logisticsStripPresent: false`. Yang ada `.factsBar`: strip krem `rgb(232,230,225)` dengan `<dl>` 3 fakta; `innerText` = `"Rilis10Tahun aktif6Tautan resmi14"` |
| 2 | **N dihitung dari data**, bukan hardcoded | **YA** | `heroStats().releaseCount` ← `releases.length` = 10. Nilai tampil `10`, cocok dengan katalog. Bukan angka literal di JSX |
| 3 | **Gap CTA → strip ≤ 40px** | **TIDAK** | `gapCtaToFacts: 63.1px` (ctaBottom 795.02 → factsTop 858.14) |
| 4 | **Strip di dalam fold 900px @1440** | **TIDAK** | `factsTop 858.14` → `factsBottom 936.52`. **Terpotong 36.5px** di bawah fold 900 |
| 5 | **Wordmark `clamp(2.8rem, 11vw, 4.5rem)`** | **TIDAK** | `--text-hero: clamp(2rem, 4vw, 4rem)`; terukur **57.6px** @1440 (spec: 11vw = 158.4px, ceiling 72px) dan **40px** @390 |
| 6 | **Watermark nomor raksasa di ledger** (`clamp(2.5rem,5vw,4.5rem)`, `--color-watermark`) | **TIDAK** | `bigWatermarkCount: 0`. Ordinal yang ada: `font-size 9px`, `color rgb(184,184,184)` (= `--color-text-secondary`, bukan watermark). `--color-watermark` tidak terdefinisi di `tokens.css` |
| 7 | **z-index watermark: di atas bg, di bawah teks, di bawah cover** | **N/A** | Tidak ada watermark untuk diuji |
| 8 | **Hover ledger: `translateX(6px)`** | **TIDAK** | Hover nyata: `--wall-z: 25.6px`, `--wall-ry: -0.87deg`, `translateX: -0.39px`. Gerakannya **lift 3D + rotasi**, bukan geser 6px horizontal |
| 9 | **Hover: watermark menyala `rgba(255,255,255,0.12)`** | **TIDAK** | Tidak ada watermark; ordinal tetap `rgb(184,184,184)` saat hover |
| 10 | **Hover: border row → `--color-signal-blue`** | **TIDAK** | `borderTop` tetap `rgb(31,31,31)` sebelum & sesudah hover. Yang berubah: `box-shadow` sleeve → `10px 12px 0 var(--color-border-strong)` (abu-abu, bukan biru) |
| 11 | **Ledger = baris** (bukan grid) | **TIDAK** | `<ol>` grid: `grid-template-columns: 306.02px ×4`, `perspective: 1700px`. Ini *wall* 4 kolom, bukan ledger baris |
| 12 | **Mobile ≤640px: layout 2-baris compact** (thumb kiri + judul / format·tahun) | **TIDAK** | @390: `grid-template-columns: 350px` (1 kolom), kartu `display:grid`, `grid-template-rows: 350px 46.6px` — sleeve besar di atas, teks di bawah. Bukan 2-baris compact. (Catatan: breakpoint kode 560px, spec 640px — dua angka berbeda) |
| 13 | **Dubplate Vault card** + teks DSP | **TIDAK** (dan **diblokir owner**) | 3 rilis tanpa link. `dubplateCardPresent: false`. Yang tampil: `noLinks` = `"Tautan mendengarkan untuk rilis ini belum tersedia."` — **netral, tidak mengklaim apa pun soal DSP**. Ini titik awal yang aman untuk 3b |
| 14 | **Data kosong tidak tampil** (PRD P1) | **TIDAK** | Terukur di `/music/cinta-terbuang`: `JENIS —` dan `TAHUN —` **terlihat publik** (`visible: true`, `inViewport: true`, bukan di dalam sheet). Sumber: `ReleasePlate.tsx:159` `{fact.value ?? "—"}` + `music/[slug]/page.tsx:130-133` yang sengaja mengirim `null` |
| 15 | **VU-meter 4 bar di header, ter-render visible** | **YA** | `[class*=eq]` 14×12px, 4 `<i>` masing-masing **2px** lebar, tinggi 3.01–10.01px (beranimasi), `opacity 1`, `visibility visible`. Terlihat di `home-1440.png` (kiri "LISTEN") |
| 16 | **Bottom Audio HUD dengan data nyata** | **TIDAK** | Tidak ada elemen fixed/sticky di zona bawah (yang fixed: `grain` overlay + `sheet` tersembunyi `bottom:1527`). Tidak ada komponen HUD di `src/components/**`. Label "Sedang diputar" yang ada adalah tautan di **footer**, bukan HUD |
| 17 | **Booking quick-copy → `✓ EMAIL DISALIN`** | **TIDAK** | `copyUiPresent: false`; tidak ada `<button>` salin (hanya `BUKA MENU`, `INDEKS`). Yang ada: 2 × `mailto:akbarnawasunda@gmail.com`. `navigator.clipboard` tersedia (`true`) → implementasi mungkin |
| 18 | **Easing token `--ease-snap` / `--ease-mechanical`** | **TIDAK** | `tokens.css` hanya punya `--ease: cubic-bezier(0.4,0,0.2,1)` (line 200) dan `--ease-out: cubic-bezier(0.16,1,0.08,1)` (line 201). Kedua nama spec tidak ada |
| 19 | **Reduced-motion global safeguard** | **YA** | `globals.css:265`. Terukur `reduce`: eq `animation-name: none` / dur `0.001s`; `name-rise` dur **0.9s → 0.001s**, iterasi `infinite → 1`. Curtain tidak muncul |
| 20 | **Radius 0px mutlak** | **SEBAGIAN** | `/music`, `/music/[slug]`, `/artist`, `/visuals`, `/contact`, `/epk` → **0 elemen** ber-radius. `/` → **2 elemen**: `span.live` 5×5px `border-radius: 9999px` (dot "BANDUNG BARAT · SEJAK 2020"). Semua bersumber dari `--radius-pill` |
| 21 | **Efek signature non-WebGL + fallback** | **TIDAK** | Masih shader WebGL: `<canvas>` di mount di dalam band, `getContext('webgl2')` = `true`. Bukan Canvas 2D. **Catatan penting:** ada fallback still yang nyata (`signatureFallback` `display:grid` @390, still WebP lazy) — jadi klaim "band gelap total tanpa fallback" **tidak berlaku untuk kode ini** |
| 22 | **Kontrak: 0 canvas di scroll 0** | **PELANGGARAN TERUKUR @390×844** | @1440×900: `0 canvas` di scroll 0 ✅ (lolos `qa:motion`). @**390×844**: `canvases: 1` di scroll 0 ❌. Penyebab: hero `height: min(100svh, 58rem)` = 844px, jadi band monogram mulai tepat di 844 = batas viewport, dan `IntersectionObserver` `rootMargin: 0px, threshold 0.01` sudah fired |
| 23 | **Mobile ≤768px: signature ambient (opacity .2, pointer-events none)** | **TIDAK** | @390: shader tetap jalan; `liquidLayer.pointerEvents: auto` (menangkap pointer), `canvas` `.canvas[data-ready]` opacity **0.85** (bukan 0.2). `signatureFallback` juga `display:grid` (z-index 1) — jadi di 390 ada dua lapisan |
| 24 | **3 varian sleeve berbeda nyata** (A/B/C) | **TIDAK** | **10 file `@sleeve.webp` byte-identik**: semuanya 5604 B, md5 `338c6da857…` sama. Generator (`generate-placeholder-covers.mjs`) tidak punya konsep varian — satu desain untuk semua. Terkonfirmasi visual di `music-wall-1440.png`: 9 sleeve identik |
| 25 | **Varian dipilih per jenis rilis** (dubplate→A, remix→B, resmi→C) | **TIDAK** | Tidak ada field varian di content layer; `ReleaseCover` memilih berdasarkan `artwork.kind`, bukan jenis rilis |
| 26 | **1 aksen biru saja** | **SEBAGIAN** | Biru `#0087FF` dipakai benar (dot, titik nama, VU-meter, focus). Tapi `tokens.css` masih mendefinisikan `--color-poster-yellow: #ffd60a`, `--color-stamp: #ff3b30`, `--color-signal-purple: #6d4a7c`, `--color-bone: #e8e6e1` — dan bone **dipakai sebagai bidang besar** di hero facts bar & `/music` |

**Ringkasan: 3 YA · 2 SEBAGIAN · 20 TIDAK (+1 pelanggaran kontrak terukur).**

---

## 5. Temuan yang TIDAK cocok dengan asumsi DESIGN.md (perlu keputusan owner)

Ini bagian yang diminta aturan tambahan: **tidak saya sesuaikan sendiri.**

### T1 — Hero bukan tanpa fallback; ia punya still, dan shader-nya jalan di mobile
`DESIGN.md` §4 menyatakan WebGL "tidak ada fallback render, hasilnya band kosong/gelap total".
**Kode saat ini tidak begitu.** `AnMonogram.tsx` memuat still WebP (`liquid-metal-wide.webp`,
`loading="lazy"`) sebagai lapisan dasar, dan `.signatureFallback` (AN mark) tampil via media query
≤767px. Yang benar hari ini: fallback **ada**; yang jadi masalah adalah shader tetap di-mount di
mobile sejak scroll 0 (T2), bukan absennya fallback.

→ **Pertanyaan:** apakah `DESIGN.md` §4 perlu direvisi (menjadi "fallback sudah ada; masalahnya
adalah shader ikut mount di mobile"), atau kode memang harus dibuang jalur WebGL-nya?

### T2 — Kontrak `qa:motion` **dilanggar di 390×844**, lolos di 1440×900
Ini bukan asumsi — terukur: `document.querySelectorAll("canvas").length` = **1** pada `scrollY: 0`
di viewport 390×844. Di 1440×900 hasilnya 0 (hanya di viewport itu kontraknya lolos).
Karena `qa:motion` memakai `setViewport(1440×900)`, CI **hijau** meski ada pelanggaran di dimensi
mobile. Artinya gate yang ada punya lubang, bukan bahwa kodenya patuh.

→ **Pertanyaan:** di Langkah 3h, apakah gate `qa:motion` boleh diperluas ke 390×844 (mengubah test),
atau perbaikannya cukup di kode (tunda mount shader sampai band benar-benar masuk)?

### T3 — Tidak ada Dubplate Vault card, tapi ada pengganti netral
Kabar baik untuk 3b: yang tampil saat ini **bukan** klaim DSP, melainkan kalimat netral
"Tautan mendengarkan untuk rilis ini belum tersedia." Jadi tidak ada klaim salah yang perlu dicabut.
Tapi `DESIGN.md` §3 menyebut card `[ STATUS: DUBPLATE / CLUB TOOL ]` — dan 3b tetap **diblokir**
sampai owner mengonfirmasi status 3 rilis.

### T4 — `/music` bukan ledger; ia *wall* yang diputuskan sadar
Ada komentar panjang di `CatalogueWall.tsx` yang membela wall 4 kolom + perspektif sebagai keputusan
desain ("a grid of equal tiles is the shape a page takes when nobody decided anything").
Ini **bertentangan arah** dengan `DESIGN.md` §3 (ledger baris + watermark + `translateX(6px)`).
Menggantinya = membuang komponen yang punya alasan tertulis.

→ **Pertanyaan:** owner mengonfirmasi ledger menang atas wall (dan saya tulis ulang `CatalogueWall`),
atau DESIGN.md direvisi mengikuti wall?

### T5 — Nomor urut sudah ada, tapi 9px, bukan watermark
`CatalogueWall` mencetak ordinal `01…09` di kolom kiri kartu dengan `font-size: 9px`.
Spec minta angka raksasa `clamp(2.5rem,5vw,4.5rem)` **di belakang** teks. Jadi bukan "belum ada
nomor" — nomornya ada, perannya beda total.

### T6 — Ada jalur `managed` (Studio/DB) yang menerbitkan field kosong
`music/[slug]/page.tsx` punya dua jalur: `managed` (DB) dan static. Jalur managed mencetak
`RELEASE_TYPE_LABELS[managed.type]` **tanpa guard**, dan `facts` untuk kedua jalur selalu memuat
`Jenis`/`Tahun` dengan `null` → `—`. Perbaikan 3b harus menyentuh **kedua** jalur, bukan hanya
`src/content/releases.ts`.

### T7 — Ada komponen "BackSide" (lembar cetak) yang memuat metadata desain
`src/components/print/BackSide.tsx` (sheet yang bisa dibuka, `inert` saat tertutup) mencetak
"Tinta: Cyan cetak #2E8C86 / Merah poster #C93A22", "Huruf: Excess-V-Straight · Gohan",
"Tautan: {totalLinks} tautan resmi…", "Cetakan: R15 · neon grid · ca74742".
Semua di dalam panel tertutup, jadi **tidak** tampil ke pembaca biasa.
Catatan: skrip probe pertama saya salah menghitungnya sebagai "Lembar data" publik karena
memakai `querySelectorAll("dl div")`; setelah diukur dengan `closest('[inert]')` + `checkVisibility`,
terbukti `insideSheet: true`. **Tidak dilaporkan sebagai pelanggaran.**
Tapi `totalLinks` adalah angka dari data, dan teks "7 tautan resmi, semuanya menuju kanal pemilik"
muncul di setiap halaman termasuk rilis yang punya **1** tautan — perlu dicek apa maksudnya
(agregat situs vs per rilis) saat copywriting pass (3i).

### T8 — Dua breakpoint berbeda untuk satu perilaku
`DESIGN.md` menulis mobile ≤640px; `CatalogueWall.module.css` memakai `max-width: 560px` (dan
`min-width: 720/1100px` untuk kolom). `AnMonogram` memakai ≤1023px untuk opacity dan ≤767px untuk
fallback. Tidak ada satu skala breakpoint yang dipakai konsisten.

---

## 6. Catatan metodologis (supaya sesi berikutnya tidak salah baca)

- **Probe pertama saya salah** soal hover: saya mengukur `getComputedStyle().transform` pada elemen
  yang `transition: transform 320ms`, jadi nilainya masih `matrix(1,0,0,1,0,0)` saat dibaca.
  Setelah `mouse.move` dengan `steps` + jeda 600ms, nilainya terbaca
  `matrix3d(…, 25.5927, 1)` dan variabel inline `--wall-z: 25.6px` muncul. **Hover berfungsi.**
- Angka `1 canvas` @390×844 diukur **dua kali** (probe terpisah) dengan hasil sama.
- Semua angka berasal dari `artifacts/visual-check/audit/design-metrics*.json`. Skrip probe
  dihapus setelah audit; JSON-nya yang disimpan sebagai bukti.
