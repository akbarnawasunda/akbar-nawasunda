/**
 * Types for the pure sleeve rules. The module is plain ESM (`.mjs`) so the generator can be run with
 * `node` directly, without a TypeScript loader; this declaration is what lets `tsc --noEmit` check
 * the test that imports it.
 */

export type SleeveVariant = "monogram-crop" | "typographic-heavy" | "minimal-frame";

/** The slice of a release the rules read: identity for the hash, and the confirmed type. */
export interface SleeveRelease {
  slug: string;
  type?: string;
  source?: string;
}

export declare function seedFor(slug: string): number;

export declare const VARIANT_ORDER: readonly SleeveVariant[];

export declare const VARIANT_LABEL: Readonly<Record<SleeveVariant, string>>;

export declare function assignVariants(list: readonly SleeveRelease[]): Map<string, SleeveVariant>;

export declare function rankWithinVariant(list: readonly SleeveRelease[]): Map<string, number>;
