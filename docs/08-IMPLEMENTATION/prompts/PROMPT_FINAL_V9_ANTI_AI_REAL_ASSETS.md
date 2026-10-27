# PROMPT FINAL V9 — ANTI-AI, REAL ASSETS, ARTWORK AUTO, NO SIGNAL BLOB

## STATUS REPO SEKARANG:
- Prompt lama (Phase 7 music notes + hapus signal) sudah di-up ke repo, jadi prompt ini adalah final yang menggantikan keduanya.
- Repo sudah ada aset foto real di docs/05-CONTENT-AND-ASSETS/assets/ dan public/assets/ — jangan biarkan web kosong.
- Preview: https://3000-itgtebfif3vcbq3bw02cr.e2b.app — masih ada SignalField dot-matrix yang kerasa AI, harus dihapus total di revisi ini.

## TUJUAN FINAL:
Web produser musik kayak Martin Garrix dan Alan Walker — dark editorial, foto real dominan, typography bold tight, genre tape, platform logos, bento grid dengan artwork real per lagu (auto dari Spotify jika belum ada manual), tanpa glowing blob, tanpa dot-matrix signal, tanpa 60 music notes 3D spam.

## DELETE TOTAL YANG KERASA AI:

Hapus file dan import ini:
- src/components/SignalField.tsx
- src/components/SignalField.example.tsx
- src/components/MusicNotesField.tsx
- src/components/MusicNotesField.example.tsx
- Semua Canvas @react-three/fiber yang render blob di hero
- Semua CSS .signal-field, .signal-blob, .signal-dots, .signal-field--dots, .signal-field--outline
- Semua div dengan gradient ungu-biru full-screen, glowing sphere, feTurbulence blob besar, particle spam

Jika butuh @react-three/fiber untuk tempat lain, keep dependency tapi jangan render blob di homepage.

## PAKAI ASET REAL YANG BARU DI-UP (JANGAN KOSONG):

Assets yang wajib dipakai (dari docs/05-CONTENT-AND-ASSETS/assets/ dan public/assets/):
- akbar-nawasunda-official-portrait-1200.webp (LCP hero 4:5)
- akbar-nawasunda-official-portrait.jpg (original)
- akbar-an-mark-transparent.png (AN 32px nav, 48px footer, watermark 10% jika perlu)
- akbar-nawasunda-full-transparent.png (full lockup)
- logo-an.png, akbar-logo.webp

Jika belum ada di public/assets/, copy dari docs/ ke public/assets/ via script.

## HOMEPAGE BARU — NO SIGNAL, REAL PHOTO ONLY:

### NAV 64px:
- Left: AN mark transparent 32px + wordmark Syne Bold 14px tracking -0.02em (desktop), mobile hanya AN mark.
- Right: Links mono 11px uppercase tracking 0.2em Music, Visuals, Artist, EPK + CTA pill Listen ke https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw bg #0087FF white px 20 py 10 radius 999px.
- Border bottom 1px #2A2A38 backdrop-blur 12px bg #0A0A0E/80%.

### HERO 60/40 — TANPA BLOB:

Container max-width 1280px padding 96px desktop 64px mobile bg #0A0A0E + noise 2% feTurbulence satu layer (bukan blob).

Kiri 60%:
- Eyebrow mono 11px uppercase #A1A1B5 7.8:1 BANDUNG BARAT • SINCE 2020
- H1 AKBAR NAWASUNDA Syne Bold 700 clamp(40px,8vw,96px) line-height 0.9 tracking -0.02em #FFFFFF left align, bukan centered.
- Sub Inter Regular 16px line-height 1.6 #A1A1B5 max 45ch margin-top 24px: Produser, remixer, DJ asal Bandung Barat. Breakbeat / Indo Bass.
- CTA row gap 16px: Primary Listen (blue) + Secondary Lihat Visuals outline 1px #2A2A38.
- Stats row mono 12px gap 32px: +5 tahun aktif, +6 rilis verified, Bandung Barat — verified only, jangan fake.

Kanan 40%:
- Portrait official 4:5 object-cover top radius 24px LCP priority <picture> srcset 480/720/960 WebP+AVIF preload AVIF height 70vh desktop 50vh mobile.
- Tidak ada blob di belakang. Hanya portrait dengan vignette gradient bottom 40% black/60% untuk depth.
- Jika butuh graphic element, pakai AN watermark 10% opacity 400x400 centered dari akbar-an-mark-transparent.png, bukan blob glowing.

Background: solid #0A0A0E + noise 2% via SVG feTurbulence baseFrequency 0.9. Jangan gradient ungu-biru.

### PLATFORM LOGOS ROW:

Padding 32px vertical border top/bottom 1px #2A2A38 flex gap 24px overflow-x auto mobile. Logos mono 11px #A1A1B5 hover #FFFFFF: Spotify, YouTube, SoundCloud, TikTok dengan SVG icons simple, link verified.

### GENRE TAPE:

BREAKBEAT • INDO BASS • JEDAG JEDUG • JUNGLE DUTCH repeat mono 11px #6A6A80 gap 24px border 1px #2A2A38 static atau slow scroll 60s linear.

### MUSIC BENTO — ARTWORK AUTO PER LAGU:

Prioritas artwork waterfall di src/content/release-view.ts:

Level 1 MANUAL: public/assets/covers/<slug>.webp — jika ada pakai itu. Slug: masih-mencintainya-papinka, cinta-terbuang, masih-dihatiku, bayang-tanpa-kata, pada-imut-aisyah-tak-belagu, hitungan-cinta-breakbeat-super-exc

Level 2 AUTO SPOTIFY: Jika Level 1 tidak ada, fetch dari Spotify oEmbed https://open.spotify.com/oembed?url=<spotify_url> thumbnail_url. Buat scripts/fetch-spotify-artwork.js baca spotifyUrl per slug, cek file ada atau tidak, download ke public/assets/covers/<slug>.webp via sharp, log Fetched/Skipped/Failed.

Level 3 AUTO GENERATED: Jika 1 dan 2 tidak ada, generate cover bg #101014 AN ghost 10% centered title Sora 24px white genre pill #1A1A22 border bottom gradient #0087FF->#7800FF 4px. Jangan putih kosong.

Level 4: Owner drop manual file ke covers/ langsung override tanpa kode.

Grid: 12 cols gap 16px Section header OUR RELEASES + blue line 24px #0087FF H2 Rilisan Terbaru Sora Bold clamp(28px,4vw,48px) divider 1px #2A2A38. Featured 16:9 col-span 12 bg #101014 radius 24px border 1px #2A2A38 left 60% cover right 40% info. 5 kecil col-span 4 aspect 1:1 radius 24px bg #101014 border 1px #2A2A38 padding 16px title Sora 18px year mono 12px #6A6A80 hover scale 1.05 overlay gradient bottom 60% black/80%.

Jangan biarkan card tipografis kosong — harus ada artwork auto.

### VISUALS:

Masonry 2 kolom dari 560px gap 16px radius 24px pakai 4 aset resmi portrait AN mark full lockup logo-an, lightbox, kolom catatan arsip. Jangan blob.

### ARTIST:

Split asimetris kiri fakta verified kanan portrait 4:5, platform row + genre tape, timeline hanya 2020 DJ Akbar Remix, 2025 Masih Mencintainya Papinka, Sekarang Akbar Nawasunda — periode 2021-2024 dashed [NEEDS OWNER] jangan dikarang. Bio panjang dari /studio/pages/about.

### EPK:

Tombol download .zip real 977KB foto pers cetak 394KB + web 143KB + logos 433KB via scripts/build-epk.sh, manifest, fact sheet, kontak. Jangan tombol kosong.

### 404:

Ghost AN 10% kanan Sinyal hilang CTA + nav strip biru 5px #0087FF.

### REFERENSI YANG DIIKUTI TANPA BLOB:

- Denis Concepts protect your data: H1 besar overlap tipis ke visual real (bukan blob), stats kecil +1.5b di pojok, row logo platform.
- KONAV: Dark navy #0A0A0E hero kiri teks kanan visual real (untuk lu portrait real, bukan chrome fluid), bento asimetris 1 featured + 5 kecil stats nested 2.2k/52k.
- Martin Garrix / Alan Walker: Dark theme large portrait overlay gradient, genre tape seperti tour dates, social proof platform logos, player minimal, tidak ada glowing blob generik.

### ANTI-AI CHECKLIST WAJIB LULUS:

- [ ] Tidak ada SignalField, MusicNotesField, Liquid Signal, dot-matrix, glowing sphere
- [ ] Tidak ada Canvas Three.js blob di hero
- [ ] Tidak ada gradient ungu-biru full-screen
- [ ] Tidak ada glassmorphism blur 20px
- [ ] Tidak ada 60 music notes floating spam
- [ ] Tidak ada centered H1 + 6 cards identik tengah semua
- [ ] Tidak ada emoji, lorem ipsum, fake stats
- [ ] Semua foto real dari docs/ atau public/
- [ ] Typography tight -0.02em mono 11px uppercase
- [ ] Background hanya #0A0A0E + noise 2%
- [ ] Artwork per lagu auto dari Spotify atau manual, jangan kosong tipografis

### TECHNICAL:

- Next.js 16.4 App Router CSS Modules (ikuti repo, bukan Tailwind docs lama)
- Hapus src/components/SignalField* dan MusicNotesField*
- Update app/(site)/page.tsx hapus import signal
- next/image untuk foto real dan covers sizes priority LCP portrait
- Sharp untuk convert Spotify thumbnail ke webp
- prefers-reduced-motion: tidak ada animasi blob yang perlu disable
- npm run check hijau assets + typecheck + lint + build 83+ tests
- Hapus @react-three/fiber jika hanya untuk signal (jika dipakai lain keep)

### OUTPUT:

- Deploy ke https://3000-itgtebfif3vcbq3bw02cr.e2b.app
- Screenshot 390 768 1280 untuk / /music /music/[slug] /artist /visuals /epk /nope
- Push ke arena/e02160ef-akbar-nawasunda main jangan disentuh
- Tunggu approve final anti-AI sebelum Phase 8 QA
- /privacy jangan disentuh sampai owner kasih teks

### CONTOH WATERFALL ARTWORK CODE:

```ts
// src/content/release-view.ts
export function getCoverSrc(slug: string, spotifyUrl?: string): string {
  const localPaths = [
    `/assets/covers/${slug}.webp`,
    `/assets/covers/${slug}.avif`,
    `/assets/covers/${slug}.jpg`,
    `/assets/covers/${slug}.png`,
  ];
  // Check if file exists via fs in server component, or return first and let next/image handle 404 fallback
  // Level 1: manual file — if exists return it
  // Level 2: spotify cache — /assets/covers/spotify-cache/${slug}.webp
  // Level 3: auto generated — /api/cover/${slug} or component with AN ghost
  return `/assets/covers/${slug}.webp`;
}
```

```js
// scripts/fetch-spotify-artwork.js
// For each slug with spotifyUrl, fetch https://open.spotify.com/oembed?url=spotifyUrl, get thumbnail_url, download to public/assets/covers/<slug>.webp
```
