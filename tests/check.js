// HorizonQ Observatories — the regression checks.
//
//   npm test                         every device in lib/devices.js
//   npm test -- --devices=laptop,fold-open
//   npm test -- --url=https://horizonqltd.com/        check the live site instead of the local copy
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
const BOARDS_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'boards.json'), 'utf8'));
const boards = BOARDS_JSON.boards.filter(b => !b.hidden);   // hidden cards are only on the page after unlocking
const HIDDEN = BOARDS_JSON.boards.filter(b => b.hidden);
const BASE = BOARDS_JSON.base || 'https://horizonqltd.com/';
const VERSION = fs.readFileSync(path.join(ROOT, 'tools', 'VERSION'), 'utf8').trim();
const STATUS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'status.json'), 'utf8')); } catch (e) { return {}; } })();
// Software WebGL, so the 3D carousel renders on machines without a GPU (CI, cloud, headless).
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const results = [];
function record(device, name, ok, detail = '') { results.push({ device, name, ok: !!ok, detail }); }

async function check(browser, URL, devName, dev) {
  const ctx = await browser.newContext({ viewport: dev.viewport, deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile, hasTouch: dev.hasTouch });
  await setupRoutes(ctx);
  // Watch every frame from the very start: on carousel devices the tiles, and the CSS stand-in ring,
  // must never be painted before the real carousel (Stuart saw both flash on refresh, 2026-11-15).
  await ctx.addInitScript(() => {
    const w = window.__boot = { tilesBeforeCarousel: false, standInBeforeGl: false };
    const shown = el => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility === 'visible';
    const t0 = performance.now();
    (function tick() {
      const b = document.body;
      if (b && !b.classList.contains('view-carousel') && shown(document.querySelector('.group .card'))) w.tilesBeforeCarousel = true;
      if (b && !document.documentElement.classList.contains('gl') && shown(document.querySelector('.oring > .card'))) w.standInBeforeGl = true;
      if (performance.now() - t0 < 6000) requestAnimationFrame(tick);
    })();
  });
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
  // Page loads get more time and one retry: software 3D at 4K can be slow to settle.
  const go = async u => { for (let i = 0; i < 2; i++) { try { return await page.goto(u, { waitUntil: 'load', timeout: 25000 }); } catch (e) { if (i) throw e; await page.waitForTimeout(1000); } } };
  const shoot = n => page.screenshot({ path: path.join(OUT, `${devName}-${n}.png`) }).catch(() => {});

  try {
    await go(URL);
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
    if (expectView === 'carousel') {
      const boot = await page.evaluate(() => ({ ...window.__boot, gl: document.documentElement.classList.contains('gl') }));
      T('no tiles flash before the carousel', !boot.tilesBeforeCarousel, JSON.stringify(boot));
      T('no flat stand-in flash before the 3D carousel', !boot.gl || !boot.standInBeforeGl, JSON.stringify(boot));
    }

    // --- every card's links point where boards.json says ---
    const hrefs = await page.$$eval('.card[data-repo] a.body', as => as.map(a => [a.closest('.card').dataset.repo, a.href]));
    const bad = hrefs.filter(([repo, href]) => { const b = boards.find(x => x.repo === repo); return !b || href !== (b.url || `${BASE}${b.repo}/`); });
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
    // The lens (the beam's source) hangs between the two floating toolbars where it fits; the taller
    // canvas must never cover the toolbar buttons or the title.
    if (gl) {
      const ln = await page.evaluate(() => {
        const on = document.querySelector('.ostage').classList.contains('lens');
        const hit = el => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (el === e || el.contains(e)); };
        const btns = [...document.querySelectorAll('.toolbar button')].filter(b => b.offsetWidth);
        return { on, buttonsClickable: btns.every(hit), titleClickable: hit(document.querySelector('#hinfoBtn')) };
      });
      const want = ['laptop', 'stuart', 'qhd', '4k', 'ipad'].includes(devName);
      T('lens shown where it fits', !want || ln.on, JSON.stringify(ln));
      T('toolbar and title still clickable above the 3D view', ln.buttonsClickable && ln.titleClickable, JSON.stringify(ln));
    }
    if (dev.kind !== 'phone') {
      const vs = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      T('carousel fits without scrolling', vs <= 2, `${vs}px`);
    }
    const frontRepo = () => page.evaluate(() => window.HQ.cards[window.HQ.frontIndex()].dataset.repo);
    T('first visit opens on The Shrinking Gap', (await frontRepo()) === 'ResearchGap', await frontRepo());
    const label0 = await page.textContent('.olabel');
    await page.click('.navbtn[data-dir="1"]'); await page.waitForTimeout(900);
    const label1 = await page.textContent('.olabel');
    T('arrows turn the ring', label0 !== label1, `${label0} → ${label1}`);
    const turned = await page.evaluate(() => ({ repo: window.HQ.cards[window.HQ.frontIndex()].dataset.repo, title: window.HQ.cards[window.HQ.frontIndex()].querySelector('h3').textContent, hash: location.hash }));
    const slug = s => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    T('address bar follows the front board', turned.hash === '#' + slug(turned.title), JSON.stringify(turned));
    await go(URL); await page.waitForTimeout(2000);
    T('front board remembered after reload', (await frontRepo()) === turned.repo, `${await frontRepo()} (expected ${turned.repo})`);
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

    // --- automation status dot: opens its panel from the enlarged card (wobbly finger on touch) ---
    if (touch) await tap(fx, fy); else { await page.mouse.move(5, 5); await page.mouse.move(fx, fy, { steps: 4 }); }
    await page.waitForTimeout(1300);
    const fst = await page.$('.card.ofloat .stat');
    if (fst) {
      const sb = await fst.boundingBox();
      await tap(sb.x + sb.width / 2, sb.y + sb.height / 2, touch ? 6 : 0); await page.waitForTimeout(700);
      const sd = await page.evaluate(() => { const d = document.getElementById('statDlg'), r = d.getBoundingClientRect(); return { open: d.open, inView: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, about: d.textContent.includes('About this board'), player: document.getElementById('player').open }; });
      T('status panel opens from the enlarged card', sd.open && sd.inView && sd.about && !sd.player, JSON.stringify(sd));
      await shoot('status-carousel');
      if (sd.open) { await page.click('#statClose'); await page.waitForTimeout(300); }
    } else T('status panel opens from the enlarged card', false, 'no status dot on the enlarged card');

    // Open from the enlarged card goes to the board
    if (touch) await tap(fx, fy); else { await page.mouse.move(5, 5); await page.mouse.move(fx, fy, { steps: 4 }); }
    await page.waitForTimeout(1200);
    const g = await page.$('.card.ofloat .go');
    if (g) {
      const gb = await g.boundingBox();
      const req = page.waitForRequest(r => r.url().startsWith(BASE), { timeout: 4000 }).catch(() => null);
      await tap(gb.x + gb.width / 2, gb.y + gb.height / 2, touch ? 6 : 0);
      const r = await req;
      T('Open goes to the board', !!r, r ? r.url() : 'no navigation');
      await go(URL); await page.waitForTimeout(2000);
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

    // --- automation status dot in the tiles view ---
    const st = await page.evaluate(() => ({ dots: document.querySelectorAll('.card[data-repo] > .stat').length, states: [...document.querySelectorAll('.card[data-repo] > .stat')].map(b => b.dataset.state) }));
    T('status dot on every card', st.dots === boards.length && st.states.every(s => ['on', 'paused', 'failed', 'none'].includes(s)), JSON.stringify(st));
    const expectState = Object.fromEntries(Object.entries(STATUS.boards || {}).map(([r, s]) => [r, s.state]));
    const shown = await page.$$eval('.card[data-repo]', cs => cs.map(c => [c.dataset.repo, c.querySelector('.stat').dataset.state]));
    const wrong = shown.filter(([r, s]) => expectState[r] && expectState[r] !== s);
    T('status dots match status.json', wrong.length === 0, wrong.map(x => x.join('=')).join(', '));
    const tile = await page.$('.group:not([hidden]) .card[data-repo="quantum-observatory"] > .stat');
    if (tile) {
      await tile.scrollIntoViewIfNeeded(); const tb = await tile.boundingBox();
      await tap(tb.x + tb.width / 2, tb.y + tb.height / 2, touch ? 6 : 0); await page.waitForTimeout(600);
      const sd = await page.evaluate(() => { const d = document.getElementById('statDlg'), r = d.getBoundingClientRect(); return { open: d.open, inView: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1, paused: d.textContent.includes('Paused'), side: document.documentElement.scrollWidth - innerWidth, url: location.href }; });
      T('status panel opens from a tile, on screen', sd.open && sd.inView && sd.paused && sd.side <= 0 && sd.url === URL, JSON.stringify(sd));
      await shoot('status-tiles');
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      T('status panel closes with Escape', await page.evaluate(() => !document.getElementById('statDlg').open));
    } else T('status panel opens from a tile, on screen', false, 'no tile dot found');

    // --- theme ---
    await page.click('[data-theme-set="light"]'); await page.waitForTimeout(400);
    await page.reload(); await page.waitForTimeout(1500);
    T('light theme remembered', await page.evaluate(() => document.documentElement.dataset.theme === 'light'));
    await shoot('light');
    await page.click('[data-theme-set="dark"]');

    // --- a shared link opens the hub on that board ---
    await go(URL + '#apollos-maths-missions'); await page.waitForTimeout(2200);
    const dl = await page.evaluate(() => {
      const c = document.querySelector('.card[data-repo="ApolloMaths"]'), r = c.getBoundingClientRect();
      return { view: document.body.classList.contains('view-carousel') ? 'carousel' : 'tiles', front: window.HQ.cards[window.HQ.frontIndex()].dataset.repo, inView: r.top < innerHeight && r.bottom > 0 };
    });
    T('a shared link opens on that board', dl.view === 'carousel' ? dl.front === 'ApolloMaths' : dl.inView, JSON.stringify(dl));
    await page.click('.card[data-repo="ApolloMaths"] .stat').catch(() => {});
    if (dl.view === 'tiles') {
      await page.waitForTimeout(400);
      const link = await page.evaluate(() => (document.querySelector('.statdlg__share input') || {}).value || '');
      T('status panel offers a link to the board', link.endsWith('#apollos-maths-missions'), link);
    }
    await shoot('share');
    await page.keyboard.press('Escape').catch(() => {});
    await page.click('[data-view="carousel"]'); await page.waitForTimeout(600);
    await go(URL + '#cyber-attack-earth'); await page.waitForTimeout(2200);
    const dc = await page.evaluate(() => ({ view: document.body.classList.contains('view-carousel'), front: window.HQ.cards[window.HQ.frontIndex()].dataset.repo }));
    T('a shared link turns the carousel to that board', dc.view && dc.front === 'cyber-attack-earth', JSON.stringify(dc));

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

  // Hidden cards: sealed with a made-up key for the test, then unlocked by link and by the ⓘ field.
  if (HIDDEN.length && !args.url) {
    const KEY = 'rig-test-key', sealedFile = path.join(OUT, 'sealed-test.json');
    require('child_process').execFileSync('python3', [path.join(ROOT, 'tools', 'seal.py'), `--key=${KEY}`, `--out=${sealedFile}`]);
    const h = HIDDEN[0], all = BOARDS_JSON.boards, idx = all.indexOf(h);
    const prev = all.slice(0, idx).filter(b => b.sec === h.sec && !b.hidden).pop();
    for (const [dn, dev] of [['laptop', DEVICES.laptop], ['fold-cover', DEVICES['fold-cover']]].filter(([, d]) => d)) {
      const R = (n, ok, d) => record(`hidden ${dn}`, n, ok, d);
      const hc = await browser.newContext({ viewport: dev.viewport, deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile, hasTouch: dev.hasTouch });
      await setupRoutes(hc);
      await hc.route(/\/sealed\.json(\?.*)?$/, r => r.fulfill({ contentType: 'application/json', body: fs.readFileSync(sealedFile, 'utf8') }));
      const hp = await hc.newPage(); const errs = []; hp.on('pageerror', e => errs.push(e.message));
      const shown = () => hp.evaluate(r => !!document.querySelector(`.card[data-repo="${r}"]`), h.repo);
      const ready = () => hp.waitForFunction(() => window.HQ && window.HQ.cards, null, { timeout: 15000 }).catch(() => {});
      try {
        await hp.goto(URL); await ready();
        R('hidden card not on the page without the key', !(await shown()));
        R('hidden card not even in the page source', !(await hp.content()).includes(h.title));
        await hp.goto('about:blank'); await hp.goto(URL + '#key=not-the-key'); await ready();
        R('a wrong key shows nothing', !(await shown()));
        await hp.goto('about:blank'); await hp.goto(URL + '#key=' + KEY); await ready(); await hp.waitForTimeout(400);
        R('the #key= link shows the hidden card', await shown());
        R('the key is wiped from the address', !(await hp.evaluate(() => location.href)).includes(KEY));
        const place = await hp.evaluate(([r, p]) => { const c = document.querySelector(`.card[data-repo="${r}"]`); const pr = c && c.previousElementSibling; return { after: pr ? pr.dataset.repo : null, inHQ: window.HQ.cards.some(x => x.dataset.repo === r) }; }, [h.repo, prev ? prev.repo : null]);
        R('the card goes back in its place', place.after === (prev ? prev.repo : null), JSON.stringify(place));
        R('tiles and carousel both know the card', place.inHQ);
        await hp.reload(); await ready();
        R('the device stays unlocked after a reload', await shown());
        // a key link pasted into an already-open tab works too
        await hp.evaluate(() => localStorage.removeItem('obs.unlock')); await hp.goto('about:blank'); await hp.goto(URL); await ready();
        await hp.evaluate(k => { location.hash = 'key=' + k; }, KEY);
        const pasted = await hp.waitForFunction(r => !!document.querySelector(`.card[data-repo="${r}"]`) && window.HQ && window.HQ.cards.length, h.repo, { timeout: 20000 }).then(() => true, () => false);
        await hp.waitForTimeout(500); await ready();
        R('a #key= link pasted into an open tab unlocks it', pasted);
        R('the stored unlock is not the key itself', !(await hp.evaluate(() => localStorage.getItem('obs.unlock') || '')).includes(KEY));
        await hp.evaluate(() => document.getElementById('hinfoBtn').click()); await hp.waitForTimeout(200);
        R('the ⓘ panel offers Lock', await hp.isVisible('#lockBtn'));
        await Promise.all([hp.waitForNavigation().catch(() => {}), hp.click('#lockBtn')]); await ready();
        R('Lock hides it again', !(await shown()));
        await hp.evaluate(() => document.getElementById('hinfoBtn').click()); await hp.waitForTimeout(200);
        await hp.fill('#unlockKey', 'wrong'); await hp.click('.unlock__btn'); await hp.waitForFunction(() => /fit/.test(document.getElementById('unlockMsg').textContent), null, { timeout: 8000 }).catch(() => {});
        R('a wrong key in the ⓘ field says so', /fit/.test(await hp.textContent('#unlockMsg')));
        await hp.fill('#unlockKey', KEY);
        await Promise.all([hp.waitForNavigation({ timeout: 15000 }).catch(() => {}), hp.click('.unlock__btn')]); await ready();
        R('the right key in the ⓘ field shows the card', await shown());
        const w = await hp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
        R('not wider than the screen when unlocked', w <= 1, `${w}px`);
      } catch (e) { R('run completed', false, e.message.split('\n')[0]); }
      R('no script errors', errs.length === 0, errs.slice(0, 3).join(' | '));
      await hc.close();
    }
  }
  // Restricted cards ("restricted" in boards.json): dimmed with "Access by request" until this device holds the
  // board's key (its IndexedDB key store, checked against the board's seal.json).
  for (const rb of BOARDS_JSON.boards.filter(b => b.restricted && !b.hidden)) {
    if (args.url) break;
    const crypto = require('crypto');
    const raw = crypto.randomBytes(32), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', raw, iv);
    const check = Buffer.concat([iv, c.update('energy-resilience-unlocked'), c.final(), c.getAuthTag()]).toString('base64');
    for (const [dn, dev] of [['laptop', DEVICES.laptop], ['phone', DEVICES.phone]].filter(([, d]) => d)) {
      const R = (n, ok, d) => record(`restricted ${dn}`, n, ok, d);
      const rc = await browser.newContext({ viewport: dev.viewport, deviceScaleFactor: dev.deviceScaleFactor, isMobile: dev.isMobile, hasTouch: dev.hasTouch });
      await setupRoutes(rc);
      await rc.route(new RegExp(`/${rb.repo}/seal\\.json`), r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ check }) }));
      await rc.route(new RegExp(`^${BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}${rb.repo}/`), r => r.fulfill({ contentType: 'text/html', body: '<title>board</title>key screen' }));
      await rc.addInitScript(() => { try { localStorage.setItem('obs.view', 'tiles'); } catch (e) {} });
      const rp = await rc.newPage(); const errs = []; rp.on('pageerror', e => errs.push(e.message));
      const state = () => rp.evaluate(r => {
        const c = document.querySelector(`.group .card[data-repo="${r}"], .card[data-repo="${r}"]`); if (!c) return null;
        const img = c.querySelector('.media img'), req = c.querySelector('.request');
        return { restricted: c.classList.contains('card--restricted'), blur: getComputedStyle(img).filter, req: !!req && req.offsetParent !== null, mail: req ? req.getAttribute('href') : '', go: c.querySelector('.go').textContent.trim() };
      }, rb.repo);
      try {
        await rp.goto(URL); await rp.waitForTimeout(1500);
        let st = await state();
        R('the card is on the page', !!st);
        R('dimmed and blurred without the key', st && st.restricted && /blur/.test(st.blur), JSON.stringify(st));
        R('"Request access" link by email', st && st.req && st.mail.startsWith(`mailto:${rb.restricted.email}`), JSON.stringify(st));
        // the picture opens the board's key screen, not the demo video
        const media = await rp.$(`.card[data-repo="${rb.repo}"] .media`);
        if (media) {
          await media.scrollIntoViewIfNeeded();
          await Promise.all([rp.waitForNavigation({ timeout: 10000 }).catch(() => {}), media.click()]);
          R('the picture opens the board (key screen), not the video', rp.url().includes(`/${rb.repo}/`), rp.url());
          await rp.goto(URL); await rp.waitForTimeout(800);
        }
        // a stored key that no longer fits keeps it dimmed
        const put = k => rp.evaluate(([name, bytes]) => new Promise(ok => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => { const t = r.result.transaction('k', 'readwrite'); t.objectStore('k').put(new Uint8Array(bytes).buffer, 'raw'); t.oncomplete = () => { r.result.close(); ok(); }; }; }), [rb.restricted.keydb, [...k]]);
        await put(crypto.randomBytes(32)); await rp.reload(); await rp.waitForTimeout(1500);
        st = await state();
        R('an old key keeps it dimmed', st && st.restricted, JSON.stringify(st));
        await put(raw); await rp.reload(); await rp.waitForTimeout(1500);
        st = await state();
        R('clear once the board has been opened with its key', st && !st.restricted && !/blur/.test(st.blur) && !st.req && /^Open/.test(st.go), JSON.stringify(st));
        const w = await rp.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth);
        R('not wider than the screen', w <= 1, `${w}px`);
        // the ⓘ panel: no hub key field (no hidden cards), and a Lock for the board open on this device
        await rp.evaluate(() => document.getElementById('hinfoBtn').click()); await rp.waitForTimeout(300);
        const panel = await rp.evaluate(() => ({ keyField: !!document.getElementById('unlockKey') && document.getElementById('unlockKey').offsetParent !== null, lock: !!document.querySelector('#accessBox:not([hidden]) .unlock__btn') }));
        R('the ⓘ panel has no key field when no card is hidden', !panel.keyField || BOARDS_JSON.boards.some(b => b.hidden), JSON.stringify(panel));
        R('the ⓘ panel offers Lock for the board', panel.lock, JSON.stringify(panel));
        if (panel.lock) {
          await Promise.all([rp.waitForNavigation({ timeout: 10000 }).catch(() => {}), rp.click('#accessBox .unlock__btn')]); await rp.waitForTimeout(1500);
          st = await state();
          const left = await rp.evaluate(name => new Promise(ok => { const r = indexedDB.open(name, 1); r.onsuccess = () => { const q = r.result.transaction('k').objectStore('k').get('raw'); q.onsuccess = () => ok(!!q.result); q.onerror = () => ok(false); }; r.onerror = () => ok(false); }), rb.restricted.keydb);
          R('Lock dims the card again and forgets the board key', st && st.restricted && !left, JSON.stringify({ st, left }));
        }
      } catch (e) { R('run completed', false, e.message.split('\n')[0]); }
      R('no script errors', errs.length === 0, errs.slice(0, 3).join(' | '));
      await rc.close();
    }
  }
  await browser.close();
  if (server) server.close();

  const failed = results.filter(r => !r.ok);
  console.log('\n' + results.map(r => `${r.ok ? 'PASS' : 'FAIL'}  ${r.device.padEnd(12)} ${r.name}${r.ok || !r.detail ? '' : '  — ' + r.detail}`).join('\n'));
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed. Screenshots in tests/out/`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ version: VERSION, url: URL, when: new Date().toISOString(), results }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
