# Round 30 — build hijau, reel satu detik, menu yang tidak hilang, gambar via next/image

## 1. Build

`npm run build` lulus lokal, dengan maupun tanpa `.env.local` (simulasi env Vercel yang kosong).
Check Vercel pada push branch ini (`gh pr checks 3`) bernilai **pass** untuk commit R29 — jadi
"merah" yang terlihat hampir pasti deployment production, yang tracking `main`: branch itu tidak
pernah kita push tanpa approval owner, sehingga production memang masih desain lama. Preview URL
branch ini selalu membawa kerja terkini.

Chunk liquid tetap dynamic import, kini `next/dynamic(..., { ssr: false })` sesuai instruksi: tidak
perah dirender server, hanya masuk browser saat band mendekati viewport.

## 2. Animasi loading: monogram AN menggambar dirinya

`LoadingCurtain` lama (hitung 000→100 + dua sheet, >2 s) diganti sesuai spek: satu SVG inline
(tiga stroke + titik biru), `pathLength={1}` sehingga satu pasang `stroke-dasharray/dashoffset`
menggambar semua jalur; draw 520 ms, titik 560 ms, fade 700→1000 ms — plafon satu detik. Tetap:
sekali per sesi (`an-curtain`), hilang total dưới reduced-motion, tidak menunggu jaringan.
Bukti visual: `d-loading-1280.webp` (frame mid-draw) dan state 01 di folder round8.

## 3. Bug tombol menu

Akar: drawer adalah state React, dan navigasi yang tidak lewat link drawer (klik brand,
back/forward, push programmatik) meninggalkannya terbuka di halaman baru — dialog layar penuh di
atas halaman yang sudah berganti, terbaca sebagai "tombol menu hilang". Fix sesuai instruksi:
`usePathname()` + `useEffect` yang menutup drawer pada setiap commit route (plus brand link ikut
menutup). Repro headless sebelum/sesudah: drawer terbuka → klik brand → dulu `aria-expanded=true`
tertahan, kini `false` dan toggle terlihat; back/forward sama. Tombol tidak pernah terpotong
overflow parent (satu-satunya `overflow: hidden` di sekitar bar adalah clip SR wordmark).
Bukti: `m-menu-open-390.webp`.

## 4. Gambar: next/image di seluruh halaman

Semua `<img>` situs (home, artist, epk, music, visuals, release, header, footer, 404, cover,
monogram still, curtain transisi) kini `next/image` dengan `width`+`height` atau `fill`+`sizes`
(nol layout shift), `loading="lazy"` kecuali foto hero yang `priority`. Optimizer aktif: request
`/_next/image` melayani webp/avif sesuai header Accept (diverifikasi 200 image/webp). Pengecualian
satu-satunya: `src/app/og/route.tsx` — template OG dirender satori di server, bukan browser, dan
satori hanya menerima elemen polos.

## Gate

typecheck 0 · lint 0 · tokens 98 · test 132/132 · a11y 0/16 · qa:motion 23/23 · shots 19/19 ·
check:web JS 190,9 KB gz / CSS 16,8 KB gz (budget 250/40).
