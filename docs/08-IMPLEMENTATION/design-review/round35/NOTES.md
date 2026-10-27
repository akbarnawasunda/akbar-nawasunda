# Round 35 — critical fix & restoration

Owner's brief: "bug fatal interaksi" + "kembalikan seluruh katalog lagu". Lima tugas, satu gerbang
hijau. Tanpa Tailwind, tanpa PostCSS, CSS Modules + `tokens.css`, tanpa hex/px mentah.

## 1 · Katalog lagu — dipulihkan dan diperluas dari MusicBrainz

**Sumber data.** Endpoint yang diberikan
(`https://musicbrainz.org/ws/2/release-group?artist=bb843d35-fc0a-4d3b-b445-390b9b299812&fmt=json`)
dijawab dengan **11 release group**. Sandbox ini memblokir `curl`/`fetch` keluar, jadi permintaan
dilakukan lewat jalur baca halaman; data yang masuk ke repo adalah jawaban API itu, bukan ingatan.

Empat rilis yang selama ini **tidak ada** di katalog (dan sekarang ada, lengkap dengan `mbid`):

| Rilis | Tipe | Tahun | Release-group id |
| --- | --- | --- | --- |
| Yang Tak Pernah Usai | Single | 2025 | `38ef2ed1-…` |
| Satu Hari Cukup | Single | 2025 | `ce16ef87-…` |
| APT (DJ Akbar Remix) | Single · Remix | 2024 | `66506c98-…` |
| Die With A Smile × Warga +62 × Est Ce Que Tu M'aimes (DJ Akbar Remix) | Single · Remix | 2024 | `91f276bf-…` |

Katalog kini **14 rilis** (`src/content/releases.ts`): 10 entri pemilik (tautan asli dipertahankan)
+ 4 entri MusicBrainz. Tiga rilis pemilik yang tidak dikenal MusicBrainz tetap dipertahankan (rilis
independen) — skrip sinkronisasi hanya *melaporkannya*, tidak menghapusnya.

MusicBrainz juga menyelesaikan satu kontradiksi berkas pemilik: `dj-rantau-den-panjauah` kini
`remix · 2024` (bukan `2024` tanpa tipe).

**Mengapa tidak ada tautan untuk 4 rilis baru:** daftar release-group MusicBrainz tidak memuat URL.
`links: []` adalah keadaan yang jujur; kartu di beranda memakai profil resmi artis
(`src/config/socials.ts`) untuk tombol stream, bukan URL lagu yang dikarang.

**Skrip permanen:** `npm run releases:sync` (`scripts/musicbrainz-sync.ts`) memanggil endpoint yang
sama dengan `User-Agent: AkbarNawasundaOfficial/1.0 ( webmaster@akbarnawasunda.com )`, lalu mencetak
rilis yang belum ada di katalog. `--check` keluar dengan kode 1 bila ada yang tertinggal, `--json`
mencetak daftar mentah. Di sandbox ini skrip berhenti dengan pesan jujur "MusicBrainz tidak bisa
dihubungi" — jaringan keluar diblokir — dan situs tetap memakai katalog statis.

**Bug fatal "data kosong".**

- `getCatalogue()` (`src/content/catalogue.ts`) dibungkus `try/catch`; baris Studio yang gagal
  dipetakan dibuang satu per satu, bukan menjatuhkan seluruh daftar; bila hasilnya kosong,
  `catalogueFloor()` — daftar statis terverifikasi — yang dipakai. Fungsi ini **tidak bisa** lagi
  mengembalikan array kosong.
- Beranda tidak lagi memakai reel `CataloguePin` (300vh + sticky + translateX dari scroll engine:
  kalau engine tidak jalan, sleeve berada di luar viewport dan halaman tampak tanpa rilis). Diganti
  `ReleaseGrid` — grid di alur dokumen, server-rendered, nol JavaScript.
- `ReleaseCover` kini menamai rilisnya di panel fallback: `#14263A` (`--color-cover-fallback`) +
  monogram AN + judul lagu. Bukan kotak putih, bukan kotak kosong.

## 2 · Kursor & mouse

`MagneticCursor.tsx` + `.module.css`:

- `pointer-events: none !important` pada `.cursor`, `.dot`, dan `.ring` — dekorasi tidak boleh
  mengalahkan tangan. Ini penyebab "tidak bisa klik".
- `pointerType === "touch"` → **disarm total**: listener berhenti menulis, `data-cursor` dihapus dari
  `<html>`, pointer native kembali. Termasuk pada perangkat hybrid (laptop layar sentuh).
- Effect tidak lagi bergantung pada state `armed` (dulu setiap gerakan mouse pertama membongkar dan
  memasang ulang tiga listener); arming lewat ref, mount sekali.
- Satu tulisan per frame (`requestAnimationFrame`, digabung), rect target diukur sekali saat
  `pointerover` (bukan tiap frame), lock dilepas saat scroll.
- Dot **tanpa** transisi (pointer yang tertinggal = bug); hanya ring yang tertinggal 180 ms. Token
  `--duration-cursor-dot` dihapus.

## 3 · Logo AN & shader

- Semua uniform mulai dari nilai aman: `uMouse [0.5, 0.5]`, `uHover 0`, `uTime 0`, dan setiap tulisan
  dijaga `Number.isFinite` + clamp.
- `normalize(toPointer)` diganti `toPointer / max(dist, 0.0005)` — NaN klasik di GLSL hilang.
- `uTime` di-*wrap* (`% 1000`) agar presisi float tidak rusak setelah berjam-jam.
- **Still baked di belakang shader**: `data-shader="on"` baru ditulis setelah shader benar-benar
  **melukis** (frame kedua), bukan saat chunk di-mount. Dulu `data-liquid` mematikan still segera →
  band kosong selama fetch + compile + decode. Sekarang logo selalu terlihat.
- `ShaderBoundary` (error boundary) + `webglcontextlost` → shader dilepas, still kembali penuh.
- Still punya fallback sendiri: bila `/assets/monogram/liquid-metal-wide.webp` gagal, pakai
  `/brand/an-mark.webp`; dan `data-ready` dipaksa setelah 1,2 detik supaya band tidak pernah tinggal
  `opacity: 0`.

## 4 · Reveal

Threshold `0.05`, `rootMargin: "50px"`, dan failsafe 400 ms yang memaksa `data-visible="true"`. Bila
`IntersectionObserver` tidak ada, state tersembunyi dilewati sepenuhnya. Cleanup menandai node
terlihat agar remount tidak mewarisi keadaan tersembunyi.

## 5 · Desain

Hero tetap masif (nama + monogram stabil). Katalog beranda: grid tajam `auto-fill minmax(12.5rem, 1fr)`,
artwork 1:1 resolusi sumbernya, judul **bold** + tautan, baris `tahun · format` mono, tombol stream
(Spotify / Apple Music / YouTube / SoundCloud — hanya tautan pemilik), radius 0 di semua elemen.
Dasar `#000000` / `#050507`, aksen `#0087FF` hanya pada aksi.

## Gerbang

```
audit:tokens  ✓ 120 tokens, no raw hex, no orphaned tokens
typecheck     ✓
lint          ✓
test          ✓ 147/147 (9 kasus baru: tests/studio/round35.test.ts)
build         ✓ exit 0
```

Verifikasi HTML (`next start`, 200): beranda memuat **14 kartu rilis** (`data-release`), 28 tautan
stream di band katalog, dan keempat platform muncul; `/music` memuat 13 kartu dinding + 1 takeover.
CSS terbangun memuat `pointer-events:none!important` untuk kursor.

Screenshot tetap tidak mungkin di sandbox ini (tidak ada Chromium/Firefox, apt diblokir) — tidak ada
klaim visual berbasis tangkapan layar, dan gerakan kursor/logo tidak bisa direkam di sini.
