import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * Langkah 3p — the social card's fallback monogram has a contrast window, not a favourite colour.
 *
 * The window exists because two owners of this value disagreed with each other in public:
 * `#8f8f8f` (6.11:1) was legible and rejected as a second headline, `#4a4a4a` (2.23:1) was a ghost
 * and failed the 3.0:1 floor for large graphics. A number that must sit between two rejected values
 * will be "simplified" back to one of them by the next person who finds it inconvenient, so the
 * bounds are asserted here rather than described in a comment.
 */
const root = join(import.meta.dirname, "../..");
const source = readFileSync(join(root, "src/app/og/route.tsx"), "utf8");

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 0xff) + 0.7152 * channel((n >> 8) & 0xff) + 0.0722 * channel(n & 0xff);
};

const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
};

const hex = (pattern: RegExp, name: string): string => {
  const match = source.match(pattern);
  assert.ok(match?.[1], `${name} not found in src/app/og/route.tsx`);
  return match[1]!;
};

describe("og card — fallback monogram contrast", () => {
  it("sits inside the window the owner set: at or above 3.0:1, well under the rejected 6.11:1", () => {
    const mark = hex(/const MARK = "(#[0-9a-fA-F]{6})"/, "MARK");
    const ink = hex(/const INK = "(#[0-9a-fA-F]{6})"/, "INK");
    const ratio = contrast(mark, ink);

    assert.ok(ratio >= 3, `${mark} is ${ratio.toFixed(2)}:1 — under the 3.0:1 floor`);
    assert.ok(ratio < 4.5, `${mark} is ${ratio.toFixed(2)}:1 — close enough to the rejected 6.11:1 to read as a headline`);
  });

  it("is not the rejected headline grey, and not the invisible original", () => {
    const mark = hex(/const MARK = "(#[0-9a-fA-F]{6})"/, "MARK").toLowerCase();
    assert.notEqual(mark, "#8f8f8f", "#8f8f8f was rejected by the owner as a second headline");
    assert.notEqual(mark, "#1a2430", "#1a2430 was 1.26:1 — invisible");
  });
});
