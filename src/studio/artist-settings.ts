/**
 * Global artist settings: display name, role line, and social links. Plain module, no "server-only",
 * so the rules can be unit tested. Values are never invented here: every default is blank, and an
 * empty field means "keep the current site wording".
 *
 * Social links are entered one per line as "Label | https://address" and go through the same https
 * rules as release links (parseLinks), so javascript:, http:, and credentials in URLs are rejected.
 */
import { parseLinks, type ValidationResult } from "./validation";
import type { ReleaseLinkDoc } from "./releases";

export const ARTIST_LIMITS = {
  artistName: 80,
  role: 120,
  socialLinks: 12,
  linkLabel: 40,
} as const;

export interface ArtistSettings {
  artistName: string;
  role: string;
  socialLinks: ReleaseLinkDoc[];
}

export const DEFAULT_ARTIST_SETTINGS: ArtistSettings = { artistName: "", role: "", socialLinks: [] };

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function plainText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > max || CONTROL_CHARACTERS.test(trimmed)) return null;
  return trimmed;
}

/** Parses the stored JSON. Returns null when the stored value does not match the rules. */
export function parseArtistSettings(raw: unknown): ArtistSettings | null {
  if (typeof raw !== "string") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const artistName = plainText(record.artistName ?? "", ARTIST_LIMITS.artistName);
  const role = plainText(record.role ?? "", ARTIST_LIMITS.role);
  if (artistName === null || role === null || !Array.isArray(record.socialLinks)) return null;
  const links = parseLinks(JSON.stringify(record.socialLinks));
  if (typeof links === "string") return null;
  return { artistName, role, socialLinks: links };
}

/**
 * Parses the "Label | https://..." lines. Blank lines are ignored. Returns the links or an error
 * message for the first problem found.
 */
export function parseSocialLinkLines(text: string): ReleaseLinkDoc[] | string {
  const items: Array<{ label: string; href: string }> = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (line.length === 0) continue;
    const bar = line.indexOf("|");
    if (bar < 0) return `Line ${i + 1}: use the form "Label | https://address".`;
    const label = line.slice(0, bar).trim();
    const href = line.slice(bar + 1).trim();
    if (label.length === 0) return `Line ${i + 1}: add a label before the |.`;
    if (label.length > ARTIST_LIMITS.linkLabel) return `Line ${i + 1}: keep the label under ${ARTIST_LIMITS.linkLabel} characters.`;
    if (CONTROL_CHARACTERS.test(label)) return `Line ${i + 1}: remove hidden control characters.`;
    items.push({ label, href });
    if (items.length > ARTIST_LIMITS.socialLinks) return `Keep to ${ARTIST_LIMITS.socialLinks} social links or fewer.`;
  }
  // parseLinks enforces the https rules and returns a message string on the first failing row.
  const parsed = parseLinks(JSON.stringify(items));
  if (typeof parsed === "string") return parsed.replace(/^Link (\d+)/, "Line $1");
  return parsed;
}

/** Validates the settings form. Empty name and role are allowed; they fall back to the site wording. */
export function validateArtistSettings(input: Record<string, unknown>): ValidationResult<ArtistSettings> {
  const errors: Record<string, string> = {};
  const artistName = plainText(input.artistName ?? "", ARTIST_LIMITS.artistName);
  const role = plainText(input.role ?? "", ARTIST_LIMITS.role);
  if (artistName === null) errors.artistName = `Keep the name under ${ARTIST_LIMITS.artistName} characters, without hidden characters.`;
  if (role === null) errors.role = `Keep the role line under ${ARTIST_LIMITS.role} characters, without hidden characters.`;

  const links = parseSocialLinkLines(typeof input.socialLinks === "string" ? input.socialLinks : "");
  if (typeof links === "string") errors.socialLinks = links;

  if (Object.keys(errors).length > 0 || artistName === null || role === null || typeof links === "string") {
    return { ok: false, errors };
  }
  return { ok: true, value: { artistName, role, socialLinks: links } };
}

/** Text for the form: one "Label | https://address" per line. */
export function socialLinksToText(links: readonly ReleaseLinkDoc[]): string {
  return links.map((link) => `${link.label} | ${link.href}`).join("\n");
}
