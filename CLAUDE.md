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
- The site is written **in a personal capacity**: never name his employer or job title. Footer
  wording is fixed:
  *"Written in a personal capacity and do not represent the position of any organisation I am engaged with."*

## How changes reach the live site

You commit and push straight to `main` (see the working standard below); GitHub Pages
publishes within a minute or two. Stuart doesn't upload files any more.

- Every release **bumps the version** (`python3 tools/build.py --bump`, which also refreshes
  `status.json`). The version appears in the ⓘ panel ("Page version …") and on the css/js
  URLs, so phones can't keep an old copy. When Stuart reports a bug, first ask/check which
  version his ⓘ panel shows.
- This repo also holds the **master kill switch** (`automation.json`) and the **standards for
  every repo** (`docs/STANDARDS.md`, `docs/SHARED-LESSONS.md`).

## The golden rules

1. **Never hand-edit the card markup in `index.html`.** Cards come from `tools/boards.json`;
   the page around them from `tools/page.html`. Run `python3 tools/build.py` to regenerate.
   `css/` and `js/` are edited directly.
2. **Run the test rig before every delivery** (`cd tests && npm test`). 210+ checks across
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
| Pause / resume automation | `automation.json` in a repo (`"paused": true`), or this repo's for all (KNOWLEDGE-BASE §15) |
| Change the automation panel wording | `"automation"` in `tools/boards.json` (public: "Stuart", not "you") |
| Check the live site, not the local copy | `cd tests && npm test -- --url=https://horizonqltd.com/` |

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

<!-- STANDARD:BEGIN v1 — the same block is in every one of Stuart's repos. Master copy:
     stuartokin/stuartokin.github.io docs/STANDARDS.md. Change it there, then everywhere. -->
## Working standard (all of Stuart's repos)

**Stuart** owns this. British English; short, plain replies. He does not read or edit code:
you make every change, test it, push it, and tell him what to check. Plan first for big
things; when he says "go ahead", build without further proofs.

**Personal capacity.** Never name his employer or job title anywhere: pages, docs, commit
messages, articles. Byline: *Stuart Okin*. Where a disclaimer is needed: *"Written in a
personal capacity and do not represent the position of any organisation I am engaged with."*
Citing an organisation as a source is fine.

**Delivering changes.** Commit and push straight to `main` yourself. Don't send zips or ask
him to upload; older instructions in this repo that say so are superseded. Before anything
major (deleting or restructuring, rewriting a core file, changing workflows or agents,
migrating data) push a backup tag first:
`git tag backup/YYYY-MM-DD-<what> origin/main && git push origin backup/YYYY-MM-DD-<what>`.
To undo, reset `main` to that tag; say in your reply that a backup exists. Never commit
secrets: keys live only in GitHub secrets.

**Tests.** Run the repo's tests before every push; all must pass. Fix a bug, add a check so
it stays fixed. If the repo has no tests yet, add at least a smoke test the next time you
change it.

**Automation.** Any workflow that runs on its own (schedule, issues, comments, other
workflows) must start with the kill-switch `switch` job, reading `automation.json` here and
the master in stuartokin.github.io (see its docs/KNOWLEDGE-BASE.md §15). Don't add an AI
agent without saying what it costs, what it can change and how to switch it off.

**"Wrap up".** When Stuart says "wrap up", and before you finish any session that changed
something:
1. Run the tests; fix or report any failure.
2. Update the docs: how the app works (knowledge base or handover), `LESSONS` (what went
   wrong or surprised you), `ROADMAP` (done, next, open questions for Stuart, decisions with
   dates) and `CHANGELOG` (bump the version if the app changed). Create them if missing.
3. If a lesson would help the other repos, add it to `docs/SHARED-LESSONS.md` in
   stuartokin.github.io.
4. Commit and push to `main` (backup tag first if major). Check the deploy or workflow run.
5. Reply with what changed, the version, what was and wasn't tested, a short numbered list of
   things for Stuart to try, and anything waiting on him.

A new session must be able to carry on from the repo alone. If it couldn't, the wrap-up
isn't done.
<!-- STANDARD:END -->
