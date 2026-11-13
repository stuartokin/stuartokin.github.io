# Roadmap

Status as of version **2026-11-13g**. Move items between sections as they change; date decisions.

## Open — needs Stuart

- **Articles still missing** for Quantum Observatory, Apollo's Maths Missions and Starlane Trader.
  Add when written (`"article"` in `tools/boards.json`).
- **Confirm two article pairings** that were inferred, not confirmed:
  "I Built a Q-Day Clock…" is on **Q-Day Research** (could belong to Quantum Observatory), and
  "The Patch Wave isn't coming…" on **Patch Pulse**.
- **Energy Resilience badge** says "Live data" (no research agents yet). When its weekly agents
  run, remove `"tag"` so it shows "Live" and counts as agent-maintained.
- **Re-record demos when boards change.** Energy Resilience and Apollo's Maths Missions were
  re-recorded on 2026-11-13. Others date from 2026-11-11.

## Next — agreed or obvious

- **Folded Fold (280px wide, original Fold) — Fit to screen in tiles** leaves ~20px below the
  screen. Current Folds (344px) are fine. Low priority.
- **Run the rig automatically on GitHub** (Actions workflow on push: build check + `npm test`
  on a few devices). Stuart adds `.github/` files by hand — supply the YAML to paste.
- **Accessibility pass on the WebGL carousel:** screen readers currently get the hidden HTML
  cards (aria-hidden except the front one) and the dots/arrows; check announcements, focus order
  and that keyboard Tab → front card → float card works everywhere.
- **Smaller three.js**: the vendored build is ~170 KB gzipped; a tree-shaken custom build could
  halve it.

## Ideas — not decided

- Posters and previews as WebP/AV1 for faster loading on phones.
- A "what's new" strip (latest commit message per board) from the same GitHub API call.
- Scripted re-recording of the static boards (Playwright) as `tests/record.js`, so demos can be
  refreshed with one command.
- Deep links (`#carousel/energy-resilience`) to open the site on a given card.

## Decided / done (don't reopen without a reason)

- 2026-11-11 Renamed to **HorizonQ Observatories**; personal-capacity footer; no employer named.
- 2026-11-11 "Talks and evidence" section **removed**.
- 2026-11-11 Light theme = **warm paper** (option B of three).
- 2026-11-12 Carousel style: dark = **glass edges**, light = **thick lit edges** + floor shadow.
- 2026-11-12 Carousel default on tablets/Fold/laptops/large; tiles on phones.
- 2026-11-12 Starlane Trader links to its own site; hidden-code wording removed.
- 2026-11-13 Two floating toolbars from 640px wide.
- 2026-11-13 **WebGL carousel** replaces CSS 3D (Edge on the Fold); split into css/js files.
- 2026-11-13 Front-card emphasis: spotlight + lift + lit edges + first-visit hint; no floating bob.
- 2026-11-13 Text size hidden in carousel view.
- 2026-11-13 Knowledge base, lessons, roadmap, build tool and test rig added to the repo.
