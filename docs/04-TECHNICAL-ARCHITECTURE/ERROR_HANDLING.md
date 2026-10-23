# ERROR_HANDLING

- Public pages: if release not found → 404 custom with AN ghost
- API: JSON {error,message} with correct status, no stack in prod
- 3D: try/catch init, on error fallback static, log to console, event 3d_error
- Upload: show user friendly message mime/size
- Studio: form validation inline, toast error
- Offline: public pages still readable from cache (if PWA? out of scope v1, but at least no crash)
