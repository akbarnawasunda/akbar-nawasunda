import type { Client } from "@libsql/client";

/**
 * Site photo slots — the bridge the owner asked for in round 26: "kosongkan aja untuk foto … nanti
 * hubungkan ke studio buat pengisian foto kosong itu".
 *
 * A slot is a named photograph position on the public site (the hero background, the night frame on
 * the home page, the empty stage on /artist). Each slot either carries an owner upload — stored in
 * the studio database, served through `/api/public/foto/<slot>` — or falls back: the repository
 * asset where one is verified, or an honestly empty frame where none is, so nothing on the site
 * ever pretends to be a photograph the owner did not supply.
 *
 * Photos live in the database, not in object storage, on purpose: the R2 bucket integration is
 * still unwritten (`src/studio/media/storage.ts`), and a base64 row in the studio's own Turso
 * database needs no new provider, no new secrets and no new liability — just a login.
 */

export interface PhotoSlot {
  id: string;
  /** Indonesian label for the Studio UI. */
  label: string;
  /** Where the slot sits on the public site. */
  place: string;
}

export const PHOTO_SLOTS: readonly PhotoSlot[] = [
  { id: "latar", label: "Latar hero", place: "Beranda, belakang nama" },
  { id: "malam", label: "Malam", place: "Beranda, band malam" },
  { id: "panggung", label: "Panggung", place: "/artist, band panggung" },
] as const;

export const PHOTO_SLOT_IDS = PHOTO_SLOTS.map((slot) => slot.id);

export function isPhotoSlot(value: string): boolean {
  return (PHOTO_SLOT_IDS as string[]).includes(value);
}

export interface PhotoRow {
  slot: string;
  dataBase64: string;
  mime: string;
  updatedAt: number;
}

export async function listPhotos(db: Client): Promise<PhotoRow[]> {
  const result = await db.execute("SELECT slot, data_base64, mime, updated_at FROM studio_photos ORDER BY slot");
  return result.rows.map((row) => ({
    slot: String(row.slot),
    dataBase64: String(row.data_base64),
    mime: String(row.mime),
    updatedAt: Number(row.updated_at),
  }));
}

export interface PhotoMeta {
  slot: string;
  mime: string;
  updatedAt: number;
}

/** Slot ids that carry an upload, without pulling any bytes — what the Studio list and the public
 *  resolver need. */
export async function listPhotoMeta(db: Client): Promise<PhotoMeta[]> {
  const result = await db.execute("SELECT slot, mime, updated_at FROM studio_photos ORDER BY slot");
  return result.rows.map((row) => ({
    slot: String(row.slot),
    mime: String(row.mime),
    updatedAt: Number(row.updated_at),
  }));
}

export async function readPhoto(db: Client, slot: string): Promise<PhotoRow | null> {
  const result = await db.execute({
    sql: "SELECT slot, data_base64, mime, updated_at FROM studio_photos WHERE slot = ?",
    args: [slot],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    slot: String(row.slot),
    dataBase64: String(row.data_base64),
    mime: String(row.mime),
    updatedAt: Number(row.updated_at),
  };
}

export async function savePhoto(db: Client, slot: string, dataBase64: string, mime: string): Promise<void> {
  await db.execute({
    sql: `INSERT INTO studio_photos (slot, data_base64, mime, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT(slot) DO UPDATE SET data_base64 = excluded.data_base64, mime = excluded.mime,
          updated_at = excluded.updated_at`,
    args: [slot, dataBase64, mime, Date.now()],
  });
}

/** The public URL a filled slot is served from. */
export function photoUrl(slot: string): string {
  return `/api/public/foto/${slot}`;
}

export async function deletePhoto(db: Client, slot: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM studio_photos WHERE slot = ?", args: [slot] });
}
