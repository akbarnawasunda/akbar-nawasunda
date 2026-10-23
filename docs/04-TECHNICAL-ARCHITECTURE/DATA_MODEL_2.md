> **STATUS (2026-10-23): superseded by `drizzle/schema.ts`.** The tables below were an early
> proposal; the shipped Studio stores pages, design settings and releases as documents so that the
> "draft never leaks" rule lives in one place (D-025). Kept for history only.

# DATA_MODEL — Turso Drizzle Schema

```ts
// drizzle/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const releases = sqliteTable('releases', {
  id: text('id').primaryKey(), // ulid
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  year: integer('year').notNull(),
  genre: text('genre').notNull(),
  coverUrl: text('cover_url').notNull(), // Vercel Blob URL or /uploads/...
  description: text('description'),
  spotifyUrl: text('spotify_url'),
  youtubeUrl: text('youtube_url'),
  youtubeMusicUrl: text('youtube_music_url'),
  appleMusicUrl: text('apple_music_url'),
  soundcloudUrl: text('soundcloud_url'),
  tiktokUrl: text('tiktok_url'),
  status: text('status').notNull().default('draft'), // draft | published
  featured: integer('featured', {mode: 'boolean'}).default(false),
  createdAt: text('created_at').notNull(),
  publishedAt: text('published_at'),
})

export const visuals = sqliteTable('visuals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  category: text('category').notNull(), // portrait, artwork, logo, press
  year: integer('year'),
  status: text('status').notNull().default('published'),
})

export const links = sqliteTable('links', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull().unique(),
  url: text('url').notNull(),
  verified: integer('verified', {mode: 'boolean'}).default(false),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
})
```

Seed links with verified URLs from SOCIAL_LINKS.md.
