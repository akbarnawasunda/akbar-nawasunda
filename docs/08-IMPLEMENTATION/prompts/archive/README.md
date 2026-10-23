# Prompt archive

Superseded prompts, kept for history only. **Nothing in this folder is read by the agent or by the
site.** The source of truth for the current work is `AGENTS.md` plus the phase sections in
`docs/08-IMPLEMENTATION/`.

| File | What it was | Superseded by |
|---|---|---|
| `PROMPT_AWAL_AGENT.md` | The first bootstrap prompt (Phase 0–1 handover) | `AGENTS.md` + `docs/08-IMPLEMENTATION/PHASE_0_AUDIT_AND_PHASE_1.md` |
| `AGENTS_2.md` | An older copy of the agent entry point | `AGENTS.md` at the repo root |
| `README_2.md` | A duplicate of the documentation-package README | `README.md` at the repo root |

Archived on 2026-10-23 so the repository root carries only the entry documents
(`AGENTS.md`, `README.md`, `HANDOFF_TO_CODING_AGENT.md`, `CLAUDE.md`,
`GITHUB_REPO_README.md`) and config files.

Note: a file named `PROMPT_FINAL_V10_SINGLE_SOURCE.md` was requested as the single source of truth on
2026-10-23, but it does not exist in this checkout or in `origin/main`. The brief delivered in chat
was used instead, and every rule from it is recorded in `DECISION_LOG.md` (D-055…D-061) and in
`PHASE_0_AUDIT_AND_PHASE_1.md` §18 so it survives outside the conversation.
