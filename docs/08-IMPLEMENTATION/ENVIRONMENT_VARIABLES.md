# ENVIRONMENT_VARIABLES

## Required (Vercel Project Settings)

```env
# Turso
TURSO_DATABASE_URL=libsql://[your-db].turso.io
TURSO_AUTH_TOKEN=eyJ...

# Auth
AUTH_SECRET=random-32-chars-min
AUTH_URL=https://akbarnawasunda.my.id

# Optional Vercel Blob for uploads
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Admin seed (for initial migration only, remove after)
ADMIN_EMAIL=admin@akbarnawasunda.my.id
ADMIN_PASSWORD_HASH=$2b$10$...
```

## Rules
- NEVER expose TURSO_AUTH_TOKEN or AUTH_SECRET to client
- Never commit .env to repo
- Use Vercel Environment Variables: Production, Preview, Development
- For local dev: .env.local (gitignore)

## Setup Steps
1. Create Turso DB: turso db create akbar-nawasunda
2. Get URL: turso db show akbar-nawasunda --url
3. Get token: turso db tokens create akbar-nawasunda
4. Add to Vercel env
5. Run drizzle migration: npm run db:migrate
