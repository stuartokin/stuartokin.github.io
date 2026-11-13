# Changelog

Newest first. The version is in `tools/VERSION`, the ⓘ panel and the css/js URLs.

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
