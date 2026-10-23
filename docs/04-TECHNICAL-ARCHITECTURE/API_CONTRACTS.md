# API_CONTRACTS

## Public (no auth)
- GET /api/public/releases → Release[] published only, sorted year desc
- GET /api/public/releases/:slug → Release published or 404
- GET /api/public/visuals → Visual[] published
- GET /api/public/links → Link[] verified

## Studio (auth cookie)
- POST /api/studio/login {email,password} → 200 set httpOnly cookie or 401
- POST /api/studio/logout
- GET /api/studio/releases (includes drafts)
- POST /api/studio/releases
- PUT /api/studio/releases/:id
- DELETE /api/studio/releases/:id
- POST /api/studio/upload → {url} after validation
- GET /api/studio/preview?token=... → preview draft page

All studio routes: 401 if no session, 403 if not owner.

Public must NEVER return draft.
