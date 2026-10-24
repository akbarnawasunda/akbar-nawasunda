# Tooling: what is in use, what is not, and why

Written after the owner handed over five tools on 2026-10-24. The short version: **one is adopted as
the QA harness, one was used once as an audit, and three cannot run in this environment.** Everything
below was actually attempted; nothing here is a guess about what a tool does.

---

## 1. Playwright CLI — **adopted** (QA harness)

`@playwright/cli@0.1.22` (`microsoft/playwright-cli`). It drives a real Chromium from the shell with
named sessions, so a check can be one command instead of a bespoke script.

**Setup in this image** (cdn.playwright.dev is blocked, so the bundled browser cannot be downloaded):

```bash
bash scripts/setup-playwright-cli.sh
export LD_LIBRARY_PATH="$HOME/.cache/ms-playwright/system-libs:$LD_LIBRARY_PATH"
playwright-cli open http://127.0.0.1:3000/ --browser chromium
```

The script installs the CLI from npm, unpacks `@sparticuz/chromium` into the exact directory
`playwright-core/browsers.json` asks for (revision read at runtime — never hardcoded), and writes the
launch flags this image needs. **The SwiftShader/ANGLE libraries must sit next to the binary**; with
them on `LD_LIBRARY_PATH` only, Chromium launches but `getContext("webgl2")` returns `null`, and the
monogram then silently never appears. That failure mode is what found the bug in §1.1.

On a normal machine none of this is needed: `npm i -g @playwright/cli && playwright-cli install-browser`.

Useful commands for this repo:

```bash
playwright-cli open http://127.0.0.1:3000/ --browser chromium
playwright-cli resize 390 844
playwright-cli snapshot                 # accessible tree with element refs
playwright-cli console                  # errors and warnings since load
playwright-cli requests                 # every request, numbered; `request <n>` for headers/body
playwright-cli set-reduced-motion reduce
playwright-cli screenshot --full-page --filename /tmp/home.png
playwright-cli run-code "$(cat /tmp/script.js)"   # async page => { ... } — returns the value as JSON
```

### 1.1 Bug it found, and the fix

`AnMonogram.tsx` appended its `<canvas>` **before** constructing `WebGLRenderer`. On a browser without
WebGL, the constructor threw, the `catch` swallowed it, and the page kept a dead **300×150** canvas in
the layout — a grey rectangle under the monogram heading for anyone on a machine without hardware
acceleration. The canvas is now attached only after the context exists, so a failed mount leaves
nothing behind (D-101).

### 1.2 What the QA pass verified (2026-10-24, desktop 1280 and mobile 390)

| Check | Result |
|---|---|
| `<canvas>` before the monogram band is on screen | **0** |
| `<canvas>` after scrolling to the band | 1, `data-ready="true"`, 1280×790 |
| `prefers-reduced-motion: reduce` | no curtain; canvas mounts and draws one static frame only |
| Drawer focus trap (12 × Tab) | focus never leaves `role="dialog"` |
| Escape closes the drawer | focus returns to the toggle |
| Horizontal overflow, 6 routes × 320/390/768/1024 px | **0** |
| Third-party network requests on `/` | **0** |
| Console errors and warnings on `/` | **0** |
| `/studio/*` without a session (8 routes) | 307 → `/studio/login`, every one |
| CSP / HSTS / nosniff / frame-ancestors / COOP / CORP | present on the document |

---

## 2. skillui — **used once, not committed**

`npx skillui@1.3.4 --dir . --out /tmp/skillout --no-skill` reverse-engineers a design system by pure
static analysis and writes a 503-line `DESIGN.md`. It ran in 1.6 s and its inventory mostly matched:
20 colours, 4 px baseline grid, CSS Modules + Next detected.

It is **not** committed, and it is not a build step, because it is confidently wrong in ways that
would poison a future agent's context: it reports **1 font family** (the site is set in Syne + Inter +
JetBrains Mono, all loaded through `next/font`, which it does not follow), and it describes the motion
as "spring physics, layout animations" — this site has no spring library and no layout animation.

What it *did* earn its keep on: it listed **`--color-signal-purple: #7800ff`** as a live token. That
colour is banned from the site since round 1. It survives in `tokens.css` and is used by exactly one
rule — the blue→purple 4 px rule on the *generated sleeve fallback*
(`ReleaseCover.module.css`), the documented specification from D-065. The shipped sleeves are real
WebP files, so a reader never sees it, but the token should not outlive the reason it exists. Left in
place for now and recorded here rather than changed silently: regenerating ten sleeves to retire one
gradient is a decision for the owner, not a cleanup for an audit.

---

## 3. Supabase plugin — **not applicable to this stack**

`npx plugins add supabase-community/supabase-plugin` bundles the Supabase MCP server plus two agent
skills. This project's data layer is **Turso (libSQL) + Drizzle ORM**; there is no Supabase project,
no Postgres dialect, and the schema in `src/db/` is written for SQLite. Installing it would give an
agent tools for a database that does not exist here.

Two honest paths, both the owner's call:

1. keep Turso and skip the plugin (current state), or
2. migrate Turso → Supabase Postgres: swap the Drizzle dialect, re-run `db:generate`/`db:migrate`,
   move the seed, and change the Vercel env vars. That is a phase of its own, not a toggle.

---

## 4. Strix — **cannot run here**

`usestrix/strix` is an autonomous penetration-testing agent. Its sandbox is a Docker image and it
needs an LLM API key (OpenRouter, etc.). This environment has **no Docker daemon** and no API keys —
and the agent must never ask for one.

The gap was covered by hand with Playwright CLI instead (the `/studio/*` and header rows in §1.2 plus
the request audit). A real pentest of the Studio auth flow is still worth doing against a *preview*
deployment, with the owner driving Strix where Docker exists:

```bash
strix --target https://<preview-domain> --instruction "Focus on the /studio auth flow and server actions"
```

---

## 5. Context7 — **cannot run here**

Context7 is an MCP server (`@upstash/context7-mcp`, v4.4.4) that serves library documentation into an
agent's context. Using it requires two things this session does not have: an MCP host to attach the
server to, and outbound access to `context7.com` — the sandbox network allowlist is limited to
`github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org` and
`files.pythonhosted.org`.

Practical effect for this repo: version-specific questions about Next 16 / React 19 / Drizzle were
answered from the installed packages in `node_modules` (types, `browsers.json`, changelogs) rather
than from a docs service. If the owner wants Context7 wired in, it belongs in the owner's own agent
config, not in the repo:

```json
{ "mcpServers": { "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp"] } } }
```

---

## 2. What to add next, ranked — and one thing that is already done

Written after the owner asked which other tools are worth adopting. Ordered by what actually moves a
site from "good" to "professional", not by novelty. The first entry is no longer a proposal: it was
built in the same session (D-105…D-107).

### 1. GitHub Actions as the quality gate — **done**
`.github/workflows/ci.yml` runs typecheck, lint, 113 tests, a production build, `check:web` (real
gzipped byte budgets, dead internal links, dead `#anchors`), axe-core across 14 page loads, and the
smoke suite. `.github/dependabot.yml` groups dependency updates weekly and pins `three` to the shape
the monogram was traced against.

Why this was the first thing: every number in `PERFORMANCE_BUDGET.md` was measured once, by hand, and
never re-checked. A budget nobody re-measures is a wish.

### 2. Vercel's own preview deployments — highest value per minute
The repo is already Vercel-shaped. Once the project is connected, **every PR gets its own URL**, so a
review is "open the link on your phone", not "trust the screenshot I pasted". Turn on:
- **Speed Insights** (real-user Core Web Vitals, not lab) — the only way to know what a Moto G in
  Bandung actually experiences;
- **Web Analytics** (privacy-friendly, no cookie banner, ~1 KB) — which releases get clicked;
- **Vercel Blob or S3** later, only if the owner starts uploading masters.

Cost: free tier covers this traffic. Nothing to install in the repo.

### 3. Sentry (free tier) — errors you would otherwise never see
A static-ish site still has a client bundle, a 3D scene, and a Studio. Right now an exception in the
AnMonogram loop on one person's GPU is invisible. `@sentry/nextjs` with `tracesSampleRate: 0.1`
catches it. It adds ~20 KB gz to the client — which is why it belongs *after* the 3D gate, loaded the
same lazy way `three` is.

### 4. Screaming Frog / Lighthouse CI — the parts CI cannot see
`lighthouse-ci` (open source) can enforce *score floors*, not just budgets: fail the PR if desktop
perf drops below 95 or mobile below 85. That is the difference between "we respect the budget" and
"we respect the experience". Screaming Frog's free 500-URL crawl is worth one run before launch for
crawl traps, duplicate titles and orphan pages.

### 5. Uptime + DNS + email auth — the unglamorous half
- **Better Stack / UptimeRobot**: 60-second checks on `/` and `/api/public/*`, alert to WhatsApp.
- **Cloudflare in front of Vercel** (free): the domain is `.my.id`, and Cloudflare gives you caching,
  bot filtering, and analytics for free. Optional — Vercel's edge is already good.
- **SPF, DKIM, DMARC** on `akbarnawasunda.my.id`. The contact email is printed on the site; without
  DMARC, anyone can spoof it. This is a DNS task, not a repo task, and it matters more than any
  library on this list.

### 6. Things that sound impressive and are not worth it here
- **Storybook** — three components are shared; the site itself is the story.
- **Chromatic / visual regression cloud** — Playwright screenshots in CI cover it for free.
- **Supabase / Firebase** — the data layer is Turso + Drizzle and it works (D-104).
- **Any "AI website builder"** — the point of this repo is that a human made these decisions.

### The one GitHub feature nobody uses and everyone should
**`CODEOWNERS` + branch protection on `main`.** The repo has a single maintainer, so protection feels
pointless — until one force-push erases a week. Required status checks = the CI job above; no force
push; no direct commits to `main`. Five minutes, and it is the difference between a hobby repo and a
professional one.
