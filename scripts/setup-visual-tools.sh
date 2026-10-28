#!/usr/bin/env bash
# =============================================================================
# Permanent visual-verification toolkit — one-command restore.
#
#   bash scripts/setup-visual-tools.sh
#   npm run visual:setup          # same thing
#
# WHY THIS EXISTS
# ---------------
# This sandbox can reach registry.npmjs.org but NOT cdn.playwright.dev or the
# Debian apt mirrors. So the two standard commands both fail here:
#
#   npx playwright install chromium --with-deps   -> apt: "Unable to locate package ..."
#   npx playwright install chromium              -> ECONNRESET to cdn.playwright.dev
#
# The reliable path is @sparticuz/chromium: it ships a brotli-compressed
# Chromium plus the ANGLE/SwiftShader/NSS libraries as a normal npm tarball.
# This script unpacks them into a REPO-LOCAL directory (.visual-tools/) and
# writes a fontconfig that actually contains fonts. Without that last step
# Chromium starts but lays out all text at height 0, so screenshots look empty.
#
# WHAT IS COMMITTED / WHAT IS NOT
# -------------------------------
# Committed: this script, scripts/visual-check.mjs, package.json, lockfile,
#            docs/VISUAL-VERIFICATION.md, and the .gitignore rule.
# Not committed: .visual-tools/ (a ~209 MB browser binary + shared libraries).
#            It is regenerated from the npm tarball by this script in a few
#            seconds. Everything needed to recreate it lives in the lockfile,
#            so a sandbox reset only costs you one command.
#
# On a normal machine you can skip all of this and set CHROME_PATH to a system
# Chrome; scripts/visual-check.mjs honours that variable.
# =============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

TOOLS="$REPO/.visual-tools"
FORCE=0
if [[ "${1:-}" == "--force" ]]; then FORCE=1; fi

SPARTICUZ_BIN="$REPO/node_modules/@sparticuz/chromium/bin"

echo "→ repo: $REPO"

# ---------------------------------------------------------------- 1. packages
# npm ci is the single source of truth: playwright-core, @playwright/test,
# @axe-core/playwright, axe-core and @sparticuz/chromium are all devDependencies.
if [[ ! -f "$SPARTICUZ_BIN/chromium.br" ]] || [[ ! -f "$REPO/node_modules/playwright-core/package.json" ]]; then
  echo "→ restoring dev dependencies from package-lock.json (npm ci)"
  npm ci --no-audit --no-fund
else
  echo "✓ dev dependencies already present"
fi

if [[ ! -f "$SPARTICUZ_BIN/chromium.br" ]]; then
  echo "✗ @sparticuz/chromium is missing from the lockfile; run:" >&2
  echo "    npm install -D @sparticuz/chromium@153" >&2
  exit 1
fi

# ------------------------------------------------------------- 2. browser bits
if [[ -x "$TOOLS/chrome" ]] && [[ -f "$TOOLS/fonts.conf" ]] && [[ "$FORCE" -eq 0 ]]; then
  echo "✓ browser already unpacked at $TOOLS (use --force to rebuild)"
else
  echo "→ unpacking Chromium into $TOOLS"
  rm -rf "$TOOLS"
  mkdir -p "$TOOLS/libs" "$TOOLS/fonts"

  node - "$SPARTICUZ_BIN" "$TOOLS" <<'NODE'
const { brotliDecompressSync } = require("node:zlib");
const fs = require("node:fs");
const path = require("node:path");
const [bin, tools] = process.argv.slice(2);

const chrome = brotliDecompressSync(fs.readFileSync(path.join(bin, "chromium.br")));
fs.writeFileSync(path.join(tools, "chrome"), chrome, { mode: 0o755 });
console.log(`   chrome binary: ${(chrome.length / 1048576).toFixed(1)} MB`);

for (const name of ["al2023", "swiftshader", "fonts"]) {
  const tar = brotliDecompressSync(fs.readFileSync(path.join(bin, `${name}.tar.br`)));
  const dest = path.join(tools, "libs", `${name}.tar`);
  fs.writeFileSync(dest, tar);
}
NODE

  for name in al2023 swiftshader fonts; do
    tar -xf "$TOOLS/libs/$name.tar" -C "$TOOLS/libs"
    rm -f "$TOOLS/libs/$name.tar"
  done

  # Sparticuz's own fonts.conf points at /var/task/.fonts, /opt/fonts, /tmp/fonts —
  # all empty here. Build a real one: bundled Open Sans + whatever the image has.
  cp -r "$TOOLS/libs/fonts/." "$TOOLS/fonts/" 2>/dev/null || true
  if [[ -d /usr/share/fonts ]]; then
    find /usr/share/fonts -type f \( -iname '*.ttf' -o -iname '*.otf' -o -iname '*.ttc' \) \
      -exec cp -n {} "$TOOLS/fonts/" \; 2>/dev/null || true
  fi

  cat > "$TOOLS/fonts.conf" <<EOF
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>$TOOLS/fonts</dir>
  <dir>/usr/share/fonts</dir>
  <cachedir>/tmp/visual-tools-font-cache</cachedir>
  <config></config>
</fontconfig>
EOF

  echo "   fonts available: $(find "$TOOLS/fonts" -type f | wc -l)"
fi

# ------------------------------------------------------------------ 3. check
echo "→ smoke test (real headless launch + screenshot)"
LD_LIBRARY_PATH="$TOOLS/libs/lib:$TOOLS/libs:${LD_LIBRARY_PATH:-}" \
FONTCONFIG_PATH="$TOOLS" \
node - "$TOOLS" <<'NODE'
const { chromium } = require("playwright-core");
const fs = require("node:fs");
const path = require("node:path");
const tools = process.argv[2];

(async () => {
  const browser = await chromium.launch({
    executablePath: path.join(tools, "chrome"),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  const version = browser.version();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent("<h1 style='font:700 40px sans-serif'>visual toolkit ok</h1>");
  const shot = path.join(tools, "smoke.png");
  await page.screenshot({ path: shot });
  const bytes = fs.statSync(shot).size;
  fs.unlinkSync(shot);
  await browser.close();
  if (bytes < 1000) throw new Error("smoke screenshot is empty");
  console.log(`✓ Chromium ${version} launched; smoke screenshot ${bytes} bytes`);
  fs.writeFileSync(
    path.join(tools, "state.json"),
    JSON.stringify({ browser: version, source: "@sparticuz/chromium@153", installedAt: new Date().toISOString() }, null, 2),
  );
})().catch((err) => { console.error("✗ smoke test failed:", err.message); process.exit(1); });
NODE

echo
echo "✓ Visual toolkit ready."
echo "  Browser : $TOOLS/chrome"
echo "  Run     : npm run dev        (in one terminal)"
echo "            npm run visual:check -- /music"
echo "            npm run visual:check          (defaults: / , /music , first release)"
