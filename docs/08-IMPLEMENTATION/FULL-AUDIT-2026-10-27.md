# Audit menyeluruh — akbarnawasunda.my.id

**Tanggal:** 27 Oktober 2026
**Commit yang diaudit:** `7c6ae8b` (Round 39, ujung branch `arena/3e160edb-akbar-nawasunda`)
**Metode:** build produksi nyata (`npm run build` + `next start`), pengukuran HTTP langsung ke server lokal,
grep statis seluruh `src`/`scripts`/`docs`, pembacaan screenshot review terakhir (390px & 1440px),
dan pembacaan dokumen desain di `docs/`.

**Yang tidak bisa diukur di lingkungan ini dan tidak diklaim:** skor Lighthouse, Core Web Vitals lapangan
(tidak ada analytics), dan jumlah kunjungan. Semua angka di bawah adalah angka yang benar-benar diukur.

---

## 1. Ringkasan eksekutif

Situs ini secara teknis berada di **kuartil atas** dari yang biasanya saya temui untuk situs artis:
build bersih, 147 test, audit token, axe 0 violations di 15 halaman, budget JS/CSS dijaga, dan bahasa
visualnya punya satu keputusan yang jelas (hitam, 0px radius, satu aksen biru, satu objek merkuri).

Masalahnya bukan "belum rapi". Masalahnya ada di tiga tempat lain:

1. **Katalognya belum bisa dipakai untuk mendengar.** 7 dari 14 halaman rilis tidak punya satu pun tautan
   streaming. Untuk situs yang seluruh fungsinya mengubah kunjungan jadi pemutaran, itu lubang terbesar —
   dan letaknya di data, bukan di desain.
2. **Dokumen desainnya sudah bercerita tentang situs yang lain.** `DESIGN.md` masih menyebut Instrument
   Serif, Inter, grid 1280px, radius 16–20px. Yang dikirim: Excess V Straight, Relidux, 1440px, radius 0.
   Siapa pun yang onboarding dari dokumen itu akan membangun hal yang salah.
3. **Repo-nya menyimpan terlalu banyak barang bekas di tempat yang salah.** 6.8 MB screenshot QA dan
   929 KB file master ikut ter-deploy di `public/`; 34 duplikat dokumen `*_2.md`; ±700 KB font yang tidak
   pernah dimuat; 7 komponen mati.

### Skor per disiplin

| Disiplin | Skor | Catatan singkat |
| --- | --- | --- |
| Kualitas kode & arsitektur | 8.5 / 10 | Server component, satu sumber data, tanpa `any`, tanpa `<img>` mentah |
| Sistem desain & token | 8 / 10 | 119 token, 0 hex mentah di CSS module, tapi ada 15 token di allowlist |
| Tipografi & hierarki | 8.5 / 10 | Satu display face, satu reading face — bersih, tapi datar secara kontras |
| Arah seni & kesan mewah | 7 / 10 | Hero kuat; halaman lain satu nada; sleeve generatif terlalu seragam |
| UX & alur konversi | 6 / 10 | 7 halaman rilis tanpa jalan mendengar; tanpa pengukuran sama sekali |
| Aksesibilitas | 9 / 10 | 0 violations, skip link, reduced-motion di 20/45 file CSS, kontras aman |
| SEO & metadata | 7 / 10 | Title/OG/canonical/sitemap rapi; **0 structured data di 14 halaman rilis** |
| Performa | 8 / 10 | 189.5 KB JS gz, 15.6 KB CSS gz, 17.3 KB HTML gz; semua rute dinamis |
| Keamanan | 6.5 / 10 | Header lengkap dan ketat, tapi **1 kerentanan kritis** di Next.js |
| Kebersihan repo & dokumentasi | 4 / 10 | 38 MB docs, 34 duplikat, 15 file prompt di root, 6.8 MB artefak QA di `public/` |

**Verdict:** fondasinya bagus, finishing-nya sudah 90%, tapi **isi dan pemeliharaannya belum setara
dengan finishing-nya.** Tiga pekerjaan P0 di bawah memberi hasil terbesar per jam.

---

## 2. Inventaris yang diaudit

| Item | Angka |
| --- | --- |
| File terlacak git | 866 |
| Commit | 62 (34 di antaranya bertajuk "Round") |
| Baris kode `src` | 19.478 (ts/tsx/css) |
| File CSS | 45 |
| Komponen React | 47 |
| Rute publik | 20 halaman + 1 API (`/og` dihitung terpisah) |
| Rute Studio | 12 |
| Token desain | 119 (124 deklarasi) |
| Test | 147, semuanya lulus |
| Dokumen | 144 markdown + 377 gambar (38 MB) |
| Payload `public/` | 13 MB |
| Ukuran pack git | 124.71 MiB |

---

## 3. Temuan

### P0 — kerjakan sekarang

#### P0-1. Kerentanan kritis di framework

```
npm audit --omit=dev
1 critical severity vulnerability
Next.js: Unauthenticated RCE in `use cache` functions returning typed arrays
GHSA-673q-mjm6-r5xr   next 16.4.0 → 16.4.3
```

Situs ini dipasang di Vercel dan rute-rutenya dinamis. Meski `use cache` belum dipakai di repo ini
(saya cek: tidak ada), versi framework yang punya RCE tanpa autentikasi tidak boleh dibiarkan di produksi.
**Perbaikan: `npm i next@16.4.3 eslint-config-next@16.4.3 react@19.3.1 react-dom@19.3.1`, lalu jalankan
ulang seluruh gate.** Ekspektasi waktu: 15 menit.

#### P0-2. Separuh katalog tidak punya jalan untuk mendengar

Dari 14 rilis:

| Kondisi | Jumlah | Akibat di halaman |
| --- | --- | --- |
| Tanpa tautan streaming sama sekali | **7** | "Tautan mendengarkan untuk rilis ini belum tersedia." |
| Tanpa `mbid` MusicBrainz | 4 | tidak bisa disinkronkan otomatis |
| Tanpa tahun **dan** tanpa jenis | 1 (`hitungan-cinta-breakbeat-super-exc`) | halaman mencetak **"Jenis — Tahun —"** |

Dua hal berbeda di sini, dan keduanya harus diputuskan:

- **Data.** Tujuh rilis tanpa tautan adalah pekerjaan pengisian data, bukan kode. Kalau memang belum ada
  di platform mana pun, keputusannya adalah desain: halaman tanpa tautan jangan menampilkan blok kosong,
  tapi satu ajakan tunggal — mis. "Rilis ini belum ada di platform streaming. Dengarkan versi lain →"
  menuju `/music`. Kalimat "belum tersedia" adalah pesan sistem, bukan pesan artis.
- **Tanda "—".** Tabel "Lembar data" yang mencetak `Jenis —` dan `Tahun —` terbaca seperti data rusak.
  Baris yang tidak punya nilai seharusnya **tidak dirender sama sekali**, dan `data-cover` fallback tidak
  perlu diberi label. Ini kerjanya 20 menit dan efeknya besar: satu halaman yang jujur lebih baik daripada
  satu halaman yang terlihat belum selesai.

#### P0-3. Artefak QA dan file master ikut ter-deploy

`public/` berisi 6.8 MB screenshot review (`/review-shots/*.png`, 11 file, semuanya **bisa diakses publik**
di `https://akbarnawasunda.my.id/review-shots/home-1440.png`) dan 929 KB file master PNG
(`akbar-nawasunda-full-transparent.png` 432 KB, `akbar-an-mark-transparent.png` 200 KB,
`official-portrait-1200.webp` 296 KB) yang hanya dipakai `scripts/build-epk.sh` dan `build-web-assets.sh`.

Konsekuensi: setiap deploy membawa 13 MB `public/`, gambar QA internal bisa ditemukan mesin pencari
(robots mengizinkan `/`), dan file sumber tercampur dengan file yang disajikan.

**Perbaikan:** pindahkan `review-shots/` ke root `artifacts/` (tidak disajikan) atau tambahkan
`Disallow: /review-shots` + `.vercelignore`; pindahkan file master ke `AKBAR-NAWASUNDA-ASSETS/` (sudah ada)
dan arahkan skrip build ke sana.

---

### P1 — pekerjaan satu-dua hari, hasil besar

#### P1-1. Dokumen desain bertentangan dengan yang dikirim

| Sumber | Klaim dokumen | Kenyataan di kode |
| --- | --- | --- |
| `DESIGN.md` | Display: **Instrument Serif**, Body: **Inter** | Excess V Straight + Relidux |
| `DESIGN.md` | max-width **1280px**, 12 kolom, gutter 24 | `--container-max: 1440px`, `--gutter: clamp(1.25rem,3vw,3rem)` |
| `DESIGN.md` | Radius kartu **16–20px**, tombol pill | `--radius-sm: 0`, `--radius-xl: 0`, satu-satunya pill adalah titik status |
| `DESIGN.md` | Homepage v1: grid 3 kolom, kartu cover 1:1, hero 70vh | ledger baris, tanpa kartu, hero satu viewport penuh, asimetris kiri |
| `TYPOGRAPHY.md` | **5 role** font (display/heading/label/accent/body) | **2 family** (`.heroName` display, sisanya body) |
| `COLOR_SYSTEM.md` | purple `#7800FF` untuk accent Potret Neon | `--color-signal-purple: #6d4a7c` (diredam, tanpa konsumen) |

Ini bukan sekadar dokumen basi: `DESIGN.md` adalah file yang dibuka orang pertama kali, dan isinya
menggambarkan produk yang berbeda. **Rekomendasi:** ubah `DESIGN.md` menjadi satu halaman "Design
Principles" yang tahan waktu (konsep, aturan anti-generic, hierarki visual), lalu pindahkan angka konkret
ke `DESIGN_TOKENS.md` yang sudah akurat. Hapus `*_2.md` (34 file) dan `*_3.md` (4 file) — duplikat
yang membuat orang tidak tahu mana yang berlaku.

#### P1-2. Tidak ada structured data di halaman rilis

| Halaman | JSON-LD |
| --- | --- |
| `/` | `MusicGroup` + `Place` |
| `/music/lali-dalane` dan 13 halaman rilis lain | **tidak ada** |

14 halaman yang paling mungkin muncul di pencarian ("Lali Dalane Akbar Nawasunda") tidak memberi mesin
pencari satu pun petunjuk terstruktur. `MusicRecording` (nama, durasi bila ada, `byArtist`, `datePublished`,
`sameAs` ke Spotify/YouTube) + `BreadcrumbList` adalah tambahan berbiaya rendah dengan hasil nyata:
rich result, dan korelasi entitas yang lebih kuat dengan MusicBrainz (`mbid` sudah tersimpan di data).

#### P1-3. Komponen mati dan font yang tidak pernah dimuat

Komponen tanpa satu pun konsumen (diverifikasi dengan grep, bukan tebakan):

```
src/components/content/CataloguePin.tsx
src/components/content/PaperAbout.tsx (+ PaperAbout.module.css)
src/components/content/ReleaseGrid.tsx (+ ReleaseGrid.module.css, 5.6 KB)
src/components/zine/MagneticCursor.tsx (+ CSS)
src/components/zine/Tilt3D.tsx
src/components/MusicNotesField.example.tsx
src/components/SignalField.example.tsx
```

Font di `src/assets/fonts/` yang tidak pernah dimuat (hanya 2 dari 11 file yang dipakai):

```
Marseloup.woff2                 342 KB
Psychlone (2 file)              ±10 KB
Impact Label                   103 KB
Anton                          18 KB   (dipakai hanya untuk OG, ada salinan di public/fonts)
space-grotesk-latin            22 KB
neo-latina-demo                21 KB
```

Total ±520 KB bobot mati di repo + dua `example.tsx` yang mengimpor warna mentah (`#7800FF`) — file yang
justru akan lolos dari `audit:tokens` karena bukan CSS.

#### P1-4. Tidak ada pengukuran apa pun

Tidak ada analytics, tidak ada event, tidak ada Vercel Analytics/Speed Insights. Konsekuensinya:

- tidak tahu platform mana yang benar-benar mengirim orang (Spotify vs SoundCloud vs YouTube);
- tidak tahu halaman rilis mana yang dibuka sebelum orang menekan "Buka rilis";
- tidak punya data lapangan Core Web Vitals, padahal halaman ini punya WebGL, Lenis, dan ticker.

Untuk situs yang distribusinya lewat share link, ini menutup mata pada satu-satunya pertanyaan yang penting:
**"rilis mana yang menjual, dan dari mana orang datang?"** Rekomendasi minimal: Vercel Analytics
(1 baris) + 2 event kustom (`listen_click` dengan `platform`, `release_open` dengan `slug`).

---

### P2 — kerapian, bisa dicicil

1. **Seluruh rute dinamis (`ƒ`).** Beranda, `/music`, 14 halaman rilis semuanya dirender per request.
   Kontennya statis (file TS), jadi `generateStaticParams` + ISR akan memberi TTFB jauh lebih rendah
   tanpa mengubah apa pun yang terlihat. Sekarang `Cache-Control: private, no-cache`.
2. **15 entri di allowlist token.** `token-audit.mjs` punya komentar sendiri: *"a growing allowlist is how
   a token file becomes archaeology"* — dan daftarnya sudah 15. Tujuh di antaranya semantik lama
   (`--color-bone-100`, `--color-paper-muted`, `--color-poster-red`, `--color-poster-yellow`).
   Saran: hapus empat yang tidak punya rencana, sisakan yang benar-benar dipakai Studio.
3. **Tiga lapis alias warna.** `--color-bone-100 → --color-text-primary → #ffffff`, sementara `bone`
   sendiri (`#e8e6e1`) sudah tidak dipakai di permukaan mana pun tapi masih jadi nama token. Ganti nama
   token alias menjadi istilah semantik (`--color-fg`, sudah ada) dan hapus ramp warisan.
4. **Dua token radius bernilai sama** (`--radius-sm: 0`, `--radius-xl: 0`). Boleh, tapi menandakan skala
   yang tidak pernah dipakai sebagai skala.
5. **Nama file aset menipu.** `assets:check` melaporkan dua warning: `favicon.png` dan `logo-an.png`
   berekstensi `.png` tapi isinya JPEG. Sudah "didokumentasikan", tapi tetap salah.
6. **Kartu OG memakai warna yang bukan warna situs.** `src/app/og/route.tsx` menulis `BLUE = "#2E8C86"`
   (teal) untuk garis dan titik brand, sementara aksen situs adalah `#0087FF`. Kartu OG adalah satu-satunya
   aset yang berkeliling tanpa situsnya — di WhatsApp/X/Facebook ia berdiri sendiri, dan sekarang ia
   berdiri dengan warna yang salah. Satu baris.
7. **Screenshot QA 6 MB di `docs/08-IMPLEMENTATION/screenshots`** — pindahkan ke storage eksternal atau
   hapus yang sudah digantikan `public/review-shots`.
8. **15 file markdown di root**, sembilan di antaranya `PROMPT_*.md` / `HANDOFF_*.md` / `AGENTS_2.md`.
   Pindahkan ke `docs/08-IMPLEMENTATION/prompts/` (folder itu sudah ada).

---

## 4. Analisis desain — bagian "AI designer"

Ini bagian yang tidak bisa diukur dengan grep. Saya menilai dari screenshot Round 39 (390px & 1440px)
plus struktur komponennya.

### Yang sudah benar dan jangan diubah

- **Hero 1440.** Komposisi asimetris kiri (label → wordmark dua baris → dua tombol) dengan objek merkuri
  di kanan dan lampu biru di belakangnya adalah satu-satunya layar di situs ini yang punya *cahaya*.
  Keputusan mengurangi display face hanya untuk nama juga tepat: wordmark jadi satu-satunya suara besar,
  dan itu yang membuat halaman terasa seperti poster, bukan template.
- **Ledger diskografi.** Baris + hairline + nomor katalog + sleeve kecil adalah bentuk yang benar untuk
  katalog 14 item. Ini bagian yang paling "label rekaman" di seluruh situs.
- **Menutup krem di `/music` dan memusatkan mark di sleeve** menyelesaikan masalah paling kelihatan
  (tiga belas kotak putih yang terbaca sebagai gambar rusak).
- **Disiplin 0px radius + satu aksen biru + grain.** Ini yang membedakan dari template Next.js pada umumnya.

### Yang menahan situs ini dari level STMPD

**1. Nilai tengahnya hilang.** Di 1440px, halaman hampir seluruhnya `#000` atau `#fff`. Satu-satunya
permukaan berwarna adalah panel `#14263A` di spotlight — dan itu panel *fallback*, bukan pilihan.
Artis dengan estetika klub butuh satu langkah permukaan di antara hitam dan putih: `#0B0B0B` untuk panel,
`#15161A` untuk bidang yang harus terpisah, dan satu *bidang* aksen biru penuh (bukan garis) di satu
tempat saja per halaman. Sekarang biru hanya muncul sebagai garis 1px dan teks 11px, jadi ia terbaca
sebagai *UI*, bukan sebagai *energi*. Garis biru tidak akan pernah terasa seperti lampu panggung.

**2. Empat belas sleeve, satu desain.** Semua sleeve generatif memakai anatomi identik: ground gelap,
frame hairline, monogram AN di tengah, garis biru di bawah. Terlihat disiplin, tapi di grid katalog ia
terbaca sebagai **empat belas placeholder** — karena memang itu. Untuk sampai ke level label, sleeve
harus punya *sistem*, bukan *stensil*: satu grid, tiga atau empat varian komposisi (monogram besar
potong tepi / nomor katalog raksasa / judul sebagai tipografi / bidang warna era), dipilih oleh
`type` + `era` + `year`. Rilis 2024 dan rilis 2025 boleh terlihat berbeda tanpa keluar dari sistem.
Ini pekerjaan `scripts/generate-placeholder-covers.mjs` — satu malam, dan efeknya ke seluruh situs.

**3. Satu-satunya foto manusia dipakai dua kali.** `visualItems` berisi enam item, dan yang benar-benar
fotografi hanya: portrait, jalan malam (foto yang sama dengan night-frequency hero), panggung kosong, dan
maskot. Tiga sisanya line art (mark, lockup). Untuk artis yang menjual *kehadiran*, arsip visual adalah
aset kredibilitas paling murah: 6–10 frame panggung nyata (silhouette, keringat, lampu, tangan di
atas udara) akan mengubah /visuals dari "halaman galeri" menjadi bukti bahwa orang ini main.
Sampai itu ada, /visuals sebaiknya tidak dipanggil "arsip".

**4. Spot 1440 punya lubang.** Di bawah wordmark, antara dua tombol dan tepi bawah ada ±180px kosong
yang tidak melakukan apa pun, sementara objek merkuri di kanan tingginya hanya 60% kolomnya dan
menggantung di tengah vertikal. Dua perbaikan kecil: (a) turunkan baseline objek supaya kakinya
sejajar dengan baseline tombol, (b) pakai ruang kosong itu untuk satu baris metadata katalog
(`14 RILIS · SEJAK 2020 · BANDUNG BARAT`) — teks 11px, satu baris, di kiri bawah. Hero langsung
terasa "berisi" tanpa menambah satu pun elemen dekoratif.

**5. Tipografi sudah benar, tapi belum berkarakter.** Relidux di semua ukuran 12–40px bekerja secara
fungsional, tapi tidak ada satu pun momen tipografi yang "dirancang" selain wordmark: tidak ada judul
yang di-tracking ekstrem, tidak ada satu kata yang dibesarkan sampai keluar grid, tidak ada numbering
raksasa. Referensi yang Anda sebut (STMPD, Garrix) selalu punya satu keputusan tipografi yang berlebihan
dengan sengaja. Kandidat terbaik: nomor katalog di ledger (sekarang 11px mono) — jadikan 64px, di belakang
judul, warna `#1A1A1A`. Nol risiko aksesibilitas, dan seluruh band langsung dapat tekstur.

### Prioritas desain (dampak per jam kerja)

| # | Perubahan | Dampak | Usaha |
| --- | --- | --- | --- |
| 1 | Sistem sleeve: 3–4 varian komposisi per era/tipe | Sangat tinggi | 1 malam |
| 2 | Satu bidang aksen biru penuh per halaman | Tinggi | 2 jam |
| 3 | Nomor katalog raksasa di belakang judul ledger | Tinggi | 1 jam |
| 4 | Baris metadata di ruang kosong hero | Sedang-tinggi | 30 menit |
| 5 | Tangkap 6–10 foto panggung nyata untuk /visuals | Sangat tinggi | butuh owner |
| 6 | Panel fallback `#14263A` → `#0B0B0B` + mark, hilangkan kesan "placeholder" | Sedang | 30 menit |

---

## 5. Aksesibilitas

Diukur: axe-core di CI, 15 pemuatan halaman (390 & 1280, termasuk drawer terbuka).

- **0 violations**, 1 incomplete per halaman (biasanya contrast pada elemen transparan/dekoratif).
- `lang="id"`, skip link, `prefers-reduced-motion` di 20 dari 45 file CSS (44%), focus visible di semua
  kontrol, drawer dengan focus trap + Escape + `aria-expanded`.
- Kontras yang saya hitung manual:

| Pasangan | Rasio | Status |
| --- | --- | --- |
| `#ffffff` / `#000000` | 21.00 : 1 | AAA |
| `#a1a1b5` / `#000000` (label) | 8.28 : 1 | AAA |
| `#8f8f8f` / `#000000` (muted) | 6.49 : 1 | AA+ |
| `#0087ff` / `#000000` (aksen) | 5.91 : 1 | AA |
| `#ffffff` / `#14263a` (panel) | 15.35 : 1 | AAA |
| `#0087ff` / `#e8e6e1` (bone, sudah dihapus) | 2.85 : 1 | **gagal** — dan itu salah satu alasan krem harus pergi |

Satu catatan: 25 dari 45 file CSS belum punya blok `prefers-reduced-motion`. Yang sudah menanganinya
adalah yang berat (shader, Lenis, curtain, drawer), jadi risikonya rendah — tapi kalau mau konsisten,
tambahkan blok global di `globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 6. Performa

| Metrik | Nilai | Budget | Status |
| --- | --- | --- | --- |
| JS beranda | 189.5 KB gz (11 chunk) | 250 KB | ✓ 76% |
| CSS beranda | 15.6 KB gz (3 file) | 40 KB | ✓ 39% |
| HTML `/` | 17.3 KB gz | — | ✓ |
| HTML `/music` | 9.4 KB gz | — | ✓ |
| HTML `/visuals` | 7.6 KB gz | — | ✓ |
| three.js | chunk terpisah, dimuat saat band mendekat | — | ✓ di luar jalur kritis |
| `Cache-Control` | `private, no-cache` di semua rute | — | ✗ tidak ada caching statis |

Keputusan-keputusan mahal yang sudah diambil dengan benar: CSS tidak di-inline (D-072), `backdrop-filter`
dihapus dari header, shader pakai `frameloop="never"` saat di luar layar, `next/image` di 13 komponen,
0 `<img>` mentah, dan **tidak ada `<canvas>` di HTML awal** (diverifikasi smoke test).

Yang tersisa: **static generation**. Semua konten berasal dari file TS yang tidak berubah saat runtime.
`export const dynamic = "force-static"` (atau `generateStaticParams` untuk 14 slug rilis) akan mengubah
TTFB dari render per request menjadi file di CDN. Ini kemenangan gratis terbesar yang tersisa.

---

## 7. SEO & metadata

Sudah benar: title & description per halaman, canonical absolut, OG image dinamis per rilis
(1200×630, terverifikasi 200 `image/png`), `summary_large_image`, sitemap 20 URL, robots dengan
`Disallow: /studio` + `/api/`, `MusicGroup` + `sameAs` 14 tautan di beranda, manifest, `theme-color`,
`/about → /artist` 308.

Belum ada:
1. **JSON-LD di 14 halaman rilis** (P1-2).
2. **Deskripsi templated**: `"<judul> — rilis terverifikasi Akbar Nawasunda."` untuk semua rilis. Itu
   bukan deskripsi, itu label. Untuk 14 halaman, satu kalimat per rilis (tahun, genre, asal lagu) akan
   membuat hasil pencarian terlihat seperti dikelola manusia.
3. **`lastModified` di sitemap** sengaja dihilangkan dengan alasan yang benar (tidak ada yang tahu kapan
   halaman berubah) — tapi sekarang ada git rev di build (`NEXT_PUBLIC_BUILD_REV`), jadi tanggal build
   bisa dipakai sebagai aproksimasi yang jujur.
4. **Halaman `/visuals` tanpa `<h2>`.** Dari pengukuran: `/visuals` punya `h1=1, h2=0`. Struktur heading
   untuk halaman galeri enam item masih bisa dipertahankan, tapi satu `h2` per kelompok akan membantu.

---

## 8. Keamanan

| Item | Status |
| --- | --- |
| CSP | ✓ `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'` |
| HSTS | ✓ `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP` | ✓ semua ada |
| `X-Frame-Options: SAMEORIGIN` | ✓ (dan `frame-ancestors` yang lebih kuat) |
| `poweredByHeader: false` | ✓ |
| Studio | ✓ 307 ke login, `robots` disallow, password di-hash (test khusus) |
| OG endpoint | ✓ hanya menerima `slug`, dicari di katalog — tidak ada teks bebas |
| Dependency | ✗ **1 critical (Next.js RCE)** |
| `'unsafe-inline'` di `script-src` | ⚠ melemahkan CSP; konsekuensi Next.js tanpa nonce. Bisa diperketat dengan `nonce` middleware, tapi biayanya nyata |

CSP saat ini ditulis dengan `'unsafe-inline'` untuk script dan style. Itu normal untuk Next tanpa setup
nonce, tapi artinya CSP hanya melindungi dari injeksi eksternal, bukan dari XSS inline. Kalau ada
rencana menambah form publik atau komentar, ini harus dinaikkan prioritasnya.

---

## 9. Kualitas & CI

Tiga workflow: `ci.yml` (typecheck → lint → test → audit:tokens → build → Chrome → check:web → a11y →
smoke → qa:motion), `covers.yml`, `review-shots.yml`.

Hasil gate pada commit yang diaudit:

```
build            ✓ exit 0
typecheck        ✓ 0 error
lint             ✓ 0 warning
test             ✓ 147/147
audit:tokens     ✓ 119 token, 0 hex mentah, 0 orphan (15 di allowlist)
audit:fonts      ✓ 2 family
assets:check     ✓ 4 warning terdokumentasi (2 di antaranya ekstensi salah)
check:web        ✓ JS 189.5 KB gz · CSS 15.6 KB gz · 24 internal target · 63 media file
smoke            ✓ 28/28
a11y             ✓ 0 violations / 15 halaman
qa:motion        ✓ 22/22
```

Ini kualitas CI yang jarang ada. Yang perlu ditambah:

1. **`npm audit` di CI**, gagal pada severity high/critical. Sekarang kerentanan kritis bisa masuk tanpa
   satu pun gate berbunyi.
2. **Lighthouse CI** dengan budget LCP/CLS/TBT. Semua gate lain mengukur *bobot*, tidak ada yang mengukur
   *pengalaman*.
3. **Test untuk OG route** — sekarang hanya smoke yang mengecek `200 image/png`, tidak ada yang mengecek
   bahwa kartu untuk rilis tanpa tahun tidak mencetak "undefined".

---

## 10. Roadmap perbaikan

### Minggu ini (P0, ±1 hari)

| # | Pekerjaan | File | Waktu |
| --- | --- | --- | --- |
| 1 | Upgrade Next 16.4.3 + React 19.3.1, jalankan semua gate | `package.json` | 15 menit |
| 2 | Sembunyikan baris data kosong; ganti kalimat "belum tersedia" jadi ajakan | `ReleaseView.tsx`, `ReleasePlate` | 45 menit |
| 3 | Pindahkan `review-shots/` keluar `public/`, master PNG ke `AKBAR-NAWASUNDA-ASSETS/` | `public/`, scripts | 30 menit |
| 4 | `npm audit` di CI, gagal pada high/critical | `.github/workflows/ci.yml` | 10 menit |

### Bulan ini (P1, ±3 hari)

| # | Pekerjaan |
| --- | --- |
| 5 | Rewrite `DESIGN.md` jadi prinsip; hapus 38 file `*_2.md`/`*_3.md` duplikat |
| 6 | JSON-LD `MusicRecording` + `BreadcrumbList` untuk 14 halaman rilis |
| 7 | Hapus 7 komponen mati + 520 KB font tak terpakai |
| 8 | Analytics (Vercel) + 2 event kustom |
| 9 | Static generation untuk 20 rute publik |
| 10 | Lengkapi 7 tautan streaming (butuh owner) atau finalkan desain "tanpa tautan" |

### Kuartal ini (arah seni)

| # | Pekerjaan |
| --- | --- |
| 11 | Sistem sleeve generatif: 3–4 varian, dipilih oleh era/tipe/tahun |
| 12 | Satu bidang aksen biru penuh per halaman + langkah permukaan `#0B0B0B`/`#15161A` |
| 13 | Nomor katalog raksasa di ledger, metadata di ruang hero, baseline mark diturunkan |
| 14 | 6–10 foto panggung nyata untuk /visuals (butuh owner) |
| 15 | Perbaiki warna kartu OG: `#2E8C86` → `#0087FF` |

---

## 11. Satu paragraf penutup

Kalau saya harus memilih satu kalimat: **situs ini sudah lebih rapi daripada isinya.** Struktur kode,
sistem token, dan disiplin gerbangnya berada di level yang biasanya hanya dimiliki agensi; yang belum
sampai adalah hal-hal yang tidak bisa diotomasi — tujuh tautan streaming yang kosong, satu sleeve yang
digandakan empat belas kali, satu foto panggung yang dipakai dua kali, dan satu dokumen desain yang
menceritakan versi lain dari situs ini. Tiga pekerjaan P0 di atas bisa diselesaikan dalam satu hari dan
langsung menghilangkan kesan "belum jadi". Sisanya soal aset dan keputusan, bukan soal kode.
