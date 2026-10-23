# DECISION_LOG

| ID | Date | Decision | Why | Alternatives | Impact | Status |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-22 | Single evolving 3D scene Liquid Signal, not multiple scenes | Performance mobile, narrative continuity | Multiple scenes per section | Lower bundle, better FPS | PROPOSED, needs owner approval |
| D-002 | 2026-10-22 | Dark mode only v1, no light toggle | Brand identity akbarnawasunda.my.id is dark editorial | Light mode | Simpler tokens | PROPOSED |
| D-003 | 2026-10-22 | Content source v1 JSON local, not external CMS SaaS | Avoid paid service, owner-controlled, per prompt | Sanity, Contentful | Zero cost, easy backup | PROPOSED |
| D-004 | 2026-10-22 | Primary identity Akbar Nawasunda, DJ Akbar Remix as history | Medium bio + site positioning | Keep separate | Clear brand | VERIFIED + PROPOSED |
| D-005 | 2026-10-22 | Palette #0A0A0E / #101012 / #0087FF / #7800FF / #8AE8FF | From Potret Neon + AN logo, not neon green | Previous generic purple | Matches real assets | PROPOSED |

| D-006 | 2026-10-23 | Tahap eksekusi dimulai dari audit kode nyata, bukan setup ulang | Repo sudah berisi Next 16 + Studio CMS; menulis ulang akan menghapus kerja yang ada | Scaffold baru | Tidak ada regresi fitur | DONE |
| D-007 | 2026-10-23 | Token lama (`--color-ink-*`, `--color-bone-*`, `--color-signal`) dipetakan ke palet v3, bukan dihapus | Halaman Studio & halaman lama langsung ikut palet baru tanpa edit massal berisiko | Refactor semua modul CSS sekaligus | Perubahan visual terkontrol, sisa nama lama terdokumentasi | DONE |
| D-008 | 2026-10-23 | Label kecil memakai `--color-text-secondary` (#A1A1B5, 7.8:1), bukan `--color-text-muted` (#6B6B80, 3.8:1) | `text-muted` gagal WCAG AA untuk teks kecil; ACCESSIBILITY.md minta AA | Mengubah nilai token muted | Kontras AA tanpa menyimpang dari token | DONE |
| D-009 | 2026-10-23 | Aset web diturunkan ke `public/brand` & `public/media` via `scripts/build-web-assets.sh` | AVIF tidak bisa di-import Turbopack; `<picture>` butuh URL stabil; originals tidak boleh disentuh | Import statis dari `src/assets` | Byte yang dikirim bisa diprediksi & dites | DONE |
| D-010 | 2026-10-23 | Hanya satu `preload` (AVIF) untuk gambar hero; `<img>` tanpa `fetchPriority` | Dua preload (AVIF+WebP) membuat browser mengunduh dua file | Preload ganda / tanpa preload | LCP satu file, 27-146 KB sesuai viewport | DONE |
| D-011 | 2026-10-23 | Hero memakai `<picture>` + srcset manual (480/720/960), bukan optimizer Next | Budget LCP 150 KB bisa dijamin dan diverifikasi test | `next/image` + optimizer | Tidak bergantung pada sharp/optimizer saat deploy | DONE |
| D-012 | 2026-10-23 | Rilis tanpa tahun diverifikasi ditampilkan tanpa tahun ("Rilis"), bukan tahun tebakan | Larangan invent data (AGENTS §3) | Tebak tahun dari judul | Tidak ada klaim palsu; katalog tetap tampil | DONE |
| D-013 | 2026-10-23 | Stack mengikuti repo: Next.js 16 App Router + CSS Modules, bukan "Next 14 + Tailwind" | package.json & struktur nyata; migrasi framework bukan nilai tambah | Migrasi ke Tailwind / downgrade | Docs perlu dikoreksi (HANDOFF) | DONE (dokumen perlu update) |
| D-014 | 2026-10-23 | Nama env mengikuti kode: `DATABASE_URL` + `DATABASE_AUTH_TOKEN` (+`STUDIO_ADMIN_PASSWORD_HASH`), bukan `TURSO_*`/`AUTH_SECRET` | Kode & `.env.example` sudah konsisten; `libsql://` tetap Turso | Ganti nama env di kode | `.env` Vercel harus pakai nama ini | BUTUH KONFIRMASI OWNER |
| D-015 | 2026-10-23 | Sumber aset baru = `docs/05-CONTENT-AND-ASSETS/assets/`; `AKBAR-NAWASUNDA-ASSETS/` & manifest lama tidak diubah | Sesuai instruksi owner terbaru; manifest lama memuat aset brand lama | Menyatukan dua folder | Dua sumber aset hidup berdampingan | PROPOSED (konsolidasi Phase 9) |
| D-016 | 2026-10-23 | Nav hanya memuat route yang ada (`/music`, `/about`, `/contact`) | Link mati merusak kredibilitas & a11y | Tautkan `/visuals`, `/artist` yang belum ada | `/visuals` & `/artist` masuk Phase 5 | DONE |
| D-017 | 2026-10-23 | Opsi accent Studio: `signal #0087FF`, `icy #8AE8FF`, `bone #FFFFFF` (cobalt dihapus) | #4f8cff bukan warna brand; purple gagal kontras sebagai teks | Biarkan cobalt | Studio konsisten dengan brand | DONE |
| D-018 | 2026-10-23 | Rilis verified = 5 judul dari AGENTS.md; tahun/tautan kosong bila belum dikonfirmasi | AGENTS.md adalah entry point & lebih baru dari FACTS v1 | Hanya 1 rilis (FACTS v1) | Katalog punya isi tanpa mengarang data | BUTUH KONFIRMASI OWNER |
| D-019 | 2026-10-23 | Chrome + homepage berbahasa Indonesia (`lang="id"`); halaman lama dilokalkan Phase 5 | BRAND_VOICE menetapkan Bahasa Indonesia | Tetap Inggris | Sementara campuran bahasa di /about, /music, /contact | PROPOSED |
| D-020 | 2026-10-23 | Instagram, Apple Music, YouTube Music, email booking tidak dipasang | Belum verified (SOCIAL_LINKS_3) | Placeholder link | Tidak ada tombol rusak | DONE |
| D-021 | 2026-10-23 | On mobile potret tampil lebih dulu (maks 58vh), teks di bawahnya | DESIGN.md mobile: foto full width, teks di bawah; H1 tetap terlihat di layar pertama | Teks dulu, foto bawah | Perlu dicek owner di HP 390px | BUTUH REVIEW OWNER |
| D-022 | 2026-10-23 | `drizzle/` di-exclude dari `tsconfig`, file seed dibiarkan | Blocker build; Drizzle belum terpasang, schema belum ada | Hapus seed / pasang Drizzle sekarang | Build hijau; Phase 4 wajib menyelesaikan | DONE (sementara) |

Add new decisions as you go, never overwrite without new row.
