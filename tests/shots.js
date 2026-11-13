// Screenshots of the page on every device, in both themes and both views, for eyeballing changes.
//   npm run shots                       → tests/out/shots/<device>-<theme>-<view>.png
//   npm run shots -- --devices=fold-open,stuart
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start } = require('./lib/server');
const { setupRoutes } = require('./lib/net');
const DEVICES = require('./lib/devices');

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const OUT = path.join(__dirname, 'out', 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const server = args.url ? null : await start(8811);
  const URL = args.url || 'http://localhost:8811/';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const n of (args.devices ? args.devices.split(',') : Object.keys(DEVICES))) {
    const d = DEVICES[n];
    const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: Math.min(d.deviceScaleFactor || 1, 2), isMobile: d.isMobile, hasTouch: d.hasTouch });
    await setupRoutes(ctx);
    const p = await ctx.newPage();
    await p.goto(URL); await p.waitForTimeout(2500);
    for (const theme of ['dark', 'light']) {
      await p.click(`[data-theme-set="${theme}"]`);
      for (const view of ['carousel', 'tiles']) {
        await p.click(`[data-view="${view}"]`); await p.waitForTimeout(1500);
        await p.screenshot({ path: path.join(OUT, `${n}-${theme}-${view}.png`), fullPage: view === 'tiles' });
      }
    }
    console.log('  ' + n);
    await ctx.close();
  }
  await browser.close();
  if (server) server.close();
  console.log(`Saved to ${OUT}`);
})();
