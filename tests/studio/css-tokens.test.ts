import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(import.meta.dirname, "../..");

/**
 * Collects every custom property defined across the stylesheets. Tokens live in tokens.css, but a
 * component module may legitimately define its own (none do yet, and this test would notice).
 */
function definedProperties(): Set<string> {
  const names = new Set<string>();
  for (const file of globSync("src/**/*.css", { cwd: root })) {
    const css = readFileSync(join(root, file), "utf8");
    for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
      const name = match[1];
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * Properties that are legitimate without a stylesheet definition:
 * - `--text-display` is set inline on a single component;
 * - `--rail-pin` is written by the scroll engine (`registerPin`), which is exactly the point: the
 *   property name belongs to the component, not to the token file.
 */
const EXTERNAL = new Set(["--text-display", "--rail-pin", "--ticker"]);

describe("css custom properties", () => {
  /**
   * A `var(--space-5)` with no definition does not fail the build: the declaration is simply
   * invalid and the browser drops it, which is how a page shipped with zero vertical padding
   * (D-032). This test turns that silent failure into a red test.
   */
  it("every var() used in a stylesheet is defined somewhere", () => {
    const defined = definedProperties();
    const missing: string[] = [];

    for (const file of globSync("src/**/*.css", { cwd: root })) {
      const css = readFileSync(join(root, file), "utf8");
      for (const match of css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
        const name = match[1] ?? "";
        if (EXTERNAL.has(name)) continue;
        if (name.startsWith("--font") || name.startsWith("--next")) continue;
        if (!defined.has(name)) missing.push(`${file}: ${name}`);
      }
    }

    assert.deepEqual(missing, [], `undefined custom properties: ${missing.join(", ")}`);
  });
});
