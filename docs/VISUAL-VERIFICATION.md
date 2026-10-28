# Visual verification toolkit

The harness captures the site and asserts on it without a human opening a browser.
It does **not** give the agent eyes — see "Reading the results yourself" at the end.

Two commands:

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

> **This section was wrong until this commit.** It used to say that `read_file` on a PNG
> "shows the image to the agent". That is **not true in this environment**: `read_file` on a
> PNG returns `[An image was provided here, but you do not have vision capabilities.]` —
> re-verified live against a committed PNG, not recalled. The harness never gave the agent
> eyes, and any report that narrates pixel analysis as "I looked at the image" is misleading.

What the toolkit actually gives the agent, and what each method can and cannot prove:

| method | proves | cannot prove |
| --- | --- | --- |
| axe-core, console / `pageerror` / `requestfailed`, HTTP status | a11y violations, JS errors, broken requests | anything aesthetic |
| DOM assertions — geometry, computed styles, transforms | layout numbers, element presence, motion values | whether it *looks* right |
| in-page pixel census (`getImageData`) | exact coverage, colour and alpha counts on a canvas | intent, balance, legibility |
| PNG decoded in Node → ASCII grid + colour histogram | shape, position, rough colour balance, artefacts | fine typography, "feel" |
| in-page rAF trace of a canvas | that an animation actually moves, and where | whether the motion reads well |

So the loop is:

```
screenshot → assert (DOM + pixel math) → change code → screenshot again → compare numbers
```

The screenshot is still the artifact the **human** signs off from. Export the PNGs for anything
that requires taste — automated checks catch contrast, overflow and console errors, not taste.

### Rule for writing reports

Say *"analyzed via pixel-sampling / ASCII-render / colour statistics"* — never *"I looked at the
image"* — unless image understanding is genuinely available in that session. Label every claim
with its provenance at the moment it is made, never retroactively:

- `[DOM-ASSERTION]` — measured from the live DOM (geometry, computed style, transform).
- `[PIXEL-MATH]` — measured from pixel data (canvas census, PNG decode, colour histogram).
- `[UNVERIFIED-VISUAL-CLAIM]` — an impression of appearance that no measurement backs.

See `artifacts/visual-check/mercury-core/DIAGNOSIS.md` §0 and
`artifacts/visual-check/audit-round-1/AUDIT-ROUND-1-PROVENANCE-CORRECTED.md`.
