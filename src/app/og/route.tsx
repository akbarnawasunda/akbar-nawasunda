import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { coverArtwork } from "@/content/covers";
import { releaseDisplayTitle, releases } from "@/content/releases";

/**
 * Social card, generated at request time.
 *
 * Why this exists: before it, all sixteen pages — including all ten release pages — shipped the
 * same 1000×1000 image with `twitter:card=summary`. Ten tracks shared one preview, so a link to
 * "Lali Dalane" and a link to "Kamu Nanyeak" looked identical in WhatsApp, X and Facebook. For an
 * artist whose entire distribution is shared links, that is the most expensive square metre of the
 * site.
 *
 * Two deliberate constraints:
 *
 * 1. **No free-form text in the query string.** The only input is `slug`, which is looked up in the
 *    catalogue; anything else falls back to the brand card. An endpoint that renders arbitrary
 *    strings into an image is an invitation to abuse and a CPU bill.
 * 2. **Nothing is invented.** The card prints the release title, its year and its type — the same
 *    fields the page prints, from the same module. A release with no year prints no year.
 */
export const runtime = "nodejs";

/** 1200×630 is the size WhatsApp/X/Facebook crop to; `summary_large_image` expects this ratio. */
const WIDTH = 1200;
const HEIGHT = 630;

const BLUE = "#2E8C86";
const INK = "#0A0A0E";
const PAPER = "#E8E6E1";
const SECONDARY = "#A1A1B5";
/*
 * Langkah 3k → 3p — the fallback monogram's colour.
 *
 * Three values, three failures, in order:
 *
 *   `#1A2430`  1.26:1  a value from nowhere; the card's right half looked empty because it was.
 *   `#8f8f8f`  6.11:1  `--color-text-muted`: legible, and rejected by the owner — at 300 px it read
 *                      as a second headline competing with the release title.
 *   `#4A4A4A`  2.23:1  `--color-border-strong`: a ghost again, but under the 3.0:1 floor for a
 *                      large graphic, so it failed the WCAG check it was supposed to satisfy.
 *
 * The floor and the ceiling sit 4 px apart in grey, so the value is not chosen by taste: it is the
 * darkest neutral that clears the floor with margin while staying far below the rejected ceiling.
 *
 *   `#666666`  3.44:1  +15% over the 3.0:1 floor, −44% under the rejected 6.11:1.
 *
 * Verified on the rendered card, not on this arithmetic: the PNG's monogram pixels measure
 * `rgb(102,102,102)` against `rgb(10,10,14)` at 1440-family render size, i.e. the ratio above is
 * what actually ships (see `artifacts/visual-check/3p/`).
 */
const MARK = "#666666";

const PUBLIC = join(process.cwd(), "public");

/**
 * Everything is read off disk and handed to satori as bytes.
 *
 * The obvious alternative — `fetch(new URL(path, origin))` — fails twice over: Next's ImageResponse
 * refuses to load images from a loopback address ("blocked address (SSRF protection)"), so the card
 * 500s in local development, and a self-fetch would also mean the card cannot be generated while the
 * deployment is cold. `outputFileTracingIncludes` in next.config.ts is what keeps these files inside
 * the serverless bundle.
 */
async function readAsset(path: string): Promise<Buffer | null> {
  try {
    return await readFile(join(PUBLIC, path));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  const release = slug ? releases.find((candidate) => candidate.slug === slug) : undefined;

  const fontBytes = await readAsset("fonts/anton-og.ttf");
  if (!fontBytes) return new Response("OG font missing", { status: 500 });
  const font = new Uint8Array(fontBytes).buffer;

  const title = release ? releaseDisplayTitle(release) : "Akbar Nawasunda";
  const meta = release
    ? [release.type, release.year].filter(Boolean).join(" · ")
    : "Produser · Remixer · DJ";

  /**
   * The card uses the site's display face, Anton, in caps (R13). Anton is condensed, so the same box
   * holds far more title than the serif did: a 30-character release name still sets in two lines at
   * 96. Satori needs a real TTF — `public/fonts/anton-og.ttf` is the OFL file, not a subset.
   */
  const titleSize = title.length > 30 ? 88 : title.length > 18 ? 104 : 124;

  const artwork = release ? coverArtwork(release.slug) : null;
  // A data URI, not a URL: satori accepts both, but only one survives the SSRF guard and a cold CDN.
  /**
   * Only *real* artwork is shown. A generated sleeve (kind "sleeve") already prints the release title
   * in the display face — putting it beside the card's own headline printed the same words twice, four centimetres
   * apart. The sleeve is typography this card can reproduce itself, so a sleeve release gets the
   * large title and the AN mark instead.
   */
  const rawCover = artwork?.kind === "image" ? await readAsset(artwork.src) : null;
  /**
   * Satori (the renderer behind ImageResponse) only decodes PNG and JPEG. Our sleeves and the
   * owner's artwork are WebP, which satori accepts without error and then draws as an empty box —
   * the first render of this card had a black rectangle where the sleeve should be. sharp converts
   * to PNG at 470px, which is the size the card actually paints.
   */
  const coverUrl = rawCover
    ? `data:image/png;base64,${(
        await sharp(rawCover).resize(470, 470, { fit: "cover" }).png().toBuffer()
      ).toString("base64")}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: INK,
          color: PAPER,
          fontFamily: "Anton",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "64px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 14, height: 14, background: BLUE }} />
            <div style={{ fontSize: 24, letterSpacing: 8, color: SECONDARY }}>AKBAR NAWASUNDA</div>
          </div>

          {/*
            No slab behind the title any more (D-108): on the card it read as a stray rectangle that
            only lined up on two-line titles, and the site it links to no longer uses it either.
          */}
          <div style={{ display: "flex", flexDirection: "column", gap: 30, position: "relative" }}>
            <div
              style={{
                fontSize: titleSize,
                /* 0.92 measured wrong on the card: satori lays the caps ink outside a sub-1 line box,
                   so the meta line collided with the last baseline. 1.0 keeps the block exact. */
                lineHeight: 1,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                maxWidth: 660,
                display: "flex",
                position: "relative",
              }}
            >
              {title}
            </div>
            {meta ? (
              <div style={{ fontSize: 26, letterSpacing: 4, color: SECONDARY }}>{meta.toUpperCase()}</div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 120, height: 4, background: BLUE }} />
            <div style={{ fontSize: 22, letterSpacing: 4, color: SECONDARY }}>AKBARNAWASUNDA.MY.ID</div>
          </div>
        </div>

        {coverUrl ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 630,
              paddingRight: 64,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- satori renders this, not a browser */}
            <img
              src={coverUrl}
              alt=""
              width={470}
              height={470}
              style={{ objectFit: "cover", border: "1px solid #2A2A38" }}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 560,
              paddingRight: 80,
            }}
          >
            {/* The mark as type, not as a raster: the card must stay sharp at any size. */}
            <div style={{ fontSize: 300, letterSpacing: -24, color: MARK, lineHeight: 1 }}>AN</div>
          </div>
        )}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: "Anton", data: font, weight: 400, style: "normal" }],
      headers: {
        // Cards change only when the catalogue does; let the CDN hold them for a day.
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
