# PROMPT PHASE 7 REVISI — FIX KOSONG + ARTWORK AUTO + 3D MUSIC NOTES (NO EMOJI, SVG + THREE.JS)

## MASALAH YANG OWNER LAPORKAN:

- Web kosong banget padahal repo udah ada aset foto dan lainnya
- Tiap lagu harus ngambil artwork dari artwork lagu itu sendiri dulu (auto), sebelum manual
- Layout UI kurang menarik, ga kayak referensi (KONAV, protect your data), teks dan info kayak AI
- Tidak ada animasi 3D, mau kayak Martin Garrix dan Alan Walker — pakai not lagu sebagai particle
- Aset yang sudah ada di repo tidak dipakai

## ASET YANG SUDAH ADA DI REPO (WAJIB PAKAI, JANGAN BIARKAN KOSONG):

- akbar-an-mark-transparent.png
- akbar-favicon.jpg
- akbar-logo-fallback.webp
- akbar-logo.webp
- akbar-nawasunda-full-transparent.png
- akbar-nawasunda-official-portrait-1200.webp
- akbar-nawasunda-official-portrait-1200_1.webp
- akbar-nawasunda-official-portrait.jpg
- akbar-rmx-mark-fallback.jpg
- favicon.png
- logo-an.png
- portrait-blur-placeholder.jpg
- portrait-blur-placeholder_1.jpg

Plus di public/assets/ seharusnya ada:
- public/assets/covers/ untuk artwork per rilis (jika belum ada, pakai fallback auto)
- public/assets/akbar-nawasunda-official-portrait.jpg (original 1122x1402)
- public/assets/akbar-an-mark-transparent.png (AN 32px nav, 48px footer)

## TUGAS PHASE 7 REVISI — 3 BAGIAN:

### BAGIAN 1: FIX KOSONG — PAKAI ASET YANG SUDAH ADA

1. Homepage hero jangan kosong:
   - Kiri 55%: H1 AKBAR NAWASUNDA, sub, CTA, stats +6 rilis
   - Kanan 45%: portrait official 4:5 pakai akbar-nawasunda-official-portrait-1200.webp LCP priority, bukan placeholder. Jika portrait belum ada di public/, copy dari docs/05-CONTENT-AND-ASSETS/assets/ ke public/assets/.
   - Background hero: #0A0A0E + noise 2% feTurbulence (sudah ada), bukan putih kosong.

2. Visuals page jangan kosong:
   - Masonry 2 kolom pakai 4 aset resmi: portrait official, AN mark transparent, full lockup, logo-an. Jika hanya 4, duplikasi dengan crop berbeda atau pakai versi web/print agar masonry penuh.
   - Jangan biarkan tile kosong dengan watermark doang — pakai foto asli.

3. EPK page jangan tombol kosong:
   - Sudah ada file nyata 977KB (sudah fix di Phase 5) — pastikan tombol download .zip work.

### BAGIAN 2: ARTWORK PER LAGU — AUTO DULU, MANUAL KEMUDIAN

Implementasi di src/content/release-view.ts dan src/components/ReleaseCard.tsx dan app/(site)/music/[slug]/page.tsx:

1. Prioritas artwork (waterfall):
   - Level 1 (AUTO): Cek file di public/assets/covers/<slug>.webp (atau .avif, .jpg, .png) — jika ada, pakai itu. Slug list: masih-mencintainya-papinka, cinta-terbuang, masih-dihatiku, bayang-tanpa-kata, pada-imut-aisyah-tak-belagu, hitungan-cinta-breakbeat-super-exc
   - Level 2 (AUTO from Spotify): Jika Level 1 tidak ada, fetch artwork dari Spotify via oEmbed atau Spotify API. Gunakan endpoint https://open.spotify.com/oembed?url=<spotify_url> untuk dapat thumbnail_url. Simpan cache di public/assets/covers/spotify-cache/ agar tidak hit API tiap load.
   - Level 3 (AUTO generated): Jika Level 1 dan 2 tidak ada, generate cover otomatis: bg #101014, AN ghost 10% centered, title Sora 24px white, genre pill #1A1A22, dengan gradient accent #0087FF -> #7800FF di border bottom 4px. Jangan pakai placeholder putih kosong.
   - Level 4 (MANUAL): Owner bisa drop file manual ke public/assets/covers/<slug>.webp — langsung override Level 1-3 tanpa sentuh kode.

2. Script helper: buat scripts/fetch-spotify-artwork.js yang:
   - Baca list spotifyUrl per slug
   - Untuk tiap slug, cek apakah file di public/assets/covers/<slug>.* ada — jika tidak, fetch dari Spotify oEmbed
   - Download image ke public/assets/covers/<slug>.webp
   - Log: Fetched 3, Skipped 3 (already exists), Failed 0

### BAGIAN 3: 3D ANIMASI MUSIC NOTES — KAYAK MARTIN GARRIX & ALAN WALKER

Referensi: Martin Garrix dan Alan Walker pakai music notes melayang, particles, dan audio visualizer, bukan blob generik.

1. Ganti SignalField dot-matrix placeholder dengan MusicNotesField 3D:
   - Stack: @react-three/fiber + @react-three/drei
   - Canvas 600x600, position absolute top -20 right -40 z-index 1 di belakang portrait
   - Particles: 50-80 music notes (♪, ♫, ♬, ♩) sebagai Text geometry, bukan dots
   - Material: MeshStandardMaterial emissive #0087FF dan #8AE8FF, metalness 0.8, roughness 0.2
   - Animasi: floating y -20 to +20, rotation slow, scale breathing 1->1.1 6s
   - Gradient: notes edge atas #8AE8FF, bawah #7800FF, tengah #0087FF

2. SVG fallback untuk non-WebGL atau reduced-motion:
   - Inline SVG dengan 20-30 text elements music notes dengan font size 16-24px
   - Animasi CSS float 3-6s infinite

3. Performance: Chunk Three.js <70kb gz (dynamic import, ssr false), Canvas tidak render di mobile <768px default, LCP tidak terganggu portrait priority

### BAGIAN 4: LAYOUT UI BIAR GAK KAYAK AI

1. Hero seperti Alan Walker / Martin Garrix: Large portrait overlay gradient dark, H1 tight -0.02em overlap -120px ke visual, CTA dengan icon play, genre tape seperti tour dates
2. Music bento grid seperti KONAV: Featured besar 16:9 dengan artwork auto, 5 kecil 1:1, stats nested +5 tahun +6 rilis, hover scale 1.05 + overlay gradient
3. Text jangan AI: Pakai fakta terverifikasi dari FACTS_AND_VERIFICATION.md, label mono 11px uppercase #A1A1B5 7.8:1, jangan semua centered
4. Martin Garrix / Alan Walker inspirasi: Dark theme #0A0A0E accent blue #0087FF purple #7800FF icy #8AE8FF, music notes decorative, player minimal

OUTPUT: Deploy ke preview URL sama https://3000-itgtebfif3vcbq3bw02cr.e2b.app, screenshot 390 768 1280, file baru src/components/MusicNotesField.tsx, src/components/SignalField.tsx revisi, scripts/fetch-spotify-artwork.js
