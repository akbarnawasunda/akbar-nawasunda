# Round 36 — pencabutan, bukan penambahan

Brief pemilik: *"Hentikan visual saling-timpa, matikan kursor rusak, dan tampilkan katalog lagu
Akbar Nawasunda secara presisi. JANGAN menambahkan animasi aneh-aneh."*

Putaran ini dikerjakan sebagai **pengurangan**. Tidak ada komponen baru, tidak ada keyframes baru,
tidak ada efek baru. Yang ada: empat komponen dilepas dari halaman, satu stylesheet ditulis ulang
lebih kecil, dan satu grid diberi jumlah kolom yang tegas.

## 1 · Sumber bug saling-timpa dicabut

`src/app/(site)/page.tsx` sekarang tidak mengimpor `Depth` dan `Plate3D` sama sekali. Yang ikut
hilang dari hero:

| Dilepas | Kenapa |
| --- | --- |
| `Depth` (foto, `y=-70`) | translasi negatif pada lapisan setinggi viewport — di 390px lapisan itu menyeberang ke blok type |
| `Plate3D` (`tiltY=2`, `perspective=1300`) | rotasi 3D pada blok yang memuat masthead, nama, dan tombol; kaki nama masuk ke tombol |
| `heroScrim` | lapisan `position: absolute` ketiga di kotak yang sama |
| foto hero + `<link rel=preload>` | bukan subjek utama lagi; nama adalah poster |
| `.nameLine` / `.nameRise` | animasi rise butuh mask `overflow: hidden` per baris; mask adalah kotak yang memotong |
| pembungkus `Magnetic` pada CTA | kursor sudah native; tombol tidak perlu magnet |

Hero sekarang **satu grid, empat baris, satu kolom**:

```
.heroInner { display: grid; grid-template-rows: auto auto minmax(0,1fr) auto; gap: var(--space-6); }
```

Baris 1 running head (dua baris mono di atas satu hairline), baris 2 wordmark, baris 3 logo AN,
baris 4 CTA + satu baris copy. Tidak ada `position: absolute` di dalam hero, tidak ada `transform`
pada satu pun baris — ini bukan klaim, ini diukur di CI (lihat bagian gerbang).

`PaperAbout` dan `section.night` sudah tidak ada di beranda sejak putaran 34/35; sekarang
`background: var(--color-night)` hanya dipakai sebagai lantai band rilis (satu langkah dari hitam,
bukan panel).

## 2 · Kursor rusak dimatikan

`<MagneticCursor />` **tidak lagi di-mount** di `src/app/(site)/layout.tsx`. Alasannya persis yang
dikeluhkan: dot dan ring-nya di-lerp menuju pointer, jadi setiap frame dekorasi itu tertinggal
sedikit dari tangan — dan mengarahkan ke tombol 40px terasa seperti menyeret sesuatu.

Kursor yang dipakai sekarang adalah kursor sistem. `globals.css` masih menyimpan aturan
`html[data-cursor="on"] { cursor: none }`, tetapi atribut itu hanya pernah ditulis oleh
`MagneticCursor`, jadi aturannya mati dengan sendirinya. File komponen dan stylesheet-nya tetap
ada di pohon (dengan perbaikan putaran 35: `pointer-events: none !important`, disarm untuk
`pointerType === "touch"`), tidak diimpor siapa pun — kalau pemilik ingin mematikannya lagi,
tinggal satu baris.

`AnMonogram` juga tidak lagi membungkus still-nya dengan `Depth`: logo tidak lagi bergerak 26px saat
halaman digulir. Mark di hero bahkan bukan shader — itu `an-mark.webp` 174×112, jadi logo ada di
paint pertama, tanpa kompilasi, tanpa canvas, tanpa flicker.

## 3 · Katalog lagu tampil presisi

Urutan beranda sekarang **release-first**: hero → running head → **#catalogue** → tur → monogram →
genre → arsip → platform → catatan. Tombol hero `[DENGARKAN MUSIK]` menuju `#catalogue`.

- Sumber: `getCatalogue()` — fungsi yang sama dengan `/music`, dengan `catalogueFloor()` sebagai
  lantai. Tidak ada jalur yang bisa menghasilkan `[]`.
- Grid **tidak** dibungkus `Reveal`: reveal adalah `opacity: 0` yang menunggu JavaScript, dan
  katalog adalah satu-satunya hal di halaman ini yang tidak boleh menunggu apa pun.
- Kolom: **1 di HP, 2 dari 640px, 3 dari 1024px.** Sebelumnya `auto-fill minmax(12.5rem, 1fr)`
  menghasilkan empat kolom sempit di 1440px — artwork jadi benda terkecil di band yang seluruh
  isinya artwork.
- Kartu: cover 1:1 radius 0, judul **700** uppercase, baris mono `tahun · tipe`, tombol stream
  Spotify / Apple Music / YouTube (tautan rilis sendiri, atau profil resmi bila rilis tidak punya).
- Cover gagal: panel `#14263A` + monogram AN + **judul lagu di tengah** (sebelumnya di pojok kiri
  bawah — di pojok ia terbaca sebagai caption).

## 4 · Gerbang

Lokal (`ba9c2b2` + `0002ecf` + `c61d792`):

```
audit:tokens  ✓ 120 tokens, no raw hex, no orphaned tokens
typecheck     ✓
lint          ✓
test          ✓ 147/147
build         ✓ exit 0
```

CI — run **40463822321**, job `quality · budgets · a11y`, **sukses**:

```
check:web   ✓  JS 189.1 KB gz / 11 chunks · CSS 15 KB gz · 20 rute · 24 target internal · 63 media
a11y        ✓  0 violation(s) across 15 page loads
smoke       ✓  28/28
qa:motion   ✓  20/20
```

`qa:motion` yang relevan untuk putaran ini:

```
PASS  the hero stacks in one column with nothing overlapping, wide and narrow — 1440 gaps 24 / 24px · 390 gaps 32 / 32px
PASS  the hero has no absolutely positioned furniture left — none
PASS  the pointer is the browser's own again — data-cursor "" · cursor auto · custom nodes 0
PASS  the catalogue grid renders every release without a scroll driver — 14 cards, 14 named sleeves
PASS  the hero's button lands on the catalogue — Dengarkan Musik → #catalogue top 60px at scrollY 992
PASS  the hero ships no depth layer, no tilted plate and no transformed child — layers 0 · plates 0 · transformed 0
PASS  no horizontal overflow at 320–1920
```

Pemeriksaan `qa:motion` untuk `Depth`, `Plate3D` dan sleeve unggulan **diganti**, bukan dihapus:
komponen yang mereka ukur sudah tidak ada, jadi yang diukur sekarang adalah hal yang memang rusak —
baris hero yang tidak saling menimpa di 1440 dan 390, tidak ada furniture `position: absolute`,
tidak ada `data-layer`/`data-plate`/transform di dalam band, dan tombol hero benar-benar mendarat di
`#catalogue`.

## Catatan jujur

Sandbox ini tidak punya Chromium/Firefox dan apt diblokir, jadi **tidak ada screenshot** dan gerakan
kursor tidak bisa direkam dari sini. Semua angka di atas berasal dari Chromium asli di runner CI
(Chrome 156, 1440×900 dan 390×780), bukan dari klaim lokal. Verifikasi lokal di `next start`: `/`
200 dengan **14 kartu rilis**, 26 tautan Spotify di beranda, 0 `data-layer`, 0 `data-plate`,
0 `data-cursor`; `/music`, `/artist`, `/epk` 200.
