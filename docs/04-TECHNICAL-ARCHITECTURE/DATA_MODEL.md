> **STATUS (2026-10-23): superseded.** The implemented model is the document store in
> `drizzle/schema.ts` (`studio_pages` with draft/published JSON). See D-025. The sketch below is kept
> for history only — do not build new code against it.

# DATA_MODEL

```ts
type Release = {
  id: string // ulid
  slug: string // kebab + year
  title: string
  year: number
  genre: "Breakbeat" | "Indo Bass" | "Jedag Jedug" | "Jungle Dutch" | "Other"
  cover: string // /uploads/...
  description?: string // markdown
  platforms: {
    spotify?: string
    youtubeMusic?: string
    appleMusic?: string
    soundcloud?: string
    youtube?: string
    tiktok?: string
  }
  status: "draft" | "published"
  featured: boolean
  createdAt: string
  publishedAt?: string
}

type Visual = {
  id: string
  title: string
  image: string
  category: "portrait" | "artwork" | "logo" | "press"
  year?: number
  status: "draft" | "published"
}

type Link = { platform: string, url: string, verified: boolean }
```

Validation: title required, slug unique, at least one platform for published, cover mime whitelist, max 5MB.
