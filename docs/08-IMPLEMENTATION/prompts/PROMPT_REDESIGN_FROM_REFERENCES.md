# PROMPT REDESIGN HOMEPAGE — GABUNGAN 4 REFERENSI (NO EMOJI, SVG FIRST)

## KONTEKS GAMBAR REFERENSI YANG OWNER KIRIM:

1. 969329519781716489.jpg — particle dot fluid: blue to purple dot matrix, organic blob shape, black bg, dot density varies by curvature, highlight biru terang di edge atas, ungu di bawah. Ini adalah Liquid Signal yang benar — bukan bola glowing solid.
2. Denis_Concepts.jpg — layout protect your data: H1 besar 96px overlap dengan glassy blobs ber-outline tipis 1px orange/blue, stats kecil +1.5b +65k +300k di pojok, row logo platform (Auth, Unity, Western Union, Dropbox) dengan rounded pill, section Our Benefits dengan cards bento.
3. Landing_Page_Design_Inspiration_2026_Clean_Modern_UI.jpg — KONAV: dark navy #0A0A0E, hero kiri teks Discover The Limitless Possibilities, kanan iridescent chrome fluid metallic, bawahnya bento grid dengan cards 24px radius, border #2A2A38, stats besar 2.2k / 52k di dalam card, nested cards overlap.
4. 713257659759413787.jpg — Blockchain AI: header dark dengan karakter 3D kecil di tengah, minimal, tidak relevan untuk hero tapi relevan untuk penggunaan karakter (portrait official sebagai hero character).

## TUGAS: REVISI HOMEPAGE PROTOTYPE AGAR TIDAK KELIHATAN AI

### PRINSIP ANTI-AI DARI 4 REFERENSI:

- Jangan centered semua. Pakai layout dari referensi 2 dan 3: hero split 55% kiri teks, 45% kanan visual, dengan teks overlap sedikit ke visual (seperti protect your data overlap blob).
- Jangan solid glowing sphere. Pakai referensi 1: dot matrix particle, bukan mesh solid. Dot size 1.5px - 3px, opacity varies by depth, gradient blue #0087FF -> icy #8AE8FF -> purple #7800FF pada dots di edge.
- Jangan glassmorphism heavy. Pakai referensi 2: thin outline 1px dengan inner glow subtle, background #101014, border #2A2A38, bukan blur 20px putih.
- Jangan bento grid identik. Pakai referensi 3: bento dengan 1 featured besar 16:9 + 5 kecil 1:1, cards radius 24px, gap 16px, dengan nested stats.

### SPESIFIKASI HOMEPAGE BARU — SECTION BY SECTION:

#### 1. NAV (64px height)
- Left: AN mark transparent akbar-an-mark-transparent.png 32px height, clear space 8px. No wordmark di mobile, wordmark optional di desktop dengan font Syne Bold 14px tracking -0.02em.
- Right: Links mono 11px uppercase tracking 0.2em: Music, Visuals, Artist, EPK. CTA pill Listen — Spotify verified https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw — bg #0087FF, white text, px 20 py 10, radius 999px.
- Border bottom 1px #2A2A38, backdrop-blur 12px bg #0A0A0E / 80%.
- Mobile: hamburger -> drawer full-screen black, focus trap, links display 32px.

#### 2. HERO — GABUNGAN REFERENSI 1 + 2 + 3
Layout: grid 12 cols, max-width 1280px, padding 96px desktop, 64px mobile.
- Col 1-7 (55%): 
  - Eyebrow mono 11px #A1A1B5 (7.8:1 contrast, bukan #6B6B80): BANDUNG BARAT • SINCE 2020
  - H1: AKBAR NAWASUNDA, font Syne Bold 700, size clamp(40px, 8vw, 96px), line-height 0.9, tracking -0.02em, color #FFFFFF. H1 harus overlap sedikit ke visual di desktop (margin-right -40px) seperti referensi 2 protect your data overlap blob.
  - Sub: Produser, remixer, DJ asal Bandung Barat. Breakbeat / Indo Bass. Font Inter Regular 16px, line-height 1.6, color #A1A1B5, max 45ch, margin-top 24px.
  - CTA row gap 16px: Primary Listen (blue) + Secondary Lihat Visuals (outline 1px #2A2A38, transparent, white text).
  - Stats row (dari referensi 2 + 3): 3 stats kecil mono 12px: +5 tahun aktif, +6 rilis verified, Bandung Barat. Jangan fake numbers, pakai verified saja. Layout seperti +1.5b +65k di referensi 2, posisi di bawah CTA, gap 32px.

- Col 8-12 (45%):
  - Portrait official: akbar-nawasunda-official-portrait-1200.webp 1200px, aspect 4:5, object-cover top, radius 24px, z-index 2, LCP priority, <picture> srcset 480/720/960 WebP + AVIF, preload AVIF.
  - Di belakang portrait, z-index 1: Liquid Signal — IMPLEMENTASI SVG FIRST (bukan canvas dulu untuk Phase 2 revisi):
    - Buat inline SVG 600x600 viewBox 0 0 600 600, absolute positioned, top -20px right -40px.
    - Di dalam SVG: <defs> dengan radialGradient id="signalBlue" #0087FF -> #8AE8FF, linearGradient id="signalPurple" #7800FF -> #8AE8FF.
    - Bentuk organic blob path, bukan circle. Path d: M 150 100 Q 250 50 350 100 T 500 200 Q 550 350 450 450 T 250 500 Q 100 400 100 250 T 150 100 — tweak agar seperti referensi 1.
    - Isi blob dengan pattern dot: <pattern id="dotPattern" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.5" fill="url(#signalBlue)" opacity="0.8"/></pattern> — dot size 1.5px - 3px varied via JS or multiple circles.
    - Stroke: 1px solid #2A2A38 dengan opacity 0.5, plus inner glow filter feGaussianBlur 4px.
    - Animasi: breathing scale 1 -> 1.03 6s easeOutCubic infinite, plus rotate 0 -> 3deg 20s. Disable jika prefers-reduced-motion.
    - Jika user minta WebGL nanti (Phase 7), ganti SVG ini dengan Three.js particle system dengan posisi dots yang sama.

- Background hero: #0A0A0E dengan noise 2% opacity. Noise bisa via SVG feTurbulence baseFrequency 0.9, atau PNG noise 256x256 tile. Jangan pakai gradient ungu-biru besar — itu AI look.

#### 3. PLATFORM LOGOS ROW — DARI REFERENSI 2
- Section di bawah hero, padding 32px vertical, border top/bottom 1px #2A2A38.
- Row flex gap 24px, overflow-x auto di mobile.
- 4 logos: Spotify, YouTube, SoundCloud, TikTok — pakai simple SVG icons monochrome #A1A1B5, hover #FFFFFF, size 20px + text platform mono 11px.
- Link ke URLs verified, target _blank rel noopener.

#### 4. GENRE TAPE — MINIMAL
- Horizontal scroll tape dengan text BREAKBEAT • INDO BASS • JEDAG JEDUG • JUNGLE DUTCH repeat, mono 11px #6A6A80, gap 24px, border top/bottom 1px #2A2A38. Jangan animasi marquee infinite — static atau slow scroll 60s linear.

#### 5. MUSIC BENTO GRID — DARI REFERENSI 3 KONAV
- Section header: label mono 11px uppercase OUR RELEASES + blue line 24px #0087FF, title H2 Sora Bold clamp(28px, 4vw, 48px) Rilisan Terbaru, divider 1px #2A2A38.
- Grid: 12 cols, gap 16px.
  - Featured card col-span 12 desktop, 16:9 aspect, bg #101014, radius 24px, border 1px #2A2A38, overflow hidden.
    - Left 60% cover (jika ada artwork dari public/assets/covers/masih-mencintainya-papinka-2025.webp), right 40% info: title, year, genre tag pill #1A1A22, description 2 lines, platform buttons.
    - Jika belum ada artwork: pakai AN ghost 10% opacity centered, bukan placeholder putih.
  - 5 cards kecil col-span 4 desktop (12/3), aspect 1:1, radius 24px, bg #101014, border 1px #2A2A38, padding 16px, title Sora 18px, year mono 12px #6A6A80, hover scale image 1.0->1.05 250ms easeOutCubic, overlay gradient bottom 60% black/80%.
  - Cards tidak identik: variasikan tinggi dengan nth-child(2) span 2 rows seperti bento referensi 3.

- Empty state: Jika artwork belum ada, jangan fake cover — biarkan AN ghost + title. Jangan pakai gradient AI.

#### 6. VISUALS PREVIEW — DARI REFERENSI 2 OUR BENEFITS
- 2x2 grid masonry, gap 16px, radius 24px.
- Top-left: portrait official, top-right: AN mark transparent di bg #101014, bottom-left: full lockup, bottom-right: Potret Neon detail.
- Lightbox on click, ESC close, aria-label.

#### 7. FOOTER — 3 COLS + BLUE STRIP
- Max-width 1280px, padding 64px vertical, bg #0A0A0E, border top 1px #2A2A38.
- Col 1: AN mark 48px + Akbar Nawasunda + Bandung Barat • Since 2020 mono 11px.
- Col 2: Nav links Music, Visuals, Artist, EPK.
- Col 3: Social links verified.
- Bottom: domain akbarnawasunda.my.id mono 11px + © 2026.
- Blue strip 5px height #0087FF full width di paling bawah.

### SVG REQUIREMENTS (JANGAN PNG UNTUK DECORATIVE):

- Liquid Signal: inline SVG seperti dijelaskan di hero, file src/components/SignalField.tsx return <svg>... dengan props size, variant. Buat 2 varian: dot matrix (referensi 1) dan iridescent outline (referensi 2).
- AN mark: pakai akbar-an-mark-transparent.png yang sudah ada, tapi buat juga versi SVG trace untuk crisp di retina: src/assets/an-mark.svg dengan path yang sama.
- Noise: SVG filter feTurbulence untuk background noise 2%.

### ANTI-AI CHECKLIST (WAJIB CEK SEBELUM DEPLOY):

- [ ] Tidak ada centered H1 96px + sub + 3 buttons + 6 cards identik tengah semua
- [ ] Tidak ada giant glowing sphere tanpa makna — Liquid Signal harus punya makna: flow Sunda + sinyal bass, dot matrix seperti referensi 1
- [ ] Tidak ada glassmorphism blur 20px putih di mana-mana — hanya thin outline 1px + inner glow subtle
- [ ] Tidak ada gradient ungu-biru full-screen background
- [ ] Tidak ada emoji, tidak ada lorem ipsum, tidak ada fake stats +1.5b (kecuali stats verified +5 tahun, +6 rilis)
- [ ] Typography tight -0.02em, bukan default system, mono untuk labels
- [ ] Portrait official jadi hero character, bukan robot atau ilustrasi AI
- [ ] Bento grid tidak simetris sempurna — ada featured besar + kecil variasi

### TECHNICAL:

- Next.js 16.4 App Router, CSS Modules (ikuti repo, bukan Tailwind docs lama)
- next/image untuk portrait dan covers, sizes prop, priority untuk LCP
- prefers-reduced-motion: disable scale, rotate, keep opacity
- JS initial <180kb gz, CSS <30kb (sudah 6.7KB), LCP <2.5s Moto G4
- npm run check harus hijau: assets, typecheck, lint, 78+ tests, build

### OUTPUT:

- Deploy ke preview URL yang sama https://3000-itgtebfif3vcbq3bw02cr.e2b.app
- Screenshot 390px, 768px, 1280px untuk homepage, /music, /music/[slug]
- Jangan sentuh main, push ke arena/e02160ef-akbar-nawasunda
- Tunggu approve Phase 2 revisi sebelum Phase 5
