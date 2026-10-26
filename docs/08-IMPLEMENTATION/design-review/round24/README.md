# Round 24 — print run: the site learns bone stock

Owner's verdict on rounds 22–23: "jelek bikin ulang semua". Audited my own work with fresh
eyes and agreed with the diagnosis behind the verdict, not the literal wording: the page was
*monotone* — every section the same ink ground, the same hairline, the same temperature, and
the catalogue (the product!) printed as void boxes on void ground. All-black reads as empty
before it reads as luxurious. A printed campaign alternates stock; this site never did.

## The flip

Four new tokens (`--color-bone`, `-bone-ink`, `-bone-muted`, `-bone-line`) and a rule: a section
goes bone by re-declaring the text/hairline/ink tokens locally, so every descendant inverts by
reading the names it always read — plus one explicit `color:` on the section root, because
inherited color is a *computed* value and stays white otherwise (axe caught that the same turn,
8 violations, fixed before commit).

Bone moments now: the home takeover, the `/music` featured poster, the `/artist` intro spread.
Everything else stays ink, so the bone lands as an event, not a theme.

## The sleeves, series v3

Bone stock, ink hairline frame, and the mark printed large and **cropped** — bleeding off the
top-left corner instead of centred like a logo on a slide. On the ink wall ten bone sleeves now
read as a body of printed editions; on bone sections the sleeve sits on an ink plinth, the way
a gallery hangs a light print on a light wall.

## The hero can finally see

The scrim buried the photograph: an image-led site whose image nobody saw. Lighter at the top
and middle (0.58/0.26/0.42 against 0.82/0.42/0.55), floor still falls to ink for the facts bar.

Evidence: `d-home-hero`, `d-home-takeover`, `d-home-rail`, `d-music-featured`,
`d-artist-intro`, `m-home-takeover`. Gates at commit: tests 132/132 · tokens 91 · qa:motion
22/22 · a11y 0/16 · check:web 189.7 KB gz JS / 17.3 KB gz CSS.
