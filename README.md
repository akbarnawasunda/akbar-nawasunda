# akbar-nawasunda

Official website foundation for Akbar Nawasunda (electronic music producer, remixer, DJ).
This repository is a new Next.js + TypeScript project; it does not reuse any previous site code.

## Requirements

- Node.js 22 (see `.nvmrc`; Node 20.9+ is the minimum)
- npm

## Commands

```bash
npm install
npm run dev        # development server on 0.0.0.0:3000
npm run build      # production build
npm run start      # serve the production build on 0.0.0.0:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run check      # typecheck + lint + build
```

## Structure

```
src/
  app/                  Routes only (App Router). Pages compose components; they hold little logic.
    layout.tsx          Root layout, metadata defaults, viewport, font variable.
    page.tsx            Placeholder home page (production site not yet built).
    experiments/lattice Isolated visual study 01 (noindex).
  config/site.ts        Site identity and metadata source of truth.
  lib/fonts.ts          Font loading (vendored font, no runtime third-party requests).
  styles/               Design tokens (tokens.css) and global styles.
  components/layout/    Reusable layout primitives (Container).
  effects/              Reusable, content-agnostic motion/media hooks.
  experiments/          Self-contained visual studies; each one owns its files.
  assets/fonts/         Vendored font files and license.
```

Conventions:
- Colours, spacing, type sizes, motion curves and z-layers come from `src/styles/tokens.css`.
- Components use CSS Modules co-located with the component.
- Effects sit in a layer beneath content (`--z-effects` < `--z-content` < `--z-chrome`).
- Animation code keeps its state in refs and never triggers React re-renders per frame.

## Visual study 01 — Lattice

Route: `/experiments/lattice` (not indexed).

A grid of points forms a sound-surface: two slow interference waves, and a ring that
travels outward once per beat (124 BPM). Rendered with Canvas 2D; no 3D library.
Tunables live in `src/experiments/lattice/lattice-config.ts`.

Performance behaviour:
- Point density is reduced below 720px wide.
- Device pixel ratio is capped at 2.
- The loop pauses when the canvas is off-screen or the tab is hidden.
- `prefers-reduced-motion` renders one static frame and redraws only on resize.

## Official assets

Original brand and website files live in `AKBAR-NAWASUNDA-ASSETS/` and are never edited in place.

- `src/assets/manifest.ts` is the registry: stable ids, roles, status, alt text, and build-time dimensions.
- `src/assets/asset-checksums.json` records a SHA-256 for every file. Run `npm run assets:check` to verify.
- Regenerate checksums only after a deliberate change: `node scripts/check-assets.mjs --update`.

Plan for the content management system: `docs/nawa-studio.md`.
