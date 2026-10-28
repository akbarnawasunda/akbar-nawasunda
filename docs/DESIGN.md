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
- Kalau font web berubah, **tabel di atas yang diubah lebih dulu**, baru kode.

### Font raster non-web: Anton (`public/fonts/anton-og.ttf`)

Tabel di atas adalah **font yang dimuat ke halaman**. Selain itu ada satu face lagi di repo yang
**tidak pernah** menjadi font web — tidak ada `@font-face`, tidak ada `<link rel=preload>`, tidak ada
stylesheet yang menyentuhnya:

| Pemakaian | Di mana | Kapan | Output |
| --- | --- | --- | --- |
| Kartu OG (`/og`) | `src/app/og/route.tsx` (`readAsset("fonts/anton-og.ttf")`, dirender Satori) | saat request `/og` | PNG kartu 1200×630 |
| Sleeve generatif, varian **Typographic Heavy** | `scripts/generate-placeholder-covers.mjs` (librsvg via `FONTCONFIG_FILE`) | **build-time**, manual oleh owner | `public/assets/covers/<slug>@sleeve.webp` |

**Batas yang mengikat:**

- Anton **bukan** font halaman. Halaman memakai Excess V Straight + Relidux (tabel di atas) dan
  hanya itu; `npm run audit:fonts` tetap menjadi gate untuk stylesheet, dan Anton tidak pernah
  muncul di sana.
- Di sleeve, Anton dipakai **hanya di varian Typographic Heavy**, untuk mencetak judul rilis sebagai
  bagian dari artwork. Varian **Monogram Crop** dan **Minimal Frame** tetap **tanpa tipografi**.
- Prinsip asli tetap berlaku dan tidak dilanggar: *placeholder yang mencetak judulnya sendiri dengan
  font yang tidak dipakai situs adalah efek ransom-note yang ditolak.* Anton bukan kasus itu — ia
  binary yang sudah ada di repo dan sudah dipakai untuk kartu OG; yang berubah hanya apakah glyph-nya
  boleh muncul di dalam artwork sleeve, dan hanya di satu varian.
- Judul rilis tetap **teks HTML** di halaman (Relidux). Yang di-raster hanya artwork; tidak ada
  informasi yang hilang dari teks biasa, sehingga tetap bisa dipilih, dibaca mesin, dan diterjemahkan.

Catatan koreksi: klaim di laporan klarifikasi 3h-2 bahwa "Anton tidak dipakai di `src/`" **salah** —
pemindaian itu memakai `--include=*.ts` dan tidak mencakup `.tsx`, sehingga pemakaian di
`src/app/og/route.tsx` terlewat. Tabel di atas adalah keadaan sebenarnya.

### Skala (fluid clamp, bukan px tetap)

| Peran | Token | Nilai sekarang | Dipakai di |
| --- | --- | --- | --- |
| Hero wordmark | `--text-hero` + override lokal `.name` | <720px: `clamp(2.5rem, 9.6vw, 3.6rem)` (token, **tidak diubah**); ≥720px: `clamp(2.8rem, 11vw, 4.5rem)` (override lokal di `page.module.css`) | `h1` hero |
| Takeover | `--text-takeover` | `clamp(1.5rem, 2.5vw, 2.5rem)` | rilis unggulan |
| Display | `--text-display` | `clamp(1.5rem, 2.5vw, 2.5rem)` | judul section |
| Title | `--text-title` | `clamp(1.2rem, 1.8vw, 1.6rem)` | judul kartu |
| Body | `--text-body` | `clamp(0.9rem, 1vw, 1rem)` | paragraf |
| Label | `--text-label` | `0.75rem` (tetap) | meta mono |

### Wordmark hero — spec, pengecualian mobile, dan hasil ukur

- **Spec berlaku ≥720px:** `font-size: clamp(2.8rem, 11vw, 4.5rem)`.
- **Pengecualian <720px:** token `--text-hero` tetap `clamp(2.5rem, 9.6vw, 3.6rem)`
  (`tokens.css:239`, override mobile). Mobile **tidak** memakai 11vw dan **tidak boleh** diubah ke
  nilai itu. Alasan di bawah.
- **Kenapa mobile dikecualikan (diukur, bukan diperkirakan):** kata terpanjang `Nawasunda.`
  mengukur **8.175 × font-size** pada face display. Di 390px lebar kontainer adalah 339.6px, jadi:
  - 41px → lebar kata ≈335px → **1 baris**, aman;
  - 41.5px → lebar kata ≈339px → **wrap jadi 3 baris** (line-height 46.7px → 91px);
  - 44.8px (11vw di 390px, floor spec) → pasti pecah. Bukti gambar:
    `artifacts/visual-check/after-3c/sim-390-44.8px-SPEC.png` vs `sim-1440-72px-SPEC.png`.
  Mobile 40px (2 baris, tanpa wrap) adalah hasil proses perbaikan regresi; jangan "perbaiki" lagi.
  Audit berikutnya **tidak boleh** menandai mobile sebagai pelanggaran spec — batasnya jelas:
  **≤41px aman, ≥41.5px pecah 3 baris** di 390px.
- **Batasan 8.175×** juga yang menjamin ≥720px aman: pada 720px kontainer ≈656.6px dan 72px ×
  8.175 = 588.6px → satu baris; terukur `wrapped=false` di 719/720/760/899/900/1200/1440/1920.
- **Implementasi:** override lokal `@media (min-width: 720px) { .name { … } }` di
  `src/app/(site)/page.module.css`, ditulis **setelah** aturan dasar `.name`. Token `--text-hero`
  **tidak disentuh** karena dipakai bersama `PageMasthead` (`/music`, `/artist`, `/epk`,
  `/visuals`) dan `/contact`; mengubah token akan mengubah halaman yang dilarang untuk disentuh.
  Terverifikasi: `/music` 57.6px, `/artist` 36px, `/visuals` 57.6px di 1440px (tidak berubah).
- **Hasil ukur (build 3c, `next start`, Chrome):**

  | viewport | font-size | baris | wrap |
  | --- | --- | --- | --- |
  | 390×844 | 40px | 2 | tidak |
  | 719×900 | 57.6px (token) | 2 | tidak (kata 655.7px / kontainer 655.7px) |
  | 720×900 | 72px | 2 | tidak |
  | 768×900 | 72px | 2 | tidak |
  | 1024×768 | 72px | — | tidak |
  | 1440×900 | 72px | — | tidak |
  | 1920×1080 | 72px | — | tidak |

  11vw = 84.48px (768) / 112.64px (1024) / 158.4px (1440) / 211.2px (1920) — semuanya di atas
  ceiling 4.5rem = 72px, jadi hasilnya **72px seragam** di ≥720px.
- Catatan cascade: blok `@media` ini pernah ditulis **sebelum** aturan dasar `.name` dan kalah
  (specificity identik) sehingga desktop jatuh ke 32–64px. Media override **wajib** setelah base rule.

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
- Gaya: hairline atas `1px solid var(--color-border)`, radius **0px**, latar transparan, 11px body
  stack, tracking `--tracking-label`, uppercase saat **render** (data disimpan lowercase). Ini
  readout teknis, **bukan** card krem seperti `.factsBar` lama.
- `overflow-wrap: anywhere` **dan** `max-width: none` wajib ada: `globals.css` membatasi setiap `p`
  ke 60ch (≈540px di 11px), yang dulu memecah baris strip jadi 2 di semua desktop ≥900px padahal
  separuh lebar masih kosong. Strip adalah readout, bukan reading copy — opt-out lokal.

**STATUS: SESUAI SPEC (Langkah 3c, diukur).** `.factsBar`/`<dl>` lama sudah dihapus dari
`page.tsx` dan diganti `.strip` (`data-depth="hero-facts"`, dipertahankan karena
`scripts/qa-motion.mjs:313` menegaskan hook itu) / `.stripLine` / `.stripValue` / `.stripSlash`.
`N` = `stats.releaseCount` dari `heroStats()` (10), status dari `siteConfig.status` (manual,
uppercase saat render), lokasi dari `siteConfig.origin` + region `siteConfig.locale`.

| viewport | strip (baris) | gap CTA→strip | strip bottom | hero | fold 900 |
| --- | --- | --- | --- | --- | --- |
| 390×844 | 2 | 20.32px | 537.61px | 81–560.28px (auto) | — |
| 768×900 | 1 | 19.10px | 503.40px | 81–525.56px (auto) | — |
| 1024×768 | 1 | 32.44px | 743.21px | 81–769px | dalam viewport |
| 1280×900 | 1 | 32.24px | 873.24px | 81–901px | ✓ |
| 1440×900 | 1 | 32.24px | 873.24px | 81–901px | ✓ (26.76px margin) |
| 1920×1080 | 1 | 31.19px | 979.63px | 81–1009px (cap 58rem) | ✓ |

Semua gap ≤40px. Di bawah 900px `@media (max-width:899px)` membuat `.hero` setinggi konten, jadi
target fold 900px hanya relevan ≥900px. Bukti gambar:
`artifacts/visual-check/after-3c/final-{before,after}-{1440,390}.png`.

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
- **Bottom Release HUD (informasional, tanpa playback)**: menampilkan info rilis yang disorot;
  **WAJIB** diberi data nyata saat render (jangan komponen ada tapi selalu `null` karena props
  tidak dikirim).
  **HUD ini TIDAK PERNAH memutar audio inline.** Tidak ada elemen `<audio>`, tidak ada ikon play,
  tidak ada progress bar, tidak ada kontrol volume — tidak sekarang, tidak "nanti kalau asetnya
  ada". Ini kartu info + tautan keluar, selaras dengan `docs/PRD.md` §5 non-goal *"BUKAN platform
  streaming sendiri. Tidak ada player penuh, tidak ada hosting audio master."* dan
  `docs/00-PROJECT-FOUNDATION/PROJECT_SCOPE.md` baris 12 *"Automated audio player streaming (link
  out to platforms)"* yang ada di Out of Scope v1. Membaca dokumen ini lalu menambahkan pemutar
  audio adalah melanggar dua dokumen lain sekaligus.
  **STATUS: ADA dan terukur (Langkah 3f)** — `src/components/content/ReleaseHud.tsx` +
  `ReleaseHud.module.css` + `src/content/release-hud.ts`, dipasang **hanya** di
  `src/app/(site)/page.tsx`.

  - **Isi ditentukan server, bukan state klien.** `page.tsx` mengambil `releases[0]` (opsi A
    keputusan owner: rilis pertama dalam urutan daftar owner, sama dengan yang sudah di-feature di
    seksi transmission) lalu `releaseHudModel()` menghasilkan judul (`releaseDisplayTitle`),
    eyebrow (`releaseEyebrow`), dan tujuan. Komponen menerima string jadi dan tidak bisa mengarang
    isi. Terukur: `Masih Mencintainya — Papinka` · `Remix · 2025` · tombol `SoundCloud ↗`.
  - **Tanpa tautan → halaman rilis**, label netral `Halaman rilis`, tanpa klaim distribusi apa pun
    (aturan yang sama dengan blocker 3b). Dikunci unit test lewat regex klaim terlarang.
  - **Tidak pernah memutar audio.** 0 elemen `<audio>`/`<video>`, tanpa ikon play, progress bar,
    atau volume. Ikut diperiksa `qa:motion`.
  - **≥720px saja.** Di bawah 720px komponen `return null` → tidak ada di DOM, layout, pohon
    aksesibilitas, maupun urutan tab. Server tidak tahu viewport (Next.js tidak mengeksposnya ke
    RSC tanpa header petunjuk yang tidak dikirim browser), jadi gerbang mount memakai
    `useSyncExternalStore` + `matchMedia` dengan `getServerSnapshot` = `false`: HTML server tidak
    pernah memuat HUD di lebar mana pun, sehingga tidak ada flash di 390px dan tidak ada hydration
    mismatch. Konsekuensi jujur: tanpa JavaScript, HUD tidak muncul di desktop. HUD adalah pelengkap,
    bukan konten yang halaman ini butuhkan.
  - **Muncul setelah setengah layar scroll**, bukan di scroll 0. Terukur di 1440×900: kartu
    setinggi 70px di `bottom: 16px` menempati y=814–884, persis menimpa strip logistik hero yang
    bottom-nya 873.24px (deliverable 3c). Jadi gerbang kedua = `scrollY > 50svh`.
  - **Tabrakan:** `z-index: calc(--z-chrome - 10)` = 40, **di bawah** tab INDEKS (45) dan header
    (50). Di 1440: HUD x=43–616, tab INDEKS x=1411–1440 → jarak horizontal **795px**, irisan
    **false**. `max-width: min(40rem, 100vw - 2·gutter - 44px)` menjaga 44px kanan agar tab tidak
    pernah tersentuh di lebar mana pun.
  - **Ruang bawah halaman:** HUD fixed tidak memakan ruang alur, jadi `page.tsx` merender penanda
    `<span data-hud-slot hidden />` dan `ReleaseHud.module.css` memakai
    `main.site-main:has([data-hud-slot]) ~ footer { padding-bottom: … }`. Tanpa penanda, tanpa
    padding — jadi tidak ada perubahan pada route lain, dan `SiteFooter` (site-wide) tidak disentuh.
    Terukur di dasar halaman: jarak baris kolofon → HUD = **26px**, tanpa tumpang tindih. Di 390px
    `padding-bottom` footer tetap **0px**.
  - **Landmark:** `<aside>` (implicit `complementary`) dengan `aria-label="Rilis sorotan"`;
    menambah tepat **1 tab stop** dan dirender paling akhir di DOM halaman itu sendiri.
  - Motion: masuk sekali dengan `hudIn` 280ms (`opacity` + `translateY`), tanpa loop; di
    `prefers-reduced-motion: reduce` → `animation: none` (terukur `animation-name: none`).
- **Booking quick-copy button** (Langkah 3e): klik → salin email booking ke clipboard +
  konfirmasi visual `✓ EMAIL DISALIN`.
  **STATUS: ADA dan terukur** — `src/components/layout/BookingCopy.tsx` +
  `BookingCopy.module.css`, dipasang di `SiteHeader.tsx` tepat sebelum kendali Listen (berdekatan
  dengan VU-meter). Bentuk: `.btn-industrial` — kotak siku, border hairline, radius 0, hover invert
  **instan** (`transition: none`, terukur `transition-duration: 0s` pada hover), label 11px
  uppercase bertracking. Di ≥720px label `BOOKING` → `✓ EMAIL DISALIN`; di <720px kotak 40×40
  dengan glyph salin (dua lembar 8px digambar border, bukan icon font) → `✓`.

  Data: `contactEmail` di `src/config/socials.ts` (`akbarnawasunda@gmail.com`). **Booking, press dan
  licensing memakai satu alamat yang sama** — tidak ada inbox booking terpisah di repo ini, dan
  tidak ada kontak yang dikarang. Keputusan owner (2026-10-28): pakai alamat yang ada; kalau nanti
  dipisah, komponen sudah menerima prop `email` sehingga call site tinggal diganti.

  Perilaku & aksesibilitas:
  - konfirmasi tampil **1800 ms** lalu kembali ke label diam; hanya `opacity` + `translateY` yang
    bergerak, dan kedua label menempati **satu sel grid** sehingga lebar tombol konstan (terukur
    158.7px → 158.7px, bar tidak reflow);
  - `aria-label` berubah mengikuti label yang terlihat (`Booking — salin alamat email…` /
    `Email disalin: …` / `Booking — clipboard diblokir…`) supaya lolos WCAG 2.5.3
    `label-content-name-mismatch` di **setiap** state, bukan hanya saat load;
  - state diumumkan lewat `role="status" aria-live="polite"` (sr-only);
  - **fallback**: kalau Clipboard API tidak ada atau write ditolak, tombol berganti border putus-putus
    dan panel hairline muncul di bawah bar berisi alamat sebagai teks `user-select: all` — tidak ada
    kegagalan diam-diam. Panel bisa ditutup dengan Escape atau klik di luar.
  - `prefers-reduced-motion`: pergantian label instan. Catatan jujur: `globals.css:265` memasang
    `transition-duration: 1ms !important` global, jadi nilai terukur **0.001s**, bukan 0s.

  Dua jebakan yang ditemukan saat verifikasi (dicatat supaya tidak diulang):
  1. `browser.defaultBrowserContext().overridePermissions(base, ["clipboard-read","clipboard-write"])`
     **tidak cukup** — `clipboard-write` tetap `denied` (NotAllowedError). Yang bekerja:
     CDP `Browser.grantPermissions` dengan `clipboardReadWrite` + `clipboardSanitizedWrite`.
  2. Atribut `data-state` **sudah** dipakai curtain/monogram/header. Tombol booking yang membawa
     `data-state="idle"` ikut terpilih oleh `scripts/qa-motion.mjs` saat mencari curtain, dan
     pemeriksaan monogram jadi gagal padahal monogramnya benar. Komponen ini memakai
     `data-copy-state`.
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
| D5 | Wordmark `clamp(2.8rem, 11vw, 4.5rem)` | PASS (≥720px) / N/A (<720px) | ≥720px = 72px terukur; <720px sengaja tetap token 40px @390 (batas 41px, lihat §2) |
| D6 | Max width 1440px | PASS | `--container-max: 1440px` |
| D7 | Radius 0 mutlak | FAIL | 4 lokasi publik (§3) |
| D8 | Logistics strip hero | PASS | `.strip` satu baris `KATALOG: 10 ITEM // STATUS: AKTIF // LOC: BANDUNG BARAT, ID` (3c) |
| D9 | Gap CTA→strip ≤40px, strip dalam fold 900px | PASS | 20.32/19.10/32.44/32.24/31.19px; strip bottom 873.24px @1440×900 |
| D10 | Ledger + watermark + z-index | FAIL | `/music` masih wall 2 kolom; 0 watermark |
| D11 | Ledger hover `translateX(6px)` | FAIL | sekarang lift Z + rotate |
| D12 | Ledger mobile 2-baris compact | FAIL | tidak ada |
| D13 | Dubplate card | BLOKIR FAKTUAL | `docs/PRD.md` §2 |
| D14 | Effect non-WebGL + fallback | **PASS** | Canvas 2D `AnMonogramFoil.tsx` + still lazy (3h-1) |
| D15 | Kontrak `qa:motion` 0 canvas di scroll 0 | **PASS, sekarang di 1440 DAN 390** | probe 390×844 ditambahkan di 3h-1 |
| D16 | Mobile signature ambient 0.2 | **PASS** | `data-ambient="true"` → `opacity: 0.2`, `pointer-events: none` (terukur) |
| D17 | `--ease-snap` / `--ease-mechanical` | FAIL | token tidak ada |
| D18 | VU-meter 4 bar header | PARTIAL | `Equalizer.tsx` ada; visibilitas BELUM DIUKUR |
| D19 | Bottom Release HUD data nyata (informasional, tanpa playback) | PASS | `ReleaseHud.tsx` + `releaseHudModel()`; `releases[0]` nyata, 1 tab stop, 0 elemen audio, hadir ≥720px setelah 50svh; `qa:motion` 38/38 |
| D20 | Booking quick-copy + `✓ EMAIL DISALIN` | PASS | `BookingCopy.tsx`; clipboard terverifikasi berisi alamat, konfirmasi 1800 ms, fallback teks terpilih, `qa:motion` 33/33 |
| D21 | Reduced-motion global | PASS | `globals.css:265` |
| D22 | 3 varian sleeve berbeda nyata | **PASS** | 10 md5 unik; A/B/C berbeda 39–80% piksel (3h-2) |
| D23 | Kontrak `anti-ai` (tolak `<canvas`/`getContext`) | PASS (sekarang) | `tests/fixtures/anti-ai.ts` `BANNED_HOMEPAGE_PATTERNS` |
