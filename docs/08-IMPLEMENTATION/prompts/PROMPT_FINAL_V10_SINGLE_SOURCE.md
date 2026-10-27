# PROMPT FINAL V10 — SINGLE SOURCE OF TRUTH (ANTI-AI, REAL ASSETS, NO SIGNAL)

## INSTRUKSI PEMBERSIHAN REPO (JALANKAN DULU):

Root sekarang kotor karena banyak PROMPT_*.md. Bersihkan:

mkdir -p docs/08-IMPLEMENTATION/prompts/archive
mv PROMPT_*.md docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null || true
mv AGENTS_2.md docs/08-IMPLEMENTATION/prompts/archive/ 2>/dev/null || true

Setelah itu root hanya boleh ada:
- AGENTS.md, README.md, HANDOFF_TO_CODING_AGENT.md, CLAUDE.md, GITHUB_REPO_README.md
- next.config.ts, package.json, tsconfig.json, vercel.json
- folder: docs/, public/, src/, scripts/, drizzle/, tests/

Semua prompt lama pindah ke archive, jangan dibaca lagi oleh agent. Hanya prompt ini yang jadi acuan.

---

## TUJUAN:

Web produser musik kayak Martin Garrix dan Alan Walker — dark editorial #0A0A0E, foto real dominan, typography bold tight -0.02em, genre tape, platform logos, bento grid dengan artwork real per lagu (auto dari Spotify jika belum ada manual), tanpa signal blob, tanpa dot-matrix, tanpa music notes 3D spam, tanpa glowing sphere, tanpa glassmorphism.

Preview: https://3000-itgtebfif3vcbq3bw02cr.e2b.app

## DELETE YANG KERASA AI (WAJIB):

- src/components/SignalField.tsx, SignalField.example.tsx
- src/components/MusicNotesField.tsx, MusicNotesField.example.tsx
- Semua import SignalField / MusicNotesField di app/(site)/page.tsx
- Semua Canvas @react-three/fiber yang render blob di hero
- CSS .signal-field, .signal-blob, .signal-dots
- Hapus dependency @react-three/fiber, @react-three/drei jika hanya untuk signal
- Semua div gradient ungu-biru full-screen, glowing sphere, particle spam

## PAKAI ASET REAL YANG ADA (JANGAN BIARKAN KOSONG):

Dari docs/05-CONTENT-AND-ASSETS/assets/ dan public/assets/:
- akbar-nawasunda-official-portrait-1200.webp — hero LCP 4:5, height 70vh desktop 50vh mobile, radius 24px, <picture> 480/720/960 WebP+AVIF preload AVIF
- akbar-an-mark-transparent.png — nav 32px, footer 48px, watermark 10% 400x400 jika butuh graphic, bukan blob
- akbar-nawasunda-full-transparent.png — full lockup
- logo-an.png, akbar-logo.webp

Jika belum ada di public/assets/, copy dari docs/ ke public/assets/

## HOMEPAGE FINAL — NO SIGNAL, REAL ONLY:

NAV 64px border bottom 1px #2A2A38 backdrop-blur 12px bg #0A0A0E/80%:
Left AN mark 32px + wordmark Syne Bold 14px tracking -0.02em desktop, mobile hanya AN. Right links mono 11px uppercase tracking 0.2em Music Visuals Artist EPK + CTA pill Listen ke https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw bg #0087FF white px 20 py 10 radius 999px.

HERO 60/40 max-width 1280px padding 96px desktop 64px mobile bg #0A0A0E + noise 2% feTurbulence satu layer:
Kiri 60%:
- Eyebrow mono 11px #A1A1B5 7.8:1 BANDUNG BARAT • SINCE 2020
- H1 AKBAR NAWASUNDA Syne Bold 700 clamp(40px,8vw,96px) line-height 0.9 tracking -0.02em #FFFFFF left align
- Sub Inter 16px line-height 1.6 #A1A1B5 max 45ch Produser, remixer, DJ asal Bandung Barat. Breakbeat / Indo Bass.
- CTA row gap 16px Primary Listen blue + Secondary Lihat Visuals outline 1px #2A2A38
- Stats mono 12px gap 32px +5 tahun aktif +6 rilis verified Bandung Barat

Kanan 40%:
- Portrait official 4:5 object-cover top radius 24px LCP priority, vignette gradient bottom 40% black/60% untuk depth, tidak ada blob. Jika butuh graphic, AN watermark 10% 400x400.
- Background solid #0A0A0E + noise 2% via SVG feTurbulence baseFrequency 0.9.

PLATFORM LOGOS ROW padding 32px border top/bottom 1px #2A2A38 flex gap 24px overflow-x auto: Spotify YouTube SoundCloud TikTok mono 11px #A1A1B5 hover #FFFFFF SVG simple.

GENRE TAPE BREAKBEAT • INDO BASS • JEDAG JEDUG • JUNGLE DUTCH mono 11px #6A6A80 gap 24px border 1px #2A2A38 static.

MUSIC BENTO ARTWORK AUTO:
Prioritas waterfall di src/content/release-view.ts:
Level 1 MANUAL public/assets/covers/<slug>.webp jika ada
Level 2 AUTO SPOTIFY fetch https://open.spotify.com/oembed?url=<spotify_url> thumbnail_url via scripts/fetch-spotify-artwork.js download ke covers/<slug>.webp via sharp
Level 3 AUTO GENERATED bg #101014 AN ghost 10% title Sora 24px border bottom gradient #0087FF->#7800FF 4px
Level 4 MANUAL drop override
Slug: masih-mencintainya-papinka, cinta-terbuang, masih-dihatiku, bayang-tanpa-kata, pada-imut-aisyah-tak-belagu, hitungan-cinta-breakbeat-super-exc
Grid 12 cols gap 16px Featured 16:9 col-span 12 bg #101014 radius 24px border 1px #2A2A38 left 60% cover right 40% info, 5 kecil col-span 4 aspect 1:1 radius 24px bg #101014 border 1px #2A2A38 hover scale 1.05 overlay black/80%. Jangan card tipografis kosong.

VISUALS masonry 2 kolom dari 560px gap 16px radius 24px pakai 4 aset resmi.

ARTIST split asimetris kiri fakta verified kanan portrait 4:5 timeline hanya 2020 DJ Akbar Remix 2025 Masih Mencintainya Papinka Sekarang Akbar Nawasunda 2021-2024 dashed [NEEDS OWNER].

EPK tombol download .zip real 977KB via scripts/build-epk.sh.

404 ghost AN 10% kanan Sinyal hilang strip biru 5px #0087FF.

Referensi tanpa blob: Denis Concepts protect your data H1 besar stats kecil row logo, KONAV dark navy #0A0A0E hero kiri teks kanan visual real bento asimetris, Martin Garrix Alan Walker dark theme large portrait overlay gradient genre tape tanpa glowing blob.

ANTI-AI CHECKLIST: Tidak ada SignalField MusicNotesField dot-matrix glowing sphere gradient full-screen ungu-biru glassmorphism 60 notes spam centered H1 + 6 cards identik emoji lorem ipsum fake stats. Semua foto real, typography tight -0.02em mono 11px uppercase, background #0A0A0E + noise 2% saja, artwork auto jangan kosong.

TECHNICAL: Next.js 16.4 CSS Modules, hapus SignalField* MusicNotesField*, update page.tsx hapus import, next/image foto real dan covers priority LCP portrait, sharp untuk convert Spotify thumbnail, npm run check hijau 83+ tests.

OUTPUT: Deploy ke https://3000-itgtebfif3vcbq3bw02cr.e2b.app screenshot 390 768 1280 untuk / /music /music/[slug] /artist /visuals /epk /nope. Push ke arena/e02160ef-akbar-nawasunda main jangan disentuh. Tunggu approve final anti-AI sebelum Phase 8 QA. /privacy jangan disentuh.
