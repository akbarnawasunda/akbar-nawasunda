# Activating NAWA STUDIO

This is the phone-first path from "the deployment says Setup required" to a working Studio at
`/studio/login`. Every step below can be done in a mobile browser. No terminal is needed.

Status of this document: written 2026-10-15 against the code in this repository. The activation page
(`/studio/setup`) is the source of truth for whether a deployment is ready — it checks the real
settings and the real database, so trust its output over this text if the two ever disagree.

## What you need first

1. Access to the Vercel project for this repository.
2. A database account. Turso Cloud is the candidate: its **libSQL** databases are what
   `@libsql/client` in this project talks to. Check current free-tier limits on Turso's own pricing
   page before you rely on them.
3. Five minutes, and one password you will remember for a long time.

## Step 1 — Create the administrator password hash

1. Open `https://<your-site>/studio/setup`.
2. Under **Create the administrator password**, type the password twice and press **Generate hash**.
3. Tap the generated box so the whole value is selected, copy it, and keep it on the clipboard or in a
   note. It starts with `scrypt:` and is long. The password itself cannot be recovered from it, so keep
   the password somewhere safe too.

Notes:

- This tool is only offered while `STUDIO_ADMIN_PASSWORD_HASH` is unset, so it switches itself off the
  moment the Studio is activated. That is deliberate: it must not stay available as a public hashing
  service.
- If the box appears empty after copying, the value was probably cut off. Copy it again and check that
  it still starts with `scrypt:` and has five `:` separators.

## Step 2 — Create the database

In the Turso Cloud dashboard, in a mobile browser:

1. Sign in (GitHub sign-in is the quickest route).
2. Create a database. Name it something clear, for example `akbar-nawasunda-studio`.
3. Choose the region closest to your visitors. For Indonesia that is Singapore (`sin`) if it is offered.
4. **Make sure it is a libSQL database, not the new Turso Database engine.** Turso Cloud hosts both;
   this project speaks libSQL. In the CLI the difference is the `--tursodb` flag: omit it. The
   connection URL of the right database starts with `libsql://`.
5. Copy the database URL. It looks like `libsql://akbar-nawasunda-studio-<org>.turso.io`.
6. Create a token for that database with **write** access, and copy it. A read-only token cannot create
   the Studio's tables, so the app will report a connection problem even though the URL is correct.

Button labels and layout in the dashboard change from time to time. What matters is that you end up
with a URL that starts with `libsql://` and a token that may write.

## Step 3 — Put the values in the hosting environment

On Vercel: open the project → **Settings** → **Environment Variables** → add three variables.

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the `libsql://…` URL from step 2 |
| `DATABASE_AUTH_TOKEN` | the write token from step 2 |
| `STUDIO_ADMIN_PASSWORD_HASH` | the `scrypt:…` value from step 1 |

Apply each of them to **Production** and **Preview**. Then redeploy: **Deployments** → the newest
deployment → the `⋯` menu → **Redeploy**. Vercel applies environment changes only to new deployments,
so an existing deployment keeps the old values until it is redeployed.

## Step 4 — Confirm on the same page

1. Reload `https://<your-site>/studio/setup`.
2. Every row should be green, and **Database connection and tables** should read that all three Studio
   tables exist. The tables are created automatically the first time the app connects.
3. Optional: under **Not sure the password is the right one?**, type the password to check it against the
   stored hash without signing in.
4. Open `https://<your-site>/studio/login` and sign in.

## When something is wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| The activation page still says a variable is not set | The deployment did not read the new values | Redeploy, then reload. Check the variable name for typos and that it applies to the environment you are visiting |
| `Could not connect: …` | The URL or token is wrong, the database was deleted or paused, or the token is read-only | Re-copy the URL and create a fresh write token. Confirm the URL starts with `libsql://` |
| `Connected, but these tables are missing` | The token cannot write | Create a token with write access and redeploy |
| `A Postgres connection string cannot be used here` | A Neon/Supabase-style URL was pasted | Create a libSQL database instead; this project stores content in libSQL |
| Sign-in says the password is incorrect | The hash was generated from a different password | Do the password reset below |
| "Too many failed attempts" | Five wrong tries inside 15 minutes | Wait for the window to pass, then try again |
| A file database warning | `DATABASE_URL` starts with `file:` on the deployed site | Use a `libsql://` URL in production; a file database only belongs on your own computer |

### Resetting the administrator password

1. In Vercel, delete the `STUDIO_ADMIN_PASSWORD_HASH` variable (or clear its value) and redeploy.
2. Open `/studio/setup` again. The generator is offered again.
3. Generate a new hash, add the variable back, redeploy, and sign in.
4. Old sign-in sessions stay valid until they expire (seven days). Sign out on devices you no longer use,
   or wait it out.

## What activation does not turn on

- **Image uploads.** The Media page stays read-only until the storage integration is written. The owner
  chose Vercel Blob as the provider; see `docs/nawa-studio.md` for what that needs.
- **Navigation and SEO editors.** Those are still stored in code (`src/config/navigation.ts`,
  `src/lib/metadata.ts`).
- **A custom domain.** The Studio works on the `*.vercel.app` URL. Pointing the real domain at this
  project is a separate decision and has not been made here.

## Doing it locally instead (development)

```bash
cp .env.example .env.local          # then set DATABASE_URL=file:./data/studio.db
read -rs PW && printf '%s' "$PW" | npm run -s studio:hash-password && unset PW
npm run dev                         # then open http://localhost:3000/studio/setup
```

A local file database needs no token. Never commit `.env.local`; it is gitignored.
