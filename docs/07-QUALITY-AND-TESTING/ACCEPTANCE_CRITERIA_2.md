# ACCEPTANCE_CRITERIA — v2 with Assets

## Homepage
- [ ] H1 AKBAR NAWASUNDA visible 5s, portrait official LCP <150KB WebP, CTA links verified Spotify
- [ ] AN mark transparent used in nav 32px, not JPG white bg
- [ ] 3D Liquid Signal behind portrait, fallback static if WebGL disabled — screenshot both
- [ ] No fake stats

## Music
- [ ] Verified releases appear with 1:1 cover, year correct

## 3D
- [ ] Single scene, meaning documented Liquid Signal, cleanup verified, reduced-motion disables morph

## Studio
- [ ] Draft not accessible via /api/public (curl test)
- [ ] Upload invalid rejected
- [ ] Publish <3 min

## Performance
- [ ] Portrait original 1346KB must be compressed — fail if still >200KB
- [ ] LCP <2.5s evidence
- [ ] Lighthouse a11y >90

## Visual Check
- [ ] Screenshots 390,768,1280 for all public pages
