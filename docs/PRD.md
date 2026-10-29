# PRD — akbarnawasunda.my.id (rebuild, target kelas STMPD RCRDS)

- Status dokumen: **aktif** (ditulis 2026-10-28)
- Branch kerja: `arena/13d0ccf1-akbar-nawasunda`
- Dokumen ini adalah **kontrak produk untuk rebuild**, bukan deskripsi pujian atas kondisi sekarang.
  Setiap klaim kondisi sekarang di bawah ini punya bukti perintah/file. Kalau sebuah item belum
  dikerjakan, ditulis **BELUM**.

> Catatan relasi dokumen: `docs/00-PROJECT-FOUNDATION/PRD.md` dan dokumen bernomor lain adalah
> arsip fase sebelumnya (dirujuk oleh `AGENTS.md`). Untuk rebuild ini, urutan prioritasnya:
> `docs/PRD.md` > `docs/DESIGN.md` > `docs/ARCHITECTURE.md` > dokumen bernomor. Bila keduanya
> bertentangan, dokumen di root `docs/` yang menang, dan pertentangannya dicatat di
> `docs/08-IMPLEMENTATION/DECISION_LOG.md` (append, jangan hapus riwayat).

---

## 1. Ringkasan produk

Situs resmi **Akbar Nawasunda** — produser, remixer, DJ asal Bandung Barat, Indonesia. Katalog
terverifikasi: **10 rilis** (`src/content/releases.ts`, dihitung: `total 10`).

Fungsi situs, dalam urutan kepentingan:

1. **Showcase diskografi** — satu halaman katalog + satu halaman spec sheet per rilis.
2. **Booking** — jalur terpendek dari pengunjung ke email booking, tanpa formulir.
3. **Arsip visual** — vault visual/behind the scenes sebagai bukti kerja, bukan galeri dekoratif.

Target kelas: situs label rekaman elektronik profesional (acuan rasa: Warp Records, Discogs,
STMPD RCRDS). **Bukan** landing page startup, bukan template AI, bukan halaman Web3.

### Target pengunjung

| Segmen | Yang dia cari dalam 10 detik | Konsekuensi desain |
| --- | --- | --- |
| Venue / promoter (booking) | Apakah ini aktual, di mana basisnya, bagaimana menghubungi | Stats strip di hero, email booking one-click copy |
| Fans | Rilis terbaru + satu klik ke platform dengar | Rilis unggulan di atas fold kedua, CTA "Dengar Sekarang" |
| Label / industri musik | Katalog utuh, format, tahun, tautan resmi | Ledger `/music` yang bisa dipindai, spec sheet per rilis |

---

## 2. Halaman & fungsi

| Route | Nama internal | Fungsi | Status di repo (2026-10-28) |
| --- | --- | --- | --- |
| `/` | Command Center | Hero + overview + CTA booking/listen | ADA — `src/app/(site)/page.tsx` |
| `/music` | Full Archive | Ledger semua rilis | ADA — `src/app/(site)/music/page.tsx` |
| `/music/[slug]` | Spec Sheet | Detail satu rilis | ADA — `src/app/(site)/music/[slug]/page.tsx` |
| `/visuals` | Raw Vault | Galeri visual / behind the scenes | ADA — `src/app/(site)/visuals/page.tsx` |
| `/artist` | Dossier | Bio, kontak, press kit | ADA — `src/app/(site)/artist/page.tsx` |

Route tambahan yang sudah ada dan tidak dihapus oleh rebuild ini: `/contact` (kontak + booking),
`/epk` (press kit cetak), plus `/studio/*` (CMS privat) dan `/og` (social card). `/about` adalah
308 redirect ke `/artist` (`next.config.ts`, D-024).

### Data rilis — field wajib

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `title` | string | ya | Judul tampil |
| `source` | string | tidak | Artis asli bila rilis adalah interpretasi |
| `era` | string | tidak | Babak historis, mis. "DJ Akbar Remix" |
| `type` | `single \| ep \| album \| remix \| mix` | tidak | **Kosong di 5 dari 10 rilis** |
| `year` | number | tidak | **Kosong di 4 dari 10 rilis** |
| `links` | array `{label, href}` | tidak (boleh `[]`) | **Kosong di 3 dari 10 rilis** |
| `cover` | string \| null | tidak | Waterfall di `src/content/covers.ts` |
| `description` | string | tidak | Dipakai meta description halaman rilis |
| `mbid` (MusicBrainz) | string | tidak | **BELUM ADA di model data** — lihat §5 |

Angka di atas dihitung langsung dari `src/content/releases.ts` (skrip node satu baris, output:
`total 10 / no-type 5 / no-year 4 / no-links 3`).

#### ATURAN KERAS — field kosong

- Field kosong **tidak boleh** tampil sebagai baris kosong atau placeholder: dilarang
  `Jenis —`, `Tahun —`, `Links: -`, atau baris label yang isinya kosong.
- Pakai **conditional rendering**: kalau nilainya tidak diketahui, baris itu tidak dirender sama
  sekali.
- **PELANGGARAN YANG ADA SEKARANG:** `releaseEyebrow()` di `src/content/releases.ts` mengembalikan
  string `"Rilis"` ketika `type`, `year`, dan `era` semuanya kosong. Itu terjadi pada **3 rilis**
  (`cinta-terbuang`, `bayang-tanpa-kata`, `hitungan-cinta-breakbeat-super-exc`). `"Rilis"` adalah
  label pengisi, bukan fakta → harus dihapus di Langkah 3b, dan `meta` menjadi opsional di
  `ReleaseView` supaya kartu bisa merender tanpa baris meta.

#### Dubplate Vault — **RESOLVED: kebijakan netral permanen (keputusan owner, Langkah 3m)**

**Status: RESOLVED — kebijakan netral permanen (keputusan owner, tidak bisa diverifikasi manual,
maka dipilih bahasa yang benar untuk kedua kemungkinan).** Blocker 3b ditutup oleh keputusan, bukan
oleh verifikasi: owner tidak akan mengonfirmasi per rilis, jadi situs berhenti menunggu jawaban itu
dan memakai satu kalimat yang benar baik untuk kasus (a) maupun (b).

Kalimat itu: **`TAUTAN STREAMING: BELUM TERCATAT`**, href ke `/music/<slug>`. Satu helper,
`releaseStreamingStatus()` di `src/content/releases.ts`, dipakai oleh SEMUA titik render:

| Permukaan | Sebelum 3m | Sesudah 3m |
| --- | --- | --- |
| Bottom Release HUD | `Halaman rilis` | `TAUTAN STREAMING: BELUM TERCATAT` → `/music/<slug>` |
| Halaman detail `ReleasePlate` | `Tautan mendengarkan untuk rilis ini belum tersedia.` | status yang sama, tanpa anchor (href-nya halaman itu sendiri) |
| Deskripsi SEO (`releaseDescription`) | klausa platform hilang diam-diam | klausa platform hilang, diputuskan lewat `status.recorded` |
| Ledger `/music` (Langkah 3n) | — | status yang sama, per baris |

Penjagaan otomatis: `BANNED_COPY_TERMS` (`scripts/lib/copy-terms.mjs`) sekarang memuat `dubplate`,
`unreleased`, `belum rilis`, dan `tidak didistribusikan`. Kedua guard (`npm test` dan
`npm run qa:copy`) membaca daftar yang sama, jadi klaim distribusi tidak bisa masuk lewat komponen
maupun lewat data.

Alasan kenapa bahasa ini yang dipilih: `links: []` hanya membuktikan bahwa **tidak ada tautan yang
dicatat**. Itu benar untuk kasus (a) *rilis ini memang tidak masuk DSP* dan kasus (b) *sudah masuk
DSP tapi tautannya belum dicatat* — dua fakta yang berbeda. "Belum tercatat" adalah satu-satunya
kalimat yang tidak bisa menjadi bohong di kedua kemungkinan itu, dan ia tetap menyatakan sesuatu
(tidak menyembunyikan baris), yang membuat katalog tetap terbaca sebagai data.

Konsekuensi yang tetap berlaku:

- **JANGAN** menampilkan `[ STATUS: DUBPLATE / CLUB TOOL ]` atau kalimat "Master rekaman ini tidak
  didistribusikan ke platform streaming digital (DSP)." — sekarang bukan hanya kebijakan, tapi
  kegagalan gate (`BANNED_COPY_TERMS`).
- Kalau owner **suatu saat** memberi penanda eksplisit per rilis, jalurnya tetap sama seperti
  sebelumnya: field yang diisi tangan (mis. `distribution`), **bukan** disimpulkan dari
  `links.length === 0`. Sampai itu terjadi, `BELUM TERCATAT` adalah status final, bukan status
  sementara.
- Blocker 3b karena itu **tidak lagi memblokir 3d/3n**: ledger `/music` boleh dibangun dan mencetak
  status netral ini.

<details>
<summary>Teks asli persyaratan (dipertahankan sebagai riwayat)</summary>

Tiga rilis punya `links: []`. **Tidak ada satu pun bukti di repo bahwa rilis-risil tersebut
"tidak didistribusikan ke DSP".** Yang benar-benar diketahui hanyalah: *data tautan belum diisi
atau memang tidak ada*. Itu dua hal yang berbeda, dan menampilkan klaim distribusi tanpa dasar
adalah fabrikasi fakta publik.

Konsekuensinya:

- **JANGAN** menampilkan `[ STATUS: DUBPLATE / CLUB TOOL ]` + kalimat "Master rekaman ini tidak
  didistribusikan ke platform streaming digital (DSP)." untuk ketiga slug itu sebelum owner
  mengonfirmasi satu per satu.
- **FLAG KE OWNER (menunggu jawaban):** untuk `cinta-terbuang`, `bayang-tanpa-kata`,
  `hitungan-cinta-breakbeat-super-exc` — apakah rilis ini (a) memang dubplate/club tool yang tidak
  pernah masuk DSP, atau (b) sudah masuk DSP tapi tautannya belum dicatat?
- Bentuk aman yang boleh dibangun tanpa jawaban itu: kartu berlabel netral yang **tidak mengklaim
  apa-apa**, mis. `[ ARSIP / TANPA TAUTAN TERVERIFIKASI ]`, atau rilis tanpa tautan dirender tanpa
  blok tautan sama sekali (hanya judul + nomor katalog + cover).
- Kalau owner menjawab (a) untuk sebuah rilis, barulah data diberi penanda eksplisit di content
  layer (mis. `distribution` sebagai field yang diisi tangan), **bukan** disimpulkan
  dari `links.length === 0`.

</details>

---

## 3. Prinsip bahasa

Nada: **dingin, teknis, to-the-point** — bahasa label rekaman independen. Fakta dulu, angka dulu,
tanpa adjektiva penjualan.

**DILARANG** (kata dan turunannya): "jelajahi", "eksplorasi", "keajaiban", "maha karya", "arsip
eksklusif" (versi lebay), "revolusioner", "sinergi", "unleash", "journey", "immersive experience",
"curated experience", "level up", dan kalimat bernada PR/AI generik/Web3-hype.

Izin: kata kerja biasa, satuan, nama properti, tahun, lokasi. Contoh kalimat yang lolos:
`KATALOG: 10 ITEM // STATUS: AKTIF // LOC: BANDUNG BARAT, ID`.

Catatan penting soal penjagaan otomatis (diperiksa 2026-10-28): **tidak ada** penjaga otomatis untuk
aturan bahasa. `tests/fixtures/anti-ai.ts` hanya memuat `BANNED_HOMEPAGE_PATTERNS` — pola **CSS**
(`radial-gradient`, `backdrop-filter`, `mix-blend-mode`, `filter: blur()`, `<canvas|getContext(`,
`animation: … infinite`) pada 7 file homepage. Pencarian `grep -rn "jelajah\|eksplor\|keajaiban\|maha
karya\|eksklusif" tests src` → **0 hasil**. Artinya daftar frasa terlarang di §3 belum ditegakkan
mesin apa pun; Langkah 3i harus **membuat** test baru (mis. `tests/studio/copy-voice.test.ts`) yang
memindai teks publik terhadap daftar itu, bukan menyinkronkan ke sesuatu yang sudah ada.

---

## 4. Acceptance criteria tingkat produk

| # | Kriteria | Ambang | Status 2026-10-28 |
| --- | --- | --- | --- |
| P1 | Data kosong tampil ke publik | 0 kemunculan | **PASS** — Langkah 3i: `Rilis` dan `—` diganti status eksplisit (`Belum terklasifikasi`, `Tidak tercatat`); `npm run qa:copy` menolak field kosong di DOM |
| P2 | Console error di semua halaman publik | 0 | **BELUM DIUKUR** — butuh browser (Langkah 1–2) |
| P3 | Route publik static (`○`/`●` di `next build`) | semua | **FAIL** — 8 route publik `ƒ` (lihat `docs/ARCHITECTURE.md` §5) |
| P4 | axe violation di semua halaman publik | 0 | **BELUM DIUKUR** — `scripts/a11y-audit.mjs` ada, Chrome belum terpasang di sandbox ini |
| P5 | Warning tracing saat build | 0 | **PASS** (commit `90c2b1f`) — 0 warning; trace 1189 → 316 entri, `docs/` 520 → 0 |
| P6 | Radius non-zero di elemen publik | 0 | **PASS** — **0 elemen dan 0 pseudo-element** ber-radius di 8 route publik + kursor kustom (diukur 1440px, Langkah 3g). `--radius-pill` dihapus |

---

## 5. Non-goals

- **BUKAN e-commerce.** Tidak ada checkout, keranjang, harga, lisensi berbayar.
- **BUKAN platform streaming sendiri.** Tidak ada player penuh, tidak ada hosting audio master.
- **BUKAN blog / CMS berat.** `/studio` tetap CMS privat yang sudah ada; tidak menambah editor
  blok, tidak menambah komentar, tidak menambah multi-user.
- Tidak menambah halaman baru di luar lima route inti tanpa keputusan owner.
- Tidak menampilkan angka yang tidak bisa dibuktikan (jumlah stream, penjualan, award, jadwal
  tur). Kalau tidak ada, tidak ditulis.

---

## 6. Gap model data (untuk Langkah 3b)

| Kebutuhan | Kondisi sekarang | Tindakan |
| --- | --- | --- |
| `mbid` MusicBrainz opsional | Tidak ada di `Release` interface | Tambah field opsional, render hanya bila terisi |
| `distribution` | Tidak ada; **tidak lagi** disimpulkan dari `links.length` | RESOLVED Langkah 3m: status netral permanen `TAUTAN STREAMING: BELUM TERCATAT` (§2). Field eksplisit hanya perlu kalau owner kelak mengonfirmasi per rilis |
| `meta` opsional | `meta: string` selalu terisi (fallback `"Rilis"`) | Ubah ke `string \| null`, render kondisional |
| Format/jenis tampil | `releaseTypeLabel` sudah ada | Pertahankan, tapi jangan render bila kosong |

---

## 7. Riwayat keputusan yang mengikat rebuild ini

1. **PR lama ditutup manual oleh owner.** `gh pr list --state open` → kosong. Jangan mengandalkan
   PR/branch lama. Branch kerja sesi ini: `arena/13d0ccf1-akbar-nawasunda`.
2. **WebGL di hero dinyatakan gagal** oleh owner (tanpa WebGL → band gelap kosong). Efek signature
   harus punya jalur render non-WebGL yang benar-benar tampil. Lihat `docs/DESIGN.md` §7 untuk
   konflik dengan kontrak `qa:motion` yang ada.
3. **Insiden storage Vercel 19.36 GB** pernah memaksa penghapusan project. Aturan tracing di
   `docs/ARCHITECTURE.md` §3 bersifat mengikat.
