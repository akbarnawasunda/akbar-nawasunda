import { MUSIC_LIST_COUNTS, PAGE_CONFIG, type PageDocument, type PageSection, type PageSlug, type SectionType } from "./content-model";
import { isAccent, isTitleCase, type DesignSettings } from "./design";
import {
  MAX_RELEASE_LINKS,
  RELEASE_LIMITS,
  RELEASE_TYPES,
  validateSlug,
  type ReleaseDocument,
  type ReleaseKind,
  type ReleaseLinkDoc,
} from "./releases";

/** Server-side limits for pages. The browser may mirror these, but only the server decides. */
export const LIMITS = {
  title: 80,
  lead: 280,
  seoDescription: 200,
  headingText: 120,
  paragraphLength: 2000,
} as const;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

// Control characters other than tab and newline.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function hasControl(value: string): boolean {
  return CONTROL_CHARACTERS.test(value);
}

/** Reads a form field as text. Missing fields are empty; non-text values are rejected (null). */
function readText(input: Record<string, unknown>, key: string): string | null {
  const value = input[key];
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : null;
}

const FORM_ERROR = "Data formulir tidak terbaca. Muat ulang halaman lalu coba lagi.";

/** Fields as submitted by the editor, before server rules are applied. */
interface RawSection {
  type?: unknown;
  text?: unknown;
  heading?: unknown;
  count?: unknown;
  visible?: unknown;
}

/**
 * Validates a page document. `sections` arrives as a JSON string built by the editor. Section ids
 * are assigned here, so client-supplied ids are ignored.
 */
export function validatePageDocument(slug: PageSlug, input: Record<string, unknown>): ValidationResult<PageDocument> {
  const config = PAGE_CONFIG[slug];
  const errors: Record<string, string> = {};

  const title = readText(input, "title");
  const lead = readText(input, "lead");
  const seoDescription = readText(input, "seoDescription");
  const sectionsJson = readText(input, "sections");
  if (title === null || lead === null || seoDescription === null || sectionsJson === null) {
    return { ok: false, errors: { form: FORM_ERROR } };
  }

  let rawSections: unknown;
  try {
    rawSections = JSON.parse(sectionsJson || "[]");
  } catch {
    return { ok: false, errors: { form: FORM_ERROR } };
  }
  if (!Array.isArray(rawSections)) return { ok: false, errors: { form: FORM_ERROR } };

  const cleanTitle = config.fields.title ? title.trim() : "";
  const cleanLead = config.fields.lead ? lead.trim() : "";
  const cleanSeo = config.fields.seoDescription ? seoDescription.trim() : "";

  if (config.fields.title) {
    if (cleanTitle.length === 0) errors.title = "Isi judul.";
    else if (cleanTitle.length > LIMITS.title) errors.title = `Judul maksimal ${LIMITS.title} karakter.`;
    else if (hasControl(cleanTitle)) errors.title = "Hapus karakter kontrol yang tidak terlihat.";
  }
  if (config.fields.lead) {
    if (cleanLead.length > LIMITS.lead) errors.lead = `Kalimat pembuka maksimal ${LIMITS.lead} karakter.`;
    else if (hasControl(cleanLead)) errors.lead = "Hapus karakter kontrol yang tidak terlihat.";
  }
  if (config.fields.seoDescription) {
    if (cleanSeo.length > LIMITS.seoDescription) {
      errors.seoDescription = `Deskripsi pencarian maksimal ${LIMITS.seoDescription} karakter.`;
    } else if (hasControl(cleanSeo)) {
      errors.seoDescription = "Hapus karakter kontrol yang tidak terlihat.";
    }
  }

  if (rawSections.length > config.maxSections) {
    errors.sections = `Maksimal ${config.maxSections} bagian di halaman ini.`;
  }

  const sections: PageSection[] = [];
  rawSections.forEach((raw: unknown, index: number) => {
    const result = validateSection(raw, index + 1, config.sectionTypes);
    if (typeof result === "string") errors[`section-${index}`] = result;
    else sections.push(result);
  });

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: { title: cleanTitle, lead: cleanLead, seoDescription: cleanSeo, sections },
  };
}

function validateSection(
  raw: unknown,
  position: number,
  allowed: readonly SectionType[],
): PageSection | string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return `Bagian ${position} tidak valid.`;
  const section = raw as RawSection;
  const type = section.type;
  if (typeof type !== "string" || !(allowed as readonly string[]).includes(type)) {
    return `Bagian ${position} memakai jenis yang tidak didukung halaman ini.`;
  }
  if (section.visible !== undefined && typeof section.visible !== "boolean") {
    return `Bagian ${position}: status tampil harus hidup atau mati.`;
  }
  const visible = section.visible !== false;
  const id = `s${position}`;

  if (type === "heading" || type === "paragraph") {
    if (typeof section.text !== "string") return `Bagian ${position} tidak punya teks.`;
    const text = section.text.trim();
    if (text.length === 0) return `Bagian ${position}: isi teksnya, atau hapus bagian ini.`;
    if (type === "heading") {
      if (text.length > LIMITS.headingText) return `Bagian ${position}: judul maksimal ${LIMITS.headingText} karakter.`;
      if (hasControl(text)) return `Bagian ${position}: hapus karakter kontrol yang tidak terlihat.`;
      return { id, type, visible, text };
    }
    if (text.length > LIMITS.paragraphLength) {
      return `Bagian ${position}: paragraf maksimal ${LIMITS.paragraphLength} karakter.`;
    }
    if (hasControl(text)) return `Bagian ${position}: hapus karakter kontrol yang tidak terlihat.`;
    return { id, type, visible, text };
  }

  // music-list
  const heading = typeof section.heading === "string" ? section.heading.trim() : "";
  if (heading.length > LIMITS.headingText) return `Bagian ${position}: judul maksimal ${LIMITS.headingText} karakter.`;
  if (hasControl(heading)) return `Bagian ${position}: hapus karakter kontrol yang tidak terlihat.`;
  const count = Number(section.count);
  if (!(MUSIC_LIST_COUNTS as readonly number[]).includes(count)) {
    return `Bagian ${position}: pilih jumlah rilis yang ditampilkan.`;
  }
  return { id, type: "music-list", visible, heading, count: count as (typeof MUSIC_LIST_COUNTS)[number] };
}

/** Design validation: enum values only. Anything else is rejected. */
export function validateDesign(input: Record<string, unknown>): ValidationResult<DesignSettings> {
  const errors: Record<string, string> = {};
  if (!isAccent(input.accent)) errors.accent = "Pilih salah satu warna aksen yang tersedia.";
  if (!isTitleCase(input.titleCase)) errors.titleCase = "Pilih salah satu gaya judul yang tersedia.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      accent: input.accent as DesignSettings["accent"],
      titleCase: input.titleCase as DesignSettings["titleCase"],
    },
  };
}

export interface ReleaseInputOptions {
  /** Repository asset ids that may be used as release artwork (approved, role release-artwork). */
  allowedArtworkIds: readonly string[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * Validates release fields. The slug is validated separately (create only). Links must be
 * absolute https URLs; fully blank link rows are ignored.
 */
export function validateRelease(input: Record<string, unknown>, options: ReleaseInputOptions): ValidationResult<ReleaseDocument> {
  const errors: Record<string, string> = {};
  const title = readText(input, "title");
  const type = readText(input, "type");
  const releaseDate = readText(input, "releaseDate");
  const description = readText(input, "description");
  const artworkId = readText(input, "artworkId");
  const seoTitle = readText(input, "seoTitle");
  const seoDescription = readText(input, "seoDescription");
  const linksJson = readText(input, "links");
  if ([title, type, releaseDate, description, artworkId, seoTitle, seoDescription, linksJson].some((v) => v === null)) {
    return { ok: false, errors: { form: FORM_ERROR } };
  }

  const cleanTitle = (title as string).trim();
  if (cleanTitle.length === 0) errors.title = "Isi judul rilis.";
  else if (cleanTitle.length > RELEASE_LIMITS.title) errors.title = `Judul maksimal ${RELEASE_LIMITS.title} karakter.`;
  else if (hasControl(cleanTitle)) errors.title = "Hapus karakter kontrol yang tidak terlihat.";

  if (!(RELEASE_TYPES as readonly string[]).includes(type as string)) errors.type = "Pilih jenis rilis.";

  const cleanDate = (releaseDate as string).trim();
  const dateVerified = input.dateVerified === true || input.dateVerified === "on" || input.dateVerified === "true";
  if (cleanDate.length > 0) {
    if (!isValidCalendarDate(cleanDate)) errors.releaseDate = "Isi tanggal yang benar dalam format YYYY-MM-DD.";
    else if (!dateVerified) errors.releaseDate = "Centang \"tanggal terverifikasi\" untuk menyimpan tanggal ini, atau kosongkan tanggalnya.";
  }

  const cleanDescription = (description as string).trim();
  if (cleanDescription.length > RELEASE_LIMITS.description) {
    errors.description = `Deskripsi maksimal ${RELEASE_LIMITS.description} karakter.`;
  } else if (hasControl(cleanDescription)) {
    errors.description = "Hapus karakter kontrol yang tidak terlihat.";
  }

  const cleanArtwork = (artworkId as string).trim();
  if (cleanArtwork.length > 0 && !options.allowedArtworkIds.includes(cleanArtwork)) {
    errors.artworkId = "Artwork ini belum disetujui untuk rilis.";
  }

  const cleanSeoTitle = (seoTitle as string).trim();
  if (cleanSeoTitle.length > RELEASE_LIMITS.seoTitle) errors.seoTitle = `Maksimal ${RELEASE_LIMITS.seoTitle} karakter.`;
  else if (hasControl(cleanSeoTitle)) errors.seoTitle = "Hapus karakter kontrol yang tidak terlihat.";

  const cleanSeoDescription = (seoDescription as string).trim();
  if (cleanSeoDescription.length > RELEASE_LIMITS.seoDescription) {
    errors.seoDescription = `Maksimal ${RELEASE_LIMITS.seoDescription} karakter.`;
  } else if (hasControl(cleanSeoDescription)) {
    errors.seoDescription = "Hapus karakter kontrol yang tidak terlihat.";
  }

  const links = parseLinks(linksJson as string);
  if (typeof links === "string") errors.links = links;
  else if (links.length > MAX_RELEASE_LINKS) errors.links = `Maksimal ${MAX_RELEASE_LINKS} tautan.`;

  if (Object.keys(errors).length > 0 || typeof links === "string") return { ok: false, errors };

  return {
    ok: true,
    value: {
      title: cleanTitle,
      type: type as ReleaseKind,
      releaseDate: cleanDate.length > 0 ? cleanDate : null,
      dateVerified: cleanDate.length > 0 ? dateVerified : false,
      description: cleanDescription,
      artworkId: cleanArtwork.length > 0 ? cleanArtwork : null,
      links: links as ReleaseLinkDoc[],
      seoTitle: cleanSeoTitle,
      seoDescription: cleanSeoDescription,
    },
  };
}

/** Parses and checks the link list. Returns an error message string, or the cleaned links. */
export function parseLinks(json: string): ReleaseLinkDoc[] | string {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return "Tautan tidak terbaca. Muat ulang lalu coba lagi.";
  }
  if (!Array.isArray(raw)) return "Tautan tidak terbaca. Muat ulang lalu coba lagi.";
  const out: ReleaseLinkDoc[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as { label?: unknown; href?: unknown } | null;
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    const href = typeof item?.href === "string" ? item.href.trim() : "";
    if (label.length === 0 && href.length === 0) continue;
    if (label.length === 0) return `Link ${i + 1}: add a label.`;
    if (label.length > RELEASE_LIMITS.linkLabel) return `Link ${i + 1}: keep the label under ${RELEASE_LIMITS.linkLabel} characters.`;
    if (hasControl(label)) return `Link ${i + 1}: remove hidden control characters.`;
    if (href.length > RELEASE_LIMITS.linkHref) return `Link ${i + 1}: the address is too long.`;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return `Link ${i + 1}: enter a full address starting with https://`;
    }
    if (url.protocol !== "https:") return `Link ${i + 1}: only https:// addresses are allowed.`;
    if (url.username || url.password) return `Link ${i + 1}: remove the username from the address.`;
    out.push({ label, href: url.toString() });
  }
  return out;
}

export { validateSlug };
