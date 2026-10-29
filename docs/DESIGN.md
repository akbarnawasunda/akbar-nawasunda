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
| Body — semua glyph lain (H2/H3, judul rilis, paragraf, tombol, nav, label) | **Gohan** | `src/assets/fonts/Gohan.woff2` | 400 statis | `preload: false` |

**Gohan menggantikan Relidux di slot body (2026-10-29).** Kontrak dua peran tidak berubah — satu suara
untuk identitas, satu suara untuk membaca — hanya biner yang mengisi suara kedua. Yang terukur, bukan
diasumsikan (browser `measureText`, 100 px, sampel 67 karakter):

- Gohan **12,21 % lebih lebar** dari fallback mentah mesin Linux (`ui-sans-serif`/`system-ui`/Arial/
  DejaVu semua berbagi metrik yang sama di sini: 3387,9 px vs Gohan 3801,6 px). Angka itu **tidak**
  dipakai untuk `size-adjust` manual: `next/font` sudah mengunci `size-adjust:131.59 %` terhadap
  **Arial**, dan Arial asli di Windows/macOS lebarnya berbeda dari default Linux, jadi menambal angka
  kedua akan membuat salah satu platform lebih buruk. `adjustFontFallback` dibiarkan menghitungnya.
- Metrik vertikal tidak bisa menggeser line box: Gohan ascent/descent 77/20 vs Relidux 84/20, dan
  `line-height` body adalah `--leading-body: 1.6` **tanpa unit**, jadi tinggi baris selalu 1,6 ×
  font-size. CLS terukur justru **turun** di 6 dari 7 route.
- `Relidux.woff2` **dihapus** (11 584 byte) setelah terbukti 0 `font-family`, 0 loader, dan 0 stack
  fallback merujuknya. Jejak lisensi tetap di `src/assets/fonts/LICENSE-COMMERCIAL.txt`, dan binernya
  bisa dipulihkan dari riwayat git. Tiga face pensiun lain (Psychlone, Impact Label, Marseloup) tetap
  di disk karena itu keputusan yang tercatat saat masing-masing dipensiunkan.

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

**Monogram fallback di kartu OG — jendela kontras (Langkah 3p).** Kalau rilis tidak punya artwork
asli, sel kanan kartu memuat `AN` 300 px, bukan foto. Warnanya punya **dua batas**, bukan satu
selera:

| Nilai | Rasio vs `#0A0A0E` | Keputusan |
| --- | --- | --- |
| `#1A2430` | 1.26:1 | ditolak — mark tidak terlihat, separuh kartu tampak kosong |
| `#8F8F8F` (`--color-text-muted`) | 6.11:1 | ditolak owner — terbaca sebagai headline kedua |
| `#4A4A4A` (`--color-border-strong`) | 2.23:1 | sempat dipakai (3k) — di bawah ambang 3.0:1 |
| **`#666666`** | **3.44:1** | **dipakai (3p)** — +15% di atas ambang, −44% di bawah nilai yang ditolak |

Diverifikasi pada **piksel PNG hasil render**, bukan pada aritmetika: `/og?slug=lali-dalane`
menghasilkan 53.991 piksel `rgb(102,102,102)` dengan latar `rgb(10,10,14)` — 3.44:1, dan pada
thumbnail 300 px mark tetap terbaca sebagai bayangan, bukan judul kedua. Dikunci
`tests/studio/og-mark.test.ts` (rasio wajib `>= 3.0` dan `< 4.5`, dan tidak boleh sama dengan dua
nilai yang sudah ditolak). Artefak: `artifacts/visual-check/3p/`.
| Sleeve generatif, varian **Typographic Heavy** | `scripts/generate-placeholder-covers.mjs` (librsvg via `FONTCONFIG_FILE`) | **build-time**, manual oleh owner | `public/assets/covers/<slug>@sleeve.webp` |

**Batas yang mengikat:**

- Anton **bukan** font halaman. Halaman memakai Excess V Straight + Gohan (tabel di atas) dan
  hanya itu; `npm run audit:fonts` tetap menjadi gate untuk stylesheet, dan Anton tidak pernah
  muncul di sana.
- Di sleeve, Anton dipakai **hanya di varian Typographic Heavy**, untuk mencetak judul rilis sebagai
  bagian dari artwork. Varian **Monogram Crop** dan **Minimal Frame** tetap **tanpa tipografi**.
- Prinsip asli tetap berlaku dan tidak dilanggar: *placeholder yang mencetak judulnya sendiri dengan
  font yang tidak dipakai situs adalah efek ransom-note yang ditolak.* Anton bukan kasus itu — ia
  binary yang sudah ada di repo dan sudah dipakai untuk kartu OG; yang berubah hanya apakah glyph-nya
  boleh muncul di dalam artwork sleeve, dan hanya di satu varian.
- Judul rilis tetap **teks HTML** di halaman (Gohan). Yang di-raster hanya artwork; tidak ada
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
  (`tokens.css:258`, override mobile; nomor ini bergeser dari 239 setelah token cursor dan `--z-*` masuk di Langkah 3g–3h). Mobile **tidak** memakai 11vw dan **tidak boleh** diubah ke
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

### Status radius (Langkah 3g, diperbarui: dot diratakan)

Keputusan owner: **0px di semua permukaan publik**, termasuk dot/indikator kecil. Tidak ada
pengecualian desain, jadi tidak ada baris "dikecualikan" di tabel ini.

| Lokasi | Nilai | Status |
| --- | --- | --- |
| `src/app/(site)/page.module.css` `.live` (dot status hero + flag transmisi, 5x5px) | `0` | sesuai — **diubah** di Langkah 3g (sebelumnya `var(--radius-pill)`) |
| `src/styles/tokens.css` `--radius-sm`, `--radius-xl` | `0` | sesuai |
| `src/styles/tokens.css` `--radius-pill` | **dihapus** | sesuai — satu-satunya konsumennya dot 5px; token tanpa konsumen adalah arkeologi |
| `src/components/layout/GenreTape.module.css` bullet `::before` (4x4px) | `0` | sesuai — **diubah** di Langkah 3g (sebelumnya `50%`) |
| ~~`src/components/zine/MagneticCursor.module.css` `.dot`, `.ring`~~ | — | **komponen dihapus** (Langkah 4a): custom cursor dibuang total, situs memakai cursor default sistem |
| `src/components/print/BackSide.module.css` | `var(--radius-sm)` = 0 | sesuai |
| `src/components/ui/ButtonLink.module.css` | `var(--radius-sm)` = 0 | sesuai |
| `src/studio/ui/studio.module.css` `.dot` | `50%` | di luar halaman publik (CMS privat); tetap dicatat |

Cara status ini diukur, bukan diperiksa dengan mata: skrip Puppeteer membaca
`border-radius` keempat sudut setiap elemen **dan semua pseudo-element** (`::before`/`::after`
dengan `content` nyata) di 8 route publik (`/`, `/music`, `/music/<slug>`, `/artist`, `/visuals`,
`/epk`, `/contact`, 404) pada 1440px. Hasil: **0 elemen dan 0 pseudo-element ber-radius**.

**Langkah 4a — custom cursor dihapus total.** `MagneticCursor` (dot 6 px + ring 36 px yang menggantikan
pointer sistem sejak round 31) sudah dibuang beserta `cursor: none` yang menyembunyikan pointer OS.
Situs kini memakai cursor default sistem di seluruh elemen. Konsekuensi yang tercatat: 5 token
(`--cursor-dot`, `--cursor-ring`, `--duration-cursor-dot`, `--duration-cursor-ring`, `--z-cursor`) dan
blok `html[data-cursor="on"]` ikut dihapus — anggaran token turun **107 → 102**, bukan ditambah ke
`ALLOWED_UNUSED`, karena token tanpa konsumen adalah arkeologi.

**Baseline token sekarang 102, permanen (disetujui owner, 2026-10-29).** Angka 107 dianggap angka
lama dan tidak boleh muncul lagi sebagai target. Alasannya satu kalimat: *5 token cursor dihapus
bersamaan penghapusan `MagneticCursor` (P1)* — `--cursor-dot`, `--cursor-ring`,
`--duration-cursor-dot`, `--duration-cursor-ring`, `--z-cursor`. `scripts/token-audit.mjs` tidak
menyimpan angka apa pun di dalam kode: ia menghitung token yang dipakai dan yang menganggur, jadi
102 adalah hasil pengukuran, bukan konstanta yang ditulis tangan. Yang perlu dijaga adalah aturannya,
bukan angkanya: **jangan tambah token baru tanpa mencabut yang lama**.

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
`scripts/qa-motion.mjs:322` menegaskan hook itu) / `.stripLine` / `.stripValue` / `.stripSlash`.
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

### Ledger `/music` (**SUDAH DIIMPLEMENTASIKAN — Langkah 3n**)

Keputusan owner: `/music` adalah **ledger**, bukan wall. Satu baris per rilis, enam kolom, hairline
antar baris, radius 0, tanpa shadow. Bentuknya mengikuti Discogs/Warp/Factory dan mengikuti bahasa
fact-table yang sudah dipakai `ReleasePlate` di halaman detail rilis — satu situs, satu cara mencetak
data.

Kolom per baris (1440): `nomor · sleeve · judul · jenis · tahun · status streaming`

| Kolom | Lebar terukur @1440 | Isi |
| --- | --- | --- |
| nomor | 44 px, right-aligned, tabular | `01`–`10`, urutan `releases.ts` |
| sleeve | 56 px persegi | `ReleaseCover`, 1:1 |
| judul | sisa (655 px @1440) | `releaseDisplayTitle()`, uppercase |
| jenis | 164 px | label tipe, atau `Belum terklasifikasi` |
| tahun | 104 px | 4 digit, atau `Tidak tercatat` |
| status | 244 px, right | `releaseStreamingStatus()` (Langkah 3m) |

Yang berubah dari target lama, dan kenapa:

- **Watermark nomor raksasa dibatalkan.** Target lama meminta angka raksasa di belakang teks dengan
  `--color-watermark`. Token itu **tidak ada** di `tokens.css`, dan menambahkannya berarti token ke-108
  hanya untuk satu hiasan — sementara `audit:tokens` dijaga tetap 102 (baseline permanen sejak P1).
  Keputusan saya: nomor urut
  dicetak sebagai **kolom** biasa (44 px, `--color-text-muted`), bukan watermark. Alasan desainnya
  lebih kuat daripada alasan token: kolom angka yang lurus ke bawah terbaca sebagai tabel, sedangkan
  angka raksasa di belakang teks terbaca sebagai poster — dan 3n justru memindahkan halaman ini dari
  poster ke tabel. **Ini keputusan tanpa izin eksplisit owner dan harus disetujui atau dibalik.**
- **Hover: `translateX(6px)` DIPERTAHANKAN**, dan border baris menyala ke `--color-signal-blue`.
  Yang dihapus: lift Z + rotasi (itu bahasa wall). Pointer di-track satu handler untuk seluruh daftar
  supaya hanya satu baris yang "hot" pada satu waktu — `:hover` per elemen membuat sepuluh transisi
  berjalan di sepuluh waktu berbeda saat pointer menyapu cepat.
- **Mobile: 3 baris, bukan 2.** ≤719 px: `nomor + sleeve + judul` / `jenis + tahun` / `status`. Target
  lama minta 2 baris; 3 baris dipakai karena status streaming harus tetap terbaca di 320 px dan
  memaksa dua fakta itu turun ke baris ketiga. Yang tidak boleh terjadi adalah menghilangkan field di
  layar terkecil.

Ambang layout (terukur, bukan tebakan): tabel satu baris mulai **1280 px**, dua baris 720–1279 px,
tiga baris ≤719 px. Di 1024 judul butuh 387 px untuk "Hitungan Cinta Breakbeat Super Exc" dan kolom
tersedia 403 px — aman; di bawah 1280 kolom tetap itu tidak lagi aman, jadi judul boleh membungkus.
Lebar kolom diambil dari pengukuran string asli pada style aslinya: `Belum terklasifikasi` 162 px
(tracking 0.14em, bukan 0.2em), `Tidak tercatat` 103 px, `TAUTAN STREAMING: BELUM TERCATAT` 242 px.

### Spesifikasi di seksi transmission (**Langkah 3o**)

Seksi `#music` di beranda: judul rilis terpilih (kanan), satu sleeve 767 px (kanan), dan kolom kiri
yang dulu hanya berisi satu baris eyebrow + satu tombol — **127 px isi di baris 780 px**, yaitu
**653 px bone kosong** (84% tinggi baris) di samping sleeve yang penuh. Owner memilih **Opsi A** dari
proposal 3l: isi kolom dengan tabel fakta, bukan dengan prosa.

Bentuk akhir (terukur @1440):

| Baris | Label | Nilai | Sumber |
| --- | --- | --- | --- |
| 1 | `TIPE` | `Remix` | `release.type` → `releaseTypeLabel`, fallback `Belum terklasifikasi` |
| 2 | `TAHUN` | `2025` | `release.year`, fallback `Tidak tercatat` |
| 3 | `ERA` | `Tidak tercatat` | `release.era` (field owner), fallback sama |
| 4 | `PLATFORM` | `SoundCloud` | `releaseStreamingStatus()` — Langkah 3m, bukan logika baru |

Geometri: label **120 px** tetap (bukan `auto`, supaya nilai keempat baris duduk di satu kolom optik),
nilai `minmax(0, 1fr)`, **baris 34 px termasuk hairline** (`min-height`, bukan `height` — di 320 px
nilai `TAUTAN STREAMING: BELUM TERCATAT` butuh dua baris), blok **137 px** (4×34 + rule penutup).
Radius 0, tanpa shadow, tanpa latar panel: sama seperti ledger `/music`.

Yang **tidak** ditambahkan, dan kenapa: durasi, BPM, dan key. Ketiganya tidak ada di `releases.ts`;
mengarang satu angka di lembar spesifikasi membuat keempat baris lain ikut dipertanyakan. Empat baris
ini adalah seluruh fakta yang dimiliki pemilik data.

**Keputusan yang diambil tanpa izin eksplisit owner — harus disetujui atau dibalik:** baris eyebrow
`REMIX · 2025` (`releaseEyebrow()`, dulu `.transmissionMeta`) **dihapus** dari seksi ini. Isinya
adalah gabungan baris 1 dan 2 tabel, dicetak ulang 55 px di atasnya. Konsekuensi angka: ruang kosong
653 → **563 px** (72%), bukan target ±493 px yang dihitung dengan asumsi eyebrow tetap ada. Kalau
owner lebih memilih angka target, mengembalikan eyebrow mengembalikan 492 px — dengan biaya dua fakta
yang sama tercetak dua kali. `featured.meta` tidak diubah: ticker dan rail tetap memakainya.

Alternatif yang ditolak: memberi margin/padding tambahan supaya angka 493 tercapai. Itu mengisi void
dengan void.

**SEKARANG:** terimplementasi di `releaseSpecification()` (`src/content/releases.ts`), dirender
`page.tsx` sebagai `<dl>`, dikunci `tests/studio/release-specification.test.ts` (5 tes: 4 baris
berurutan, tidak ada sel kosong, tidak ada field kelima, `Platform` identik dengan helper 3m, tidak
ada klaim distribusi). Terukur 320/360/390/480/719/720/768/1024/1279/1280/1440/1920: 4 baris,
tinggi `[34,34,34,34]`, `overflowX 0`, 0 sel terpotong.

**SEKARANG:** terimplementasi. `CatalogueWall.tsx` + `.module.css` dihapus. Baris diturunkan oleh
`src/content/release-ledger.ts` (`ledgerRowFromRelease`/`ledgerRowFromDocument`, satu bentuk untuk
data statis dan record Studio), dirender `ReleaseLedger.tsx`. Invariant "10 baris, nomor 01..10, tidak
ada baris kosong" ditegakkan `assertLedgerComplete()` di halaman dan di
`tests/studio/release-ledger.test.ts`.

### Release page tanpa tautan streaming

Card pengganti, teks persis:

```
[ STATUS: DUBPLATE / CLUB TOOL ]
Master rekaman ini tidak didistribusikan ke platform streaming digital (DSP).
Rilis ini tersimpan dalam arsip independen dan hanya dimainkan secara langsung pada club set.
```

**RESOLVED (Langkah 3m) — kebijakan netral permanen.** Blok kartu di atas **dibatalkan permanen**;
kalimatnya kini masuk `BANNED_COPY_TERMS` dan menggagalkan gate kalau seseorang menuliskannya lagi.

Keputusan owner: `links: []` tidak akan diverifikasi per rilis, jadi situs memakai satu kalimat yang
benar di kedua kemungkinan — `TAUTAN STREAMING: BELUM TERCATAT` + href `/music/<slug>`. Satu helper
(`releaseStreamingStatus()` di `src/content/releases.ts`) melayani keempat permukaan: kartu/ledger
katalog, halaman detail, Bottom Release HUD, dan deskripsi SEO. Di halaman detail status dicetak
tanpa anchor (href-nya halaman itu sendiri); di ledger dan HUD ia menjadi tautan ke halaman rilis.

Alasan desainnya: baris kosong menyembunyikan fakta, dan klaim distribusi mengarang fakta. Status
eksplisit adalah satu-satunya bentuk yang tetap terbaca sebagai data tanpa mengklaim apa pun.

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
`--duration-base: 250ms`, `--duration-slow: 400ms`.

**Langkah 3g:** `--ease-snap: cubic-bezier(0.16, 1, 0.3, 1)` dan
`--ease-mechanical: cubic-bezier(0.25, 0.1, 0.25, 1)` **sudah didefinisikan** dengan nilai persis
seperti di blok target di atas. **Belum dipakai satu elemen pun**, dan itu keputusan sadar:

- Dokumen ini **tidak menyebut satu elemen spesifik** yang wajib memakai salah satu dari dua kurva
  ini — hanya label generik "micro-interaction" (180ms) dan "transisi struktural" (240ms).
- Seluruh **64 bagian transisi** di codebase sudah menyebut timing function-nya sendiri
  (`--ease`, `--ease-out`, atau `linear` untuk kursor). Yang tanpa timing function hanya
  `transition: none`, yaitu pergantian instan yang memang diminta (`.btn-industrial`: *"hover =
  invert warna instan, tanpa fade"*).
- Mengganti kurva transisi yang sudah di-tuning tanpa izin adalah kelas kesalahan yang sudah
  terjadi di langkah 3c (clamp wordmark pernah "diperbaiki" lalu rusak lagi). Jadi penugasan token
  menunggu keputusan owner: sebutkan permukaan mana yang harus memakai `--ease-snap` /
  `--ease-mechanical`, dan nilainya tinggal diganti.
- Supaya gate tetap hijau sementara belum ada konsumen, keduanya masuk allowlist eksplisit di
  `scripts/token-audit.mjs` (allowlist itu memang untuk vocabulary yang belum dipakai). Hapus dua
  baris itu begitu satu elemen memakainya.

Nilai `--ease-out` juga bukan nilai target mana pun (0.08 vs 0.3 pada kontrol ke-3).

Aturan:

- Hanya animasikan `transform` dan `opacity`. **Jangan** `width`/`height`/`top`/`left`.
- `.btn-industrial`: hover = **invert warna instan**, tanpa fade (`transition: none`). Belum ada
  kelas dengan nama ini; `ButtonLink.module.css` perlu diaudit di Langkah 3g.
- **VU-meter mini 4 bar di header** (dekoratif, representasi "live"). Harus **benar ter-render
  visible**, bukan collapse 0px.
  **SEKARANG:** `src/components/ui/Equalizer.tsx` — 4 `<i>`, `aria-hidden`, tinggi
  `var(--space-3)` = 0.75rem = 12px, lebar bar `calc(var(--space-1)/2)` = 2px, `scaleY` animation,
  dipakai di `SiteHeader.tsx:192` dan `SiteFooter.tsx:84` (nomor bergeser dari 183 setelah blok BookingCopy di Langkah 3e). Komponen ada; visibilitas render nyata
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
  - **Tanpa tautan → halaman rilis**, label `TAUTAN STREAMING: BELUM TERCATAT` dari
    `releaseStreamingStatus()` (Langkah 3m; satu helper untuk HUD, halaman detail, deskripsi SEO dan
    ledger `/music`), tanpa klaim distribusi apa pun. Dikunci unit test lewat regex klaim terlarang.
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

### Copy voice (Langkah 3i)

Register publik: **dingin, teknis, katalogis** — lembar data, bukan pitch. Rujukan: Factory Records,
Warp, Discogs field-by-field, STMPD RCRDS.

**Dua tingkat, dua guard:**

| Tingkat | Isi | Aturan |
| --- | --- | --- |
| `BANNED_COPY_TERMS` | hype/marketing/Web3/AI (`jelajah`, `eksplor`, `keajaiban`, `memukau`, `selami`, `menakjubkan`, `luar biasa`, `premium`, `eksklusif`, `inovatif`, `revolusioner`, `transformasi`, `kisah`, `magis`, `sinematik`, `epik`, …) | **nol pengecualian**, di mana pun |
| `OWNER_COPY_ONLY_TERMS` | `perjalanan`, `karya` | hanya di dalam `[data-copy-origin="owner-verbatim"]` |

Kedua kata terakhir itu milik biografi pemilik, yang diserahkan apa adanya. Menulis ulang kalimat
artis tentang dirinya bukan penyuntingan copy, melainkan menaruh kata di mulutnya. Karena itu
pengecualiannya **sempit dan terlihat**: satu blok per halaman, ditandai atribut, dan kedua guard
memastikan blok itu memang biografi (≥200 karakter, memuat nama artis) sehingga tidak bisa dipakai
menyembunyikan headline.

**Nilai kosong.** Field yang belum diserahkan pemilik tidak pernah dicetak sebagai `—`
(`Jenis —` / `Tahun —` adalah field kosong yang menyamar sebagai data) maupun sebagai kata generik
`Rilis` (yang terbaca sebagai *jenis: rilis*). Dua status eksplisit di `src/content/copy.ts`:
`Tidak tercatat` untuk satu fakta, `Belum terklasifikasi` untuk rilis yang tipenya/tahunnya/eranya
belum diketahui.

**Guard, bukan niat baik:**

| Guard | Lapisan | Kapan jalan |
| --- | --- | --- |
| `tests/studio/copy-voice.test.ts` | literal string + **teks JSX** di `src/` | tiap `npm test` |
| `scripts/qa-copy.mjs` | DOM sungguhan: 10 route, teks + `alt`/`aria-label`/`title` | tiap CI (`qa:copy`) |

Dua lapisan karena satu lapisan tidak cukup: guard sumber tidak melihat teks yang datang dari data
(deskripsi rilis, isi CMS), dan guard DOM tidak melihat halaman yang belum pernah dibangun. Keduanya
diuji dengan pelanggaran sengaja — bukan hanya "hijau karena tidak ada yang menguji".

---

## 8. Ringkasan status vs spec (dipakai sebagai tabel audit Langkah 2)

| # | Item | Status | Bukti |

> **Cara membaca angka suite di tabel ini (Langkah 4).** Angka `qa:motion` yang tercantum adalah
> ukuran suite **pada saat baris itu ditutup**, bukan ukuran hari ini. Suite bertambah setiap kali
> sebuah langkah menambah perilaku yang layak diuji: 33 cek (3f) → 38 (3g) → **40** (3n, setelah probe
> wall diganti probe ledger). Yang mengikat selalu keluaran `npm run qa:motion` terakhir: **40/40**.
| --- | --- | --- | --- |
| D1 | Palet 7 token target | FAIL | nilai berbeda di `tokens.css` (§1) |
| D2 | Zero raw hex di luar token | PASS (dijaga) | `scripts/token-audit.mjs` + CI step |
| D3 | 1 aksen biru saja | PARTIAL | `--color-poster-yellow`, `--color-stamp`, `--color-signal-purple` masih terdefinisi |
| D4 | Font: 1 display + 1 body | PASS | `src/lib/fonts.ts` (Excess V Straight + Gohan) |
| D5 | Wordmark `clamp(2.8rem, 11vw, 4.5rem)` | PASS (≥720px) / N/A (<720px) | ≥720px = 72px terukur; <720px sengaja tetap token 40px @390 (batas 41px, lihat §2) |
| D6 | Max width 1440px | PASS | `--container-max: 1440px` |
| D7 | Radius 0 mutlak | **PASS** | 0 elemen + 0 pseudo-element ber-radius di 8 route publik; `--radius-pill` dihapus (§3, Langkah 3g). Kursor kustom yang dulu ikut diukur sudah **dihapus total** di Langkah 4a |
| D8 | Logistics strip hero | PASS | `.strip` satu baris `KATALOG: 10 ITEM // STATUS: AKTIF // LOC: BANDUNG BARAT, ID` (3c) |
| D9 | Gap CTA→strip ≤40px, strip dalam fold 900px | PASS | 20.32/19.10/32.44/32.24/31.19px; strip bottom 873.24px @1440×900 |
| D10 | Ledger + watermark + z-index | **PASS (tanpa watermark)** | Langkah 3n: ledger 6 kolom menggantikan wall. Watermark DIBATALKAN dengan alasan tercatat di §3 — nomor jadi kolom 44 px, bukan angka raksasa, dan token tidak bertambah (saat itu 107; baseline kini 102). Butuh persetujuan owner |
| D11 | Ledger hover `translateX(6px)` | **PASS** | terukur: `matrix(1,0,0,1,6,0)` + border `rgb(0,135,255)`; satu baris hot pada satu waktu; `prefers-reduced-motion` → `transform: none` |
| D12 | Ledger mobile compact | **PASS (3 baris, bukan 2)** | ≤719 px: nomor+sleeve+judul / jenis+tahun / status; 0 overflow di 320–1920 |
| D13 | Dubplate card | **RESOLVED — kebijakan netral permanen** (Langkah 3m) | Kartu klaim DIBATALKAN; `TAUTAN STREAMING: BELUM TERCATAT` via `releaseStreamingStatus()`, dipakai 4 permukaan, dikunci `BANNED_COPY_TERMS` (`dubplate`, `unreleased`, `belum rilis`, `tidak didistribusikan`) |
| D14 | Effect non-WebGL + fallback | **PASS** | Canvas 2D `AnMonogramFoil.tsx` + still lazy (3h-1) |
| D15 | Kontrak `qa:motion` 0 canvas di scroll 0 | **PASS, sekarang di 1440 DAN 390** | probe 390×844 ditambahkan di 3h-1 |
| D16 | Mobile signature ambient 0.2 | **PASS** | `data-ambient="true"` → `opacity: 0.2`, `pointer-events: none` (terukur) |
| D17 | `--ease-snap` / `--ease-mechanical` | PARTIAL | token ada dengan nilai spec; **belum dipakai** karena DESIGN.md §5 tidak menyebut elemen mana pun — menunggu keputusan owner |
| D18 | VU-meter 4 bar header | PARTIAL | `Equalizer.tsx` ada; visibilitas BELUM DIUKUR |
| D19 | Bottom Release HUD data nyata (informasional, tanpa playback) | PASS | `ReleaseHud.tsx` + `releaseHudModel()`; `releases[0]` nyata, 1 tab stop, 0 elemen audio, hadir ≥720px setelah 50svh; `qa:motion` **40/40 saat ini** (38 cek waktu baris ini ditulis) |
| D20 | Booking quick-copy + `✓ EMAIL DISALIN` | PASS | `BookingCopy.tsx`; clipboard terverifikasi berisi alamat, konfirmasi 1800 ms, fallback teks terpilih, `qa:motion` **40/40 saat ini** (33 cek waktu baris ini ditulis) |
| D21 | Reduced-motion global | PASS | `globals.css:265` |
| D22 | 3 varian sleeve berbeda nyata | **PASS** | 10 md5 unik; A/B/C berbeda 39–80% piksel (3h-2) |
| D23 | Kontrak `anti-ai` (tolak `<canvas`/`getContext`) | PASS (sekarang) | `tests/fixtures/anti-ai.ts` `BANNED_HOMEPAGE_PATTERNS` |
| D24 | Copy voice dingin/katalogis + hard gate | **PASS** | `tests/studio/copy-voice.test.ts` (6 test) + `scripts/qa-copy.mjs` di CI; 0 kata hype di DOM 10 route; bio pemilik dikecualikan sempit (§7) |
| D25 | Tidak ada nilai kosong di UI publik | **PASS** | `Tidak tercatat` / `Belum terklasifikasi` menggantikan `—` dan `Rilis`; PRD P1 PASS; `qa:copy` menolak elemen berisi dash |
| D26 | Monogram fallback kartu OG ≥3.0:1 tanpa jadi headline | **PASS** | Langkah 3p: `#666666` = 3.44:1 terukur pada piksel PNG (`rgb(102,102,102)` vs `rgb(10,10,14)`), di antara dua nilai yang ditolak (2.23:1 dan 6.11:1). Ambang dikunci `tests/studio/og-mark.test.ts` |
| D27 | Blok spesifikasi transmission (4 baris, tanpa field karangan) | **PASS** | Langkah 3o: `releaseSpecification()` → `TIPE / TAHUN / ERA / PLATFORM`, label 120 px, baris 34 px (blok 137 px), 0 overflow & 0 sel terpotong di 12 lebar 320–1920; baris eyebrow `REMIX · 2025` dihapus karena menduplikasi baris 1–2 (keputusan tanpa izin, tercatat di §3); durasi/BPM/key dilarang karena tidak ada di data |
| D28 | Custom cursor dihapus, pointer sistem aktif | **PASS** | Langkah 4a: `MagneticCursor.tsx` + `.module.css` dihapus, `cursor: none` 0 kemunculan di `src/`, `[class*="cursor"]` = **0** di DOM `/`, seluruh elemen ber-computed `cursor: auto/pointer/text` (0 `none`). Token 107 → 102 |
| D29 | Foil signature digambar sekali, bukan 60x per detik | **PASS** | Temuan P2 (19,5 fps di y200–1400) ternyata bukan compositing: opacity→1, `contain:paint`, dan `content-visibility:auto` = 0 dampak, sedangkan canvas yang dibekukan (layer tetap dikomposit) = 60 fps. Biayanya menggambar ulang ~195 `stroke()` grain + 2 blit rim full-canvas tiap frame. Perbaikan: plate + rim dibakar sekali per ukuran, sapuan & highlight hanya mengisi kotak band, loop 30 Hz. `prefers-reduced-motion` tetap satu fase tetap. Diff piksel fase tetap: **0 / 1.296.000** (desktop), delta maks 1/255 (ambient mobile). 19,5 → 60,0 fps. Bukti: `artifacts/scroll-perf-fix/` |
| D30 | Gohan menggantikan Relidux sebagai font body | **PASS** | Gohan dipasang lewat `next/font/local` (pola yang sudah ada), `--font-body-stack` menunjuk Gohan, `Relidux` masuk `RETIRED_FAMILIES` di `audit:fonts` (penjaga kini mengabaikan komentar). H1 tetap Excess (`--font-display`); wordmark/CTA/heading tidak tersentuh cascade karena 130 pemakaian lewat satu token. CLS terukur 0,01153 → 0,01150 (`/visuals`, sumber gambar bukan teks), 6/7 route turun. `Relidux.woff2` dihapus (11 584 byte). Bukti: `artifacts/font-gohan/` |
| D31 | FASE 1: 5 berkas yatim + 1 devDependency mati dibuang | **PASS** | Yang dihapus, tiap berkas dibuktikan 0 rujukan lebih dulu: `public/fonts/instrument-serif-og.ttf` (48 360 B) + `instrument-serif-og-italic.ttf` (50 624 B) — sisa ronde tipografi sebelum Anton, hanya disebut di komentar `globals.css:46`; `src/assets/fonts/space-grotesk-latin-wght-normal.woff2` (22 288 B) + `LICENSE-space-grotesk.txt` (4 401 B) — sisa ronde 15/16; `src/assets/fonts/neo-latina-demo-FFP.woff2` (21 252 B) — hanya disebut README ronde 18 sebagai berkas yang seharusnya sudah dibuang. Total **146 925 B**. DevDependency `@types/three` (0 import, `three` sendiri dilarang permanen) ikut dibuang; lockfile turun 58 baris = 7 paket (`@types/three` + 6 transitif: `@dimforge/rapier3d-compat`, `@tweenjs/tween.js`, `@types/stats.js`, `@types/webxr`, `fflate`, `meshoptimizer`). **Tidak** dihapus walau grep literal 0 hit: 8 `*@sleeve.webp` (path dibangun template literal di `covers.ts:90`) dan 2 skrip provenance (`bake-monogram.mjs`, `build-archive-hires.mjs`). Bukti aman: 10 sleeve di-regenerate dua kali (sebelum & sesudah penghapusan font) → **10/10 md5 identik**, jadi `FONTCONFIG_FILE`→`public/fonts/` memang hanya memakai `anton-og.ttf`; `/og` tetap 200 `image/png`; hanya 2 woff2 diminta di runtime (Excess + Gohan), keduanya 200. Gate: tsc 0 · lint 0 · test 169/169 · test:db 8/8 · build 0 warn/28 rute · qa:motion 40/40 · qa:copy 4/4 · a11y 0/16 · audit:tokens 102 · audit:fonts clean · assets:check pass |
