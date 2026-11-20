# Roadmap

Status as of version **2026-11-15a**. Move items between sections as they change; date decisions.

## Open — needs Stuart
- **Hidden cards (since 20 Nov 2026):** if you want one again, it goes in the `HUB_HIDDEN_CARDS` GitHub secret
  (KNOWLEDGE-BASE §14d), not boards.json. Use a long random `HUB_UNLOCK_KEY` and change it after sharing a `#key=` link.

- **Energy Resilience is private (2026-11-16):** the repo is private (Stuart's GitHub Pro) and the board
  is sealed with the `BOARD_UNLOCK_KEY` secret in that repo, so it opens only with the key (see its
  `docs/HANDOVER.md`). The hub can no longer read its dates or status without logging in.
  - Its card is hidden here.
  - If it's shown again, give `status.yml` a read token, or accept fixed dates.
- **Hidden Energy Resilience card (2026-11-16):** add the secret `HUB_UNLOCK_KEY` in this repo
  (Settings → Secrets and variables → Actions), then run **Actions → Seal hidden cards → Run
  workflow**. Until then the card is hidden for everyone. Unlock on each device with the ⓘ key field or
  `https://horizonqltd.com/#key=…`. To show it to everyone again, remove `"hidden": true`.

- **Check on real devices (2026-11-15):** the lens and beam on the big monitor in dark and light,
  the darker side cards, no flash on refresh, the Shrinking Gap opening, the remembered board, and
  a copied board link opening on the Fold. All pass in the rig; none yet seen on his screens.
- **Backups from cloud sessions:** the standard says push a `backup/…` tag before major changes, but a
  Starlane session found tag pushes refused (HTTP 403). Until settled, note the last good commit id in
  the reply as the way back. Options: allow tag pushes for the session, or use backup branches;
  then update the standard (v2) in every repo.
- **Kill switch test:** set the master `automation.json` to `true`, check the next scheduled run
  in cyber-attack-earth logs "Paused by master switch", then set it back.

- **Articles still missing** for Quantum Observatory and Starlane Trader (Apollo's Maths Missions added 2026-11-19).
  Add when written (`"article"` in `tools/boards.json`).
- **Confirm two article pairings** that were inferred, not confirmed:
  "I Built a Q-Day Clock…" is on **Q-Day Research** (could belong to Quantum Observatory), and
  "The Patch Wave isn't coming…" on **Patch Pulse**.
- **Energy Resilience badge** says "Live data" (no research agents yet). When its weekly agents
  run, remove `"tag"` so it shows "Live" and counts as agent-maintained.
- **Re-record demos when boards change.** Energy Resilience and Apollo's Maths Missions were
  re-recorded on 2026-11-13. Others date from 2026-11-11.

- **Quantum Observatory automation is paused** (its `automation.json`), at Stuart's request
  while he isn't working on it. Set `"paused": false` there when he picks it up again.

## Next — agreed or obvious
- **Security follow-ups (review 20 Nov 2026), not urgent.** Full log of the review (hub and GB Energy Map):
  `docs/SECURITY-REVIEW.md` in stuartokin/energy-resilience. Hub items for Claude:
  1. Scope `seal.yml` permissions per job; pin actions to commit SHAs; pin `cryptography`.
  2. A meta content security policy, once the inline theme script in `tools/page.html` is a file.
  3. Allow only https links in `build.py` (`article.url`, `go`), and escape the remaining fields.
  4. Next review with the energy app's (Feb 2027 at the latest).
- **Docs and smoke tests for the repos that have none** (Cyber Attack Earth, Energy Resilience, the five
  single-page boards): each `CLAUDE.md` says to add them on the next change; or do a pass across all at once.

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

## Decided / done (don't reopen without a reason)
- 2026-11-20: Hidden cards live only in the `HUB_HIDDEN_CARDS` secret, never in the public `boards.json`
  (security review; Stuart approved the fixes "without affecting UI, function or features"). Backup branch
  `backup/2026-11-20-security` (tags can't be pushed from cloud sessions).
- 2026-11-17: Energy Resilience shown on the hub as **restricted** (dimmed, "Access by request", email stuart@horizonqltd.com), clear on devices that have opened the board with its key. Replaces hiding it (16 Nov).

- 2026-11-16 Custom domain **horizonqltd.com**, bare domain as the main address (www redirects).
  Live and confirmed working by Stuart the same day (setup in KNOWLEDGE-BASE §1).
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
- 2026-11-15 Kill switches: one small `automation.json` per repo plus a master here (not repo
  variables). Status refreshed at release and daily. Steward answers only the owner.
- 2026-11-15 **Claude pushes straight to `main`** in every repo; no zips. Backup tag first for major changes.
- 2026-11-15 Beam source: **observatory lens** (option B of four: spotlight, lens, pendant, orb), both
  themes; darker side cards in the dark theme.
- 2026-11-15 **No employer or job title anywhere**, in any repo; personal capacity only. Ofgem may still be cited
  as a source. Working standard v1 (incl. "wrap up") in every repo's `CLAUDE.md`; master in `docs/STANDARDS.md`.
