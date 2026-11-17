# Shared lessons (all repos)

Lessons that apply beyond one app. Each repo keeps its own `LESSONS` too; add here only what
another repo would benefit from. Newest at the bottom. Say which repo it came from.

1. **GitHub runs scheduled workflows only from `main`,** and may delay or drop runs at the top
   of the hour. Use an off-the-hour minute (e.g. `17 5 * * 1`), and a back-up slot that skips
   itself if the day's run already happened. (ResearchGap)
2. **A run that ends in seconds is not necessarily switched off.** Look at which jobs ran or
   were skipped before concluding anything. (hub, 2026-11-15)
3. **Every automatic workflow starts with the kill-switch job.** `automation.json` in the repo,
   master in stuartokin.github.io. (hub, 2026-11-15)
4. **Anyone can open an issue on a public repo.** A workflow triggered by issues or comments
   that spends API credit or changes the repo must check the sender is the owner.
   (quantum-observatory, 2026-11-15)
5. **Real fingers wobble.** On touch screens a tap that moves 5–10 px can be read as a drag or
   cancel the click. Test taps with a wobble; act on `pointerup` for important buttons. (hub)
6. **Web uploads can't delete files and lose who-wrote-what.** Push from the session instead;
   the commit history then shows Stuart vs Claude vs agents. (hub, 2026-11-15)
7. **Write for the public.** Panels and help text are read by visitors: "Stuart", not "you";
   no employer or job title anywhere. (hub, 2026-11-15)
8. **Phones keep old copies.** Version every release, show the version somewhere visible, and
   put it on asset URLs (or bump the service-worker cache). Ask which version a bug report
   was on. (hub, ApolloMaths, Starlane)
9. **When a setting changes, redraw everything that depends on it,** from one place every route
   goes through, not in each control. ApolloMaths changed the exam but left the old exam's
   question and plan on screen. (ApolloMaths, 2026-11-15)
10. **Wide tables break on phones and tablets.** Turn edit tables into cards below ~1000 px and
    screenshot grown-up/admin screens at 375 and 820 px too, not just the main page.
    (ApolloMaths, 2026-11-15)
11. **Playwright in a Claude cloud sandbox:** Chromium is pre-installed; pin the Python package
    to the same version as the node one (`pip install playwright==1.63.0` in Nov 2026) instead of
    `playwright install`. (ApolloMaths, 2026-11-15)
12. **Passing tests aren't the same as feeling right.** In Starlane the mouse was tracked across
   the whole screen and the tests passed, but steering reached full turn inside a small area and
   the aiming ring was clipped. To Stuart it looked broken. Check what the player sees, scale
   controls to the area actually shown, and ask Stuart for a short screen recording when
   something feels off. (Starlane, 2026-11-15)
13. **Practice copies must hand back preferences.** Starlane's test mode plays a copy of the save,
    and the copy also held key and display settings, so "Reset all keys" seemed not to work. Keep a
    list of preferences that survive leaving a sandbox. (Starlane, 2026-11-15)
14. **Random events make flaky tests.** Turn the randomness off in the test (a debug setting),
    or loop until the condition holds, rather than retrying the whole suite.
    (Starlane, 2026-11-15)
15. **Moving a panel leaves things behind.** When a layout changes, search for everything placed
    relative to the old one (Starlane's lasers and start-up shading hung off the console top).
    (Starlane, 2026-11-15)
16. **Cloud sessions may not be able to push tags.** Pushes to `main` worked, but `backup/…` tags
    were refused (HTTP 403). Note the last good commit id in the reply as the way to undo.
    (Starlane, 2026-11-15)
17. **Draw the right layout first.** If the starting view depends on the screen or a saved choice,
   decide it in a tiny script in the page head, before first paint; otherwise visitors see the
   default flash up and then swap. Test it by sampling every frame from navigation start. (hub)
18. **Links into a page need a stable name.** Use a slug in the address (`#the-shrinking-gap`),
    update it with `history.replaceState` as the view changes, and accept old forms (repo names) too.
    Handy for LinkedIn articles. (hub)
19. **When tags are refused, back up with a branch.** The GitHub tool (create_branch) can make
    `backup/YYYY-MM-DD-what` from `main` even when git refuses tag pushes (lesson 16). To undo, reset
    `main` to that branch. (energy-resilience, 2026-11-15)
20. **A silent fallback can hide a broken build for weeks.** NESO renamed a dataset; the build logged
    "skipped" and the site quietly used coarser data. Write what each build step did (fresh / kept /
    failed) somewhere the site shows, and keep the last good copy rather than publishing nothing.
    (energy-resilience, 2026-11-15)
21. **Don't cache a fallback as if it were a success.** A weekly cache saved last week's kept copy as
    "this week's build", so nothing retried. Cache only what a successful download wrote.
    (energy-resilience, 2026-11-16)
22. **Tailwind only generates the opacity steps it knows** (`/90`, `/95`). `bg-slate-950/92` made no
    background at all, so a panel was see-through. (energy-resilience, 2026-11-16)
23. **`flex-1` inside a box with no height shrinks to nothing.** Pop-out charts drew blank until the
    window was resized. Give the body a fixed starting height, and test the first open, not just after
    interacting. (energy-resilience, 2026-11-15)
24. **Never cite a link you haven't opened.** Research agents return search snippets; open each source
    before it goes in the app, and label any you couldn't open (some sites block automated checks).
    (energy-resilience, 2026-11-16)
25. **A new domain breaks allow-lists.** When the sites moved to horizonqltd.com, any Cloudflare Worker or
    API that only allows `https://stuartokin.github.io` (CORS `ALLOWED_ORIGINS`) silently fails for visitors.
    Add `https://horizonqltd.com` (and `www.`) to every allow-list, then re-paste the Worker.
    (energy-resilience, 2026-11-16)
26. **"Not open" often means "needs a free key".** Open-data portals (Opendatasoft, Azure API Management)
    can list an openly licensed dataset whose records are hidden until you sign in. Check the portal's
    catalogue API and the licence field before writing a source off. Keys go in Worker or GitHub secrets.
    (energy-resilience, 2026-11-16)
27. **`git add -A -- . ':!folder'` fails when that folder is git-ignored.** Git treats naming an ignored
    path as an error. RetroArcade's first AI run passed every check and was then lost at the commit
    step. Use plain `git add -A` and let `.gitignore` do the work. Have a workflow upload its work as a
    download if publishing fails, and test the publish step, not just the build. (RetroArcade, 2026-11-16)
28. **Adding a secret doesn't start any workflow.** After adding or changing a secret, run the workflow
    that uses it by hand (or push a change it watches). (hub, 2026-11-16)
29. **A private repo on GitHub Pro still publishes a public website.** Only the code goes private. To
    keep the site itself private, seal what it publishes:
    - the hub's hidden cards: `tools/seal.py` and `js/unlock.js`
    - Energy Resilience: a key screen plus a service worker that opens sealed files
      (`scripts/seal-site.mjs`)

    Go private only after Pro is active, or the site goes offline straight away. (energy-resilience,
    2026-11-16)
30. **Playwright: `goto()` with only a new `#…` doesn't reload the page.** Load `about:blank` in between,
    and handle `hashchange` in the page too, because people paste links into open tabs. (hub, 2026-11-16)
31. **Don't name commercial products on the sites, even in hidden search terms or test files.**
    Stuart's decision, after a search that matched classic arcade titles. Describe genres instead.
    (RetroArcade, 2026-11-16)
32. **Wide content in tall tiles: `object-fit: cover` blows up the middle.** For landscape pictures in
    portrait tiles, switch those to `contain` (e.g. a `.wide` class set from the image's own size), and
    check the CSS specificity actually wins. (RetroArcade, 2026-11-16)

33. **A `<dialog>` game can swallow Escape.** If the page calls `preventDefault()` on every keydown the game
    handles, the dialog's Escape `cancel` event never fires, so "Esc pauses" silently does nothing. Handle
    Escape in the game itself, and test it with a real key press. (Starlane, 2026-11-16)
34. **Test where you land after every screen change, not just that a screen opens.** Record the whole state
    (mode, page, overlay, sub-page, camera, style) before and after each step, on every screen size; with one
    overlay at a time, "close" easily goes somewhere surprising. (Starlane, 2026-11-16)
35. **Settings that depend on the device must be stored per device kind, and checked on every load.** A
    setting fixed when a profile was created follows the player to other devices (a laptop's 3D cockpit and
    mouse controls on a Fold). Keep phone / tablet / desktop copies and swap them on load. (Starlane, 2026-11-16)
36. **"Keep the last good copy" must cover the index, not just the file.** A data build kept a failed
    source's file on disk but rebuilt its manifest from that night's results only, so the layer vanished
    from the site. Carry the old manifest entry forward too, and add a shrink guard (hold back a result
    far smaller than last time). (cyber-attack-earth, 2026-11-17)
37. **A green status light must check the age of the inputs, not just the run.** Every source said "ok"
    while two hand-downloaded exports were four months old. Show export age, and say on screen where each
    source's coverage ends. (cyber-attack-earth, 2026-11-17)
38. **Actions jobs calling api.github.com anonymously share a 60-an-hour limit.** Send the workflow's
    `GITHUB_TOKEN`. Also: cap retries on "slow down" replies and set `timeout-minutes` (the default is six
    hours), and sort rows before committing data so an unchanged night is a no-op. (cyber-attack-earth,
    2026-11-17)
39. **Some data providers' APIs need a key: ask them, don't scrape their dashboards.** (cyber-attack-earth,
    2026-11-17)
36. **Local tests hide download time.** A rig that serves files from disk never sees a slow first load, so a
    feature that waits on a big file (a 3D engine, fonts, video) can look broken only on a real phone. Delay the
    file with Playwright's `page.route` and block the service worker (`service_workers='block'`), or the offline
    cache answers and the delay never applies. (Starlane, 2026-11-17)
37. **"Do it for me" features need to meet the real map.** An autopilot that flew in a straight line hit the
    station on the way to the planet and pushed against a rock until the ship was destroyed. Test helpers like
    this from several starting points, with obstacles, and make them stop and hand back control on any bump.
    (Starlane, 2026-11-17)
40. **When a data provider gives sample code, follow it over their API page.** CISSM's documented endpoint
    was broken; the route in their own R example worked. Page in a fixed sort order and drop repeats by id.
    (cyber-attack-earth, 2026-11-17)
41. **Test a new API key from the session first.** Save it as a network secret on the session environment
    (the proxy adds it; Claude never sees it), run the build with a placeholder variable, and only then rely
    on the scheduled job. (cyber-attack-earth, 2026-11-17)
42. **Check curated research on the publisher's own page before showing Stuart.** Search summaries carried
    counts, attributions and dates the cited sources did not state. (cyber-attack-earth, 2026-11-17)
43. **Test the repo's rules, not just its code.** A small test can assert every self-starting workflow has
    the kill-switch job and a timeout, and that no secret is written into a workflow — see
    cyber-attack-earth `tests/test_workflows.py`. (cyber-attack-earth, 2026-11-17)
