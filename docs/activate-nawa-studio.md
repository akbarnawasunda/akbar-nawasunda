> **Security update (2026-10-15, stage 2):** Unauthenticated browser hash generation
> is now available only with `NODE_ENV=development` in a trusted local environment.
> Production `/studio/setup` with no hash shows a generic offline-setup notice, not
> the generator or diagnostics. Generate the hash locally with `npm run studio:hash-password`
> (password via stdin), or use local development setup, then set the host environment.
> Never delete an existing production hash to enable bootstrap. Rotate it directly
> across all workers/deployments and retire stale previews; keep preview DB credentials separate.
> Older phone-only setup instructions below are superseded where they imply public
> production hash generation. See `security-review-stage2.md` for remaining limitations.

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

**Do not delete the existing hash.** The browser generator on `/studio/setup` is offline-only in production
(see the security update at the top), so deleting the variable does not bring it back. It only locks you out
until you set a new value offline.

1. On a trusted computer with Node.js, generate the new hash locally. The password is read from stdin and is
   never written to disk or sent anywhere:
   ```bash
   read -rs PW && printf '%s' "$PW" | npm run -s studio:hash-password && unset PW
   ```
   Copy the output (it starts with `scrypt:`). Do not paste it into chat or a ticket.
2. In Vercel, **replace** the value of `STUDIO_ADMIN_PASSWORD_HASH` with the new hash, for Production and
   Preview, then redeploy.
3. Sign in on the new deployment.
4. **Sessions and stale deployments.** Each session is bound to the hash that was active when it was created.
   After the hash changes, sessions made with the old hash stop working on any deployment that reads the new
   value. A deployment that still has the old value keeps accepting its sessions. Before you treat the reset
   as finished, redeploy or retire every older deployment (preview deployments included) and make sure none of
   them still has the old hash. Then sign out on devices you no longer use.
5. Phone-only reset is not possible after this change. A reset needs a computer with Node.js, or the owner's
   trusted local environment.

### If you are locked out (login lockout)

**Why it happens.** The Studio counts every sign-in attempt, correct or wrong, in one shared counter. After
five attempts inside a 15-minute window, further attempts are refused with "Too many password attempts". The
window is fixed: it ends 15 minutes after the first attempt in it. Refused attempts do not extend it. The
counter is shared by all devices and browsers, so anyone who can reach `/studio/login` can use up the budget.
That is the deliberate trade-off that protects the password from guessing. Several legitimate sign-ins in
quick succession (for example, from more than one phone) can also trigger it.

**Which records are involved.** Only one row: `studio_login_failures`, with the attempt count and the window
start time. Sessions (`studio_sessions`), pages, releases, and design settings are not affected by the
lockout. Waiting deletes nothing.

**Recovery, in order:**

1. Stop signing in. Read the message: "Too many password attempts" means the lockout. "Incorrect password"
   means a wrong password, which the steps below do not fix.
2. Check that nobody else is trying. Close other tabs and devices. If the lockout keeps coming back, someone
   else is using the budget, and clearing it will not help.
3. Wait at least 15 minutes after your last attempt, then try once.
4. If you still cannot sign in, the next step depends on where the database is:
   - **Local development only:** stop the local server, export your content first from `/studio/export`
     (keep the file safe), then delete only the lockout row in your local file database, for example with the
     `sqlite3` command-line tool if it is installed:
     `sqlite3 data/studio.db "DELETE FROM studio_login_failures WHERE id = 1;"`
     Never delete `data/studio.db` itself. It holds your drafts.
   - **Production:** this is a separately approved production operation. It is not described here as a
     routine step. It requires a verified backup or export, the database provider's own authenticated shell,
     a single-row change limited to `studio_login_failures`, and a note of the date and time without any
     credentials. It must never be done through an HTTP endpoint, a script in the repository, or by editing
     source code.

**Never do these as a workaround:**

- Raise the attempt limit or the window length, or disable the lockout. That weakens protection against
  password guessing for every visitor.
- Add a bypass, a backdoor, or an emergency password, or a public reset endpoint.
- Delete `STUDIO_ADMIN_PASSWORD_HASH` to reopen setup (see above).

**Keep secrets out of support requests.** Do not paste cookies, passwords, hashes, database URLs, tokens, or
full error text into chat, tickets, or screenshots. Describe the message you saw and the time.

**Limits of this procedure.** The lockout is one global budget, so it cannot tell an attacker from the owner.
Stopping an ongoing attack needs host-level controls and separation of the admin area, which are not part of
this codebase yet. See `security-design-stage3.md`.

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
