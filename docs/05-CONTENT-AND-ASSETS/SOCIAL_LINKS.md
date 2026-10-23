# SOCIAL_LINKS

Sumber kebenaran: **`SOCIAL_LINKS_3.md`** (verified 2026-10-23). Jangan duplikasi URL di file lain —
kode membaca `src/config/socials.ts`.

## Dipasang di situs (verified)

| Platform | URL | Dipakai di |
|---|---|---|
| Spotify | https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw | CTA "Dengar Sekarang", header "Dengar", footer |
| YouTube | https://www.youtube.com/@akbarnawasunda | pita visual, footer |
| SoundCloud | https://soundcloud.com/akbarnawasunda | footer |
| TikTok | https://www.tiktok.com/@akbarnawasunda | footer |

## Belum dipasang (UNVERIFIED — jangan buat `<a>`)

| Platform | Alasan |
|---|---|
| Instagram | URL belum dikonfirmasi owner |
| Apple Music | belum dikonfirmasi |
| YouTube Music | kemungkinan sama dengan kanal YouTube, tapi butuh konfirmasi eksplisit |
| Email booking / WhatsApp | belum ada kontak resmi |

## Aturan

- Hanya URL verified yang boleh dirender; sisanya `[NEEDS OWNER]`.
- Semua tautan eksternal: `target="_blank"` + `rel="noopener noreferrer"`.
- TikTok untuk EPK, bukan sebagai platform rilis.
- Link Spotify per rilis belum ada → arahkan ke halaman artis (sudah diverifikasi).
