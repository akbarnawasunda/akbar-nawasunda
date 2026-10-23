# Release covers

Drop 1:1 artwork here and it appears automatically — no code change, no Studio edit.

**Production note:** `next start`/Vercel serve `public/` as it was at build time, so a new cover file
needs the normal deploy (commit the file, let Vercel build). In local development with `next dev` it
is picked up immediately. Nothing else is required — the lookup is by file name only.

- File name **must** be the release slug: `cinta-terbuang.webp`
- Accepted: `.webp` (preferred), `.avif`, `.jpg`, `.jpeg`, `.png`
- Square, at least 600x600, under ~150 KB
- Until a file exists, the release renders as a **designed sleeve** built from its title, the AN mark
  at 10% and a 4px #0087FF → #7800FF rule. Never an empty card, never borrowed artwork.
- Automatic path: `npm run covers:fetch` pulls each release's artwork from Spotify's public oEmbed
  endpoint and writes `public/assets/covers/<slug>.webp` here. It needs a Spotify URL in the
  release's `links` (`src/content/releases.ts`); with no URL it reports the slug and skips it
  instead of guessing.

Slugs currently in use:

| Slug | Title |
|---|---|
| `masih-mencintainya-papinka` | Masih Mencintainya — Papinka |
| `cinta-terbuang` | Cinta Terbuang |
| `masih-dihatiku` | Masih Dihatiku |
| `bayang-tanpa-kata` | Bayang Tanpa Kata |
| `pada-imut-aisyah-tak-belagu` | Pada Imut Aisyah Tak Belagu |
| `hitungan-cinta-breakbeat-super-exc` | Hitungan Cinta Breakbeat Super Exc (era DJ Akbar Remix) |

The lookup order lives in `src/content/covers.ts`.
