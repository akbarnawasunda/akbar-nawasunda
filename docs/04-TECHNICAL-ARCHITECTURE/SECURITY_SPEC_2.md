# SECURITY_SPEC — v2 with Real Upload Handling

- Auth: bcrypt 10 rounds, httpOnly Secure SameSite Lax cookie, expiry 7 days
- Session stored server side (or JWT signed)
- Upload: mime check image/jpeg/png/webp, magic bytes, size 5MB max, filename sanitized ulid + ext, store /public/uploads, no exec, virus scan? optional
- Rate limit: login 5/min IP, upload 20/hour, use upstash or in-memory
- CSRF: SameSite + token for forms
- XSS: sanitize markdown, no dangerouslySetInnerHTML without DOMPurify
- Headers: CSP default-src self; script-src self; style-src self unsafe-inline; img-src self data https:; connect-src self
- No secrets in client, env server only
- Logging auth attempts, publish, no password
- Backup daily JSON export
