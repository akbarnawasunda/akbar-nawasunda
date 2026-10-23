# CONTENT_MODEL

## Release
- id: string ulid
- slug: string kebab-case + year unique
- title: string (e.g., Masih Mencintainya - Papinka)
- year: number 2020-2026
- genre: enum Breakbeat, Indo Bass, Jedag Jedug, Jungle Dutch, Other
- cover: image reference
- description: markdown optional
- platforms: { spotify?, youtubeMusic?, appleMusic?, soundcloud?, youtube?, tiktok? } url
- status: draft | published
- createdAt, publishedAt
- featured: boolean

## Visual
- id, title, image, category (portrait, artwork, logo), year, status

## ArtistProfile
- name, alias, location, since, shortBio, longBio, portrait, socialLinks

## Link
- platform, url, verified boolean

Validation: title required, slug unique, at least one platform url for published release.
