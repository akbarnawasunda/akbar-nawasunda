# PROMPT AWAL UNTUK AI AGENT — COPY-PASTE INI PAS PERTAMA KALI

> Lu lagi di repo akbarnawasunda.my.id. Semua blueprint website ada di repo ini.

## TUGAS PERTAMA KALI (READ EVERYTHING):

1.  **WAJIB BACA AGENTS.md DULU** di root — itu entry point + aturan keras. Jangan skip.
2.  Lalu baca urutan ini:
    - docs/00-PROJECT-FOUNDATION/PROJECT_CHARTER.md + PRD.md + SUCCESS_CRITERIA.md
    - docs/01-BRAND-IDENTITY/BRAND_IDENTITY.md + FACTS_AND_VERIFICATION.md (v3 FINAL dengan Vercel+Turso+Social verified) + docs/05-CONTENT-AND-ASSETS/ASSET_INVENTORY.md
    - docs/02-DESIGN-SYSTEM/DESIGN.md + DESIGN_TOKENS.md + COLOR_SYSTEM.md + 3D_ART_DIRECTION.md + COMPONENT_DESIGN.md
    - docs/08-IMPLEMENTATION/DECISION_LOG.md (D-001 sampai D-012) + AUDIT_REPORT.md v3 + IMPLEMENTATION_ROADMAP.md
    - HANDOFF_TO_CODING_AGENT.md + docs/08-IMPLEMENTATION/ENVIRONMENT_VARIABLES.md + DEPLOYMENT_RUNBOOK.md
3.  Cek aset real di docs/05-CONTENT-AND-ASSETS/assets/:
    - akbar-an-mark-transparent.png (AN tajam transparan buat nav/favicon)
    - akbar-nawasunda-official-portrait-1200.webp (portrait compressed buat LCP)
    - akbar-nawasunda-full-transparent.png (full lockup buat footer/EPK)

## STACK YANG UDAH VERIFIED (JANGAN GANTI TANPA APPROVAL OWNER):

- Hosting: Vercel (owner confirmed)
- DB: Turso libSQL + Drizzle ORM (owner udah bikin DB)
- Spotify: https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw VERIFIED
- YouTube: https://www.youtube.com/@akbarnawasunda VERIFIED
- SoundCloud: https://soundcloud.com/akbarnawasunda VERIFIED
- TikTok: https://www.tiktok.com/@akbarnawasunda VERIFIED
- Domain: akbarnawasunda.my.id
- Portrait: studio gelap purple rim, jaket AN
- AN mark: hitam double-A dengan ujung biru #0087FF + white stroke 1px

## LARANGAN KERAS (kalau dilanggar, stop):

- Jangan invent rilis, listener count, press, booking email. Hanya pakai yang ada di FACTS_AND_VERIFICATION.md VERIFIED. Sisanya tulis [NEEDS OWNER]
- Jangan pakai JPG logo background putih di dark mode — pakai PNG transparan
- Portrait 1346KB wajib kompres WebP ~150KB sebelum prod
- Public API /api/public/* HANYA return published, draft tidak boleh bocor (cek via curl)
- Jangan push ke main branch tanpa bilang "approve prod" dari owner
- Jangan buat newsletter/tracking tanpa Privacy page

## CARA KERJA BERTAHAP (WAJIB IKUTI, JANGAN BUILD SEMUA SEKALIGUS):

Phase 0: Audit repo ini — cek package.json, apakah sudah Next.js 14 App Router? Cek env Turso ada? List file yang ada vs yang dibutuhkan.

Phase 1: Foundations — setup tokens dari DESIGN_TOKENS.md + COLOR_SYSTEM.md final (bg #0A0A0E, surface #101014, blue #0087FF, purple #7800FF, icy #8AE8FF), layout grid 12 col max 1280, nav 64px dengan AN transparent 32px, footer blue 5px strip.

Phase 2: HOMEPAGE PROTOTYPE STATIS — INI PALING PENTING, WAJIB REVIEW OWNER DI HP:
- Buat app/(public)/page.tsx statis dulu (tanpa CMS)
- Hero: kiri H1 AKBAR NAWASUNDA tight -0.02em + sub Produser, remixer, DJ asal Bandung Barat • Since 2020 mono + CTA Dengar Sekarang (blue pill) link ke Spotify verified + CTA secondary Lihat Visuals
- Kanan: portrait official WebP 1200px sebagai LCP (priority, preload), di belakangnya canvas 3D placeholder 600x600 z-index -1 (Liquid Signal breathing scale 1→1.03 6s)
- Section Music: 6 card placeholder 1:1
- Footer minimal
- Deploy ke Vercel Preview, kasih URL ke owner, tunggu owner bilang "approve Phase 2" sebelum lanjut. Jangan lanjut Phase 3 kalau belum di-approve.

Phase 3: Components (ReleaseCard, SectionHeader, etc.)
Phase 4: Music + Release detail dengan Turso Drizzle (seed links verified via drizzle/seed.ts)
Phase 5: Visuals, Artist, EPK, 404
Phase 6: Studio CMS /studio/login + CRUD (bcrypt, httpOnly cookie)
Phase 7: 3D Liquid Signal real + fallback
Phase 8: QA (Lighthouse, axe, security)
Phase 9: Preview deploy full
Phase 10: Prod after explicit owner approval

## SETELAH BACA SEMUA, LAKUKAN INI SEKARANG:

1. Tampilkan ringkasan 5 baris: apa yang lu pahami tentang brand Akbar Nawasunda, stack, dan task Phase 0+1
2. Audit repo: list file yang ada, stack yang terdeteksi, env vars yang ada / belum
3. Buat task list Phase 0 + Phase 1 dengan checklist
4. Mulai kerjakan Phase 0 + Phase 1, commit ke branch feat/foundation-v3
5. Minta approval sebelum Phase 2 prototype

Jika ada konflik antar dokumen, catat di DECISION_LOG.md dengan Issue ID, jangan pilih random. Tanya owner kalau Critical/High.

JANGAN MULAI CODING SEBELUM BACA AGENTS.md + FACTS_AND_VERIFICATION.md + DESIGN.md + 3D_ART_DIRECTION.md + DECISION_LOG.md
