# Remediation — commit `7c6ae8b` → round 40

Follow-up to `FULL-AUDIT-2026-10-27.md`. Six phases, one commit each, in the order the audit ranked
the damage: security first, then the two things a visitor could actually see, then weight, then
discoverability, then hygiene.

| Phase | Commit | What it fixed |
| --- | --- | --- |
| 1 | `49bc12a` | Next.js RCE advisory, React patch, a dependency gate in CI |
| 2 | `6c001dd` | 7 of 14 release pages printing `Jenis —` / `Tahun —` |
| 3 | `6765d78` | 6.8 MB of QA screenshots served from the production origin |
| 4 | `2032706` | 7 dead components, a dead stylesheet, 8 unused font binaries |
| 5 | `f3433e3` | teal OG accent, uncacheable release pages, no release structured data |
| 6 | this commit | reduced-motion floor, prompts out of the repository root |

## 1 — Security

`next` and `eslint-config-next` 16.4.x → **16.4.3** (GHSA-673q-mjm6-r5xr, RCE), `react` /
`react-dom` → **19.3.1**. `npm audit --omit=dev` went from *1 critical* to **0 vulnerabilities**.
`ci.yml` gained a `Security audit (dependencies)` step and `package.json` an `audit:deps` script
(`npm audit --audit-level=high --omit=dev`), so the gate is the same one the owner can run locally.

## 2 — Release data resilience

`ReleasePlate` used to print a `<dt>`/`<dd>` pair for every fact and fall back to an em dash when the
value was missing — seven of fourteen pages therefore showed `Jenis —`, `Tahun —` in a data sheet.
Both are gone: `visibleFacts` drops any fact without a confirmed value, and when the list is empty
the whole `Lembar data` section is not rendered rather than rendered hollow. A release with no
official link no longer says "Tautan mendengarkan …"; it says *"Rilis arsip ini belum
didistribusikan secara resmi ke platform streaming publik."* and offers
*"Dengarkan rilis lainnya di diskografi →"* to `/music`.

## 3 — Asset isolation

- `public/review-shots/*.png` → `artifacts/review-shots/` (11 files, still committed, no longer
  routed). `scripts/review-shots.mjs` and `.github/workflows/review-shots.yml` follow.
- The three master originals that lived in `docs/05-CONTENT-AND-ASSETS/assets/` moved to
  `AKBAR-NAWASUNDA-ASSETS/`, where the rest of the owner's originals already were — one answer to
  "which file is the master". `build-epk.sh` and `build-web-assets.sh` point there now; the unused
  copies that had been sitting in `public/assets/` are deleted.
- `.vercelignore` exists: `artifacts/`, `docs/`, `*.md`, `tests/`, `.git/`, local env. It
  deliberately does **not** exclude `AKBAR-NAWASUNDA-ASSETS/`, which `src/assets/manifest.ts`
  imports at build time.
- Found on the way: `scripts/check-assets.mjs` compared `buf.toString("ascii", 0, 4)` against
  `"\x89PNG"`, which can never match (ascii decoding masks the high bit), so **every genuine PNG**
  was reported as "not a recognised image". Fixed to compare the eight signature bytes.

## 4 — Dead code and unused fonts

Deleted, each after grepping for an importer: `CataloguePin`, `PaperAbout`, `ReleaseGrid`,
`MagneticCursor`, `Magnetic`, `Tilt3D` (plus their stylesheets), the orphaned
`(site)/music/[slug]/release.module.css`, and the font binaries nothing loaded — `anton-latin-400`,
`neo-latina-demo-FFP`, `space-grotesk-latin-wght-normal`, `public/fonts/instrument-serif-og{,-italic}.ttf`.

The three purchased licensed faces (`Excess V Straight`, `Relidux` are live; `Psychlone`, `Impact
Label`, `Marseloup` are retired but deliberately kept) stay where they are.

Two consequences worth naming: the round-35 tests that asserted the internals of `MagneticCursor`
were removed with the component (they could only fail if a dead file was *edited*), and
`audit:tokens` immediately caught the four cursor tokens the deleted component had been the only
reader of. 147 → 144 tests, 119 → 115 tokens.

## 5 — Cache, cards, structured data

- `/og`: the accent was `#2E8C86`, a teal that appears nowhere in the design system. Now
  `#0087FF` — verified by decoding the rendered PNG: **676 pixels of `#0087FF`, zero of the teal**.
- Site layout: `force-dynamic` → `revalidate = 3600`. That one line had made **all 21 routes**
  `Cache-Control: private, no-cache`, and every publish action already called
  `revalidatePath("/", "layout")`, so the cache was safe the whole time. `/music`, `/artist` and the
  release route followed (each already had the revalidation hook it needed).
- Release route: `generateStaticParams` over the 10 catalogue slugs ∪ published Studio releases,
  `dynamicParams = false`, `force-static` → **14 release pages now prerendered (`●`)**, served
  `s-maxage=3600`.
- Each release page now carries `MusicRecording` and `BreadcrumbList`, built by
  `src/lib/structured-data.ts` from fields the page already prints: no `datePublished` without a
  verified date, no `image` for a generated sleeve, no `sameAs` without a listening link. Four tests
  in `tests/studio/seo.test.ts` hold that line.

## 6 — Motion and hygiene

`globals.css` gained one deliberate reduced-motion floor (`scroll-behavior`, animation and
transition duration/delay/iteration on every element, including `::before`/`::after`), documented as
the floor and not the ceiling — the 16 module-level escapes and the `matchMedia` guards stay. The
dead `html[data-cursor="on"] { cursor: none }` rule went with the cursor.

Repository root: seven `PROMPT_*.md`, the handover note and an older English `AGENTS.md` moved to
`docs/08-IMPLEMENTATION/prompts/` (with an index of what each one was); `README_2.md`, byte-identical
to `README.md`, was deleted.

## Gates

```
typecheck ✓   lint ✓   audit:tokens 115 ✓   audit:fonts ✓   assets:check 31 ✓
test 148/148 ✓   build 0 ✓   check:web ✓ (JS 189.6 KB gz · CSS 15.7 KB gz)   smoke 28/28 ✓
```

`npm run a11y`, `npm run qa:motion` and `scripts/review-shots.mjs` need a Chrome binary. This
sandbox has none and the download host (`googlechromelabs.github.io`) is outside its egress
allowlist, so they were **not run** for this round rather than reported green. Run them in CI, where
Chrome is installed by the workflow.
