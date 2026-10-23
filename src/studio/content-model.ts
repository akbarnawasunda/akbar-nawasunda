/**
 * Content model for NAWA STUDIO pages.
 *
 * Each managed page declares which fields and section types it supports. The server validates
 * against this configuration, so the editor cannot create section types a page does not render.
 * Adding a section type = add it here, to validation, and to the renderer. No schema migration.
 */

/**
 * Optional per-page editor copy. The form is the same component for every page, but "Introduction"
 * means different things on different pages: on /artist it is the one-line positioning shown under
 * the name, and the long bio is written as paragraph sections. Labels live next to the page config
 * so the editor can never describe a field differently from how the public page uses it.
 */
export interface EditorCopy {
  leadLabel?: string;
  leadHint?: string;
  sectionsLabel?: string;
  sectionsHint?: string;
}

export const PAGE_CONFIG = {
  /**
   * Key stays `about` on purpose: stored documents live under this key, and renaming it would
   * orphan whatever the owner has already published. The route and label are what users see, and
   * those are `/artist` + "Artist" since D-024. Moving the key would need a data migration for no
   * visible benefit.
   */
  about: {
    label: "Artist",
    path: "/artist",
    fields: { title: true, lead: true, seoDescription: true },
    sectionTypes: ["heading", "paragraph"],
    maxSections: 30,
    editor: {
      leadLabel: "Kalimat pembuka",
      leadHint:
        "Satu kalimat di bawah nama pada /artist. Kosongkan untuk memakai kalimat bawaan situs.",
      sectionsLabel: "Bio panjang",
      sectionsHint:
        "Tulis bio sebagai bagian Paragraf. Bagian pertama akan tampil paling atas di /artist setelah diterbitkan.",
    } satisfies EditorCopy,
  },
  home: {
    label: "Homepage (below hero)",
    path: "/",
    fields: { title: false, lead: false, seoDescription: true },
    sectionTypes: ["heading", "paragraph", "music-list"],
    maxSections: 8,
    editor: {
      sectionsLabel: "Bagian tambahan",
      sectionsHint:
        "Konten ini tampil di bawah hero beranda, setelah katalog dan arsip visual bawaan.",
    } satisfies EditorCopy,
  },
} as const;

export type PageSlug = keyof typeof PAGE_CONFIG;
export type SectionType = "heading" | "paragraph" | "music-list";

export const PAGE_SLUGS = Object.keys(PAGE_CONFIG) as PageSlug[];

export function isPageSlug(value: string): value is PageSlug {
  return Object.prototype.hasOwnProperty.call(PAGE_CONFIG, value);
}

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  heading: "Judul bagian",
  paragraph: "Paragraf",
  "music-list": "Daftar musik (rilis terbit)",
};

/** Allowed values for the music-list section. */
export const MUSIC_LIST_COUNTS = [3, 6, 12] as const;

interface SectionBase {
  id: string;
  /** When false, the section is kept in the draft but not shown publicly. */
  visible: boolean;
}

export interface HeadingSection extends SectionBase {
  type: "heading";
  text: string;
}

export interface ParagraphSection extends SectionBase {
  type: "paragraph";
  text: string;
}

export interface MusicListSection extends SectionBase {
  type: "music-list";
  heading: string;
  count: (typeof MUSIC_LIST_COUNTS)[number];
}

export type PageSection = HeadingSection | ParagraphSection | MusicListSection;

export interface PageDocument {
  title: string;
  lead: string;
  seoDescription: string;
  sections: PageSection[];
}

export function emptyPageDocument(title: string): PageDocument {
  return { title, lead: "", seoDescription: "", sections: [] };
}

/**
 * Parses a stored document. Returns null for anything that does not match the model, so corrupted
 * or hand-edited data is never rendered. Older documents without `visible` are treated as visible.
 */
export function parsePageDocument(raw: unknown): PageDocument | null {
  if (typeof raw !== "string") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  if (typeof value.title !== "string") return null;
  if (typeof value.lead !== "string") return null;
  if (typeof value.seoDescription !== "string") return null;
  if (!Array.isArray(value.sections)) return null;

  const sections: PageSection[] = [];
  for (const section of value.sections) {
    const parsed = parseSection(section);
    if (!parsed) return null;
    sections.push(parsed);
  }
  return { title: value.title, lead: value.lead, seoDescription: value.seoDescription, sections };
}

function parseSection(section: unknown): PageSection | null {
  if (!isRecord(section) || typeof section.id !== "string") return null;
  const visible = section.visible === undefined ? true : section.visible === true;
  if (section.visible !== undefined && typeof section.visible !== "boolean") return null;

  if (section.type === "paragraph" && typeof section.text === "string") {
    return { id: section.id, type: "paragraph", visible, text: section.text };
  }
  if (section.type === "heading" && typeof section.text === "string") {
    return { id: section.id, type: "heading", visible, text: section.text };
  }
  if (
    section.type === "music-list" &&
    typeof section.heading === "string" &&
    (MUSIC_LIST_COUNTS as readonly unknown[]).includes(section.count)
  ) {
    return {
      id: section.id,
      type: "music-list",
      visible,
      heading: section.heading,
      count: section.count as MusicListSection["count"],
    };
  }
  return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
