# Round 27 — audit penuh: duplikat, liquid, performa, ikon, scroll, penanda, foto, loading, menu

Brief round 27 meminta audit menyeluruh dengan inventaris sebelum perubahan, perbaikan akar
masalah, dan verifikasi nyata. Inventaris dan hasil ukur ada di bawah; semua gate hijau di commit
ini.

## 1 — Inventaris konten (sebelum perubahan)

Home: hero (nama+stats+CTA+foto panggung) · band monogram (objek saja) · transmission (poster
rilis featured + CTA) · indexBand (rail 10 sleeve) · night (foto jalan malam + kutipan + baris
platform) · archive (VisualRail + aksi YouTube) · pressBand (sheet kertas: linimasa + potret) ·
epkBand (judul "Press kit" kedua + CTA EPK + email booking) · notesBand (konten terbit studio).
/music: masthead · featured takeover · wall. /artist: masthead · intro bone (potret) · stage band ·
bio · linimasa · identitas. /visuals, /epk, /contact: masthead + isi masing-masing.

Yang ditemukan dan diputuskan:

- **epkBand duplikat pesan pressBand** — dua section berdekatan sama-sama berjudul "Press kit",
  sama-sama membawa booking/pers. CTA EPK (.zip + halaman isi) dipindah ke dalam sheet press;
  band kedua beserta CSS-nya dihapus. Email booking tetap ada di footer dan /contact (fungsi
  navigasi, bukan duplikat).
- **Nomor section hiasan** — "03 — Rilis terbaru", "04 — Katalog", "05 — Arsip", "06 — Press kit",
  "07 — Booking & pers", "08 — Catatan", masthead "01 — Katalog"/"02 — Visual", eyebrow
  "03 — Artist"/"04 — Press kit"/"05 — Kontak": semua kehilangan nomornya, label katanya tetap
  (informasi, bukan hiasan).
- Duplikat round 26 tetap berlaku: rail satu-satunya diskografi di home, wall /music melewatkan
  rilis featured, /artist tidak meminjam foto hero home.
- Yang dipertahankan sengaja: footer (navigasi + identitas), baris platform (tautan fungsi),
  linimasa press (data rilisan nyata, bukan karangan), notesBand (kanal konten studio).

## 2 — Liquid Signal: akar masalah dan keadaan sekarang

Riwayat akar masalah: round 25 menyembunyikan split 8px di belakang base opaque dan membayar filter
displacement SVG full-viewport per pointermove (lag + efek tak terlihat); round 26 membuang filter
dan menaikkan split ke atas base. Round 27 menambahkan pemeriksaan yang diminta brief: komponen
dirender di semua viewport (bake WebP, bukan canvas/WebGL — fallback "tanpa WebGL" adalah desainnya
sendiri), ukuran elemen benar (inset band, object-fit cover), animasi mulai/berhenti tepat
(pointer masuk/keluar band), tidak ada error JS/shader (nol di semua route), dan **tidur di luar
viewport**: IntersectionObserver membalik satu boolean, handler pointer return sebelum membaca rect
selama band tidak terlihat. Touch terverifikasi: drag jari di band menulis `--lstr 1` dan split
opacity 0.5; di atas band (scroll puncak) `--lstr` tetap 0. Reduced motion: still utuh, tanpa
split, tanpa curtain.

## 3 — Performa: diukur, bukan diasumsikan

Pengukuran headless (longtask + frame delta, scroll terstandar 14 langkah wheel):

| rute / viewport | CPU | longtasks | fps | worst frame |
| --- | --- | --- | --- | --- |
| / 1440 | 1x | 0 | 61 | 50 ms |
| / 1440 | 4x | 0 | 56 | 67 ms |
| / 390 dpr2 | 4x | 0 | 59 | 33 ms |
| /artist 390 dpr2 | 4x | 0 | 60 | 83 ms |
| /music 390 dpr2 | 4x | 0 | 61 | 33 ms |

Tidak ada longtask; worst frame /artist adalah decode potret sekali saat masuk viewport (lazy +
async). Sumber lag historis sudah dieksekusi: filter displacement (R26), mask full-viewport (R26),
dan round 27 menambah: pekerjaan visual di luar viewport dimatikan (IO monogram), `backdrop-filter`
tetap hanya di balik `?perf=blur` (sengaja, untuk A/B), tidak ada rAF baru (scroll engine satu,
Lenis satu, sisanya gesture-scoped one-shot), DPR mobile memakai bake narrow 1350px.

## 4 — Ikon sosial

Semua ikon sosial adalah SVG lokal `src/components/ui/PlatformIcon.tsx` (grid 24px, stroke 1.4,
currentColor) — tidak ada emoji, tidak ada library baru. Round 27: sel follow footer sudah
berikon (R26), dan baris listening mendapat target sentuh layak (`min-height --space-6` +
padding-block) karena sebelumnya baris teks 16px. URL semua dari `src/config/socials.ts`
(data pemilik, D-090) — tidak ada URL buatan.

## 5 — Scroll

Sistem yang ada diaudit dulu: Lenis (wheel-only, native scroll/snap/keyboard/back-button tetap
utuh, D-096) + scroll engine satu loop. Tidak ada hijacking global baru; alasan mempertahankan
Lenis tercatat di `SmoothScroll.tsx` (coast mahal yang terasa "premium", tanpa menyentuh touch dan
keyboard). Anchor diverifikasi: `/#press` mendarat di section press (top −20px, offset header).
Tidak ada konflik dengan liquid (IO) atau 3D (tidak ada 3D live sejak R20).

## 6 — Penanda generik

Sudah dieksekusi R26: progress bar, cursor dot, cross HUD, registration crosses, hint geser.
Round 27: nomor section (lihat §1). Yang tersisa adalah elemen beralasan: hairline struktur,
caption foto, metadata rilis, label section berbunyi, mark merek.

## 7 — Foto dan studio: alur diverifikasi end-to-end

Slot `latar`/`malam`/`panggung` (R26) diverifikasi lewat UI nyata, bukan asumsi: login studio →
Media → "Foto situs" → unggah WebP ke slot `panggung` → status "tersimpan" → `/artist` publik
memuat `/api/public/foto/panggung` (box 1203×524, natural 800×450, `object-fit: cover` — crop
benar, tidak distorsi) → slot dikosongkan dari studio → frame bone kembali. Home hero dengan slot
`latar` terisi dan kembali ke aset repo setelah clear, keduanya terverifikasi. Placeholder kosong
round 27 tidak lagi menyapa pengunjung dengan teks internal: frame bone memegang mark AN ghost
16% — placeholder dirancang, bukan pesan. Tidak ada foto karangan/AI; penyimpanan tetap database
studio (tanpa provider berbayar baru).

## 8 — Loading dan transisi

Curtain masuk dipendekkan (hold 1500→900 ms, count 800, lift 480) — sekali per sesi, tidak
menghalangi tap pertama ke katalog lebih dari satu detik. RouteCurtain ditulis ulang supaya tidak
memalsukan durasi: sheet ink turun saat klik tautan internal (menyembunyikan fetch yang nyata),
dan **terangkat tepat saat route commit** (`usePathname` berubah) dengan mark AN di tengahnya;
timer keamanan 2,5 s mengangkat sheet jika navigasi batal; klik ber-modifier/eksternal/back-forward
tidak menaikkan sheet; reduced motion tanpa curtain. Tidak ada flash: sheet satu layer, transform
saja.

## 9 — Tombol menu

Diverifikasi: buka → kata TUTUP + burger jadi X + bar visible; pilih tautan → route baru, toggle
visible, kata kembali MENU, drawer unmount, scrollY 0; Escape menutup; tap touch (390px, hasTouch)
membuka dan menavigasi dengan toggle tetap visible. Perbaikan R26 tetap: bar di atas drawer
(z-chrome+1 saat open), bar tidak sembunyi selama dialog terbuka, route change mendarat di atas.

## Shot

`d-home-press` (sheet press dengan CTA EPK, band duplikat hilang) · `d-home-liquid` (air terlihat)
· `d-artist-slot` (frame bone + mark ghost) · `d-home-hero`, `m-home-hero`, `m-artist-slot` ·
`d-studio-foto` (meja slot foto di studio, login lokal).

## Gate

typecheck 0 · lint 0 · tokens 91 · tests 132/132 · a11y 0/16 · qa:motion 22/22 · review:shots
19/19 · check:web JS 189.5 KB gz / CSS 16.9 KB gz · E2E studio upload/clear lulus · verifikasi
menu/anchor/touch/reduced-motion lulus.
