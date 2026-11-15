# Changelog

Newest first. The version is in `tools/VERSION`, the ⓘ panel and the css/js URLs.

## 2026-11-15d
- **Opens on The Shrinking Gap** on a first visit (carousel front card; `DEFAULT_FRONT` in `site.js`).
- **Remembers the front board** (`obs.front`), alongside the view, fit, theme and text size it
  already remembered.
- **Links to a board.** `https://stuartokin.github.io/#the-shrinking-gap` (or any board's slug, or its
  repo name) opens the hub on that board: the carousel turns to it, the tiles scroll to it and glow.
  The address bar follows the carousel as it turns, and each board's status panel has a
  "Copy link" box near the top.
- Rig: first-visit board, address bar, remembered board, shared links (carousel and tiles), the
  panel's link; page loads now get 25 s and one retry (4K under software 3D was flaky).

## 2026-11-15b
- **New Apollo's Maths Missions video**: Stuart's 90-second LinkedIn trailer (square, with sound)
  replaces the scripted walkthrough; the tab now reads "Trailer". Card still and hover preview
  unchanged.

## 2026-11-15c
- **No flash on load.** On screens that open in the carousel, the tiles no longer show for a moment
  first, and the flat stand-in ring no longer shows before the 3D one. The page head now decides the
  view before first paint (`boot-carousel`), and the stand-in stays hidden until WebGL is ready
  (`gl-wait`, cleared by `carousel3d.js`, or after 5 s if WebGL never arrives).
- Rig: two new checks per carousel device watch every frame from the start of loading.

## 2026-11-15a
- **Automation status on every card.** A pill on each picture (top left): green "Automated",
  amber "Paused", red "Needs a look", grey "Manual". Tap it for a plain-English panel: what runs
  on its own and when, whether it uses AI, when it last ran, last update, version, and who made
  recent changes (Stuart, Claude for Stuart, AI agents, scripts). Data in `status.json`, from
  `tools/status.py`, refreshed at each release and daily by `.github/workflows/status.yml`.
- **Kill switches.** `automation.json` here is the master; each automated repo has its own.
  Quantum Observatory is paused, and its Steward now responds only to Stuart.
- Rig: status dot on every card, matches status.json, panel opens from a tile and from the
  enlarged carousel card (wobbly tap), stays on screen, closes with Escape.

## 2026-11-13g
- Repo now carries its own documentation (`CLAUDE.md`, `docs/`), the card data and build tool
  (`tools/`), a media script and a portable Playwright test rig (`tests/`). No visible change.

## 2026-11-13f
- Touch: Watch demo and Open on the enlarged card work reliably on the Fold (drag thresholds,
  act on pointerup, pass-through flag, `touch-action: none`).
- New demos for Apollo's Maths Missions and Energy Resilience.

## 2026-11-13e
- Front card emphasis: spotlight, lift, lit edges, first-visit "Click/Tap to open" hint.
- Text size buttons hidden in carousel view.

## 2026-11-13d
- **WebGL 3D carousel** (three.js r170, self-hosted) replaces the CSS carousel; CSS kept as fallback.
- Page split into `index.html`, `css/site.css`, `js/site.js`, `js/carousel3d.js`.
- Title ⓘ panel opens above the toolbar.

## 2026-11-13a–c
- Two floating toolbars from 640px; toolbar on its own layer; solid bars on touch.
- Lighter, then flat, carousel on touch devices (superseded by WebGL).
- Footer flicker fix (ignore address-bar resizes); version line in the ⓘ panel.

## 2026-11-12
- Fold fixes: page can't get wider than the screen; enlarged card as a flat overlay; toolbar
  never wraps (compact → tight → tiny).
- Starlane Trader links to its own site; hidden-code note removed.
- LinkedIn article badges on eight cards. Carousel default on larger screens.
- 3D platform under the carousel; solid card edges (glass dark / stone light).
- Energy Resilience card added. Light theme = warm paper.

## 2026-11-11
- Site rebuilt as **HorizonQ Observatories**: demo videos, hover previews, player, tiles and
  carousel, fit to screen, text size, music, dark/light, device layouts, info panels,
  Q-Day Research, Apollo's Maths Missions, Starlane Trader, The Shrinking Gap cards.
