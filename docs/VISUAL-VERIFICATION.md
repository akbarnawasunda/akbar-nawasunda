# Visual verification toolkit

The agent can see the site without a human opening a browser. Two commands:

```bash
npm run visual:setup     # one-time (or after a sandbox reset)
npm run dev              # terminal 1
npm run visual:check     # terminal 2 — / , /music , first release
```

`npm run visual:check -- /music/cinta-terbuang` checks a single page.
`npm run visual:check -- / /music /epk` checks several.
`--base https://preview.example.vercel.app` points it at another host.
`--no-fail` reports without a non-zero exit code. `--help` lists all flags.

## What it produces

For every route, at **1440x900** and **390x844**:

- a real full-page PNG at `artifacts/visual-check/<page>-<width>x<height>.png`
- an axe-core scan (violation id, impact, node count, selectors)
- every `console.error`, `console.warning`, `pageerror`, `requestfailed` and HTTP >= 400

It exits 1 if axe finds violations, the console has errors, or a capture fails.
Console warnings are reported but do not fail the run.

## Why the setup script exists

This sandbox can reach `registry.npmjs.org` but not `cdn.playwright.dev` or the
Debian apt mirrors. Both standard installers fail here:

| Command | Result |
| --- | --- |
| `npx playwright install chromium --with-deps` | apt: `Unable to locate package libcups2` … exit 100 |
| `npx playwright install chromium` | `ECONNRESET` to `cdn.playwright.dev` |
| `npm i -D @sparticuz/chromium@153` | **works** — Chromium + ANGLE/SwiftShader/NSS ship inside an npm tarball |

`scripts/setup-visual-tools.sh` restores everything from the committed lockfile:

1. `npm ci` when the dev dependencies are missing;
2. unpack `.visual-tools/chrome` (~209 MB) plus its shared libraries from
   `node_modules/@sparticuz/chromium/bin/*.br`;
3. build a **working fontconfig** at `.visual-tools/fonts.conf`. Sparticuz's
   bundled `fonts.conf` points at `/var/task/.fonts`, `/opt/fonts`, `/tmp/fonts`
   — all empty here. Without real fonts Chromium starts but lays out text at
   height 0, so screenshots look blank even though the DOM is full;
4. smoke-test a real headless launch and a non-empty screenshot.

`scripts/visual-check.mjs` passes `LD_LIBRARY_PATH` and `FONTCONFIG_PATH`
directly to `chromium.launch({ env })`, so no shell exports are needed. It also
rewrites `fonts.conf` at startup because it embeds the absolute repo path.

## What is committed, what is not

Committed: the setup script, the harness, `package.json`, `package-lock.json`,
this document and the `.gitignore` rule. The ~209 MB browser binary in
`.visual-tools/` is **not** committed — it is regenerated from the npm tarball
in a few seconds. After a full sandbox reset, `npm run visual:setup` is the only
restore step; on a machine with a normal network, `npx playwright install
chromium` works instead. Set `CHROME_PATH` to use a system Chrome and skip the
unpacking entirely.

## Known sandbox workarounds (not site bugs)

- **Chromium 153 crashes on `text-wrap: balance`** in some production CSS
  bundles. The harness always tries the untouched page first. Only when the
  renderer actually crashes does it retry with that single declaration rewritten
  to `text-wrap: wrap`, and it prints a `WORKAROUND` line. Nothing in `src/`
  changes; CI with real Chrome renders the original CSS.
- **Dev server HMR:** open pages through `localhost:3000`, not `127.0.0.1:3000`.
  Next.js 16 blocks the HMR websocket from `127.0.0.1` unless
  `allowedDevOrigins` is configured, which produces console errors that are not
  application errors.
- **Pinned sections:** the homepage catalogue reel is a 300vh sticky/pinned
  element. A single full-page PNG can only show one position of it, so a dark
  band is expected in that capture. Take viewport screenshots at several scroll
  offsets to review the reel's progression.

## Reading the results yourself

`read_file` on any PNG in `artifacts/visual-check/` shows the image to the
agent, so the loop can be:

```
screenshot → inspect → change code → screenshot again → compare
```

No image needs to leave the sandbox for a first pass. For final design sign-off,
export the PNGs and have a human look — automated checks catch contrast,
overflow and console errors, not taste.
