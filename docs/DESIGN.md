# DESIGN — akbarnawasunda.my.id (rebuild spec)

- Status: **target spec + audit kondisi sekarang** (2026-10-28)
- Nada desain: label rekaman elektronik independen. Dingin, presisi, struktural.

> Kolom **SEKARANG** di bawah ini adalah hasil baca kode pada commit `ca74742`, bukan ingatan.
> Setiap baris punya path bukti. Yang belum diukur ditulis **BELUM DIUKUR** — tidak dikarang.

---

## 1. Palet — token CSS (TARGET)

```
--color-ground:       #050506                  /* dasar halaman */
--color-surface:      #0D0E11                  /* panel/card */
--color-hairline:     rgba(255,255,255,0.08)   /* semua garis pemisah */
--color-signal-blue:  #0087FF                  /* SATU-SATUNYA warna aksen */
--color-text-primary: #FFFFFF
--color-text-muted:   #8E9099
--color-watermark:    rgba(255,255,255,0.035)  /* nomor urut ledger */
```

Aturan:

1. **Zero raw hex di luar file token.** Semua hex hanya boleh hidup di `src/styles/tokens.css`.
   Sudah ada penjaga: `npm run audit:tokens` (`scripts/token-audit.mjs`, dijalankan di CI).
2. `#0087FF` adalah satu-satunya aksen. Tidak ada ungu, merah, kuning, atau gradien multi-warna di
   halaman publik.
3. Kontras teks: `#8E9099` di `#050506` ≈ 6.4:1 (di atas 4.5:1 untuk body). Harus diverifikasi
   ulang dengan axe setelah nilai token diubah.

| Token target | Nilai sekarang di `src/styles/tokens.css` | Selisih |
| --- | --- | --- |
| `--color-ground: #050506` | `--color-bg-base: #000000` | **beda nilai** |
| `--color-surface: #0D0E11` | `--color-bg-surface: #050505` | **beda nilai** |
| `--color-hairline: rgba(255,255,255,0.08)` | `rgb(255 255 255 / 0.16)` | **beda 2×** |
| `--color-signal-blue: #0087FF` | `--color-signal-blue: #0087ff` | sama |
| `--color-text-primary: #FFFFFF` | `#ffffff` | sama |
| `--color-text-muted: #8E9099` | `#8f8f8f` | **beda nilai** |
| `--color-watermark` | tidak ada | **BELUM ADA** |

Keputusan yang harus diambil di Langkah 3g: mengganti nilai token berarti semua turunan (`--color-bone*`,
`--color-paper*`, `--color-ink*`, alias `--color-bg`) harus dipetakan ulang supaya tidak ada hex
baru yang lahir di komponen. Perubahan ini menyentuh `tests/studio/css-tokens.test.ts` dan
`tests/studio/anti-ai.test.ts` — perbarui test bersama perubahannya, jangan setelahnya.

---

## 2. Tipografi

### Font AKTUAL yang dipakai kode (`src/lib/fonts.ts`)

| Peran | Family | File | Berat | Dimuat |
| --- | --- | --- | --- | --- |
| Display — **hanya** nama situs (hero H1, wordmark footer, loading curtain) | **Excess V Straight** | `src/assets/fonts/Excess V Straight.woff2` | 400 statis | `preload: true` |
| Body — semua glyph lain (H2/H3, judul rilis, paragraf, tombol, nav, label) | **Relidux** | `src/assets/fonts/Relidux.woff2` | 400 statis | `preload: false` |

Catatan yang mengikat:

- **`font-synthesis: none`** di `src/styles/globals.css` → tidak ada bold palsu. Hierarki dibangun
  dari ukuran, tracking, warna, dan ruang — bukan dari `font-weight`.
- Tiga file lisensi lain ada di `src/assets/fonts/` tapi **tidak boleh** dimuat;
  `npm run audit:fonts` gagal kalau ada stylesheet yang menyentuhnya.
- Dokumen ini tidak menyebut font lain. Kalau nanti font berubah, **tabel di atas yang diubah lebih
  dulu**, baru kode.

### Skala (fluid clamp, bukan px tetap)

| Peran | Token | Nilai sekarang | Dipakai di |
| --- | --- | --- | --- |
| Hero wordmark | `--text-hero` | desktop `clamp(2rem, 4vw, 4rem)`; ≤719px `clamp(2.5rem, 9.6vw, 3.6rem)` | `h1` hero |
| Takeover | `--text-takeover` | `clamp(1.5rem, 2.5vw, 2.5rem)` | rilis unggulan |
| Display | `--text-display` | `clamp(1.5rem, 2.5vw, 2.5rem)` | judul section |
| Title | `--text-title` | `clamp(1.2rem, 1.8vw, 1.6rem)` | judul kartu |
| Body | `--text-body` | `clamp(0.9rem, 1vw, 1rem)` | paragraf |
| Label | `--text-label` | `0.75rem` (tetap) | meta mono |

### Wordmark hero — TARGET dan status ukur

- Target spec: `font-size: clamp(2.8rem, 11vw, 4.5rem)`.
- Sekarang: `clamp(2rem, 4vw, 4rem)` (desktop) / `clamp(2.5rem, 9.6vw, 3.6rem)` (≤719px).
  Bukan target.
- **WAJIB diuji di 1440px dan 390px** setelah diubah. Nama di hero dirender **dua baris**
  (`Akbar` / `Nawasunda.`), jadi 11vw berlaku per baris; kata terpanjang adalah `Nawasunda`.
  Catatan historis di `tokens.css` menyebut bahwa `Nawasunda` mengukur ≈8.43 × font-size pada face
  display, artinya 11vw akan **overflow** di dalam kontainer `viewport − 2×gutter`. Floor dan
  ceiling final harus ditentukan dari pengukuran lebar kata nyata di 1440 dan 390, lalu nilai
  aktual + alasannya ditulis di sini. Jangan diam-diam mengubah tanpa catatan.
- Status pengukuran: **BELUM DIUKUR** (belum ada Chrome; lihat `docs/VISUAL-VERIFICATION.md`).

---

## 3. Layout

- Lebar maksimum grid: **1440px** (`--container-max: 1440px`, sudah ada).
- Gutter: `clamp(1.25rem, 3vw, 3rem)` (sudah ada).
- **Radius: 0px MUTLAK** di seluruh elemen — tombol, card, image frame, input, dot/indicator kecil.
  Kebutuhan visual bulat → pakai bentuk lain (potongan diagonal / kotak), bukan `border-radius`.

### Status radius (Langkah 3g)

| Lokasi | Nilai | Status |
| --- | --- | --- |
| `src/styles/tokens.css` `--radius-sm`, `--radius-xl` | `0` | sesuai |
| `src/styles/tokens.css` `--radius-pill` | `9999px` | **melanggar** (token ada = pasti dipakai) |
| `src/app/(site)/page.module.css:155` | `var(--radius-pill)` | **melanggar** — indikator live hero |
| `src/components/layout/GenreTape.module.css:46` | `50%` | **melanggar** |
| `src/components/zine/MagneticCursor.module.css:21` | `50%` | **melanggar** — kursor kustom |
| `src/components/print/BackSide.module.css:31,171,479` | `var(--radius-sm)` = 0 | aman (nilai 0) |
| `src/components/ui/ButtonLink.module.css:20` | `var(--radius-sm)` = 0 | aman |
| `src/studio/ui/studio.module.css:135` | `50%` | di luar halaman publik; tetap dicatat |

### Hero `/` — logistics strip (TARGET)

Format teks, satu baris mono:

```
KATALOG: [N] ITEM // STATUS: AKTIF // LOC: BANDUNG BARAT, ID
```

Aturan:

- `N` **dihitung dari data rilis nyata saat build** — `releases.length` (sekarang `10`), bukan
  angka hardcoded. Sumber yang benar: `src/content/stats.ts` (`heroStats().releaseCount`), yang
  sudah menurunkan angka dari `releases`.
- Strip mengisi ruang di bawah CTA; gap CTA → strip **maksimal 40px**.
- Strip **harus** berada di dalam viewport fold 900px di breakpoint 1440px tanpa terpotong.

**SEKARANG:** tidak ada strip logistik. Yang ada adalah `.factsBar` berisi `<dl>` dengan tiga fakta
(`Rilis`, `Tahun aktif`, `Tautan resmi`) — lihat `src/app/(site)/page.tsx` blok `heroFoot` /
`factsBar`. Format teks, jumlah item, dan keberadaan strip sesuai spec: **0%**. Gap CTA→facts bar
dan posisi fold: **BELUM DIUKUR**.

### Ledger `/music` (TARGET)

Setiap baris rilis:

- Watermark nomor urut raksasa di belakang teks: `font-size: clamp(2.5rem, 5vw, 4.5rem)`,
  `color: var(--color-watermark)`.
- z-index: **di atas background, di bawah teks, DAN di bawah cover art/thumbnail**. Artinya
  watermark tidak boleh tertutup elemen opaque (jangan taruh di balik panel dengan `background`
  solid) dan tidak boleh menutupi teks.
- Hover baris: `translateX(6px)` + watermark menyala ke `rgba(255,255,255,0.12)` + border row ke
  `var(--color-signal-blue)`.
- Mobile ≤640px: layout **2 baris compact** — thumbnail kecil di kiri + 2 baris teks (judul, lalu
  format/tahun). Bukan versi sempit dari desktop.

**SEKARANG:** `/music` adalah *wall* dua kolom dengan perspektif 3D (`CatalogueWall.module.css`:
`grid-template-columns: repeat(2, …)`, `perspective: 1700px`), bukan ledger baris. Watermark: **tidak
ada sama sekali** (`grep -rn "watermark" src` → 0 hasil). Hover: lift Z + rotasi, bukan
`translateX(6px)`. Mobile: wall tetap 2 kolom, **tidak ada** layout 2-baris compact.
Status: **0% sesuai**. Ini pekerjaan Langkah 3d, bukan penyempurnaan kecil.

### Release page tanpa tautan streaming

Card pengganti, teks persis:

```
[ STATUS: DUBPLATE / CLUB TOOL ]
Master rekaman ini tidak didistribusikan ke platform streaming digital (DSP).
Rilis ini tersimpan dalam arsip independen dan hanya dimainkan secara langsung pada club set.
```

**BLOKIR FAKTUAL:** teks di atas hanya boleh tampil kalau owner sudah mengonfirmasi bahwa rilis itu
memang tidak masuk DSP. Lihat `docs/PRD.md` §2 "Dubplate Vault — SYARAT FAKTUAL". Sampai konfirmasi
datang, rilis tanpa tautan dirender tanpa blok tautan (dan tanpa klaim distribusi).

---

## 4. Efek signature hero

**Keputusan: Canvas 2D "metalmark foil", bukan WebGL. — SUDAH DIIMPLEMENTASIKAN (Langkah 3h-1).**
Latar belakang: sesi sebelumnya memasang liquid shader (three.js / `@react-three/fiber`); di
environment tanpa WebGL hasilnya band gelap kosong tanpa fallback.

Kondisi sekarang:

- `src/components/effects/AnMonogramFoil.tsx` (chunk lazy, `ssr: false`) — menggambar monogram 2D:
  plat gradien, grain hairlines, sapuan specular kecepatan konstan (`SWEEP_PERIOD 4200`), seam yang
  berpindah tiap `900 ms`, rim biru 1 px di tepi kanan, sorotan pointer terkuantisasi 24 px.
  `getContext("2d")` satu-satunya context di `src`.
- `src/components/effects/AnMonogram.tsx` — orchestrator: still WebP (fallback/lantai) + gate mount.
- `src/components/three/` **dihapus**; `three`, `@react-three/fiber`, `@react-three/drei` **dihapus**
  dari `package.json` (Langkah 3h-1). `tests/studio/anti-ai.test.ts` sekarang menegakkan
  **ketiadaan** stack itu, bukan karantinanya.
- Mobile ≤768px: `data-ambient="true"` → light `.foil` `opacity: .2` + `pointer-events: none`
  (state eksplisit di DOM, diverifikasi `qa:motion`). Karena 20 % dari plat gelap = tak terlihat,
  varian ambient memakai ramp perak yang lebih terang — spesifikasi mengatur opasitas, materialnya
  harus tetap terbaca.
- `prefers-reduced-motion: reduce` → satu frame statis (`STATIC_PHASE`), tanpa loop.

Aturan gaya (kalau efek dibuat):

- Monokrom dominan + **satu** aksen biru. Tidak ada warna kedua.
- Gerakan **mekanis/presisi** (sapuan, klik, langkah diskret) — **bukan** organik mengambang
  (lava lamp, galaxy generator, particle field).
- Densitas rendah–sedang.
- **DILARANG** menambah dependensi 3D baru tanpa keputusan ulang bersama owner.

### ⚠ KONFLIK KONTRAK YANG HARUS DISELESAIKAN SEBELUM MENULIS KODE (Langkah 3h)

`scripts/qa:motion` (`scripts/qa-motion.mjs`, sekitar baris 395–526) menegakkan kontrak keras:

```
canvases at scroll 0: 0
after the band: ≤ 1 canvas, dan canvas itu harus berada di dalam band monogram
```

Assertion-nya eksplisit: `canvasBefore.count === 0`.

Dan konflik kedua, dari `tests/fixtures/anti-ai.ts` → `BANNED_HOMEPAGE_PATTERNS`:

```
{ pattern: /<canvas|getContext\(/i, why: "no canvas in the hero or the catalogue" }
```

Pola ini dipindai di 7 file homepage: `src/app/(site)/page.tsx`, `page.module.css`,
`ReleaseCover.tsx`, `ReleaseCover.module.css`, `ReleaseTicker.tsx`, `ReleaseTicker.module.css`,
`Plate3D.tsx`, `Plate3D.module.css`. Jadi canvas 2D yang ditulis **di dalam file-file itu** juga akan
menggagalkan `npm run test` (`tests/studio/anti-ai.test.ts`).

Artinya: **canvas apa pun yang render di scroll position 0 = `npm run qa:motion` FAIL**, dan canvas
yang ditulis di hero/catalogue = **`npm run test` FAIL**.

Tiga jalan keluar, dan semuanya butuh keputusan owner — jangan dipilih sepihak:

1. **Efek tetap di band monogram** (di bawah hero, bukan di scroll 0). Kontrak `qa:motion` tidak
   diubah. Ini pilihan paling aman dan sudah cocok dengan struktur halaman sekarang.
2. **Efek dipindah ke hero** dan **dua** kontrak diamandemen: `qa:motion` (izinkan 1 canvas 2D di
   hero asal tidak ada WebGL/second canvas) **dan** `BANNED_HOMEPAGE_PATTERNS` (hapus/ketatkan pola
   `<canvas|getContext` untuk file yang memuat efek). Dua perubahan test harus ditulis di commit yang
   sama dengan perubahan kodenya, dengan alasan di pesan commit.
3. **Canvas di komponen baru** yang dirender oleh hero tetapi filenya di luar daftar
   `homepageSourceFiles()`. Ini lolos `npm run test` tanpa mengubah aturan — tapi **tetap** melanggar
   `qa:motion` bila muncul di scroll 0, dan melanggar *niat* aturan anti-AI (canvas di hero). Jangan
   dipakai sebagai jalan pintas tanpa persetujuan owner.

Sampai keputusan turun: **jangan ubah layout hero**, karena setiap perubahan harus dicek ulang
terhadap dua kontrak ini.

### Mobile

≤768px: elemen visual signature jadi ambient — `opacity: 0.2`, `pointer-events: none`.

**SEKARANG:** `AnMonogram.module.css` + media query di `page.module.css` menukar kanvas dengan still
(`.signatureFallback` tampil di ≤767px). Opacity 0.2 / `pointer-events: none` sesuai spec:
**BELUM ADA** — sekarang jalurnya adalah *tidak merender kanvas sama sekali* di mobile, yang secara
prinsip lebih hemat, tapi bukan yang diminta spec. Perlu keputusan owner: pertahankan "no canvas di
mobile" (lebih baik untuk performa) atau terapkan ambient 0.2. Catat di DECISION_LOG.

---

## 5. Motion

Token target:

```css
--ease-snap: cubic-bezier(0.16, 1, 0.3, 1);          /* 180ms, micro-interaction */
--ease-mechanical: cubic-bezier(0.25, 0.1, 0.25, 1); /* 240ms, transisi struktural */
```

**SEKARANG (`src/styles/tokens.css`):** `--ease: cubic-bezier(0.4, 0, 0.2, 1)`,
`--ease-out: cubic-bezier(0.16, 1, 0.08, 1)`, durasi `--duration-fast: 150ms`,
`--duration-base: 250ms`, `--duration-slow: 400ms`. **Belum ada** `--ease-snap` /
`--ease-mechanical`. Nilai `--ease-out` juga bukan nilai target mana pun (0.08 vs 0.3 pada kontrol
ke-3).

Aturan:

- Hanya animasikan `transform` dan `opacity`. **Jangan** `width`/`height`/`top`/`left`.
- `.btn-industrial`: hover = **invert warna instan**, tanpa fade (`transition: none`). Belum ada
  kelas dengan nama ini; `ButtonLink.module.css` perlu diaudit di Langkah 3g.
- **VU-meter mini 4 bar di header** (dekoratif, representasi "live"). Harus **benar ter-render
  visible**, bukan collapse 0px.
  **SEKARANG:** `src/components/ui/Equalizer.tsx` — 4 `<i>`, `aria-hidden`, tinggi
  `var(--space-3)` = 0.75rem = 12px, lebar bar `calc(var(--space-1)/2)` = 2px, `scaleY` animation,
  dipakai di `SiteHeader.tsx:183` dan `SiteFooter.tsx:84`. Komponen ada; visibilitas render nyata
  **BELUM DIUKUR** (butuh screenshot/DOM assertion).
- **Bottom Audio HUD**: menampilkan info rilis yang disorot; **WAJIB** diberi data nyata saat
  render (jangan komponen ada tapi selalu `null` karena props tidak dikirim).
  **SEKARANG: TIDAK ADA.** `grep -rn "AudioHud\|audio-hud\|HUD" src` hanya menemukan komentar.
- **Booking quick-copy button**: klik → salin email booking ke clipboard + konfirmasi visual
  `✓ EMAIL DISALIN`.
  **SEKARANG: TIDAK ADA.** `grep -rn "clipboard" src` → 0 hasil.
- **`@media (prefers-reduced-motion: reduce)` global safeguard: ADA** —
  `src/styles/globals.css:265` (`animation-duration: 1ms !important`, `scroll-behavior: auto`).
  Ditambah guard lokal di `Equalizer.module.css` (bar berhenti di `scaleY(0.6)`).

---

## 6. Sistem sleeve/cover generatif

Dipakai selama belum ada foto/artwork asli untuk semua rilis. Tiga varian yang harus **berbeda
nyata**, bukan versi yang sama dengan nomor berbeda:

| Varian | Nama | Untuk |
| --- | --- | --- |
| A | Monogram Crop | club tool / dubplate |
| B | Typographic Heavy | bootleg / remix |
| C | Minimal Frame | arsip / rilis resmi |

**STATUS SETELAH LANGKAH 3h-2 — ketiga varian SUDAH ada dan terukur berbeda.**

Penyebab versi lama: `render()` di `scripts/generate-placeholder-covers.mjs` **tidak menerima
argumen apa pun**. Loop memanggilnya 10x, tetapi setiap panggilan menghasilkan SVG yang sama
persis — jadi 10 file 5604 B dengan md5 `338c6da857…` yang identik. Generatornya jalan; ia cuma
tidak tahu sedang menggambar rilis yang mana.

| Varian | Ciri konkret | Cincin |
| --- | --- | --- |
| **Monogram Crop** | satu sudut 45° dipotong (alpha nyata), spine tinta di tepi kiri, monogram vektor diskalakan 1720–2170 px lalu digeser keluar bingkai sehingga hanya sebagian lockup yang terbaca; rule biru 1 garis di tepi bawah | 4 rilis |
| **Typographic Heavy** | bidang tinta penuh, judul rilis sebagai artwork (Anton, 3 baris maksimum, ukuran dihitung agar pas), rule biru horizontal di atas meta, cap monogram kecil di sudut | 3 rilis |
| **Minimal Frame** | stock bone, satu hairline frame (atau dua, 10 px terpisah), mark kecil–besar menurut komposisi, satu bar biru di salah satu sudut | 3 rilis |

Penentuan varian (`scripts/lib/sleeve-variants.mjs`, `assignVariants`) — deterministik, tanpa acak,
tanpa tabel per-slug:

1. `type === "remix"` atau punya `source` → Typographic Heavy (bootleg);
2. punya `type` lain (`single`/`ep`/`album`) → Minimal Frame (rilis katalog);
3. `type` belum dikonfirmasi owner → varian yang paling sedikit terpakai, ditelusuri dalam urutan
   hash slug (FnV-1a). Hash menentukan **rilis mana dapat apa**; aturan "paling sedikit" menjaga
   jumlahnya tetap merata.

Komposisi di dalam satu varian memakai **rank** (posisi rilis di antara rilis bervarian sama), bukan
hash mentah — karena dua slug yang hash-nya bertabrakan pernah menghasilkan dua file byte-identik.

Larangan tipografi rilis-19 **dibatalkan hanya untuk varian B**, sesuai instruksi owner di Langkah
3h-2. Alasan larangan itu (tipe raster tidak bisa reflow/dipilih/diterjemahkan) masih berlaku dan
karena itu tetap dipertahankan di varian A dan C.

Catatan teknis: mark digambar dari jalur vektor `src/assets/an-shape.ts` (hasil trace dari
`public/brand/an-mark.webp` 174×112), bukan dari raster yang diperbesar — upscale 174 px ke 1700 px
terlihat kabur dan di sleeve terbaca sebagai scan yang buruk. Font Anton dibaca librsvg lewat
`FONTCONFIG_FILE` yang diarahkan ke `public/fonts` saat script jalan, jadi **tidak ada dependency
baru**.

**BUTUH REVIEW VISUAL OWNER** untuk penempatan rilis→varian, karena rilis tanpa `type` yang
dikonfirmasi bisa berubah posisinya bila owner menambah/menghapus entri.

---

## 7. Kalimat uji gaya

Dipakai setiap kali ragu apakah sebuah elemen "kerasa AI":

> "Kalau elemen ini ditaruh di situs Warp Records atau Discogs tanpa logo artis, apakah tetap masuk
> akal sebagai situs label rekaman sungguhan? Kalau jawabannya 'ini kelihatan kayak AI-generated
> startup landing page', elemen itu salah."

---

## 8. Ringkasan status vs spec (dipakai sebagai tabel audit Langkah 2)

| # | Item | Status | Bukti |
| --- | --- | --- | --- |
| D1 | Palet 7 token target | FAIL | nilai berbeda di `tokens.css` (§1) |
| D2 | Zero raw hex di luar token | PASS (dijaga) | `scripts/token-audit.mjs` + CI step |
| D3 | 1 aksen biru saja | PARTIAL | `--color-poster-yellow`, `--color-stamp`, `--color-signal-purple` masih terdefinisi |
| D4 | Font: 1 display + 1 body | PASS | `src/lib/fonts.ts` (Excess V Straight + Relidux) |
| D5 | Wordmark `clamp(2.8rem, 11vw, 4.5rem)` | FAIL | sekarang `clamp(2rem,4vw,4rem)` |
| D6 | Max width 1440px | PASS | `--container-max: 1440px` |
| D7 | Radius 0 mutlak | FAIL | 4 lokasi publik (§3) |
| D8 | Logistics strip hero | FAIL | tidak ada; yang ada `factsBar` `<dl>` |
| D9 | Gap CTA→strip ≤40px, strip dalam fold 900px | BELUM DIUKUR | butuh browser |
| D10 | Ledger + watermark + z-index | FAIL | `/music` masih wall 2 kolom; 0 watermark |
| D11 | Ledger hover `translateX(6px)` | FAIL | sekarang lift Z + rotate |
| D12 | Ledger mobile 2-baris compact | FAIL | tidak ada |
| D13 | Dubplate card | BLOKIR FAKTUAL | `docs/PRD.md` §2 |
| D14 | Effect non-WebGL + fallback | **PASS** | Canvas 2D `AnMonogramFoil.tsx` + still lazy (3h-1) |
| D15 | Kontrak `qa:motion` 0 canvas di scroll 0 | **PASS, sekarang di 1440 DAN 390** | probe 390×844 ditambahkan di 3h-1 |
| D16 | Mobile signature ambient 0.2 | **PASS** | `data-ambient="true"` → `opacity: 0.2`, `pointer-events: none` (terukur) |
| D17 | `--ease-snap` / `--ease-mechanical` | FAIL | token tidak ada |
| D18 | VU-meter 4 bar header | PARTIAL | `Equalizer.tsx` ada; visibilitas BELUM DIUKUR |
| D19 | Audio HUD data nyata | FAIL | komponen tidak ada |
| D20 | Booking quick-copy + `✓ EMAIL DISALIN` | FAIL | tidak ada |
| D21 | Reduced-motion global | PASS | `globals.css:265` |
| D22 | 3 varian sleeve berbeda nyata | **PASS** | 10 md5 unik; A/B/C berbeda 39–80% piksel (3h-2) |
| D23 | Kontrak `anti-ai` (tolak `<canvas`/`getContext`) | PASS (sekarang) | `tests/fixtures/anti-ai.ts` `BANNED_HOMEPAGE_PATTERNS` |
