# CLAUDE.md — read this first

This repo is **stuartokin.github.io**, published as **HorizonQ Observatories**: a hub page
linking Stuart Okin's public research boards and apps, each with a video demo, shown as tiles or
as a 3D carousel. It is served by GitHub Pages straight from the repo root.

Start every new conversation by reading, in order:

1. this file
2. [`docs/KNOWLEDGE-BASE.md`](docs/KNOWLEDGE-BASE.md) — how everything works, file by file
3. [`docs/LESSONS.md`](docs/LESSONS.md) — what went wrong before and why (saves hours)
4. [`docs/ROADMAP.md`](docs/ROADMAP.md) — what is open, decided, or parked
5. the latest entry in [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

## Who you're working with

- **Stuart Okin.** Not a front-end developer by trade, but technical and precise; he tests on
  real devices (large monitor, laptop, Samsung Galaxy Z Fold in Edge) and sends screenshots.
- Writes in British English. Keep replies short and plain; explain what changed and why.
- When he asks for **thoughts or proofs before code**, send options (and proof images where
  visual) and wait. When he says "go ahead", build without further proofs.
- The site is written **in a personal capacity**. Do not add Ofgem, his job title or any
  employer anywhere on the page. Footer wording is fixed:
  *"Written in a personal capacity and do not represent the position of any organisation I am engaged with."*

## How changes reach the live site

Stuart uploads files himself through GitHub's web **"Add files → Upload files"** box.

- Send **only the files that changed**, in a **zip that keeps the repo's folder structure**
  (e.g. `css/site.css`, `js/site.js`, `media/x.mp4`) so he can unzip and drag the folders in.
- If **only `index.html`** changed, send that single file instead of a zip.
- `.github/` files he adds by hand; tell him what to paste rather than zipping them.
- Single files must be **under 25 MB** (GitHub web upload limit).
- Every release **bumps the version** (`python3 tools/build.py --bump`). The version appears in
  the ⓘ panel ("Page version …") and on the css/js URLs, so phones can't keep an old copy.
  When Stuart reports a bug, first ask/check which version his ⓘ panel shows.

## The golden rules

1. **Never hand-edit the card markup in `index.html`.** Cards come from `tools/boards.json`;
   the page around them from `tools/page.html`. Run `python3 tools/build.py` to regenerate.
   `css/` and `js/` are edited directly.
2. **Run the test rig before every delivery** (`cd tests && npm test`). 170+ checks across
   phone, Fold (folded/open/sideways), iPad, laptop, Stuart's 1908×950 window, QHD and 4K.
   All must pass. Add a check whenever you fix a bug, so it stays fixed.
3. **Look at the result**, not just the numbers: `npm run shots` and view the PNGs.
4. **Touch devices are different.** Test taps with a wobble (the rig does), never assume a
   mouse fix works on the Fold. See LESSONS.md #1–#6.
5. **The page must never be wider than the screen** (phones zoom the whole page out). The rig
   checks this on every device.
6. Keep everything self-hosted: no CDNs. three.js lives in `js/vendor/`. Google Fonts is the
   only external stylesheet.

## Quick recipes

| Task | Do this |
|---|---|
| Add / edit a card | Edit `tools/boards.json` → add media (below) → `python3 tools/build.py --bump` → `cd tests && npm test` |
| New demo video from a screen recording | `tools/make_media.sh <name> <file> "<keep ranges>" <preview-start> <still-at>` (KNOWLEDGE-BASE → Making demo videos) |
| Add a LinkedIn article to a card | `"article": {"title": "…", "url": "…"}` in `boards.json` (strip `?utm_…` from share links) |
| Change look / layout | `css/site.css` (theme tokens at the top) |
| Change behaviour (toolbar, fit, focus, touch) | `js/site.js` |
| Change the 3D carousel | `js/carousel3d.js` |
| Change header, toolbar, footer, player | `tools/page.html`, then build |
| Check the live site, not the local copy | `cd tests && npm test -- --url=https://stuartokin.github.io/` |

## Setting up (any machine, any new session)

```bash
python3 tools/build.py          # needs only Python 3.8+
cd tests && npm run setup       # once: installs Playwright + Chromium + fonts
npm test                        # all devices, ~5 min
npm run test:quick              # laptop, open Fold, phone
npm run shots                   # screenshots → tests/out/shots/
npm run serve                   # http://localhost:8810/ to look at it yourself
```

In a sandbox where Playwright is already installed globally, skip `npm run setup` and just run
`npm install --no-save @fontsource/archivo @fontsource/ibm-plex-mono @fontsource/newsreader`
inside `tests/`, then `node check.js`.

The other boards live in their own repos (`stuartokin/<repo>`). Clone them with
`git clone --depth 1 https://github.com/stuartokin/<repo>` when you need to record a demo
or read their content; this hub only links to them.
