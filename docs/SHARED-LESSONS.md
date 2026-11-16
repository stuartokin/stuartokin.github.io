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
