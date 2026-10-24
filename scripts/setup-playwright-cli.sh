#!/usr/bin/env bash
# Make `playwright-cli` usable in this sandbox / CI image, where cdn.playwright.dev is blocked.
#
# The CLI itself installs from npm (allowed). Its bundled browser does not, so this script:
#   1. installs @playwright/cli if it is missing,
#   2. downloads @sparticuz/chromium (npm, allowed) and unpacks it into the exact directory
#      playwright-core expects for its bundled Chromium revision, including the ANGLE/SwiftShader
#      libraries — without those next to the binary, WebGL is unavailable and the monogram scene
#      silently never renders,
#   3. writes .playwright/cli.config.json so the CLI launches with the flags this image needs.
#
# Usage:  bash scripts/setup-playwright-cli.sh
# Then:   playwright-cli open http://127.0.0.1:3000/
#
# Not needed on a normal machine: `npm i -g @playwright/cli && playwright-cli install-browser`.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_VERSION="0.1.22"
CHROMIUM_PKG="@sparticuz/chromium@153"

if ! command -v playwright-cli >/dev/null 2>&1; then
  echo "→ installing @playwright/cli@${CLI_VERSION}"
  npm i -g "@playwright/cli@${CLI_VERSION}" >/dev/null
fi

PW_ROOT="$(npm root -g)/@playwright/cli/node_modules/playwright-core"
if [ ! -f "$PW_ROOT/browsers.json" ]; then
  echo "✗ playwright-core not found under $(npm root -g)" >&2
  exit 1
fi

# Never hardcode the revision: playwright-core already knows which Chromium build it wants.
REVISION="$(node -e "const b=require('$PW_ROOT/browsers.json').browsers.find(x=>x.name==='chromium');process.stdout.write(String(b.revision))")"
CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"

if [ -x "$CACHE/chromium-$REVISION/chrome-linux64/chrome" ] && \
   [ -f "$CACHE/chromium-$REVISION/chrome-linux64/libvk_swiftshader.so" ]; then
  echo "✓ Chromium r$REVISION already unpacked at $CACHE"
else
  echo "→ unpacking $CHROMIUM_PKG into $CACHE/chromium-$REVISION"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  npm i --prefix "$TMP" "$CHROMIUM_PKG" >/dev/null

  node - "$TMP" "$CACHE" "$REVISION" <<'NODE'
const { brotliDecompressSync } = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");
const [tmp, cache, revision] = process.argv.slice(2);
const bin = path.join(tmp, "node_modules/@sparticuz/chromium/bin");

const dir = path.join(cache, `chromium-${revision}`, "chrome-linux64");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "chrome"), brotliDecompressSync(fs.readFileSync(path.join(bin, "chromium.br"))));
fs.chmodSync(path.join(dir, "chrome"), 0o755);

// SwiftShader + ANGLE have to sit next to the executable: Chromium resolves them relative to itself.
const libs = path.join(tmp, "libs");
fs.mkdirSync(libs, { recursive: true });
for (const archive of ["swiftshader.tar.br", "al2023.tar.br"]) {
  fs.writeFileSync(path.join(libs, archive.replace(".br", "")), brotliDecompressSync(fs.readFileSync(path.join(bin, archive))));
}
fs.writeFileSync(path.join(cache, `chromium-${revision}`, "INSTALLATION_COMPLETE"), "");
NODE

  tar -xf "$TMP/libs/swiftshader.tar" -C "$CACHE/chromium-$REVISION/chrome-linux64"
  # The system libraries are only needed on the library path, not next to the binary.
  mkdir -p "$CACHE/system-libs"
  tar -xf "$TMP/libs/al2023.tar" -C "$CACHE/system-libs" 2>/dev/null || true
  find "$CACHE/system-libs" -name '*.so*' -exec cp -n {} "$CACHE/system-libs/" \; 2>/dev/null || true

  echo "✓ Chromium unpacked"
fi

cat > "$REPO/.playwright/cli.config.json" <<'JSON'
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "args": [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--use-gl=swiftshader",
        "--enable-unsafe-swiftshader"
      ]
    }
  }
}
JSON

echo "✓ .playwright/cli.config.json written"
echo
echo "Run with the system library path set:"
echo "  export LD_LIBRARY_PATH=\"$CACHE/system-libs:\$LD_LIBRARY_PATH\""
echo "  playwright-cli open http://127.0.0.1:3000/"
