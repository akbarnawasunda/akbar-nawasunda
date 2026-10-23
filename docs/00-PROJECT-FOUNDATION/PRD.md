# PRD — Product Requirements Document

## 1. User Personas
- **Listener Casual (TikTok/YouTube):** Mau dengar lagu terbaru, cari link Spotify/YouTube. Device: Android mid.
- **Booker / Collaborator:** Butuh press kit, bio singkat, kontak, verified links.
- **Archivist / Core Fan:** Ingin timeline 2020→now, visual archive, evolution story.
- **Owner (Akbar):** Ingin edit homepage, rilis, visual tanpa coding.

## 2. Core Features (MUST)
- Homepage naratif: identity → hero 3D Liquid Signal → listen CTA → music grid → featured release → bio snippet → visual archive preview → closing.
- Music: list rilis dengan cover, tahun, platform links (Spotify, YT Music, Apple, SoundCloud). Detail page per rilis.
- Visuals: archive grid (Potret Neon session, artwork, logo).
- Artist: bio verified + alias explanation + location Bandung Barat.
- Studio/CMS: auth, CRUD rilis, upload artwork, manage links, draft/publish, preview.
- Responsive + reduced-motion + fallback.

## 3. SHOULD
- Timeline / journey (2020 DJ Akbar Remix → now)
- EPK page (bio short/long, press photos, logos pack)
- SEO structured data MusicGroup + MusicAlbum (only verified)

## 4. MAY (Phase 2)
- EN version routing /en/*
- Licensing info
- Live schedule (only if verified data ada)

## 5. User Stories (sample)
- Sebagai listener, saya ingin klik "Dengar Sekarang" di hero dan langsung ke Spotify terbaru dalam <1 klik.
- Sebagai owner, saya ingin upload cover 1:1 dan sistem otomatis generate responsive variants.
- Sebagai mobile user low-end, saya ingin site tetap kebaca meski 3D dimatikan.

## 6. Acceptance (high-level)
Detail di ACCEPTANCE_CRITERIA.md. Homepage must establish identity dalam 5 detik pertama.
