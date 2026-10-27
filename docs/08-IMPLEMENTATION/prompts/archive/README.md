# Prompt archive

Superseded prompts, kept for history only. **Nothing in this folder is read by the agent or by the
site.** The source of truth for the current work is `AGENTS.md` plus the phase sections in
`docs/08-IMPLEMENTATION/`.

| File | What it was | Superseded by |
|---|---|---|
| `PROMPT_AWAL_AGENT.md` | The first bootstrap prompt (Phase 0–1 handover) | `AGENTS.md` + `PHASE_0_AUDIT_AND_PHASE_1.md` |
| `PROMPT_REDESIGN_FROM_REFERENCES.md` | Homepage redesign from four visual references (SVG-first era) | §16–18 of the audit, D-0xx rows |
| `PROMPT_PHASE7_3D_MUSIC_NOTES_AND_ARTWORK.md` | The WebGL "music notes" phase | **withdrawn** — D-055 deleted the Liquid Signal |
| `PROMPT_HAPUS_SIGNAL_ANTI_AI.md` | First "remove the AI-looking signal" brief | D-055…D-062 |
| `PROMPT_FINAL_V9_ANTI_AI_REAL_ASSETS.md` | Anti-AI brief with real assets and auto artwork | D-055…D-062 |
| `PROMPT_FINAL_V10_SINGLE_SOURCE.md` | "Single source of truth" anti-AI brief | D-055…D-062 |
| `PROMPT_FINAL_V11_CLEAN_REPO.md` | The brief this build was executed against (clean root, real assets, sleeves) | §18–20 of the audit, D-063…D-070 |
| `AGENTS_2.md` | An older copy of the agent entry point | `AGENTS.md` at the repo root |
| `README_2.md` | A duplicate of the documentation-package README | `README.md` at the repo root |
| `cleanup-prompts.sh` | The owner's shell snippet for moving prompts out of the root | Replaced by the archive policy itself |

Archived on 2026-10-23 so the repository root carries only the entry documents
(`AGENTS.md`, `README.md`, `HANDOFF_TO_CODING_AGENT.md`, `CLAUDE.md`,
`GITHUB_REPO_README.md`) and config files.

## Where V9–V11 came from

The first pass through V11 ran from the brief pasted into chat, because `PROMPT_FINAL_V10_SINGLE_SOURCE.md`
was not in the checkout or in `origin/main` at that moment. The owner then re-uploaded the repository
to `main` through the GitHub web UI, and that upload contains all four V-series prompts. They were
copied here on 2026-10-23 and **checked against the build**: no requirement in V11 was missed. The
deliberate deviations are recorded in `DECISION_LOG.md`:

| V11 says | Build does | Why |
|---|---|---|
| Titles in **Sora** | **Syne** | Sora is not vendored in the repo; Syne is the site's display face and the only one with an OFL file in `src/assets/fonts/` (D-059) |
| Genre pill on each sleeve | `RILIS 0X / 06` | Genres are verified for the artist, not per song (D-066) |
| `+5 tahun` | `+6 tahun` (2020→2026) | Derived from `siteConfig.since`; 5 would be a wrong number (D-070) |
| `logo-an.png` as the 10% ghost | `brand/an-mark.webp` | `logo-an.png` is a JPEG with a white background and cannot be a watermark (D-063) |
| White text on the `#0087FF` pill | Near-black text on the same blue | White on that blue is 3.55:1 and fails WCAG AA; near-black is 5.56:1 (D-071) |
