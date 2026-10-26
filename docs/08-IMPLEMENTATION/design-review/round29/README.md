# Round 29 — liquid monogram, katalog horizontal, tipe yang mengecil

Brief ronde ini absolut dari owner: logo AN jadi *fluid shader* 2D (bukan objek 3D kaku), katalog
jadi *horizontal scroll* yang di-pin, dan seluruh tipe mengecil ke clamp yang beliau tentukan.
Tanpa rencana tertulis dulu, tanpa laporan panjang — eksekusi, lalu screenshot Beranda + Katalog.

## 1. Liquid monogram (`src/components/three/AnMonogramLiquid.tsx`)

- Satu quad 2×2 dengan `ShaderMaterial` custom (vertex + fragment), kamera orthographic yang
  frustumnya di-pin ke [-1, 1]² — tidak ada `BoxGeometry`/`Extrude`, tidak ada objek 3D.
- `uTexture` = `/brand/an-mark.webp` (alpha-nya jadi silhouette); simplex noise menggeser UV
  (ripple + melt), `uMouse`/`uStrength` menambah riak radial yang meluruh di sekitar kursor.
- Chrome: `#0087FF` di-band melawan hitam oleh field noise kedua + specular berjalan.
- Performa sesuai spek: uniform di `useMemo`, `useFrame` hanya menulis uniform, rect dibaca sekali
  per mount/resize/scroll-burst (tidak pernah di dalam loop), `frameloop="never"` saat band keluar
  layar, dan seluruh chunk di-import `React.lazy` hanya ketika band mendekati viewport, hanya di
  ≥768px, hanya tanpa `prefers-reduced-motion`, hanya bila WebGL ada.
- Lantai fallback tidak bergerak: WebP bake ronde 20 tetap di DOM (lazy, decoded) dan langsung
  tampil sendiri di ponsel / reduced-motion / tanpa WebGL.

Biaya jujur: chunk liquid = **238,8 KB gz** (three + @react-three/fiber). Ia tidak masuk budget
`check:web` karena budget itu mengukur referensi `/` sebelum interaksi, dan chunk ini memang tidak
direferensikan sampai band muncul — tapi di desktop dengan gerak aktif, ia benar-benar diunduh saat
band pertama masuk layar. Itu konsekuensi langsung spek ronde ini, bukan kebocoran budget load.

## 2. Katalog horizontal (`src/components/content/CataloguePin.*`)

- `.pinWrap { height: 300vh; position: relative }` + `.pinContent { position: sticky; top: 0;
  height: 100vh; display: flex; overflow: hidden }` persis spek.
- Progress 0→1 ditulis oleh scroll-engine yang sudah ada (`registerPin`, `--pin`), dan CSS yang
  mengerjakan matematikanya: `translateX(calc(var(--pin) * (100vw - 100%)))`. Tidak ada loop rAF
  baru, tidak ada pembacaan layout per frame, tidak ada scroll-hijack — scrollbar vertikal tetap
  milik pembaca.
- Wrapper memakai `overflow-x: clip` (bukan `hidden`, yang akan merusak sticky) sehingga halaman
  tetap bebas scrollbar horizontal di 320–1920 (diafirmasi qa:motion).
- <768px pin larut: wrapper kehilangan tingginya, baris jadi kolom vertikal.

## 3. Tipe & grid

- H1 `clamp(2rem, 4vw, 4rem)` / lh 1.1 / ls −0.02em; H2 `clamp(1.5rem, 2.5vw, 2.5rem)`;
  p `clamp(0.9rem, 1vw, 1rem)` / lh 1.6 / max-width 60ch (override lokal untuk objek yang memang
  perlu lebar penuh).
- Grid teks-kiri 5fr / gambar-kanan 7fr di transmission home dan intro /artist.
- `--section-padding` kini `clamp(6rem, 8vw, 8rem)` (mobile `clamp(6rem, 9vw, 7rem)`).

## 4. Kontrak yang ikut diperbarui (karena spek owner menimpanya)

- `tests/studio/anti-ai.test.ts`: larangan total `<canvas>` dan three menjadi karantina: tepat satu
  canvas di tepat satu file (chunk lazy), importer three hanya chunk itu, orchestrator wajib
  `React.lazy` + still `loading="lazy"`, dan geometri kaku (`Box/Extrude/Text/TubeGeometry`) tetap
  dilarang. drei/babylon/gsap tetap tidak boleh masuk.
- `scripts/qa-motion.mjs`: predikat canvas jadi "0 sebelum band, ≤1 di dalam band, still tetap
  lazy+decoded"; check hover rail diganti check reel: `--pin` bergerak DAN baris benar-benar
  ber-translate, lalu sleeve di viewport menjawab hover.
- `scripts/review/shots.mjs`: state 06 jadi reel mid-travel dengan hover sleeve yang terlihat
  (`pinMid`).

## 5. Gate ronde ini

typecheck 0 · lint 0 · audit:tokens 91 · test 132/132 · a11y 0 violation/16 load ·
qa:motion 23/23 · review:shots 19 · check:web JS 190 KB gz / CSS 17 KB gz (budget 250/40).

## 6. Screenshot di folder ini

Diambil headless Chromium + SwiftShader (WebGL software), jadi shader benar-benar ter-render:

- `d-home-hero.webp` — Beranda 1440×900 dengan skala tipe baru.
- `d-home-liquid.webp` — band monogram: AN chrome cair, bukan objek 3D.
- `d-home-reel.webp` — katalog ter-pin mid-travel, baris sleeve ber-translate.
- `m-home-hero.webp` — Beranda 390×844.
- `m-home-katalog.webp` — katalog ponsel: pin larut jadi kolom vertikal.

Batasan yang nyata: di mesin tanpa WebGL (atau GPU diblokir browser) band menampilkan bake WebP,
bukan shader — itu desain fallbacknya, bukan kerusakan; dan chunk 238,8 KB gz di atas adalah harga
spek ini di desktop ber-GPU aktif.
