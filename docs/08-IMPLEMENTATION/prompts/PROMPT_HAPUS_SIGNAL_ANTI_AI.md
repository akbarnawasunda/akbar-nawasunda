# PROMPT FIX ANTI-AI — HAPUS SEMUA SIGNAL BLOB (NO EMOJI, REAL ASSETS ONLY)

## INSTRUKSI OWNER: ga usah ada signal signal gitu lah, kayak AI jir, hapus yang kerasa kayak AI

TUGAS: Hapus semua elemen yang kerasa AI generik dari homepage dan seluruh site. Site harus editorial gelap real, bukan template AI dengan glowing blob.

## YANG HARUS DIHAPUS (DELETE):

1. SignalField.tsx (dot-matrix 1.5-3px blob #0087FF->#8AE8FF->#7800FF)
2. MusicNotesField.tsx (60 music notes 3D floating)
3. Semua Canvas Three.js / @react-three/fiber yang render blob di hero
4. Semua div dengan gradient ungu-biru full-screen, glowing sphere, particle spam, glassmorphism blur 20px
5. Semua placeholder Liquid Signal breathing scale 1->1.03 6s
6. Semua file di src/components/ yang namanya *Signal* atau *NotesField* — hapus importnya di page.tsx

Jika file masih dibutuhkan untuk test, ganti dengan komponen kosong yang return null, atau hapus total dan update import.

## YANG HARUS DIPAKAI GANTI (REAL, BUKAN AI):

### 1. HERO — TANPA BLOB, FOTO REAL DOMINAN:

Layout 60/40, max-width 1280px, padding 96px desktop 64px mobile, bg #0A0A0E + noise 2% feTurbulence saja (satu layer, bukan blob).

- Kiri 60%:
  - Eyebrow mono 11px uppercase tracking 0.2em #A1A1B5 (7.8:1): BANDUNG BARAT • SINCE 2020
  - H1: AKBAR NAWASUNDA, Syne Bold 700, clamp(40px, 8vw, 96px), line-height 0.9, tracking -0.02em, color #FFFFFF, align left, bukan centered. Jangan overlap ke blob (karena blob dihapus), biarkan H1 clean.
  - Sub: Produser, remixer, DJ asal Bandung Barat. Breakbeat / Indo Bass. Inter Regular 16px line-height 1.6 color #A1A1B5 max 45ch margin-top 24px.
  - CTA row gap 16px: Primary Listen ke https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw bg #0087FF white pill 999px px 20 py 10, Secondary Lihat Visuals outline 1px #2A2A38.
  - Stats row mono 12px gap 32px: +5 tahun aktif, +6 rilis verified, Bandung Barat — jangan fake numbers.

- Kanan 40%:
  - Portrait official akbar-nawasunda-official-portrait-1200.webp 4:5 object-cover top radius 24px LCP priority <picture> srcset 480/720/960 WebP+AVIF preload AVIF. Height 70vh desktop, 50vh mobile.
  - Tidak ada blob di belakang portrait. Hanya portrait dengan vignette subtle gradient bottom 40% black/60% untuk depth, bukan glowing.
  - Jika butuh graphic element di belakang portrait, pakai AN mark watermark 10% opacity 400x400 centered, bukan blob. File akbar-an-mark-transparent.png.

- Background hero: solid #0A0A0E + noise 2% via SVG feTurbulence baseFrequency 0.9. Jangan gradient.

### 2. PLATFORM LOGOS ROW — REAL, BUKAN AI:

Section di bawah hero padding 32px vertical border top/bottom 1px #2A2A38. Row flex gap 24px overflow-x auto mobile. 4 logos mono 11px #A1A1B5 hover #FFFFFF: Spotify, YouTube, SoundCloud, TikTok dengan SVG icons simple, link verified.

### 3. GENRE TAPE — MINIMAL, BUKAN ANIMASI AI:

Horizontal tape BREAKBEAT • INDO BASS • JEDAG JEDUG • JUNGLE DUTCH repeat mono 11px #6A6A80 gap 24px border top/bottom 1px #2A2A38. Static atau slow scroll 60s linear, jangan marquee cepat.

### 4. MUSIC BENTO GRID — REAL ARTWORK, BUKAN TIPOGRAFIS:

- Section header: label mono 11px OUR RELEASES + blue line 24px #0087FF, H2 Sora Bold clamp(28px,4vw,48px) Rilisan Terbaru, divider 1px #2A2A38.
- Grid 12 cols gap 16px:
  - Featured col-span 12 desktop 16:9 bg #101014 radius 24px border 1px #2A2A38 overflow hidden. Left 60% cover (pakai artwork dari public/assets/covers/<slug>.webp atau Spotify auto fetch), right 40% info title year genre pill.
  - 5 kecil col-span 4 desktop aspect 1:1 radius 24px bg #101014 border 1px #2A2A38 padding 16px title Sora 18px year mono 12px #6A6A80. Hover scale image 1.0->1.05 250ms.
  - Jika artwork belum ada, pakai AN ghost 10% centered di bg #101014, jangan placeholder putih, jangan gradient AI.
- Prioritas artwork: 1) manual file di public/assets/covers/<slug>.webp 2) Spotify oEmbed thumbnail auto fetch 3) auto generated AN ghost. Jangan biarkan card kosong.

### 5. VISUALS — MASONRY REAL FOTO, BUKAN BLOB:

Masonry 2 kolom dari 560px gap 16px radius 24px. Pakai 4 aset resmi: portrait official, AN mark transparent, full lockup, logo-an. Jangan pakai blob atau particle sebagai tile.

### 6. FOOTER — REAL, BUKAN AI:

Max-width 1280px padding 64px vertical bg #0A0A0E border top 1px #2A2A38. Col 1 AN mark 48px + domain, Col 2 nav, Col 3 social. Bottom strip 5px #0087FF full width.

### 7. ANTI-AI CHECKLIST — WAJIB LULUS SEBELUM DEPLOY:

- [ ] Tidak ada SignalField, MusicNotesField, Liquid Signal, dot-matrix blob, glowing sphere
- [ ] Tidak ada Canvas Three.js yang render blob di hero (hapus total)
- [ ] Tidak ada gradient ungu-biru full-screen background
- [ ] Tidak ada glassmorphism blur 20px putih
- [ ] Tidak ada particle spam music notes melayang generik (jika mau music notes, hanya 2-3 kecil mono sebagai decorative di corner, bukan 60 particles)
- [ ] Tidak ada centered H1 96px + sub + 3 buttons + 6 cards identik tengah semua
- [ ] Tidak ada emoji, tidak ada lorem ipsum, tidak ada fake stats
- [ ] Semua foto pakai aset real dari docs/05-CONTENT-AND-ASSETS/assets/ atau public/assets/
- [ ] Typography tight -0.02em, mono labels 11px uppercase tracking 0.2em
- [ ] Background hanya #0A0A0E + noise 2%, bukan blob

### TECHNICAL:

- Hapus dependencies @react-three/fiber dan @react-three/drei jika hanya dipakai untuk SignalField (jika dipakai tempat lain, keep tapi jangan render blob di hero)
- Hapus file src/components/SignalField.tsx, src/components/MusicNotesField.tsx, src/components/SignalField.example.tsx
- Update app/(site)/page.tsx: hapus import SignalField dan MusicNotesField, ganti dengan portrait real + AN watermark 10% jika perlu
- Update src/components/VisualGrid.tsx: pastikan tidak render SignalField
- CSS: pastikan tidak ada .signal-field, .signal-blob, .signal-dots
- next/image untuk semua foto real, sizes prop, priority LCP untuk portrait
- prefers-reduced-motion tetap, tapi tidak ada animasi blob yang perlu di-disable
- npm run check hijau: assets + typecheck + lint + build, tests 83+ (update tests yang cek SignalField jadi cek portrait real)

### OUTPUT:

- Deploy ke preview URL sama https://3000-itgtebfif3vcbq3bw02cr.e2b.app
- Screenshot 390px 768px 1280px untuk / /music /music/[slug] /artist /visuals /epk /nope (404)
- Hapus semua signal blob, ganti dengan foto real + typography editorial
- Push ke arena/e02160ef-akbar-nawasunda, main jangan disentuh
- Tunggu approve revisi anti-AI sebelum Phase 8 QA

### REFERENSI YANG HARUS DIIKUTI (TANPA BLOB):

- Referensi 2 Denis Concepts protect your data: H1 besar overlap tipis ke visual, tapi visualnya foto real, bukan blob. Stats kecil +1.5b di pojok, row logo platform.
- Referensi 3 KONAV: Dark navy #0A0A0E, hero kiri teks kanan visual real (chrome fluid di referensi, tapi untuk lu ganti portrait real), bento grid asimetris 1 featured + 5 kecil.
- Martin Garrix / Alan Walker: Dark theme, large portrait dengan overlay gradient, genre tape seperti tour dates, music player minimal, social proof platform logos, tidak ada glowing blob generik.

### CATATAN UNTUK OWNER:

Artwork per lagu tetap auto: public/assets/covers/<slug>.webp manual, atau Spotify oEmbed auto fetch via scripts/fetch-spotify-artwork.js, atau auto generated AN ghost. Jangan biarkan card kosong.
