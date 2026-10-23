# ACCEPTANCE_CRITERIA — Concrete Proof Required

## Homepage
- [ ] H1 "AKBAR NAWASUNDA" visible within 5s, without scroll
- [ ] CTA "Dengar Sekarang" links to verified latest release Spotify (screenshot)
- [ ] No fake stats, no invented releases
- [ ] 3D Liquid Signal present desktop, fallback static mobile — screenshot both
- [ ] LCP <2.5s evidence Lighthouse

## Music
- [ ] All verified releases appear with correct year and cover 1:1
- [ ] Each release detail has at least 1 platform link working

## 3D
- [ ] Meaning documented, not generic sphere
- [ ] Single scene, cleanup on unmount verified via memory tab
- [ ] Reduced-motion disables morph (test prefers-reduced-motion)
- [ ] If WebGL unavailable, content still readable (test via chrome://flags disable WebGL)

## Studio
- [ ] Login with wrong password fails, rate limit works
- [ ] Draft not accessible via /api/public (test curl)
- [ ] Upload invalid .exe rejected
- [ ] Publish toggle changes public site after ISR

## Security
- [ ] No secret in client bundle (grep)
- [ ] CSP header present

## Mobile
- [ ] Tested on real Android Chrome, iOS Safari (or BrowserStack) — screenshots 390px, 768px, 1280px
