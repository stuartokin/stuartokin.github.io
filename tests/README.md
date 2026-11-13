# Test rig

Portable checks for HorizonQ Observatories. Runs anywhere with Node 18+ — your laptop, a cloud
sandbox, or GitHub Actions. It serves the repo itself; no Python or other server needed.

## Set up (once)

```bash
cd tests
npm run setup        # Playwright, its Chromium, and the three site fonts
```

## Run

```bash
npm test                                     # every device (~5 min)
npm run test:quick                           # laptop, open Fold, phone
npm test -- --devices=fold-open,stuart       # pick devices (names in lib/devices.js)
npm test -- --url=https://stuartokin.github.io/   # the live site instead of this folder
ONLINE=1 npm test                            # allow internet (GitHub dates etc.)
npm run shots                                # screenshots: tests/out/shots/<device>-<theme>-<view>.png
npm run serve                                # look at it yourself: http://localhost:8810/
```

Output: a PASS/FAIL line per check, `tests/out/results.json`, and screenshots of each device's
carousel, fit-to-screen and light theme in `tests/out/` (all failures leave one too).
Exit code is non-zero if anything failed.

## What it checks (per device)

| check | why it exists |
|---|---|
| no sideways scroll | a too-wide page makes phones zoom out (LESSONS #2) |
| version stamp matches `tools/VERSION` | forgot to build after bumping |
| one card per board, article badges, card links | `boards.json` and the page agree |
| toolbar on one line | the Fold put it on two lines |
| first-visit view | carousel ≥600px, tiles on phones |
| info panel opens on top | it once opened behind the toolbar |
| 3D carousel (WebGL) running | the module loaded and started |
| carousel fits without scrolling | not on phones |
| arrows turn the ring | |
| front card enlarges, stays on screen below the toolbar | |
| Watch demo opens and plays | **with a wobbly finger on touch devices** (LESSONS #5–6) |
| Open goes to the board | wobbly finger on touch |
| fit to screen (carousel, tiles) | nothing below the screen, nothing sideways |
| light theme remembered | |
| no script errors | |

Plus one run with WebGL switched off: the CSS carousel must take over.

## Devices

`lib/devices.js`: Fold folded (344×882), phone (390×844), Fold open (884×1104) and sideways
(1104×884), iPad Pro 11, laptop (1366×768), Stuart's window (1908×950), QHD (2560×1440),
4K (3840×2160). Touch devices get `hasTouch`/`isMobile`. Add more there.

## Notes

- WebGL runs in software (SwiftShader) so it works without a GPU. It can't reproduce a real
  phone GPU's or Edge's drawing bugs — confirm visual fixes on the device.
- Google Fonts requests are answered from `node_modules/@fontsource`, so layout is identical
  offline. Everything else external is blocked unless `ONLINE=1`.
- In a sandbox with Playwright preinstalled globally, skip `npm run setup`; install just the
  fonts (`npm install --no-save @fontsource/archivo @fontsource/ibm-plex-mono @fontsource/newsreader`)
  and run `node check.js`. Don't install a second Playwright there — it won't find a browser.
- When you fix a bug, add a check for it in `check.js`.
