// Dependency-free on purpose: client components import setup.ts, so this file must not use node:crypto.

/**
 * Removes every whitespace and invisible character from a stored hash. A real hash never contains any,
 * but copy-paste from a phone or a web page can add them (line breaks, non-breaking spaces, zero-width
 * spaces). Both the setup check and login use this, so they always read the same value.
 * The typed password is never normalized.
 */
export function normalizeStoredHash(stored: string): string {
  return stored.replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, "");
}
