# PROMPT FINAL V11 — CLEAN REPO + REAL ASSETS + ANTI-AI (SINGLE SOURCE OF TRUTH)

## KONTEKS REPO SEKARANG (DARI SCREENSHOT OWNER):

Root: 5 PROMPT_*.md + AGENTS_2.md + README_2.md numpuk — ini bikin agent baca prompt lama yang masih ada SignalField.
Assets nyebar 3 tempat:
- AKBAR-NAWASUNDA-ASSETS/ 25 file (akbar-editorial-stage-bg.webp, akbar-night-frequency-hero*.webp, akbar-mascot-doodle.avif/webp, akbar-nawasunda-official-portrait-1000.webp/jpg/webp, akbar-official-portrait*.webp, akbar-rmx-mark.webp, akbar-social-preview.webp, logo-an.png)
- docs/05-CONTENT-AND-ASSETS/assets/ 12 file (duplikat)
- public/assets/covers/ hanya README.md — kosong, makanya kartu kosong

Component sampah AI masih ada: src/components/MusicNotesField.example.tsx + SignalField.example.tsx

Preview: https://3000-itgtebfif3vcbq3bw02cr.e2b.app masih ada SignalField dot-matrix yang kerasa AI

## LANGKAH 0 — BERSIHIN ROOT (WAJIB JALAN DULU SEBELUM CODING):

Jalankan di repo root:

mkdir -p docs/08-IMPLEMENTATION/prompts/archive
mv PROMPT_*.md docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null || true
mv AGENTS_2.md README_2.md docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null || true
rm -f src/components/MusicNotesField.example.tsx src/components/SignalField.example.tsx
rm -rf src/experiments/lattice

Setelah itu root hanya boleh:
- AGENTS.md, README.md, HANDOFF_TO_CODING_AGENT.md, CLAUDE.md, GITHUB_REPO_README.md
- next.config.ts, package.json, tsconfig.json, vercel.json, .env.example, .gitignore, .nvmrc, eslint.config.mjs
- folder: AKBAR-NAWASUNDA-ASSETS/, docs/, public/, src/, scripts/, drizzle/, tests/

Semua prompt lama di archive, jangan dibaca lagi. Hanya prompt ini yang jadi acuan.

## LANGKAH 1 — KONSOLIDASI ASET (BIAR WEB GAK KOSONG):

Tujuan: public/assets/ harus berisi semua foto real, bukan kosong.

Jalankan:

mkdir -p public/assets public/assets/covers
cp AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-official-portrait*.webp public/assets/ 2>/dev/null || true
cp AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-official-portrait.jpg public/assets/ 2>/dev/null || true
cp AKBAR-NAWASUNDA-ASSETS/logo-an.png public/assets/ 2>/dev/null || true
cp AKBAR-NAWASUNDA-ASSETS/akbar-logo*.webp public/assets/ 2>/dev/null || true
cp AKBAR-NAWASUNDA-ASSETS/akbar-rmx-mark*.webp public/assets/ 2>/dev/null || true
cp AKBAR-NAWASUNDA-ASSETS/akbar-night-frequency-hero*.webp public/assets/ 2>/dev/null || true
cp AKBAR-NAWASUNDA-ASSETS/akbar-editorial-stage-bg.webp public/assets/ 2>/dev/null || true
cp docs/05-CONTENT-AND-ASSETS/assets/akbar-an-mark-transparent.png public/assets/ 2>/dev/null || true
cp docs/05-CONTENT-AND-ASSETS/assets/akbar-nawasunda-full-transparent.png public/assets/ 2>/dev/null || true

# Pastikan portrait utama ada di public untuk LCP:
# public/assets/akbar-nawasunda-official-portrait-1200.webp (jika tidak ada, copy dari yang 1000)
cp AKBAR-NAWASUNDA-ASSETS/akbar-nawasunda-official-portrait-1000.webp public/assets/akbar-nawasunda-official-portrait-1200.webp 2>/dev/null || true

# Buat placeholder covers jika masih kosong (auto generated, bukan kosong):
# Jika public/assets/covers/ masih kosong, buat 6 cover auto dengan AN ghost + title
# via scripts/generate-placeholder-covers.mjs (lihat di bawah)

## LANGKAH 2 — DELETE SIGNAL YANG KERASA AI:

Hapus:
- src/components/SignalField.tsx (jika ada)
- src/effects/SpatialBackdrop.tsx jika hanya render blob (jika dipakai untuk grain keep)
- Semua import SignalField / MusicNotesField di app/(site)/page.tsx, app/(site)/layout.tsx
- Hapus @react-three/fiber, @react-three/drei dari package.json jika hanya untuk signal

Ganti dengan:
- Hero portrait real 4:5 dengan vignette gradient bottom 40% black/60%, tidak ada blob
- Background solid #0A0A0E + noise 2% feTurbulence satu layer saja

## LANGKAH 3 — ARTWORK PER LAGU AUTO DARI LAGUNYA SENDIRI:

Implementasi waterfall di src/content/release-view.ts dan src/components/content/ReleaseView.tsx:

Level 1 MANUAL: public/assets/covers/<slug>.webp — jika ada pakai itu. Slug: masih-mencintainya-papinka, cinta-terbuang, masih-dihatiku, bayang-tanpa-kata, pada-imut-aisyah-tak-belagu, hitungan-cinta-breakbeat-super-exc

Level 2 AUTO SPOTIFY: Jika Level 1 tidak ada, fetch dari Spotify oEmbed https://open.spotify.com/oembed?url=<spotify_url> thumbnail_url. Buat scripts/fetch-spotify-artwork.js:
- Baca src/content/releases.ts untuk spotifyUrl per slug
- Untuk tiap slug cek file di public/assets/covers/<slug>.webp ada atau tidak
- Jika tidak ada, fetch thumbnail_url dari oEmbed, download via fetch + sharp ke webp 800x800 max 150KB
- Log Fetched/Skipped/Failed

Level 3 AUTO GENERATED: Jika 1 dan 2 tidak ada, generate cover bg #101014 AN ghost 10% centered (pakai logo-an.png 200x200 opacity 0.1) + title Sora 24px white + genre pill #1A1A22 + border bottom gradient #0087FF->#7800FF 4px. Jangan putih kosong. Buat via scripts/generate-placeholder-covers.mjs pakai sharp.

Level 4: Owner drop manual file ke covers/<slug>.webp langsung override tanpa kode.

## LANGKAH 4 — HOMEPAGE FINAL ANTI-AI, REAL ASSETS ONLY:

NAV 64px border bottom 1px #2A2A38 backdrop-blur 12px bg #0A0A0E/80%:
Left AN mark 32px (akbar-an-mark-transparent.png atau logo-an.png) + wordmark Syne Bold 14px tracking -0.02em desktop. Right links mono 11px uppercase tracking 0.2em Music Visuals Artist EPK + CTA pill Listen ke https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw bg #0087FF white px 20 py 10 radius 999px.

HERO 60/40 max-width 1280px padding 96px desktop 64px mobile bg #0A0A0E + noise 2% feTurbulence satu layer:
Kiri 60%: Eyebrow mono 11px #A1A1B5 BANDUNG BARAT • SINCE 2020, H1 AKBAR NAWASUNDA Syne Bold clamp(40px,8vw,96px) line-height 0.9 tracking -0.02em #FFFFFF left align, Sub Inter 16px #A1A1B5 max 45ch Produser remixer DJ Bandung Barat Breakbeat Indo Bass, CTA row Primary Listen blue + Secondary Lihat Visuals outline 1px #2A2A38, Stats mono 12px +5 tahun +6 rilis verified.
Kanan 40%: Portrait official 4:5 object-cover top radius 24px LCP priority <picture> 480/720/960 WebP+AVIF preload AVIF height 70vh desktop 50vh mobile vignette gradient bottom 40% black/60% saja tidak ada blob. Jika butuh graphic AN watermark 10% 400x400.

PLATFORM LOGOS ROW padding 32px border top/bottom 1px #2A2A38 flex gap 24px overflow-x auto: Spotify YouTube SoundCloud TikTok mono 11px #A1A1B5 hover #FFFFFF SVG simple.

GENRE TAPE BREAKBEAT • INDO BASS • JEDAG JEDUG • JUNGLE DUTCH mono 11px #6A6A80 gap 24px border 1px #2A2A38 static.

MUSIC BENTO: Section header OUR RELEASES + blue line 24px #0087FF H2 Rilisan Terbaru Sora Bold clamp(28px,4vw,48px) divider 1px #2A2A38. Grid 12 cols gap 16px Featured 16:9 col-span 12 bg #101014 radius 24px border 1px #2A2A38 left 60% cover (artwork auto dari Level 1-3) right 40% info, 5 kecil col-span 4 aspect 1:1 radius 24px bg #101014 border 1px #2A2A38 padding 16px title Sora 18px year mono 12px #6A6A80 hover scale 1.05 overlay black/80%. Jangan card tipografis kosong.

VISUALS masonry 2 kolom dari 560px gap 16px radius 24px pakai 4 aset real: portrait official, AN mark, full lockup, night-frequency-hero, editorial-stage-bg, mascot-doodle. Lightbox.

ARTIST split asimetris kiri fakta verified kanan portrait 4:5 platform row + genre tape timeline hanya 2020 DJ Akbar Remix 2025 Masih Mencintainya Papinka Sekarang Akbar Nawasunda 2021-2024 dashed [NEEDS OWNER].

EPK tombol download .zip real 977KB via scripts/build-epk.sh manifest fact sheet.

404 ghost AN 10% kanan Sinyal hilang CTA + nav strip biru 5px #0087FF.

Referensi tanpa blob: Denis Concepts protect your data H1 besar stats kecil row logo, KONAV dark navy #0A0A0E hero kiri teks kanan visual real bento asimetris 1 featured + 5 kecil, Martin Garrix Alan Walker dark theme large portrait overlay gradient genre tape tanpa glowing blob.

ANTI-AI CHECKLIST: Tidak ada SignalField MusicNotesField dot-matrix glowing sphere gradient full-screen ungu-biru glassmorphism 60 notes spam centered H1 + 6 cards identik emoji lorem ipsum fake stats. Semua foto real dari AKBAR-NAWASUNDA-ASSETS/ atau public/assets/, typography tight -0.02em mono 11px uppercase, background #0A0A0E + noise 2% saja, artwork auto jangan kosong.

TECHNICAL: Next.js 16.4 CSS Modules, hapus SignalField* MusicNotesField*, update page.tsx hapus import, next/image foto real dan covers priority LCP portrait, sharp untuk convert, npm run check hijau 83+ tests.

OUTPUT: Deploy ke https://3000-itgtebfif3vcbq3bw02cr.e2b.app screenshot 390 768 1280 untuk / /music /music/[slug] /artist /visuals /epk /nope. Push ke arena/e02160ef-akbar-nawasunda main jangan disentuh. Tunggu approve final anti-AI sebelum Phase 8 QA. /privacy jangan disentuh.
