#!/usr/bin/env bash
# Make a real Chromium available to `playwright-core` in a sandbox that cannot reach
# cdn.playwright.dev and cannot apt-install system libraries.
#
# Why this exists (measured 2026-10-28, this sandbox):
#   npx playwright install chromium --with-deps   → exit 1, "Unable to locate package libnss3" …
#   npx playwright install chromium               → exit 1, ECONNRESET to cdn.playwright.dev:443
#   @sparticuz/chromium@153 alone                 → exit 127, "libnspr4.so: cannot open shared object file"
#
# So the fallback is the one that already worked in this repo (scripts/setup-playwright-cli.sh):
# take the Chromium binary AND the Amazon Linux 2023 runtime libraries from the npm registry
# (@sparticuz/chromium, allowed host), unpack them into the revision directory playwright-core
# expects, and put the system libraries on LD_LIBRARY_PATH instead of in /usr/lib.
#
# Usage:
#   bash scripts/setup-visual-tools.sh          # idempotent; skips work already done
#   bash scripts/setup-visual-tools.sh --force  # re-unpack
#
# After it runs, scripts/visual-check.mjs finds the browser by itself; you do not need to export
# anything by hand.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROMIUM_PKG="${CHROMIUM_PKG:-@sparticuz/chromium@153.0.0}"
FORCE="${1:-}"

cd "$REPO"

PW_CORE="$REPO/node_modules/playwright-core"
if [ ! -f "$PW_CORE/browsers.json" ]; then
  echo "✗ playwright-core not installed. Run: npm i -D @playwright/test" >&2
  exit 1
fi

# Never hardcode the revision: playwright-core already knows which Chromium build it wants.
REVISION="$(node -e "const b=require('$PW_CORE/browsers.json').browsers.find(x=>x.name==='chromium');process.stdout.write(String(b.revision))")"
CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
BIN_DIR="$CACHE/chromium-$REVISION/chrome-linux64"
LIBS_DIR="$CACHE/system-libs"
MARKER="$BIN_DIR/.visual-tools-ok"

echo "→ playwright-core wants chromium revision $REVISION"
echo "→ cache: $CACHE"

if [ "$FORCE" != "--force" ] && [ -f "$MARKER" ] && [ -x "$BIN_DIR/chrome" ] && [ -e "$LIBS_DIR/libnspr4.so" ]; then
  echo "✓ already unpacked ($MARKER) — pass --force to redo"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Installed on demand into a temporary prefix, NOT into package.json: the tarball is ~70 MB unpacked
# and CI already has a real Chrome from browser-actions/setup-chrome. A dev dependency that only
# one sandbox needs should not slow every `npm ci` on GitHub.
if [ -d "$REPO/node_modules/@sparticuz/chromium/bin" ]; then
  CHROMIUM_BIN="$REPO/node_modules/@sparticuz/chromium/bin"
else
  echo "→ installing $CHROMIUM_PKG into a temporary prefix"
  npm i --prefix "$TMP/pkg" --no-audit --no-fund --no-save "$CHROMIUM_PKG" >/dev/null
  CHROMIUM_BIN="$TMP/pkg/node_modules/@sparticuz/chromium/bin"
fi

node - "$CHROMIUM_BIN" "$BIN_DIR" "$TMP" <<'NODE'
const { brotliDecompressSync } = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");
const [bin, binDir, tmp] = process.argv.slice(2);

fs.mkdirSync(binDir, { recursive: true });
const chrome = path.join(binDir, "chrome");
fs.writeFileSync(chrome, brotliDecompressSync(fs.readFileSync(path.join(bin, "chromium.br"))));
fs.chmodSync(chrome, 0o755);

// SwiftShader + ANGLE must sit NEXT TO the executable: Chromium resolves them relative to itself.
for (const archive of ["swiftshader.tar.br", "al2023.tar.br"]) {
  fs.writeFileSync(
    path.join(tmp, archive.replace(".br", "")),
    brotliDecompressSync(fs.readFileSync(path.join(bin, archive))),
  );
}
NODE

tar -xf "$TMP/swiftshader.tar" -C "$BIN_DIR"

# The AL2023 runtime libraries (libnspr4, libnss3, libgbm, libdrm, …) are needed on the library
# path, not next to the binary. Flatten them so LD_LIBRARY_PATH stays one directory.
mkdir -p "$LIBS_DIR"
tar -xf "$TMP/al2023.tar" -C "$LIBS_DIR"
find "$LIBS_DIR" -name '*.so*' -exec cp -n {} "$LIBS_DIR/" \; 2>/dev/null || true

printf 'revision=%s\nchromium=%s\n' "$REVISION" "$CHROMIUM_PKG" > "$MARKER"
echo "✓ chromium unpacked into $BIN_DIR"
echo "✓ system libraries flattened into $LIBS_DIR ($(ls "$LIBS_DIR"/*.so* 2>/dev/null | wc -l) files)"
echo
echo "Run the visual check:  npm run visual:check -- --category baseline"
