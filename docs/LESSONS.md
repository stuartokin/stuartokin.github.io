# Lessons learned

Things that cost time while building this site. Each has the symptom, the cause and what to do.
Add to this file whenever something surprises you.

## Devices and drawing

**1. CSS 3D on the Galaxy Fold (Edge) breaks unpredictably.**
Symptom: cards half-drawn, title and footer vanishing, flicker while touching, a giant card over
everything, a stray green line. It worked in Chrome on the same Fold. Cause: Edge's compositor
mishandles many `transform-style: preserve-3d` layers (the CSS carousel had ~140 3D faces).
Fewer faces helped a little; a "flat" 2D imitation avoided it but looked wrong (cards floating
above the platform). **Fix: draw the carousel with WebGL** (`js/carousel3d.js`). Keep the CSS
carousel only as a fallback. Don't go back to CSS 3D for anything large.

**2. Never let the page get wider than the screen.** On phones the browser then zooms the whole
page out — it looks like a layout disaster. Causes we hit: the enlarged card overflowing the
stage; an old fit-to-screen method that laid the page out wider and shrank it with `transform`.
Fixes: `html, body { overflow-x: clip }`; fit uses CSS `zoom`; the rig checks sideways scroll on
every device.

**3. Sticky + blurred (`backdrop-filter`) toolbar over 3D content glitched on touch.** The right
half of the toolbar went missing, or the whole bar vanished. Fix: own layer (`isolation`,
`z-index`), and solid backgrounds on touch screens.

**4. The address bar sliding in/out fires `resize`.** Re-laying the page for it made the footer
flicker on the Fold. Ignore height-only changes under 160px on touch devices.

**5. Real taps wobble.** A tap that moves 5–10px was being read as a drag (closing the float
card), or the browser cancelled the click. Use bigger drag thresholds for fingers, act on
`pointerup` for the float card's buttons, `touch-action: none` on it. The rig taps with a wobble.

**6. Forwarded clicks get re-handled.** "Watch demo" on the float card clicked the ring card,
whose click handler (meant for real taps) re-opened the float card; then the browser's own click
landed on the player's backdrop and closed it. Fixes: a `passThrough` flag, and delaying the
action 60 ms past the native click. Symptom on the Fold: "the videos don't work".

**7. Mouse-only testing hides all of the above.** Everything 1–6 passed on desktop. Test touch
paths explicitly (the rig does) and ask Stuart to check on the Fold.

## Process

**8. Ask which version the device is showing.** Phones keep old copies, and GitHub Pages takes a
minute or two to update. The ⓘ panel shows "Page version …", and css/js URLs carry `?v=` so a new
version always loads fresh. Bump on every release.

**9. Check the screenshot is new.** Once a reported "still broken" screenshot was the old one
(same clock time and tabs as the previous message). Look at the status-bar time before
re-debugging.

**10. Try another browser on the same device** before rewriting things. "Works in Chrome on the
Fold" pinned bug 1 on Edge within one message.

**11. A single big HTML file got hard to work on.** The site is now `index.html` + `css/` + `js/`
+ a build step. Splitting didn't fix rendering bugs by itself (WebGL did), but it made changes
reviewable and the test rig possible.

**12. Cards are data.** Hand-editing card HTML caused drift; `tools/boards.json` + `build.py` is
the single source, and the build refuses to run if media files are missing.

**13. Proofs first when asked.** Stuart often asks for thoughts or proof images before code.
Several rounds (light theme, carousel focus, card depth) saved rework by showing 2–3 options
side by side in dark and light. When he says "no proofs, go ahead", don't send them.

**14. Recording demos offline.** Boards that need the internet (map tiles, live feeds, AI keys)
can't be recorded from a sandbox — they come out blank. Ask Stuart for a screen recording and
trim it (`tools/make_media.sh`). Static boards record well with Playwright.

**15. A run that finishes in seconds isn't necessarily switched off.** ResearchGap's 8-second
scheduled runs looked like the agents were disabled; they were the back-up slot finding the
day's run already done. Check the jobs (`status.py` does) before concluding anything.

**16. `build.py` must run on Python 3.8+.** An f-string with quotes nested inside
(`f'{e(b['title'])}'`) only works from Python 3.12; compute the value first.

**17. Push access needs pushing to `main`.** GitHub only runs scheduled workflows from the
default branch, so kill-switch changes on a side branch do nothing.

**18. Decide the first view before first paint.** The view was chosen at the end of `site.js`, so
the tiles were drawn first and then swapped for the carousel; then the CSS stand-in ring showed until
three.js had loaded. Fast local loads hid it; Stuart saw both on refresh. The head script now sets the
view class, and the rig samples every frame from navigation start.

**19. `Range.getClientRects()` returns whole element boxes, not just words.** Selecting a block's
contents gives full-width boxes for any element fully inside, so a "does this touch the header text?"
test failed everywhere. Walk the text nodes and measure each one.

**20. A stray local server makes the rig fail silently.** A preview server left on port 8810 made
`npm test` exit at once with only an "address in use" trace and no results. Stop it
(`pkill -f lib/server.js`) and rerun; if a run prints nothing, look at the end of its output.

**21. Mock up in the real renderer.** The light-source proofs were built inside the real WebGL
carousel (a throwaway copy with a switch for each option), so what Stuart chose is exactly what
shipped. Two surprises only showed that way: the canvas stopped just above the cards, so a source
needed the view extended upwards; and option B reads edge-on from the camera's angle.

**22. A custom domain goes live the moment `CNAME` lands on `main`.** GitHub redirects
`stuartokin.github.io` to the domain at once, even if DNS isn't pointing there yet, so the whole
site (and every project repo under it) would vanish. Get DNS in first, then push the `CNAME`.
Also: the cloud sandbox couldn't resolve the domain itself (DNS lookup sites blocked), and its
`tests/node_modules` Playwright was newer than the installed browser — run the rig with the global
Playwright (`NODE_PATH=$(npm root -g)`, local copy moved aside) when that happens.
Setting the domain in Settings → Pages commits its own `CNAME` to `main`; merging a branch that
also adds one gives an add/add conflict. Never `commit -a` after a merge without checking
`git status` — that's how conflict markers reached the live `CNAME` for a minute.

**23. "Hidden" in a public repo isn't hidden.** Encrypting a card into `sealed.json` did nothing while its
plain text sat in `boards.json`, which GitHub and the site both serve. Secrets go in GitHub secrets; check
what the published files and the git history show, not just the page. (Security review, 20 Nov 2026.)

## Small but sticky

- The title's ⓘ panel opened *behind* the sticky toolbar until the header got `z-index: 60`.
- With the CSS carousel, `transform: scale()` in fit mode measured wrongly — `getBoundingClientRect`
  vs `offsetHeight` differ under zoom; convert by the stage's scale when measuring.
- `box-reflect`, `backdrop-filter` and huge box-shadows are all expensive on phones; avoid.
- LinkedIn share links carry `?utm_…`; strip them.
- Starlane Trader used to be reached via a hidden code in Apollo's Maths Missions; it now has its
  own site (`/Starlane/`) and the code isn't mentioned anywhere.
- Light mode first looked "too white": the page, cards and toolbar were near-identical whites.
  Warm paper (stone ground, cream panels, darker shading for distant cards) fixed it.

1. **`page.goto()` to the same page with only a new `#…` doesn't reload it.** The first test of the
    `#key=` unlock link "failed" because the page never reloaded. Load `about:blank` in between, and
    handle `hashchange` in the page too, because a person can paste the link into an open tab.
    (2026-11-16)
