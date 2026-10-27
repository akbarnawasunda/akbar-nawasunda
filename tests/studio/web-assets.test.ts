import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  anMark,
  editorialFrame,
  lockup,
  mascotFrame,
  portraitSources,
  stageFrame,
} from "../../src/assets/web";

const publicDir = join(import.meta.dirname, "../../public");

/** Read width/height from the file header instead of trusting the registry. */
function dimensions(path: string): { width: number; height: number; format: string } {
  const buffer = readFileSync(path);
  const riff = buffer.toString("ascii", 0, 4) === "RIFF";
  const webp = riff && buffer.toString("ascii", 8, 12) === "WEBP";
  if (webp) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), format: "webp" };
    }
    if (chunk === "VP8 ") {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, format: "webp" };
    }
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: "webp" };
  }
  const isAvif = buffer.toString("ascii", 4, 8) === "ftyp" && buffer.toString("ascii", 8, 12).startsWith("avif");
  if (isAvif) {
    // The ispe box holds the display size; the first ispe in the file is the primary item.
    const index = buffer.indexOf("ispe");
    assert.ok(index > 0, "AVIF file has no ispe box");
    return { width: buffer.readUInt32BE(index + 8), height: buffer.readUInt32BE(index + 12), format: "avif" };
  }
  throw new Error(`Unsupported image format: ${path}`);
}

function expectFile(src: string, width: number, height: number) {
  const path = join(publicDir, src);
  assert.ok(statSync(path).isFile(), `missing public file: ${src}`);
  const actual = dimensions(path);
  assert.equal(actual.width, width, `${src} width`);
  assert.equal(actual.height, height, `${src} height`);
  return actual;
}

describe("web brand assets", () => {
  it("ships the AN mark at the recorded size", () => {
    expectFile(anMark.src, anMark.width, anMark.height);
  });

  it("ships the full lockup at the recorded size", () => {
    expectFile(lockup.src, lockup.width, lockup.height);
  });

  it("ships the stage frame in both formats", () => {
    expectFile(stageFrame.avif, stageFrame.width, stageFrame.height);
    expectFile(stageFrame.webp, stageFrame.width, stageFrame.height);
  });

  it("ships the editorial stage frame in both formats and both sizes", () => {
    expectFile(editorialFrame.avif, editorialFrame.width, editorialFrame.height);
    expectFile(editorialFrame.webp, editorialFrame.width, editorialFrame.height);
    expectFile(editorialFrame.thumb.avif, editorialFrame.thumb.width, editorialFrame.thumb.height);
    expectFile(editorialFrame.thumb.webp, editorialFrame.thumb.width, editorialFrame.thumb.height);
  });

  it("ships the mascot doodle at its native size", () => {
    expectFile(mascotFrame.webp, mascotFrame.width, mascotFrame.height);
  });

  it("ships every portrait variant in both formats, under the LCP budget", () => {
    for (const variant of portraitSources) {
      const avif = expectFile(variant.avif, variant.width, variant.height);
      const webp = expectFile(variant.webp, variant.width, variant.height);
      assert.equal(avif.format, "avif");
      assert.equal(webp.format, "webp");
      const bytes = statSync(join(publicDir, variant.webp)).size;
      assert.ok(bytes < 150 * 1024, `${variant.webp} is ${Math.round(bytes / 1024)} KB, over the 150 KB LCP budget`);
    }
  });
});
