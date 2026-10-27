import { getReadyDb } from "@/studio/db";
import { isPhotoSlot, PHOTO_SLOT_IDS, readPhoto } from "@/studio/photos";

/**
 * Public reader for one studio-filled site photo slot.
 *
 * Published-only by construction: the row is the owner's own upload through the studio, and the
 * route serves exactly those bytes with the stored mime — no listing, no metadata, no auth. An
 * unknown slot is a 404, so the site's fallback (repository asset or empty frame) is what renders.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return PHOTO_SLOT_IDS.map((slot) => ({ slot }));
}

const ALLOWED_MIME = new Set(["image/webp", "image/png", "image/jpeg", "image/avif"]);

export async function GET(_request: Request, context: { params: Promise<{ slot: string }> }) {
  const { slot } = await context.params;
  if (!isPhotoSlot(slot)) {
    return new Response("slot tidak dikenal", { status: 404 });
  }
  try {
    const db = await getReadyDb();
    const row = await readPhoto(db, slot);
    if (!row || !ALLOWED_MIME.has(row.mime)) {
      return new Response("foto belum diisi", { status: 404 });
    }
    const bytes = Buffer.from(row.dataBase64, "base64");
    return new Response(bytes, {
      headers: {
        "Content-Type": row.mime,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch {
    return new Response("studio belum terhubung", { status: 404 });
  }
}
