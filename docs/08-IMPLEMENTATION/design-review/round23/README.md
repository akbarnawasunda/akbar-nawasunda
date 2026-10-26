# Round 23 — the free-rein pass, second movement

Owner's grant, twice confirmed: full freedom, every file. Three additions, all native, all
inside the contracts.

## 1. The discography rail (home, under the index rows)

Ten sleeves in a horizontal scroll-snap rail: native overflow, no script, no second loop — a
thumb does the work. The index rows stay for readers, the rail is for hands; each sleeve keeps
its title and mono meta underneath because a sleeve without its title is a texture, not a
release. `qa:motion` still asserts zero horizontal page overflow at five widths: the scroller
is the only element allowed to overflow.

## 2. The empty stage, full-bleed (/artist)

The one frame the home hero only wears as a backdrop — panggung kosong, satu lampu sorot —
gets its own full-bleed band between the facts and the bio, on the site's one scroll engine,
with a mono caption *under* the image: type over a photograph is the one thing this doctrine
never does.

## 3. The index arrives one row per beat

Rows slide home 60 ms apart when the band is first seen. Transform only, never opacity: the
first attempt wrapped each row in the shared `Reveal` (an opacity entrance) and both gates
objected the same turn — axe flags faded text as a contrast violation on every unscrolled
load, and the motion QA counts anything still faded as invisible. One IntersectionObserver on
the wrap, one dataset flag, per-row delay from an inline `--row-i` declared in the stylesheet
so no custom property is ever read undefined.

Evidence: `d-home-rail`, `m-home-rail`, `d-artist-stage`. Gates at commit: tests 132/132 ·
tokens 87 · qa:motion 22/22 · a11y 0/16 · check:web within budget.
