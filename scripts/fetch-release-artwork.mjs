#!/usr/bin/env node
/**
 * Level 2 of the cover waterfall, from **the links the owner already published**.
 *
 *   node scripts/fetch-release-artwork.mjs             # fetch what is missing
 *   node scripts/fetch-release-artwork.mjs --force     # re-fetch everything
 *   node scripts/fetch-release-artwork.mjs --dry-run   # print the plan, touch the network not once
 *
 * Every platform in the catalogue exposes a public, key-less endpoint that returns artwork for a
 * track URL: Apple through `itunes.apple.com/lookup`, SoundCloud/Spotify/YouTube through oEmbed.
 * This script resolves those, downloads the image, crops it to 800×800, and writes
 * `public/assets/covers/<slug>.webp` — the exact slot `src/content/covers.ts` already reads. The site
 * never calls a third party while rendering.
 *
 * Replaces `fetch-spotify-artwork.ts`, which only understood Spotify URLs and reported "no links" —
 * while six of the ten releases do have Apple Music or SoundCloud links.
 *
 * Network is required. In this sandbox every external host is ECONNRESET, so the interesting run
 * happens on the owner's machine or in `.github/workflows/covers.yml` (which has network and can open
 * a PR with the files).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { releases } from "../src/content/releases.ts";
import { artworkSource, upgradeAppleArtwork } from "../src/lib/artwork-source.ts";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const outDir = join(process.cwd(), "public", "assets", "covers");
const SIZE = 800;
const MAX_BYTES = 150 * 1024;

/** Providers get unhappy with a burst of requests from one IP; two at a time is polite and enough. */
const CONCURRENCY = 2;

async function json(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "akbarnawasunda.my.id artwork fetcher (https://akbarnawasunda.my.id)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}

async function artworkUrl(source) {
  const data = await json(source.endpoint);

  if (source.provider === "apple") {
    const entry = (data.resultCount ? data.results[0] : null) ?? data.results?.find((r) => r.artworkUrl100);
    if (!entry?.artworkUrl100) throw new Error("iTunes lookup returned no artworkUrl100");
    return upgradeAppleArtwork(entry.artworkUrl100, 1400);
  }

  if (!data.thumbnail_url) throw new Error("oEmbed response had no thumbnail_url");
  return data.thumbnail_url;
}

async function download(url, slug) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`artwork HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());

  const source = sharp(bytes).resize(SIZE, SIZE, { fit: "cover", position: "centre" });
  let webp = await source.clone().webp({ quality: 86 }).toBuffer();
  for (const quality of [78, 70, 62]) {
    if (webp.byteLength <= MAX_BYTES) break;
    webp = await source.clone().webp({ quality }).toBuffer();
  }

  writeFileSync(join(outDir, `${slug}.webp`), webp);
  return webp.byteLength;
}

async function run() {
  mkdirSync(outDir, { recursive: true });

  const plan = releases.map((release) => {
    const source = artworkSource(release.links);
    const target = join(outDir, `${release.slug}.webp`);
    const exists = existsSync(target);
    return { release, source, target, exists };
  });

  const work = plan.filter((item) => item.source && (force || !item.exists));
  const skipped = plan.filter((item) => !work.includes(item));

  for (const item of skipped) {
    const why = !item.source
      ? item.release.links.length === 0
        ? "no links in the catalogue"
        : `no supported provider among its links (${item.release.links.map((l) => l.label).join(", ")})`
      : "artwork already on disk (use --force)";
    console.log(`skip   ${item.release.slug} — ${why}`);
  }

  if (dryRun) {
    for (const item of work) {
      console.log(`plan   ${item.release.slug} ← ${item.source.provider} ${item.source.endpoint}`);
    }
    console.log(`\n${work.length} would be fetched, ${skipped.length} skipped. --dry-run: no requests made.`);
    return 0;
  }

  if (work.length === 0) {
    console.log("\nnothing to fetch.");
    return 0;
  }

  let ok = 0;
  const failed = [];

  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const batch = work.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ release, source }) => {
        try {
          const url = await artworkUrl(source);
          const bytes = await download(url, release.slug);
          ok += 1;
          console.log(`ok     ${release.slug}.webp ${Math.round(bytes / 1024)} KB ← ${source.provider}`);
        } catch (error) {
          failed.push({ slug: release.slug, reason: error instanceof Error ? error.message : String(error) });
        }
      }),
    );
  }

  for (const failure of failed) console.log(`fail   ${failure.slug} — ${failure.reason}`);
  console.log(`\n${ok} cover(s) written to public/assets/covers/, ${failed.length} failed, ${skipped.length} skipped.`);

  // A partial failure is normal (one platform rate-limits, one track was pulled). Failing the whole
  // run would make the GitHub Action red for something the owner cannot see. Only "everything broke"
  // is worth a non-zero exit, and even then the sleeves still cover the page.
  return ok === 0 && failed.length > 0 ? 1 : 0;
}

process.exitCode = await run();
