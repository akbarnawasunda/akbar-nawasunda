import type { PageDocument } from "./content-model";

/** Server-side limits. The browser may show these too, but only the server decides. */
export const LIMITS = {
  title: 80,
  lead: 280,
  seoDescription: 200,
  paragraphLength: 2000,
  paragraphs: 30,
} as const;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

// Control characters other than tab and newline.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Validates the editor form. Body paragraphs are separated by blank lines.
 * Every rule is checked here, on the server, regardless of what the browser enforced.
 */
export function validatePageForm(input: Record<string, unknown>): ValidationResult<PageDocument> {
  const errors: Record<string, string> = {};

  const title = readString(input.title);
  const lead = readString(input.lead);
  const seoDescription = readString(input.seoDescription);
  const body = readString(input.body);
  if (title === null || lead === null || seoDescription === null || body === null) {
    return { ok: false, errors: { form: "The form data was not understood. Reload the page and try again." } };
  }

  const cleanTitle = title.trim();
  const cleanLead = lead.trim();
  const cleanSeo = seoDescription.trim();

  if (cleanTitle.length === 0) errors.title = "Enter a title.";
  else if (cleanTitle.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;
  else if (CONTROL_CHARACTERS.test(cleanTitle)) errors.title = "Remove hidden control characters.";

  if (cleanLead.length > LIMITS.lead) errors.lead = `Keep the introduction under ${LIMITS.lead} characters.`;
  else if (CONTROL_CHARACTERS.test(cleanLead)) errors.lead = "Remove hidden control characters.";

  if (cleanSeo.length > LIMITS.seoDescription) {
    errors.seoDescription = `Keep the search description under ${LIMITS.seoDescription} characters.`;
  } else if (CONTROL_CHARACTERS.test(cleanSeo)) {
    errors.seoDescription = "Remove hidden control characters.";
  }

  const paragraphs = body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length > LIMITS.paragraphs) {
    errors.body = `Use at most ${LIMITS.paragraphs} paragraphs.`;
  } else {
    const tooLong = paragraphs.findIndex((paragraph) => paragraph.length > LIMITS.paragraphLength);
    if (tooLong !== -1) {
      errors.body = `Paragraph ${tooLong + 1} is longer than ${LIMITS.paragraphLength} characters.`;
    } else if (paragraphs.some((paragraph) => CONTROL_CHARACTERS.test(paragraph))) {
      errors.body = "Remove hidden control characters.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title: cleanTitle,
      lead: cleanLead,
      seoDescription: cleanSeo,
      sections: paragraphs.map((text, index) => ({ id: `p${index + 1}`, type: "paragraph", text })),
    },
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
