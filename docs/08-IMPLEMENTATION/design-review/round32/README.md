# Round 32 — mobile bukan warga kelas dua: liquid di saku, snap magnetik, haptik, dan tipe yang ditakar untuk tangan

Koreksi owner round 32: mayoritas pengunjung situs ini memegang ponsel, jadi ponsel harus terasa
*lebih* mahal, bukan web yang mengecil. Semua logika yang mematikan animasi berdasarkan lebar
layar dihapus; yang tetap hanya pintu yang memang milik pembaca sendiri (`prefers-reduced-motion`).

## 1. Liquid 3D hidup di ponsel

- Gate `min-width: 768px` di `AnMonogram.tsx` **dihapus**: chunk yang sama kini monta di ponsel,
  tetap `next/dynamic(ssr:false)`, tetap lazy saat band mendekati layar. DPR sudah dipaksa
  `[1, 1.5]` sejak round 31 — plafon yang owner minta, tidak diubah.
- Sentuhan: canvas diberi `touch-action: pan-y`, sehingga geser vertikal tetap milik browser
  (halaman scroll seperti biasa) sementara geser horizontal milik raycaster — jari yang melintas
  di atas huruf mengirim `pointermove` yang sama seperti mouse, dan logam beriak mengikutinya.
  Bukti: `02-beranda-390-liquid-sentuh.webp` (gelombang biru pada titik sentuh).
- Gyroscope: listener `deviceorientation` menulis target tilt ke ref; frame R3F yang sudah ada
  meng-ease ke sana (tidak ada loop rAF baru). Miringkan ponsel dan mark ikut miring seperti
  kartu di tangan. iOS 13+ menguncinya di balik izin yang hanya boleh diminta dari gestur
  pengguna, jadi `pointerdown` pertama di band memanggil
  `DeviceOrientationEvent.requestPermission()` sekali; ditolak pun tidak apa-apa — mark tetap
  berputar pelan seperti biasa.
- Pelajaran potret: fov kamera vertikal tetap, maka di aspect sempit yang habis adalah *lebar*.
  Tanpa fit, mark meluber keluar kaca di 390 px. Sekarang `mesh.scale` mengikuti
  `state.viewport` (ukuran dunia pada z=0) setiap frame: `min(1, w/5.1, h/2.5)`, lantai 0.42.

## 2. Katalog: swipe ala aplikasi native

Reel ponsel (round 31) dilengkapi sesuai spek: `scroll-snap-type: x mandatory` +
`scroll-snap-align: center` (kartu selalu berhenti tepat di tengah, tetangga mengintip di kedua
sisi), `-webkit-overflow-scrolling: touch` untuk inersia iOS, dan scrollbar disembunyikan total
(`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) — aplikasi native tidak
memamerkan scrollbar. Scroll tetap 100% native: tidak satu pun baris JS menggerakkan kartu.
Bukti: `03-katalog-390-snap-center.webp`.

## 3. Sentuhan yang menjawab: press + haptik

- Press fisik: `scale: 0.96` pada `:active` untuk setiap `a`, `button`, `[role="button"]`,
  transisi 100 ms (`--duration-press`). Dipilih properti `scale` terpisah, bukan `transform`,
  supaya press *berkomposisi* dengan transform apa pun yang sudah dimiliki komponen, bukan
  menimpanya.
- Haptik: `src/lib/haptics.ts` (`navigator.vibrate(10)`, guard = feature check-nya sendiri).
  Disambung lewat satu listener `pointerdown` ter-delegasi di `TouchPress.tsx` (client, mount di
  layout situs) untuk semua link/tombol — bukan `onClick` per elemen, karena footer dirender
  server component dan props event handler tidak boleh dibawa dari sana (build pernah merah
  tepat di situ). Hanya `pointerType === "touch"` yang bergetar; mouse punya press scale-nya.

## 4. Layout ponsel yang ditakar ulang

- Skala tipe mobile bukan lagi turunan desktop: di ≤719 px token tipe dideklarasikan ulang dengan
  suku vw yang besar (`--text-hero: clamp(2.5rem, 9.6vw, 3.6rem)` dll.) sehingga nama dan judul
  mengisi lebar tangan tanpa satu pun baris yatim — "NAWASUNDA" utuh satu baris di 390 px
  (11.5vw sempat memecahnya jadi "NAWASUND / A", langsung diturunkan).
- Edge-to-edge bleed: di ≤767 px sleeve rilis di beranda dan artwork di halaman rilis melebar
  `100vw` (`margin-inline: calc(50% - 50vw)`), border dan plat offsetnya pensiun di lebar itu —
  layar ponsel *adalah* sleeve-nya. Overflow horizontal dokumen tetap 0 (diukur 320–1440).

## 5. Gate

`audit:tokens` 105 ✓ · `typecheck` ✓ · `lint` ✓ · `npm test` 132/132 ✓ · `a11y` 0/16 ✓ ·
`qa:motion` 23/23 ✓ · `review:shots` 19 ✓ · `check:web` JS 191.8 KB gz / CSS 17 KB gz
(budget 250/40) ✓.

## 6. Berkas

`01-beranda-390-hero.webp` beranda 390 px: tipe dua baris tanpa yatim, CTA fisik ·
`02-beranda-390-liquid-sentuh.webp` liquid 3D di ponsel, riak pada titik sentuh ·
`03-katalog-390-snap-center.webp` reel snap-center tanpa scrollbar, tetangga mengintip.
