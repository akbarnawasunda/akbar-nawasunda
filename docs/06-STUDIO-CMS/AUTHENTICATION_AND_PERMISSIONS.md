# AUTHENTICATION_AND_PERMISSIONS

- Single admin v1, email [NEEDS OWNER] + password hashed bcrypt
- Session httpOnly Secure SameSite Lax, 7 days, refresh on activity
- No role matrix v1, all authenticated can do all studio actions
- Rate limit login 5/min
- Password reset? OUT OF SCOPE v1, owner can reset via env or direct DB
- Session expiration 401 → redirect /studio/login
