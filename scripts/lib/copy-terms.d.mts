/**
 * Types for `copy-terms.mjs`.
 *
 * The list lives in a `.mjs` because two runtimes read it: `scripts/qa-copy.mjs` runs on bare Node in
 * CI (no transpiler), and `tests/studio/copy-voice.test.ts` runs through `tsx`. A single declaration
 * file keeps both honest — one list, two guards, no drift.
 */
export declare const BANNED_COPY_TERMS: readonly string[];
export declare const OWNER_COPY_ONLY_TERMS: readonly string[];
export declare const OWNER_COPY_ORIGIN: string;
export declare const BANNED_EMPTY_VALUES: readonly string[];
export declare function findTerms(text: string, terms: readonly string[]): string[];
