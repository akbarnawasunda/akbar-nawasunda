import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

/**
 * Layout invariants for narrow screens.
 *
 * These are the rules that keep the Studio usable at 320-430px. Each one exists because a real
 * browser test found the problem, so if a rule disappears, the bug comes back. The values quoted in
 * the comments were measured with Chromium at 320px on 2026-10-15.
 *
 * They are text assertions on purpose: no DOM, no browser, so `npm test` stays fast and works
 * anywhere. The browser audit lives outside the repository (it needs a downloaded Chromium).
 */

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), "utf8");

/** Comments carry no declarations and would otherwise be glued to the selector that follows them. */
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarations of every rule whose selector list contains `selector`, in source order. */
function declarations(css: string, selector: string): string[] {
  const bodies: string[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css)) !== null) {
    const selectors = (match[1] ?? "").split(",").map((part) => part.trim());
    if (selectors.includes(selector)) bodies.push(match[2] ?? "");
  }
  return bodies;
}

function hasDeclaration(css: string, selector: string, declaration: string): boolean {
  return declarations(css, selector).some((body) => body.replace(/\s+/g, " ").includes(declaration));
}

/**
 * Every @media block for the given query, joined. A file can hold more than one block for the same
 * query (the navigation has its own), so they are all included.
 */
function mediaBlock(css: string, query: string): string {
  const marker = `@media ${query}`;
  const blocks: string[] = [];
  let from = 0;
  for (;;) {
    const start = css.indexOf(marker, from);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = css.indexOf("{", start); i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    assert.notEqual(end, -1, `unterminated ${marker} block`);
    blocks.push(css.slice(start, end));
    from = end;
  }
  assert.ok(blocks.length > 0, `expected at least one @media ${query} block`);
  return blocks.join("\n");
}

const studioCss = withoutComments(read("src/studio/ui/studio.module.css"));
const contentCss = withoutComments(read("src/components/content/content.module.css"));
const globalsCss = withoutComments(read("src/styles/globals.css"));
const headerCss = withoutComments(read("src/components/layout/SiteHeader.module.css"));

describe("studio shell: the page never grows past the viewport", () => {
  it("caps the implicit grid column", () => {
    // Without this the header's navigation (6 links, wider than any phone) widened the document to
    // 543px at a 320px viewport, and every page inherited a horizontal scrollbar.
    assert.ok(hasDeclaration(studioCss, ".shell", "grid-template-columns: minmax(0, 1fr)"));
  });

  it("lets the navigation shrink and scroll instead of widening the shell", () => {
    assert.ok(hasDeclaration(studioCss, ".nav", "min-width: 0"));
    assert.ok(hasDeclaration(studioCss, ".nav", "overflow-x: auto"));
    assert.ok(hasDeclaration(studioCss, ".topbar", "min-width: 0"));
  });

  it("keeps the main column shrinkable and wraps long values", () => {
    assert.ok(hasDeclaration(studioCss, ".main", "min-width: 0"));
    assert.ok(hasDeclaration(studioCss, ".main", "overflow-wrap: anywhere"));
  });

  it("gives the navigation its own full-width row on phones", () => {
    const block = mediaBlock(studioCss, "(max-width: 719px)");
    assert.ok(block.includes("flex-basis: 100%"), "navigation should take a full row under 720px");
  });

  it("hides nothing that a phone user needs", () => {
    // A safety check on the studio CSS: no display:none band-aid for the header or navigation.
    for (const selector of [".topbar", ".nav", ".navLink", ".main"]) {
      assert.equal(hasDeclaration(studioCss, selector, "display: none"), false, `${selector} must stay visible`);
    }
  });
});

describe("studio tables on narrow screens", () => {
  const mobileBlock = mediaBlock(studioCss, "(max-width: 719px)");

  it("stacks table rows into cards instead of scrolling sideways", () => {
    for (const selector of [".table", ".table tbody", ".table tr", ".table td"]) {
      assert.ok(declarations(mobileBlock, selector).some((body) => body.replace(/\s+/g, " ").includes("display: block")), `${selector} should stack`);
    }
    assert.ok(hasDeclaration(mobileBlock, ".table thead", "display: none"));
    assert.ok(hasDeclaration(mobileBlock, ".table td::before", "content: attr(data-label)"));
  });

  it("does not force a max-content table, which inflated the document width", () => {
    // Measured: a 993px table with min-width:max-content inside a scroll box made the document report
    // a 912px scrollWidth (and a 912px full-page screenshot) at a 320px viewport.
    assert.equal(studioCss.includes("min-width: max-content"), false);
  });

  it("keeps a scrollable wrapper with a focusable region for wide screens", () => {
    assert.ok(hasDeclaration(studioCss, ".tableScroll", "overflow-x: auto"));
    assert.ok(hasDeclaration(studioCss, ".tableScroll", "max-width: 100%"));
  });

  it("labels every cell in the three Studio tables, so the cards are readable", () => {
    for (const page of ["src/app/studio/pages/page.tsx", "src/app/studio/music/page.tsx", "src/app/studio/media/page.tsx"]) {
      const source = read(page);
      const cells = source.match(/<td\b/g) ?? [];
      const labelled = source.match(/<td data-label=/g) ?? [];
      assert.ok(cells.length > 0, `${page} should render table cells`);
      assert.equal(labelled.length, cells.length, `every <td> in ${page} needs a data-label`);
      assert.ok(source.includes("styles.tableScroll"), `${page} should use the tableScroll wrapper`);
      assert.ok(source.includes('tabIndex={0}') && source.includes('role="region"'), `${page} should expose the table as a focusable region`);
    }
  });
});

describe("touch targets", () => {
  it("keeps every interactive control at 44px or more", () => {
    const targets = [".button", ".smallButton", ".link", ".navLink", ".linkButton", ".input", ".textarea", ".optionCard", ".checkRow"];
    for (const selector of targets) {
      assert.ok(hasDeclaration(studioCss, selector, "min-height: 44px"), `${selector} should declare min-height: 44px`);
    }
  });

  it("keeps the public header brand tappable", () => {
    // Measured before: the brand link was 137.8x18 on every public page.
    assert.ok(hasDeclaration(headerCss, ".brand", "min-height: 44px"));
  });

  it("keeps the skip link at full height", () => {
    assert.ok(hasDeclaration(globalsCss, ".skip-link", "min-height: 44px"));
  });
});

describe("text that must never widen the page", () => {
  it("lets user-written content break long tokens", () => {
    for (const selector of [".paragraph", ".title", ".sectionHeading", ".releaseLinks a", ".lead", ".releaseMeta"]) {
      assert.ok(hasDeclaration(contentCss, selector, "overflow-wrap: anywhere"), `${selector} should wrap long tokens`);
    }
  });

  it("lets the content grid items shrink", () => {
    for (const selector of [".body", ".release", ".releaseLinks", ".musicBlock"]) {
      assert.ok(hasDeclaration(contentCss, selector, "min-width: 0"), `${selector} should allow shrinking`);
    }
  });

  it("keeps a global safety net on the document", () => {
    assert.ok(hasDeclaration(globalsCss, "body", "overflow-wrap: break-word"));
  });

  it("keeps the 16px minimum that stops iOS Safari from zooming on focus", () => {
    assert.ok(hasDeclaration(studioCss, ".input", "font-size: 1rem"));
    assert.ok(hasDeclaration(studioCss, ".textarea", "font-size: 1rem"));
  });

  it("wraps the generated password hash", () => {
    assert.ok(hasDeclaration(studioCss, ".codeBlock", "overflow-wrap: anywhere"));
  });
});
