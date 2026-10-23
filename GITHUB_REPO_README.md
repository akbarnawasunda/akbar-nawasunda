# akbarnawasunda.my.id — Blueprint & Execution Docs

Repo ini adalah **single source of truth** untuk pembangunan website Akbar Nawasunda Official.

AI coding agent (Cursor, Claude Code, Codex, Windsurf) WAJIB baca `AGENTS.md` dulu. Prompt bootstrap lama sudah diarsipkan di
`docs/08-IMPLEMENTATION/prompts/archive/`.

## Struktur Rekomendasi (taruh di repo utama website lu)

```
/ (root repo akbarnawasunda.my.id)
├── AGENTS.md  <- entry point utama (Cursor, Windsurf baca ini)
├── CLAUDE.md  <- symlink/copy dari AGENTS.md buat Claude Code
├── HANDOFF_TO_CODING_AGENT.md <- instruksi eksekusi bertahap
├── README.md
├── docs/
│   ├── 00-PROJECT-FOUNDATION/
│   ├── 01-BRAND-IDENTITY/
│   ├── 02-DESIGN-SYSTEM/
│   ├── 03-USER-EXPERIENCE/
│   ├── 04-TECHNICAL-ARCHITECTURE/
│   ├── 05-CONTENT-AND-ASSETS/assets/ (AN transparent + portrait WebP)
│   ├── 06-STUDIO-CMS/
│   ├── 07-QUALITY-AND-TESTING/
│   └── 08-IMPLEMENTATION/ (DECISION_LOG, AUDIT_REPORT, ENV, DEPLOYMENT)
├── drizzle/
│   ├── schema.ts
│   └── seed.ts (seed Spotify, YT @akbarnawasunda, SoundCloud, TikTok)
└── public/
    └── assets/ (copy dari docs/assets buat production)
```

**Nama folder yang bagus di GitHub:**
- Kalau repo utama: pakai `/docs` aja (standar)
- Kalau repo terpisah khusus blueprint: namain `akbar-nawasunda-blueprint` atau `akbar-nawasunda-website-spec` atau `akbarnawasunda-docs`

Jangan namain `untuk pembuatan website gue` — terlalu generik, agent bingung. Pakai `akbar-nawasunda-blueprint` biar jelas.

## Cara Pakai untuk Agent Baru

1. Clone repo / buka di Cursor
2. Minta agent membaca `AGENTS.md` (prompt lama ada di `docs/08-IMPLEMENTATION/prompts/archive/`)
3. Agent akan baca AGENTS.md + semua MD + audit repo + mulai Phase 0 & 1
4. Agent kasih Vercel Preview URL Phase 2 homepage prototype — lu review di HP
5. Approve Phase 2 baru lanjut

## Stack Final
- Vercel + Turso + Next.js 14 + Drizzle + Tailwind + @react-three/fiber
- Social verified: Spotify, YouTube @akbarnawasunda, SoundCloud, TikTok
- Assets real: AN mark transparent + portrait official

## Rules
- Jangan push ke main tanpa approve prod
- Public API cuma published
- No fake stats
