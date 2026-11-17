# Changelog

Newest first. The version is in `tools/VERSION`, the ⓘ panel and the css/js URLs.

## 2026-11-17c
- Card renamed **GB Energy Map** (was Energy Resilience; the board's repo, address and media names are unchanged). The ⓘ Lock line and the request email subject follow the new name.

## 2026-11-17b
- The ⓘ panel no longer shows the hub key field when no card is hidden (`unlock.js`); it comes back if a
  card is hidden again.
- **Lock a restricted board from the hub:** on a device where Energy Resilience is open, the ⓘ panel shows
  "🔓 Energy Resilience open on this device · Lock" (`access.js`). Lock forgets the board's stored keys
  (both: site and feature) and stops its unlock helper, so the card dims and the board shows its key screen.
  Same as visiting `/energy-resilience/?lock`.
- Rig: no key field, Lock offered, Lock dims the card and forgets the key (laptop, phone).

## 2026-11-17a
- **Energy Resilience is back on the hub, by request** (Stuart, 2026-11-17). It's no longer hidden
  (`"hidden"` removed); it now uses `"restricted": { "email", "keydb" }` in `boards.json`.
  - The card shows a blurred picture, a softened summary, "🔒 Access by request", a "Request access" email
    button (stuart@horizonqltd.com) and "Have a key? Open ↗".
  - The picture and Open both go to the board's key screen; the demo video and hover preview stay off.
  - `js/access.js`: if this device has opened the board with its key (its IndexedDB `er-seal`, same
    address), and that key still fits the board's `seal.json`, the card turns clear. An old key keeps it
    dimmed.
  - The 3D carousel draws it the same way (`carousel3d.js`); the enlarged front card keeps the state (`site.js`).
  - Restricted cards stay out of `status.json` (private repo; commit messages could say too much).
- Rig: restricted-card checks on laptop and phone (dimmed, email link, picture opens the board, old key
  stays dimmed, clear with the key, no overflow, no errors).

## 2026-11-16d
- **Hidden cards:** Energy Resilience is hidden from the hub (`"hidden": true`).
  - It isn't in the page, the count or `status.json`; it's sealed into `sealed.json` with the
    `HUB_UNLOCK_KEY` secret (`tools/seal.py`, workflow `seal.yml`).
  - It unlocks per device with the key field in the ⓘ panel or a link ending `#key=…`; "Lock" hides it
    again.
  - `js/unlock.js` now loads first and starts `site.js` and the carousel after it.
- Rig: hidden-card checks on laptop and the folded Fold (no card or title without the key; wrong key;
  link; pasted link; reload; ⓘ field; Lock).

## 2026-11-16c
- Retro Arcade trailer re-recorded: the search now types "planet" (no commercial game names anywhere,
  Stuart's request). Its tiles show wide games whole.

## 2026-11-16b
- **New card: Retro Arcade** ("Just for fun", Play):
  - Retro arcade games, with an AI agent that reworks them every Sunday
  - automation line for `evolve.yml`
  - trailer recorded with Playwright from the RetroArcade site (48 s): home tiles playing, search
    "planet", carousel, Snake original vs the AI version, evolution log
  - `make_media.sh retro-arcade <rec> "0:33.2,35.0:49.5" 12 3`

## 2026-11-16a
- **Moves to horizonqltd.com.** `CNAME` file added; card links, preview image and the rig now use
  `https://horizonqltd.com/` (from `"base"` in `boards.json`). `stuartokin.github.io` links
  redirect, so nothing shared before breaks. DNS set-up at GoDaddy in KNOWLEDGE-BASE §1.
- Rig: board links and "Open goes to the board" follow `base` instead of a fixed address.

## 2026-11-15e
- **The spotlight has a source:** an observatory lens (glowing aperture ring, bright core, outer
  guide ring with six mounts) hangs between the two floating toolbars, and the beam starts from it.
  The 3D view reaches up above the stage just far enough to show it; the carousel doesn't move.
  Shown only where it fits between the toolbars without touching any header text (on now: laptop,
  Stuart's window, iPad, QHD, 4K; off on the Fold and phones, and in Fit to screen).
- **Darker side cards in the dark theme:** neighbours about 55% brightness (was 73%), the back
  of the ring about 28% (was 39%). Light theme unchanged.
- Rig: lens shown on the screens where it fits; toolbar and title still clickable above it.

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
