# SECURITY_SPEC

- Auth: password hashed bcrypt 10 rounds, no plaintext, session httpOnly secure cookie, expiry 7 days, refresh on activity
- Upload validation: mime whitelist image/jpeg, image/png, image/webp, max 5MB, check magic bytes, sanitize filename, no executable
- Rate limiting: /studio/login 5/min per IP, upload 20/hour
- CSRF: SameSite Lax + token for forms
- XSS: escape all user content, no dangerouslySetInnerHTML for bio unless sanitized
- SQL injection: use ORM / prepared statements if DB
- Headers: CSP default-src self, script-src self, img-src self data https, style-src self unsafe-inline (Tailwind)
- Public/private boundary: /api/public only returns published, /api/studio requires auth
- No secrets in client bundle, env vars server only
- Logging: auth attempts, publish actions, no PII passwords
- Backup: daily JSON export of releases

Test: upload invalid file, try access draft via public API, try CSRF.
