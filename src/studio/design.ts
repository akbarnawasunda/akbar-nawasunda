/**
 * Design settings: a closed set of options. The CMS can only choose from these values; it never
 * stores CSS, colour codes or code. Each option maps to a token-based attribute in globals.css.
 */

export const ACCENT_OPTIONS = {
  signal: { label: "Press cyan (brand)", value: "signal", hex: "#2e8c86" },
  icy: { label: "Icy cyan", value: "icy", hex: "#9ecfc9" },
  bone: { label: "Bone white", value: "bone", hex: "#ffffff" },
} as const;

export const TITLE_CASE_OPTIONS = {
  uppercase: { label: "Uppercase (current)", value: "uppercase" },
  "as-written": { label: "As written", value: "as-written" },
} as const;

export type AccentOption = keyof typeof ACCENT_OPTIONS;
export type TitleCaseOption = keyof typeof TITLE_CASE_OPTIONS;

export interface DesignSettings {
  accent: AccentOption;
  titleCase: TitleCaseOption;
}

export const DEFAULT_DESIGN: DesignSettings = { accent: "signal", titleCase: "uppercase" };

export function parseDesign(raw: unknown): DesignSettings | null {
  if (typeof raw !== "string") return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (!isAccent(record.accent) || !isTitleCase(record.titleCase)) return null;
  return { accent: record.accent, titleCase: record.titleCase };
}

export function isAccent(value: unknown): value is AccentOption {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ACCENT_OPTIONS, value);
}

export function isTitleCase(value: unknown): value is TitleCaseOption {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TITLE_CASE_OPTIONS, value);
}

/** Attributes applied to the public site wrapper. Only the closed values above can appear here. */
export function designAttributes(settings: DesignSettings): { "data-accent": string; "data-title-case": string } {
  return { "data-accent": settings.accent, "data-title-case": settings.titleCase };
}
