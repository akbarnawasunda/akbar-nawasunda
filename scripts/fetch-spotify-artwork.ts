/**
 * Level 2 of the cover waterfall: pull each release's artwork from Spotify's public oEmbed endpoint.
 *
 *   npm run covers:fetch          # fills in covers that are missing
 *   npm run covers:fetch -- --force   # re-downloads everything
 *
 * Why a script and not a runtime fetch: the site must never call a third party while rendering a
 * page. This writes `public/assets/covers/<slug>.webp`, which is exactly the level-1 manual path the
 * rest of the site already reads (src/content/covers.ts). If no file is produced, the release keeps
 * its designed Level-3 sleeve instead of an empty card.
 *
 * Needs a Spotify URL per release. Today `src/content/releases.ts` has none — the titles are verified
 * but the per-release links are still `[NEEDS OWNER]`, so this script reports what it could not do
 * rather than inventing URLs.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { releases } from "../src/content/releases";

const force = process.argv.includes("--force");
const publicDir = join(process.cwd(), "public", "assets", "covers");
const SIZE = 1000;

function spotifyUrl(links: readonly { label: string; href: string }[]): string | null {
  const match = links.find(
    (link) => link.href.includes("open.spotify.com") || /spotify/i.test(link.label),
  );
  return match?.href ?? null;
}

interface OEmbed {
  thumbnail_url?: string;
}

async function fetchArtwork(slug: string, url: string) {
  const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`oEmbed ${response.status} for ${url}`);

  const data = (await response.json()) as OEmbed;
  if (!data.thumbnail_url) throw new Error("oEmbed response had no thumbnail_url");

  const image = await fetch(data.thumbnail_url);
  if (!image.ok) throw new Error(`thumbnail ${image.status}`);

  const bytes = Buffer.from(await image.arrayBuffer());
  const webp = await sharp(bytes)
    .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
    .webp({ quality: 90 })
    .toBuffer();

  writeFileSync(join(publicDir, `${slug}.webp`), webp);
  return webp.byteLength;
}

async function main() {
  mkdirSync(publicDir, { recursive: true });

  let filled = 0;
  const pending: string[] = [];
  const failed: string[] = [];

  for (const release of releases) {
    const target = join(publicDir, `${release.slug}.webp`);
    if (existsSync(target) && !force) {
      console.log(`skip   ${release.slug} (already has artwork; use --force to replace)`);
      continue;
    }

    const url = spotifyUrl(release.links);
    if (!url) {
      pending.push(release.slug);
      continue;
    }

    try {
      const bytes = await fetchArtwork(release.slug, url);
      filled += 1;
      console.log(`saved  ${release.slug}.webp (${Math.round(bytes / 1024)} KB)`);
    } catch (error) {
      failed.push(`${release.slug}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n${filled} artwork(s) written to public/assets/covers/`);
  if (pending.length > 0) {
    console.log(`${pending.length} release(s) have no Spotify URL yet [NEEDS OWNER]:`);
    for (const slug of pending) console.log(`  - ${slug}`);
    console.log("Add the link to `links` in src/content/releases.ts, then run this again.");
  }
  if (failed.length > 0) {
    console.log(`${failed.length} download(s) failed:`);
    for (const line of failed) console.log(`  - ${line}`);
    process.exitCode = 1;
  }
}

// tsx emits CJS here, so the entry point is a plain call rather than top-level await.
void main();
