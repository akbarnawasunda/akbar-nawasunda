# AGENTS.md — Entry Point for All Coding Agents

**Project:** Akbar Nawasunda Official Website
**Owner:** Idel Akbar Ramadan (Akbar Nawasunda) — Bandung Barat, ID
**Domain:** akbarnawasunda.my.id
**Last Updated:** 2026-10-22

## 1. Your Mandate
You are building the digital home for a real independent music artist. Not a template. Every decision MUST be traceable to verified facts or to an explicit assumption in `ASSUMPTIONS_AND_OPEN_QUESTIONS.md`.

## 2. Reading Order (MUST)
1. This file `AGENTS.md`
2. `docs/00-PROJECT-FOUNDATION/PROJECT_CHARTER.md`
3. `docs/00-PROJECT-FOUNDATION/PRD.md`
4. `docs/01-BRAND-IDENTITY/BRAND_IDENTITY.md` + `FACTS_AND_VERIFICATION.md`
5. `docs/02-DESIGN-SYSTEM/DESIGN.md` + `3D_ART_DIRECTION.md`
6. `docs/03-USER-EXPERIENCE/SITEMAP.md` + `PAGE_SPECIFICATIONS.md`
7. `docs/04-TECHNICAL-ARCHITECTURE/TECHNICAL_SPEC.md` + `ARCHITECTURE.md`
8. `docs/08-IMPLEMENTATION/DECISION_LOG.md` + `IMPLEMENTATION_ROADMAP.md`
9. `docs/07-QUALITY-AND-TESTING/ACCEPTANCE_CRITERIA.md`

## 3. Identity Rules (MUST)
- Primary: **AKBAR NAWASUNDA**
- Historical alias: **DJ AKBAR REMIX** — MUST be presented as evolution, not separate person. Format: "Akbar Nawasunda (formerly DJ Akbar Remix, since 2020)"
- Do NOT invent releases, awards, stats, press, booking info.
- Verified facts: Lahir 1 Nov 2005 Bandung Barat, active since 2020, genres: Breakbeat / Indo Bass / Jedag Jedug / Jungle Dutch, releases verified: "Masih Mencintainya - Papinka (2025)", "Cinta Terbuang", "Masih Dihatiku", "Bayang Tanpa Kata", "Pada Imut Aisyah Tak Belagu". Source: Medium bio + sndo.ffm.to + akbarnawasunda.my.id
- All other releases = PLACEHOLDER — label as `UNVERIFIED`.

## 4. Design Authority
- Design source of truth: `DESIGN.md` + `DESIGN_TOKENS.md`. If conflict, `DESIGN_TOKENS.md` wins for values, `DESIGN.md` wins for intent.
- 3D source of truth: `3D_ART_DIRECTION.md`. Do NOT add random particles/spheres.
- Palette: Near-black #0A0A0E / #101012, charcoal #1A1A22, midnight-blue #0E1A2E, icy-cyan #8AE8FF, signal-blue #0087FF, purple #7800FF. No neon green, no glassmorphism everywhere.
- Typography: Headlines editorial bold (e.g., Sora / Syne / General Sans), body: Inter / Satoshi. Tight tracking, never unreadable futuristic fonts.

## 5. Technical Constraints (MUST)
- Inspect repo first. Do NOT assume Next.js / Supabase / etc. Read package.json, file structure.
- Performance budget: JS initial <180kb gzipped, LCP <2.5s on mid Android, 3D MUST have fallback. If WebGL fails, content remains readable.
- Mobile-first: Test on real Android. 3D disabled by default on low-power.
- Do NOT push to production branch, do NOT expose secrets, do NOT store admin password plaintext.

## 6. Content Rules
- All artist copy MUST cite `FACTS_AND_VERIFICATION.md`.
- Placeholder pattern: `[NEEDS OWNER: ...]` — never silently assert.
- Social links only from `SOCIAL_LINKS.md` verified list.

## 7. Studio/CMS
- Owner-controlled CMS, not mandatory external SaaS. Auth required. Draft vs Published separation MUST.
- Public site MUST NOT expose draft data.

## 8. Conflict Resolution
If two docs conflict, do NOT choose randomly. Log in `DECISION_LOG.md` with Issue ID, severity, docs involved, and ask owner if Critical/High affecting brand, security, cost, architecture. Safe reversible decisions MAY be made with documented assumption.

## 9. Definition of Done
A task is done only if: code exists + acceptance criteria from `ACCEPTANCE_CRITERIA.md` met + screenshot evidence mobile/desktop + no console errors + performance budget not exceeded.

## 10. Prohibited
- Generic DJ template clone
- Fake testimonials, fake listener counts
- Paid service without approval
- Adding newsletter/tracking without privacy doc
- Rewriting Git history
