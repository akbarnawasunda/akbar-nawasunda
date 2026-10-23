# SITEMAP

## Public (v1)
- `/` Home
- `/music` Music index (grid all releases)
- `/music/[slug]` Release detail — e.g., /music/masih-mencintainya-papinka-2025
- `/visuals` Visual archive
- `/artist` Artist bio + timeline (DJ Akbar Remix → Akbar Nawasunda)
- `/epk` Electronic Press Kit
- `/privacy` Privacy (static)
- `/404` Custom not-found

## Studio (auth)
- `/studio` Dashboard (redirect to /studio/login if not auth)
- `/studio/login`
- `/studio/releases` list + create
- `/studio/releases/[id]` edit
- `/studio/visuals`
- `/studio/links`
- `/studio/settings`

## Routing Spec
- Slug = kebab-case title + year untuk uniqueness
- No /en v1 unless owner wants bilingual — decision log.
- Trailing slash: no
- Redirect: /music/:id old → new slug if renamed
