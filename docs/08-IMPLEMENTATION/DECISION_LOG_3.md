# DECISION_LOG — v3 with Vercel+Turso Confirmed

| ID | Date | Decision | Why | Alternatives | Impact | Status |
|---|---|---|---|---|---|---|
| D-001 | 2026-10-22 | Single evolving 3D scene Liquid Signal | Perf mobile | Multiple scenes | Lower bundle | APPROVED |
| D-002 | 2026-10-22 | Dark mode only v1 | Brand dark editorial | Light toggle | Simpler | APPROVED |
| D-003 | 2026-10-22 | JSON local v1 → superseded by Turso | Avoid paid, but owner already has Turso | Sanity | Zero cost edge | SUPERSEDED |
| D-003b | 2026-10-23 | Turso libSQL + Drizzle on Vercel | Owner already created Turso, Vercel native, edge compatible | Supabase | Official DB | VERIFIED APPROVED |
| D-004 | 2026-10-22 | Primary Akbar Nawasunda, DJ Akbar Remix history | Medium bio + site | Separate | Clear | VERIFIED |
| D-005 | 2026-10-22 | Palette #0A0A0E/#101012/#0087FF/#7800FF/#8AE8FF | Portrait + logo | Generic purple | Matches assets | APPROVED |
| D-006 | 2026-10-23 | AN mark transparent with white stroke | Uploaded JPG white bg not suitable dark | JPG | Better contrast | APPROVED |
| D-007 | 2026-10-23 | Portrait official akbar-nawasunda-official-portrait.jpg | Only high-res | AI | Authentic | VERIFIED |
| D-008 | 2026-10-23 | Full lockup only for history/footer/EPK | Too wide nav | Everywhere | Scalable | APPROVED |
| D-009 | 2026-10-23 | Portrait 1346KB must compress WebP ~140KB | Perf budget | Keep original | LCP fail | MUST |
| D-010 | 2026-10-23 | Hosting Vercel | Owner confirmed | Cloudflare | Vercel Blob easy | VERIFIED APPROVED |
| D-011 | 2026-10-23 | Social links verified: Spotify, YT @akbarnawasunda, SoundCloud, TikTok | Owner provided | Guess | No broken links | VERIFIED |
| D-012 | 2026-10-23 | Storage Vercel Blob for uploads (free tier 1GB) + fallback local dev | Vercel native, works with Turso | S3/R2 | Simplest | PROPOSED needs owner approve cost |

