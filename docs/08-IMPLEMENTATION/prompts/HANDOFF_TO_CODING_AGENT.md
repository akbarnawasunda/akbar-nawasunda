# HANDOFF PROMPT — Copy-paste ini ke Coding Agent lu (Cursor, Claude Code, Windsurf, dll)

## Prompt untuk Agent Eksekusi (Paste langsung)

```
Kamu adalah AI coding agent untuk project akbarnawasunda.my.id.

MANDATORY READING ORDER — JANGAN SKIP:
1. Baca AGENTS.md dulu — ini pintu masuk + larangan.
2. Baca docs/00-PROJECT-FOUNDATION/PROJECT_CHARTER.md + PRD.md
3. Baca docs/01-BRAND-IDENTITY/BRAND_IDENTITY.md + FACTS_AND_VERIFICATION.md (v3) + docs/05-CONTENT-AND-ASSETS/ASSET_INVENTORY.md
4. Baca docs/02-DESIGN-SYSTEM/DESIGN.md + DESIGN_TOKENS.md + COLOR_SYSTEM.md + 3D_ART_DIRECTION.md
5. Baca docs/08-IMPLEMENTATION/DECISION_LOG.md (D-001 sampai D-012) + IMPLEMENTATION_ROADMAP.md + AUDIT_REPORT.md v3

STACK VERIFIED (jangan ganti tanpa approval):
- Hosting: Vercel
- DB: Turso libSQL (sudah dibuat owner)
- Framework: Next.js 14 App Router + Tailwind
- ORM: Drizzle ORM
- Storage: Vercel Blob (free tier) + fallback local dev
- Assets real: AN mark transparent akbar-an-mark-transparent.png + portrait official akbar-nawasunda-official-portrait.jpg (1122x1402) + compressed WebP 1200px

SOCIAL VERIFIED:
- Spotify https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw
- YouTube https://www.youtube.com/@akbarnawasunda
- SoundCloud https://soundcloud.com/akbarnawasunda
- TikTok https://www.tiktok.com/@akbarnawasunda
Jangan pakai URL Apple Music / Instagram yang belum verified — biarkan placeholder.

ATURAN KERAS:
- Jangan invent rilis, stats, press, booking info. Hanya pakai verified di FACTS_AND_VERIFICATION.md
- Jangan pakai JPG logo background putih di dark mode — pakai transparent PNG dari docs/05-CONTENT-AND-ASSETS/assets/
- Portrait original 1346KB WAJIB kompres jadi WebP ~140KB sebelum production (sudah ada versi 1200px 295KB di assets, kompres lagi ke ~150KB)
- Single 3D scene Liquid Signal saja, bukan multiple scenes. Fallback static jika WebGL fail. Mobile <768px default disabled.
- Public API /api/public/* MUST hanya return published, draft tidak boleh bocor.
- Jangan push ke production branch main tanpa approval owner. Kerja di branch feat/* dan pakai Vercel Preview.
- Setiap task cek ACCEPTANCE_CRITERIA.md dan bukti screenshot 390, 768, 1280

IMPLEMENTASI BERTAHAP (jangan build semua sekaligus):
Phase 0 — Audit repo existing (cek package.json, apakah sudah Next.js? Jika belum, setup minimal Next.js 14 + Tailwind + Turso client)
Phase 1 — Foundations: tokens, layout, nav dengan AN transparent 32px, footer blue 5px strip, max-width 1280, dark mode only
Phase 2 — HOMEPAGE PROTOTYPE STATIS (INI WAJIB REVIEW OWNER DI HP DULU): Hero dengan H1 AKBAR NAWASUNDA + sub Bandung Barat Since 2020 + CTA Dengar Sekarang -> Spotify verified + portrait official WebP sebagai LCP + placeholder 3D canvas di belakang portrait (z -1). Jangan lanjut Phase 3 sebelum owner approve prototype di Vercel Preview.
Phase 3 — Components: ReleaseCard, SectionHeader, etc.
Phase 4 — Music + Release detail pages dengan Turso Drizzle (seed links verified)
Phase 5 — Visuals, Artist, EPK, 404
Phase 6 — Studio CMS /studio/login + CRUD releases (auth bcrypt, httpOnly cookie, Turso)
Phase 7 — 3D Liquid Signal real implementation + fallback + perf measurement
Phase 8 — QA: Lighthouse, axe, security (upload invalid, draft leak test)
Phase 9 — Preview deploy
Phase 10 — Prod after explicit owner approval

SETUP ENV (Vercel + Turso):
- TURSO_DATABASE_URL=libsql://...
- TURSO_AUTH_TOKEN=...
- AUTH_SECRET=random-32-chars
- BLOB_READ_WRITE_TOKEN=...
- Lihat docs/08-IMPLEMENTATION/ENVIRONMENT_VARIABLES.md dan DEPLOYMENT_RUNBOOK.md

Mulai sekarang dengan Phase 0 + Phase 1, lalu minta approval sebelum Phase 2 prototype. Tampilkan file yang kamu ubah dan screenshot preview.

Jika ada konflik antar dokumen, jangan pilih random — catat di DECISION_LOG.md dengan Issue ID dan tanya owner jika Critical/High.
```

## Cara Eksekusi di Cursor / VS Code AI

### 1. Push docs ke repo
```bash
# di repo akbarnawasunda.my.id lu
git checkout -b docs/foundation-v3
cp -r /path/to/akbar-nawasunda/docs ./docs
cp /path/to/akbar-nawasunda/AGENTS.md ./AGENTS.md
cp /path/to/akbar-nawasunda/README.md ./README.md
git add AGENTS.md README.md docs/
git commit -m "docs: foundation v3 Vercel+Turso+verified assets + social"
git push origin docs/foundation-v3
```

### 2. Setup Turso + Vercel (sekali)
```bash
# install turso CLI
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db show akbar-nawasunda --url
turso db tokens create akbar-nawasunda

# copy URL + token ke Vercel
# Vercel Dashboard > Project > Settings > Environment Variables
# Tambah TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET

# di local
npm install
npm run db:generate # drizzle-kit generate
npm run db:migrate # push schema ke Turso
npm run db:seed # seed links verified (Spotify, YT, SoundCloud, TikTok)
```

### 3. Kasih prompt ke Agent
- Buka Cursor Composer (Ctrl+I) atau Claude Code
- Paste prompt di atas (HANDOFF PROMPT)
- Agent akan baca AGENTS.md dulu, lalu mulai Phase 0 audit

### 4. Approval Gate WAJIB
- Setelah Phase 1 + Phase 2 homepage prototype jadi, agent harus kasih Vercel Preview URL
- Lu cek di HP real Android: apakah H1 kelihatan 5 detik? CTA Spotify jalan? Portrait tidak pecah? AN mark tidak blur?
- Kalau oke, bilang "approve Phase 2, lanjut Phase 3"
- Jangan biarkan agent langsung build semua page + CMS + 3D sekaligus — itu yang bikin hasil generik

### 5. Safety
- Agent dilarang merge ke main tanpa lu bilang "approve prod"
- Semua upload harus validasi mime whitelist jpeg/png/webp, max 5MB, cek magic bytes
- Public API tidak boleh return draft — test: curl https://preview-url/api/public/releases harus cuma published

## Checklist buat Lu Sebelum Kasih ke Agent
- [ ] Docs v3 sudah di branch docs/foundation-v3
- [ ] Turso DB sudah ada + URL + token di Vercel env
- [ ] Portrait compressed WebP sudah di public/assets (atau pakai yang di docs/assets)
- [ ] AN transparent PNG sudah di public/assets
- [ ] Spotify, YT, SoundCloud, TikTok URLs sudah di seed

Kalau mau, gue bisa bikinin langsung file seed SQL + drizzle schema siap copy-paste.
