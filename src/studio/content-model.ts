/**
 * Content model for NAWA STUDIO. Extend this file to add page types and section types;
 * the storage layer stores each page as one JSON document, so new section types do not
 * require schema migrations.
 */

/** Pages that the Studio can edit. Routes that are not listed here cannot be managed. */
export const PAGE_SLUGS = ["about"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export function isPageSlug(value: string): value is PageSlug {
  return (PAGE_SLUGS as readonly string[]).includes(value);
}

export const PAGE_LABELS: Record<PageSlug, string> = {
  about: "About",
};

export interface ParagraphSection {
  id: string;
  type: "paragraph";
  text: string;
}

/** Union of all section types. Add new section types here. */
export type PageSection = ParagraphSection;

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
 * or hand-edited data is never rendered.
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
    if (!isRecord(section)) return null;
    if (section.type === "paragraph" && typeof section.id === "string" && typeof section.text === "string") {
      sections.push({ id: section.id, type: "paragraph", text: section.text });
    } else {
      return null;
    }
  }
  return { title: value.title, lead: value.lead, seoDescription: value.seoDescription, sections };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
