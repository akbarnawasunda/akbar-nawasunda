// drizzle/seed.ts — seed verified links + initial releases
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { links, releases } from "./schema"
import { nanoid } from "nanoid"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})
const db = drizzle(client)

async function main() {
  console.log("Seeding links...")
  await db.insert(links).values([
    { id: nanoid(), platform: "spotify", url: "https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw", verified: true },
    { id: nanoid(), platform: "youtube", url: "https://www.youtube.com/@akbarnawasunda", verified: true },
    { id: nanoid(), platform: "soundcloud", url: "https://soundcloud.com/akbarnawasunda", verified: true },
    { id: nanoid(), platform: "tiktok", url: "https://www.tiktok.com/@akbarnawasunda", verified: true },
    { id: nanoid(), platform: "website", url: "https://akbarnawasunda.my.id", verified: true },
  ]).onConflictDoNothing()

  console.log("Seeding sample release (verified snippet)...")
  await db.insert(releases).values([
    {
      id: nanoid(),
      slug: "masih-mencintainya-papinka-2025",
      title: "Masih Mencintainya - Papinka",
      year: 2025,
      genre: "Breakbeat",
      coverUrl: "/assets/covers/masih-mencintainya-placeholder.webp",
      description: "Rilis terbaru 2025 — [NEEDS OWNER: deskripsi]",
      spotifyUrl: "https://open.spotify.com/intl-id/artist/7KOQuIQLuxyklLox0RDMMw",
      youtubeUrl: "https://www.youtube.com/@akbarnawasunda",
      soundcloudUrl: "https://soundcloud.com/akbarnawasunda",
      status: "published",
      featured: true,
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    }
  ]).onConflictDoNothing()

  console.log("Seed done")
}

main()
