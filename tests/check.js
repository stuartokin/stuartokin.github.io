// HorizonQ Observatories — the regression checks.
//
//   npm test                         every device in lib/devices.js
//   npm test -- --devices=laptop,fold-open
//   npm test -- --url=https://stuartokin.github.io/    check the live site instead of the local copy
//   ONLINE=1 npm test                let the page reach the internet (GitHub dates, etc.)
//
// Prints a PASS/FAIL table and exits non-zero if anything failed. Screenshots of failures go to tests/out/.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start, ROOT } = require('./lib/server');
const { setupRoutes } = require('./lib/net');
const DEVICES = require('./lib/devices');

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const boards = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'boards.json'), 'utf8')).boards;
const VERSION = fs.readFileSync(path.join(ROOT, 'tools', 'VERSION'), 'utf8').trim();
// Software WebGL, so the 3D carousel renders on machines without a GPU (CI, cloud, headless).
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const results = [];
function record(device, name, ok, detail = '') { results.push({ device, name, ok: !!ok, detail }); }

async function check(browser, URL, devName, dev) {
  const ctx = await browser.newContext({ viewport: dev.viewport, deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile, hasTouch: dev.hasTouch });
  await setupRoutes(ctx);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const touch = dev.hasTouch;
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  // A finger tap that wobbles a few pixels, like a real one.
  const tap = async (x, y, wobble = 0) => {
    if (!touch) return page.mouse.click(x, y);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    if (wobble) for (let i = 1; i <= 3; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + wobble * i / 3, y: y + wobble * i / 4 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const centre = r => [r.left + r.width / 2, r.top + r.height / 2];
  const T = (name, ok, detail) => record(devName, name, ok, detail);
  const shoot = n => page.screenshot({ path: path.join(OUT, `${devName}-${n}.png`) }).catch(() => {});

  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(2500);

    // --- basics ---
    const basics = await page.evaluate(() => ({
      hScroll: document.documentElement.scrollWidth - innerWidth,
      ver: (document.querySelector('.hinfo__ver') || {}).textContent || '',
      cards: document.querySelectorAll('.card[data-repo]').length,
      articles: document.querySelectorAll('.card .article').length,
      view: document.body.classList.contains('view-carousel') ? 'carousel' : 'tiles',
      gl: !!(window.HQ3D && window.HQ3D.ready),
      bars: [...document.querySelectorAll('.toolbar, .tbgroup')].map(b => { const k = [...b.querySelectorAll(':scope > .seg, :scope > .tbgroup')].filter(e => e.offsetWidth && e.offsetHeight); return new Set(k.map(e => Math.round(e.getBoundingClientRect().top))).size; }),
    }));
    T('no sideways scroll', basics.hScroll <= 0, `${basics.hScroll}px`);
    T('version stamp matches tools/VERSION', basics.ver.includes(VERSION), basics.ver.trim());
    T('one card per board', basics.cards === boards.length, `${basics.cards} cards, ${boards.length} boards`);
    T('article badges match boards.json', basics.articles === boards.filter(b => b.article).length, `${basics.articles}`);
    T('toolbar on one line', Math.max(1, ...basics.bars) === 1, JSON.stringify(basics.bars));
    const expectView = Math.min(dev.viewport.width, 9999) >= 600 ? 'carousel' : 'tiles';
    T('first-visit view', basics.view === expectView, `${basics.view} (expected ${expectView})`);

    // --- every card's links point where boards.json says ---
    const hrefs = await page.$$eval('.card[data-repo] a.body', as => as.map(a => [a.closest('.card').dataset.repo, a.href]));
    const bad = hrefs.filter(([repo, href]) => { const b = boards.find(x => x.repo === repo); return !b || href !== (b.url || `https://stuartokin.github.io/${b.repo}/`); });
    T('card links', bad.length === 0, bad.map(x => x.join(' → ')).join('; '));

    // --- info panel opens above the toolbar ---
    await page.click('#hinfoBtn'); await page.waitForTimeout(200);
    const info = await page.evaluate(() => { const p = document.getElementById('hinfo'), r = p.getBoundingClientRect(); const e = document.elementFromPoint(r.left + 20, r.bottom - 12); return { open: !p.hidden, onTop: !!(e && p.contains(e)) }; });
    T('info panel opens on top', info.open && info.onTop, JSON.stringify(info));
    await page.keyboard.press('Escape');

    // --- carousel ---
    if (basics.view !== 'carousel') { await page.click('[data-view="carousel"]'); await page.waitForTimeout(1500); }
    const gl = await page.evaluate(() => !!(window.HQ3D && window.HQ3D.ready));
    T('3D carousel (WebGL) running', gl, gl ? '' : 'fell back to CSS carousel');
    if (dev.kind !== 'phone') {
      const vs = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      T('carousel fits without scrolling', vs <= 2, `${vs}px`);
    }
    const label0 = await page.textContent('.olabel');
    await page.click('.navbtn[data-dir="1"]'); await page.waitForTimeout(900);
    const label1 = await page.textContent('.olabel');
    T('arrows turn the ring', label0 !== label1, `${label0} → ${label1}`);
    await page.click('.navbtn[data-dir="-1"]'); await page.waitForTimeout(900);

    // pause on (mouse) or tap (touch) the front card → enlarged panel
    const fr = await page.evaluate(() => { const r = window.HQ3D && HQ3D.ready ? HQ3D.frontRect() : document.querySelector('.card.ofront').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
    const [fx, fy] = centre(fr);
    if (touch) await tap(fx, fy); else { await page.mouse.move(fx - 20, fy - 20); await page.mouse.move(fx, fy, { steps: 4 }); }
    await page.waitForTimeout(1300);
    const fl = await page.evaluate(() => { const c = document.querySelector('.card.ofloat'); if (!c) return null; const r = c.getBoundingClientRect(), b = document.querySelector('.toolbar').getBoundingClientRect(), g = c.querySelector('.go').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, bar: b.bottom, goIn: g.bottom <= innerHeight && g.top >= 0, vw: innerWidth, vh: innerHeight }; });
    T('front card enlarges', !!fl);
    if (fl) {
      T('enlarged card stays on screen, below toolbar', fl.top >= fl.bar - 1 && fl.bottom <= fl.vh + 1 && fl.left >= -1 && fl.right <= fl.vw + 1 && fl.goIn, JSON.stringify({ top: Math.round(fl.top), bar: Math.round(fl.bar), bottom: Math.round(fl.bottom), vh: fl.vh }));
      // Watch demo from the enlarged card (with a wobbly finger on touch screens)
      const m = await page.$eval('.card.ofloat .media', e => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; });
      const [mx, my] = centre(m);
      await tap(mx, my, touch ? 8 : 0); await page.waitForTimeout(1800);
      const pl = await page.evaluate(() => { const v = document.getElementById('playerVideo'); return { open: document.getElementById('player').open, src: v.currentSrc.split('/').pop(), ready: v.readyState, err: v.error && v.error.code }; });
      T('Watch demo opens and plays', pl.open && pl.ready >= 2 && !pl.err, JSON.stringify(pl));
      if (pl.open) { await page.click('#playerClose'); await page.waitForTimeout(400); }
    }
    await shoot('carousel');

    // Open from the enlarged card goes to the board
    if (touch) await tap(fx, fy); else { await page.mouse.move(5, 5); await page.mouse.move(fx, fy, { steps: 4 }); }
    await page.waitForTimeout(1200);
    const g = await page.$('.card.ofloat .go');
    if (g) {
      const gb = await g.boundingBox();
      const req = page.waitForRequest(r => r.url().startsWith('https://stuartokin.github.io/'), { timeout: 4000 }).catch(() => null);
      await tap(gb.x + gb.width / 2, gb.y + gb.height / 2, touch ? 6 : 0);
      const r = await req;
      T('Open goes to the board', !!r, r ? r.url() : 'no navigation');
      await page.goto(URL); await page.waitForTimeout(2000);
    }

    // --- fit to screen: tiles and carousel ---
    await page.click('#fitBtn'); await page.waitForTimeout(1500);
    for (const view of ['carousel', 'tiles']) {
      await page.click(`[data-view="${view}"]`); await page.waitForTimeout(1500);
      const f = await page.evaluate(() => { const r = document.querySelector('.wrap').getBoundingClientRect(); return { over: Math.round(r.bottom - innerHeight), side: document.documentElement.scrollWidth - innerWidth }; });
      T(`fit to screen (${view})`, f.over <= 2 && f.side <= 0, JSON.stringify(f));
      await shoot(`fit-${view}`);
    }
    await page.click('#fitBtn'); await page.waitForTimeout(800);

    // --- theme ---
    await page.click('[data-theme-set="light"]'); await page.waitForTimeout(400);
    await page.reload(); await page.waitForTimeout(1500);
    T('light theme remembered', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
    await shoot('light');
    await page.click('[data-theme-set="dark"]');

    T('no script errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (e) {
    T('run completed', false, e.message.split('\n')[0]);
    await shoot('crash');
  }
  await ctx.close();
}

(async () => {
  const server = args.url ? null : await start(+(args.port || 8810));
  const URL = args.url || `http://localhost:${args.port || 8810}/`;
  const names = args.devices ? args.devices.split(',') : Object.keys(DEVICES);
  const browser = await chromium.launch({ args: GL_ARGS });
  console.log(`Checking ${URL} on ${names.length} device(s), version ${VERSION}\n`);
  for (const n of names) {
    if (!DEVICES[n]) { console.log(`Unknown device '${n}'. Known: ${Object.keys(DEVICES).join(', ')}`); continue; }
    process.stdout.write(`  ${n.padEnd(12)} ${DEVICES[n].note} … `);
    const before = results.length;
    await check(browser, URL, n, DEVICES[n]);
    const mine = results.slice(before);
    console.log(mine.every(r => r.ok) ? 'ok' : `${mine.filter(r => !r.ok).length} failed`);
  }
  // Without WebGL the page must fall back to the CSS carousel.
  const nogl = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const ctx = await nogl.newContext({ viewport: { width: 1366, height: 768 } }); await setupRoutes(ctx);
  const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(2000);
  const fb = await p.evaluate(() => ({ gl: !!window.HQ3D, cards: document.querySelectorAll('.oring > .card').length, carousel: document.body.classList.contains('view-carousel') }));
  record('no-webgl', 'falls back to the CSS carousel', !fb.gl && fb.cards > 0 && fb.carousel, JSON.stringify(fb));
  await nogl.close();
  await browser.close();
  if (server) server.close();

  const failed = results.filter(r => !r.ok);
  console.log('\n' + results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.device.padEnd(12)} ${r.name}${r.ok || !r.detail ? '' : '  — ' + r.detail}`).join('\n'));
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed. Screenshots in tests/out/`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ version: VERSION, url: URL, when: new Date().toISOString(), results }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
