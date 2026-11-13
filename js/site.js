(() => {
  const OWNER = 'stuartokin';
  const root = document.documentElement;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const cards = [...document.querySelectorAll('.card[data-repo]')];
  const home = cards.map(c => c.parentElement);   // each card's tile grid, to put it back

  /* ---------- "Updated N days ago" from each repo's latest commit ---------- */
  const ago = d => {
    const days = Math.floor((Date.now() - d.getTime()) / 864e5);
    if (days <= 0) return 'Updated today';
    if (days === 1) return 'Updated yesterday';
    if (days < 45) return `Updated ${days} days ago`;
    return 'Updated ' + d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };
  const CACHE_KEY = 'obs-updated-v1', TTL = 60 * 60 * 1000;
  let cache = {};
  try { cache = JSON.parse(store.get(CACHE_KEY) || '{}'); } catch (e) {}
  const dates = {};
  const dateOf = c => dates[c.dataset.repo] || new Date(c.querySelector('.upd').dataset.fallback);
  const paint = () => {
    for (const c of cards) { const el = c.querySelector('.upd'), d = dateOf(c); el.textContent = ago(d); el.title = d.toLocaleString('en-GB'); }
    const latest = new Date(Math.max(...cards.map(dateOf)));
    const live = document.querySelectorAll('.card[data-agents]').length;
    const pulseHtml =
      `<b>${cards.length}</b> boards · <b>${live}</b> maintained by agents · last change <b>${ago(latest).replace('Updated ', '')}</b>`;
    document.querySelectorAll('[data-pulse]').forEach(el => (el.innerHTML = pulseHtml));
  };
  const fetchOne = async repo => {
    const hit = cache[repo];
    if (hit && Date.now() - hit.t < TTL) return new Date(hit.d);
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/commits?per_page=1`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(r.status);
    const [c] = await r.json();
    cache[repo] = { d: c.commit.committer.date, t: Date.now() };
    return new Date(c.commit.committer.date);
  };
  paint();
  Promise.allSettled(cards.map(c => fetchOne(c.dataset.repo).then(d => (dates[c.dataset.repo] = d))))
    .then(() => { store.set(CACHE_KEY, JSON.stringify(cache)); paint(); });

  /* ---------- Info icons: title (about + links) and each section's note ---------- */
  const hBtn = document.getElementById('hinfoBtn'), hPanel = document.getElementById('hinfo');
  const setH = open => { hPanel.hidden = !open; hBtn.setAttribute('aria-expanded', String(open)); };
  hBtn.addEventListener('click', e => { e.stopPropagation(); setH(hPanel.hidden); });
  document.addEventListener('click', e => { if (!hPanel.hidden && !hPanel.contains(e.target)) setH(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !hPanel.hidden) { setH(false); hBtn.focus(); } });
  document.querySelectorAll('.infobtn--sec').forEach(b => b.addEventListener('click', () => {
    const n = document.getElementById(b.getAttribute('aria-controls'));
    const open = !n.classList.contains('open');
    n.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    if (fit) refresh();
  }));

  /* ---------- Toolbar: words where they fit on one line, icons where they don't ---------- */
  const bar = document.querySelector('.toolbar');
  /* The bar never wraps: if its contents are wider than it, drop the words, then the
     percentage, then tighten the spacing. Re-checked whenever the bar changes size
     (unfolding a Fold, rotating, fonts arriving). */
  const overflows = () => bar.scrollWidth > bar.clientWidth + 1;
  function fitBar() {
    /* In fit mode the page is zoomed to the screen: the bar keeps the icon form set by refresh(). */
    if (document.body.classList.contains('fit')) return;
    bar.classList.remove('compact', 'tight', 'tiny');
    for (const level of ['compact', 'tight', 'tiny']) { if (!overflows()) break; bar.classList.add(level); }
  }
  fitBar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBar);
  addEventListener('load', fitBar);
  if (window.ResizeObserver) { let lastW = 0; new ResizeObserver(() => { const w = bar.clientWidth; if (Math.abs(w - lastW) > 1) { lastW = w; fitBar(); } }).observe(bar); }

  /* ---------- Theme ---------- */
  const themeBtns = document.querySelectorAll('[data-theme-set]');
  const setTheme = (t, save) => {
    root.dataset.theme = t;
    document.querySelector('meta[name="theme-color"]').content = t === 'light' ? '#EBE6DC' : '#070B14';
    themeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
    if (save) store.set('obs.theme', t);
  };
  setTheme(root.dataset.theme || 'dark');
  themeBtns.forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet, true)));

  /* ---------- Tile text size ---------- */
  const SIZES = [0.85, 1, 1.15, 1.3, 1.5, 1.75];
  let ts = parseFloat(getComputedStyle(root).getPropertyValue('--ts')) || 1;
  const tsOut = document.getElementById('tsOut');
  const setTs = (v, save) => {
    ts = v; root.style.setProperty('--ts', v);
    tsOut.textContent = Math.round(v * 100) + '%';
    document.querySelector('[data-ts="-1"]').disabled = v <= SIZES[0];
    document.querySelector('[data-ts="1"]').disabled = v >= SIZES[SIZES.length - 1];
    if (save) store.set('obs.ts', v);
    requestAnimationFrame(refresh);
  };
  document.querySelectorAll('[data-ts]').forEach(b => b.addEventListener('click', () => {
    const i = SIZES.findIndex(s => s >= ts - 0.001);
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, (i < 0 ? 1 : i) + +b.dataset.ts))];
    setTs(next, true);
  }));

  /* ---------- Carousel (the orbit) ---------- */
  const orbit = document.getElementById('orbit');
  const stage = orbit.querySelector('.ostage');
  const groups = document.querySelectorAll('.group');
  let view = 'tiles', angle = 0, moved = 0;
  const step = () => 360 / cards.length;
  const frontIndex = () => ((Math.round(angle / step()) % cards.length) + cards.length) % cards.length;

  const ring = stage.querySelector('.oring');
  /* The platform's rim: thin upright strips set round the edge of the top face. */
  const lite = root.classList.contains('lite');
  (() => {
    const base = document.createElement('i'); base.className = 'pl-base'; base.setAttribute('aria-hidden', 'true');
    if (lite) {   // one disc set lower than the top gives the platform its height
      const side = document.createElement('i'); side.className = 'pl-side'; side.setAttribute('aria-hidden', 'true');
      ring.prepend(side); ring.prepend(base); return;
    }
    const rim = document.createElement('span'); rim.className = 'pl-ring'; rim.setAttribute('aria-hidden', 'true');
    const N = 64;
    rim.innerHTML = Array.from({ length: N }, (_, i) =>
      `<i style="transform: translateY(var(--py)) rotateY(${(i * 360 / N).toFixed(2)}deg) translateZ(var(--pr))"></i>`).join('');
    ring.prepend(rim); ring.prepend(base);
  })();
  /* The faces that give each carousel card its thickness (hidden in the tile view). */
  if (!lite) cards.forEach(c => {
    const s = document.createElement('span'); s.className = 'slab'; s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<i class="sh"></i><i class="bk"></i><i class="fr"></i><i class="l"></i><i class="r"></i><i class="t"></i><i class="b"></i>';
    c.prepend(s);
  });
  const geo = { cw: 300, ch: 480, R: 480 };
  /* Each card sits on a real 3D ring: turned to its place, pushed out to the rim. The ring is
     tilted towards you, so cards going round the back rise up and turn away. */
  /* Touch screens: the same ring drawn with flat (2D) moves only — position, size and a
     slight squeeze for cards at the side — so phone graphics never have to sort 3D surfaces. */
  function layoutFlat() {
    const W = stage.clientWidth, cw = geo.cw, ch = geo.ch;
    const RX = Math.min(W * 0.4, cw * 2.6), RY = RX * 0.2, lift = ch * 0.62;
    const ex = RX + cw * 0.62, ey = RY + cw * 0.62 * 0.2, ph = Math.max(10, ey * 0.16);
    stage.style.setProperty('--ex', ex.toFixed(1) + 'px'); stage.style.setProperty('--ey', ey.toFixed(1) + 'px');
    stage.style.setProperty('--fph', ph.toFixed(1) + 'px');
    const front = frontIndex(), s = step();
    cards.forEach((c, i) => {
      let rel = i * s - angle; rel = ((rel % 360) + 540) % 360 - 180;
      const r = rel * Math.PI / 180, sn = Math.sin(r), cs = Math.cos(r), a = Math.abs(rel);
      const k = 0.42 + 0.58 * Math.pow((cs + 1) / 2, 1.3), squeeze = 0.8 + 0.2 * Math.abs(cs);
      const x = sn * RX, y = cs * RY - (1 - cs) / 2 * lift;
      c.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(k * squeeze).toFixed(4)}, ${k.toFixed(4)})`;
      c.style.zIndex = String(Math.round((cs + 1) * 100) + 10);
      c.style.opacity = '1';
      c.style.setProperty('--dim', i === front ? '0' : Math.min(0.72, 0.18 + a / 230).toFixed(3));
    });
  }
  /* WebGL carousel (js/carousel3d.js) draws the ring when the device supports it. */
  const gl = () => !!(window.HQ3D && window.HQ3D.ready);
  function syncFront(front, n) {
    cards.forEach((c, i) => {
      const isFront = i === front;
      c.classList.toggle('ofront', isFront);
      c.setAttribute('aria-hidden', String(!isFront));
      c.querySelectorAll('a, button').forEach(el => (el.tabIndex = isFront ? 0 : -1));
    });
    const fc0 = cards[front];
    orbit.querySelector('.olabel').textContent = `${fc0.dataset.section} · ${front + 1} of ${n}`;
    const dots0 = orbit.querySelector('.odots');
    if (dots0.children.length !== n) dots0.innerHTML = cards.map((c, i) => `<button class="odot" type="button" data-i="${i}" aria-label="${c.querySelector('h3').textContent}"></button>`).join('');
    [...dots0.children].forEach((d, i) => d.classList.toggle('on', i === front));
  }
  function layoutOrbit(instant) {
    const n = cards.length, s = step(), front = frontIndex();
    stage.classList.toggle('dragging', !!instant);
    if (gl()) {
      syncFront(front, n);
      window.HQ3D.update(angle, front, !!instant, stage.classList.contains('focusing'));
      return;
    }
    if (lite) {
      layoutFlat();
      cards.forEach((c, i) => {
        const isFront = i === front;
        c.classList.toggle('ofront', isFront);
        c.setAttribute('aria-hidden', String(!isFront));
        c.querySelectorAll('a, button').forEach(el => (el.tabIndex = isFront ? 0 : -1));
      });
      const fc0 = cards[front];
      orbit.querySelector('.olabel').textContent = `${fc0.dataset.section} · ${front + 1} of ${n}`;
      const dots0 = orbit.querySelector('.odots');
      if (dots0.children.length !== n) dots0.innerHTML = cards.map((c, i) => `<button class="odot" type="button" data-i="${i}" aria-label="${c.querySelector('h3').textContent}"></button>`).join('');
      [...dots0.children].forEach((d, i) => d.classList.toggle('on', i === front));
      return;
    }
    cards.forEach((c, i) => {
      let rel = i * s - angle; rel = ((rel % 360) + 540) % 360 - 180;
      const a = Math.abs(rel), isFront = i === front;
      /* Out to the rim, then turned most of the way back towards you, so cards behind stay
         visible: smaller, higher and angled, the way a real carousel looks from above. */
      c.style.transform = `rotateY(${rel.toFixed(2)}deg) translateZ(${geo.R.toFixed(1)}px) rotateY(${(-rel * 0.62).toFixed(2)}deg)`;
      c.style.opacity = '1';
      c.style.setProperty('--dim', isFront ? '0' : Math.min(0.72, 0.18 + a / 230).toFixed(3));
      c.classList.toggle('ofront', isFront);
      c.setAttribute('aria-hidden', String(!isFront));
      c.querySelectorAll('a, button').forEach(el => (el.tabIndex = isFront ? 0 : -1));
    });
    const fc = cards[front];
    orbit.querySelector('.olabel').textContent = `${fc.dataset.section} · ${front + 1} of ${n}`;
    const dots = orbit.querySelector('.odots');
    if (dots.children.length !== n) dots.innerHTML = cards.map((c, i) => `<button class="odot" type="button" data-i="${i}" aria-label="${c.querySelector('h3').textContent}"></button>`).join('');
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === front));
  }
  /* Card size for the ring: as wide as the screen allows while the whole page still fits the
     window height (no scroll bar), all cards the same height. vh is the height to fit into. */
  function setGeo(cw, k = 1) {
    stage.style.setProperty('--cw', cw + 'px');
    stage.classList.add('measuring');
    const ch = Math.max(...cards.map(c => c.offsetHeight));
    stage.classList.remove('measuring');
    const R = (cw / 2) / Math.tan(Math.PI / cards.length) * 1.3;
    const lift = R * 0.42;                     // how far the back of the ring rises above the front
    Object.assign(geo, { cw, ch, R });
    stage.style.setProperty('--ch', ch + 'px');
    stage.style.setProperty('--R', R.toFixed(1) + 'px');
    stage.style.setProperty('--rs', k.toFixed(4));
    stage.style.setProperty('--persp', Math.round(R * 3 + cw) + 'px');
    /* Measure where the tilted ring actually lands on screen and frame the stage around it. */
    let top = Math.round((lift + ch / 2 + 16) * k);
    stage.style.setProperty('--ringtop', top + 'px');
    for (let pass = 0; pass < 2; pass++) {
      layoutOrbit(true);
      const sr = stage.getBoundingClientRect(), st = sr.top, zr = (sr.height / stage.offsetHeight) || 1;
      let t = Infinity, b = -Infinity;
      cards.forEach(c => { const r = c.getBoundingClientRect(); t = Math.min(t, (r.top - st) / zr); b = Math.max(b, (r.bottom - st) / zr); });
      ring.querySelectorAll('.pl-ring > i, .pl-side').forEach(el => { const r = el.getBoundingClientRect(); if (r.height) b = Math.max(b, (r.bottom - st) / zr); });
      top = Math.round(top - t + 12);
      stage.style.setProperty('--ringtop', top + 'px');
      stage.style.height = Math.round(b - t + 30) + 'px';
    }
    return ch;
  }
  function sizeOrbit(vh) {
    if (gl()) {
      /* The 3D scene fills whatever height is left on screen (within sensible limits). */
      const W = stage.clientWidth || wrap.clientWidth;
      stage.style.height = '400px';
      const other = wrap.offsetHeight - stage.offsetHeight;
      const h = Math.round(Math.max(280, Math.min(vh - other - 4, W * 0.75, 900)));
      stage.style.height = h + 'px';
      window.HQ3D.resize();
      return wrap.offsetHeight <= vh;
    }
    const W = wrap.clientWidth, narrow = W < 640;
    const rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    const maxW = Math.min(rem * 22 * ts, W * (narrow ? 0.62 : 0.22));
    const minW = Math.min(230, maxW);
    const fits = cw => { setGeo(cw); return wrap.offsetHeight <= vh; };
    if (fits(maxW)) return true;
    if (fits(minW)) {
      let lo = minW, hi = maxW;
      for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
      setGeo(lo); return true;
    }
    /* Still too tall: keep the cards readable and stand the whole ring further back instead. */
    const cw = narrow ? maxW : minW;
    setGeo(cw);
    const floor = narrow ? 0.8 : 0.4;
    let k = 1;
    for (let i = 0; i < 6; i++) {
      const other = wrap.offsetHeight - stage.offsetHeight;
      k = Math.max(floor, Math.min(1, k * (vh - other - 2) / stage.offsetHeight));
      setGeo(cw, k);
      if (wrap.offsetHeight <= vh || k === floor) break;
    }
    return wrap.offsetHeight <= vh;
  }
  /* ----- Focus on the front card ----- */
  let focused = false, focusTimer = null, homeRect = null, ptrType = 'mouse';
  const tiltDeg = () => parseFloat(getComputedStyle(ring).getPropertyValue('--tilt')) || -16;
  /* The enlarged card is a flat copy laid over the carousel, outside the 3D scene, so no
     browser can ever draw the ring through it. It grows out of the front card's place. */
  let floatCard = null;
  function focusFront(on) {
    clearTimeout(focusTimer); focusTimer = null;
    if (view !== 'carousel') on = false;
    const f = cards[frontIndex()];
    if (on && focused) return;
    if (!on && !focused) return;
    focused = on;
    stage.classList.toggle('focusing', on);
    if (!on) {
      homeRect = null;
      cards.forEach(c => c.classList.remove('ofocus'));
      if (gl()) window.HQ3D.update(angle, frontIndex(), false, false);
      if (floatCard) {
        const fc = floatCard; floatCard = null;
        fc.classList.remove('in'); fc.style.pointerEvents = 'none';
        setTimeout(() => fc.remove(), reduce() ? 0 : 260);
      }
      return;
    }
    homeRect = frontRect();
    f.classList.add('ofocus');
    if (gl()) window.HQ3D.update(angle, frontIndex(), false, true);
    const fc = f.cloneNode(true);
    fc.querySelector('.slab')?.remove();
    fc.className = 'card ofloat'; fc.removeAttribute('aria-hidden'); fc.removeAttribute('style');
    fc.querySelectorAll('[tabindex]').forEach(el => el.removeAttribute('tabindex'));
    fc.querySelectorAll('video').forEach(v => v.remove());
    fc.querySelector('.media').addEventListener('click', () => { focusFront(false); f.querySelector('.media').click(); });
    fc.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && x0 === null && !inRect(homeRect, e)) focusFront(false); });
    fc.addEventListener('pointerdown', e => { if (e.button) return; ptrType = e.pointerType; x0 = e.clientX; a0 = angle; moved = 0; });
    fc.addEventListener('click', e => { if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    fc.addEventListener('dragstart', e => e.preventDefault());
    document.body.appendChild(fc);
    /* Size: up to 1.75 × the card, never wider than the screen, never taller than the space
       between the toolbar and the bottom of the screen. */
    const vw = document.documentElement.clientWidth, vh = window.visualViewport ? visualViewport.height : innerHeight;
    const top0 = Math.max(0, bar.getBoundingClientRect().bottom) + 10, bot0 = vh - 10;
    const w = Math.min(Math.max(homeRect.width * 1.75, gl() ? 300 : geo.cw * 1.75), vw - 24, 640);
    fc.style.width = w + 'px';
    const k = Math.min(1, (bot0 - top0) / fc.offsetHeight);
    const h = fc.offsetHeight * k, cx = homeRect.left + homeRect.width / 2, cy = homeRect.top + homeRect.height / 2;
    const left = Math.min(Math.max(12, cx - w * k / 2), vw - 12 - w * k);
    const top = Math.min(Math.max(top0, cy - h / 2), bot0 - h);
    Object.assign(fc.style, { left: left + 'px', top: top + 'px', '--k': k.toFixed(4) });
    fc.style.setProperty('--k', k.toFixed(4));
    /* Start exactly over the ring card, then grow to the final size. */
    const sx = homeRect.width / (w * k), sy = homeRect.height / h;
    fc.style.setProperty('--from', `translate(${(homeRect.left - left).toFixed(1)}px, ${(homeRect.top - top).toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`);
    void fc.offsetWidth;
    requestAnimationFrame(() => fc.classList.add('in'));
    floatCard = fc;
  }
  function frontRect() { return gl() ? window.HQ3D.frontRect() : cards[frontIndex()].getBoundingClientRect(); }
  const inRect = (r, e) => r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  stage.addEventListener('pointermove', e => {
    ptrType = e.pointerType;
    if (e.pointerType !== 'mouse' || x0 !== null || reduceFocus()) return;
    const f = cards[frontIndex()];
    if (focused) {
      if (!inRect(homeRect, e) && !(floatCard && inRect(floatCard.getBoundingClientRect(), e))) focusFront(false);
    } else if (inRect(frontRect(), e)) {
      if (!focusTimer) focusTimer = setTimeout(() => focusFront(true), 400);
    } else { clearTimeout(focusTimer); focusTimer = null; }
  });
  /* Touch: a tap anywhere outside the enlarged card puts it back. */
  document.addEventListener('pointerdown', e => {
    if (focused && floatCard && !floatCard.contains(e.target) && !stage.contains(e.target)) focusFront(false);
  }, true);
  addEventListener('scroll', () => { if (focused) focusFront(false); }, { passive: true });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && focused) focusFront(false); });
  stage.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse' && !(floatCard && inRect(floatCard.getBoundingClientRect(), e))) focusFront(false);
  });
  stage.addEventListener('focusin', e => {   // keyboard users: tabbing onto the front card focuses it
    if (e.target.closest('.card.ofront') && e.target.matches(':focus-visible')) focusFront(true);
  });
  stage.addEventListener('focusout', e => { if (!stage.contains(e.relatedTarget) && !(floatCard && floatCard.contains(e.relatedTarget))) focusFront(false); });
  function reduceFocus() { return false; }
  const turnTo = i => { focusFront(false); let d = i * step() - angle; d = ((d % 360) + 540) % 360 - 180; angle += d; layoutOrbit(); };
  const stepBy = dir => { focusFront(false); angle = Math.round(angle / step()) * step() + dir * step(); layoutOrbit(); };

  let x0 = null, a0 = 0;
  stage.addEventListener('pointerdown', e => { ptrType = e.pointerType; if (e.button) return; x0 = e.clientX; a0 = angle; moved = 0; });
  /* Drags are followed across the whole window, so a drag that starts on the enlarged card
     (or wanders off the carousel) still turns the ring. */
  addEventListener('pointermove', e => {
    if (x0 === null) return;
    const dx = e.clientX - x0; moved = Math.max(moved, Math.abs(dx));
    if (moved > 5) { if (focused) focusFront(false); angle = a0 - dx * 0.25; layoutOrbit(true); }
  });
  const endDrag = () => { if (x0 === null) return; x0 = null; if (moved > 5) { angle = Math.round(angle / step()) * step(); layoutOrbit(); } };
  ['pointerup', 'pointercancel'].forEach(t => addEventListener(t, endDrag));
  /* A drag is not a click, and a card at the side comes forward instead of opening. */
  stage.addEventListener('click', e => {
    if (focused && ptrType !== 'mouse') { e.preventDefault(); e.stopPropagation(); focusFront(false); return; }
    if (gl() && e.target.closest('canvas')) {
      e.preventDefault(); e.stopPropagation();
      if (moved > 5) { moved = 0; return; }
      const i = window.HQ3D.pick(e.clientX, e.clientY);
      if (i < 0) { focusFront(false); return; }
      if (i === frontIndex()) { if (!focused) focusFront(true); return; }
      turnTo(i); return;
    }
    const c = e.target.closest('.card'); if (!c) { focusFront(false); return; }
    if (moved > 5) { e.preventDefault(); e.stopPropagation(); moved = 0; return; }
    /* On touch screens the first tap on the front card brings it forward to read. */
    if (c.classList.contains('ofront') && !focused && ptrType !== 'mouse') { e.preventDefault(); e.stopPropagation(); focusFront(true); return; }
    if (!c.classList.contains('ofront')) { e.preventDefault(); e.stopPropagation(); turnTo(cards.indexOf(c)); }
  }, true);
  stage.addEventListener('dragstart', e => e.preventDefault());
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepBy(e.key === 'ArrowLeft' ? -1 : 1); }
  });
  orbit.querySelectorAll('.navbtn').forEach(b => b.addEventListener('click', () => stepBy(+b.dataset.dir)));
  orbit.querySelector('.odots').addEventListener('click', e => { const d = e.target.closest('.odot'); if (d) turnTo(+d.dataset.i); });
  /* On phones and Folds the browser's address bar slides in and out as you scroll, which
     changes only the window height. Re-laying the page for that made the footer jump, so
     only a width change (rotating, folding, resizing a window) or a big height change counts. */
  const touchy = matchMedia('(pointer: coarse)').matches;
  let rt, lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', () => {
    const dw = Math.abs(innerWidth - lastW), dh = Math.abs(innerHeight - lastH);
    if (touchy && dw < 2 && dh < 160 && !fit) return;
    lastW = innerWidth; lastH = innerHeight;
    clearTimeout(rt); rt = setTimeout(() => { fitBar(); refresh(); }, 120);
  });

  const viewBtns = document.querySelectorAll('[data-view]');
  const fitgrid = document.getElementById('fitgrid');
  const wrap = document.querySelector('.wrap');
  const fitBtn = document.getElementById('fitBtn');
  let fit = false;
  const clean = c => {
    c.style.transform = c.style.opacity = ''; c.style.removeProperty('--dim');
    c.classList.remove('ofront'); c.removeAttribute('aria-hidden');
    c.querySelectorAll('a, button').forEach(el => el.removeAttribute('tabindex'));
  };
  /* Put the cards where the current choices say: the ring, one fitted grid, or their sections. */
  function place() {
    document.body.classList.toggle('view-tiles', view === 'tiles');
    document.body.classList.toggle('view-carousel', view === 'carousel');
    document.body.classList.toggle('fit', fit);
    viewBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    fitBtn.setAttribute('aria-pressed', String(fit));
    if (view === 'carousel') {
      cards.forEach(c => ring.appendChild(c));
      groups.forEach(g => (g.hidden = true)); fitgrid.hidden = true; orbit.hidden = false;
    } else {
      cards.forEach(clean);
      if (fit) { cards.forEach(c => fitgrid.appendChild(c)); fitgrid.hidden = false; groups.forEach(g => (g.hidden = true)); }
      else { cards.forEach((c, i) => home[i].appendChild(c)); fitgrid.hidden = true; groups.forEach(g => (g.hidden = false)); }
      orbit.hidden = true;
    }
    refresh();
  }
  /* Lay out for the current screen; in fit mode, choose the column count that shows the
     largest cards with nothing below the fold, then shrink the whole page if still needed. */
  /* Shrink the page to the window when fit is on, but widen it first by the same factor, so
     the result still fills the whole screen width (large screens included). */
  /* Fit: find the largest zoom at which the whole page fits the window height. CSS zoom keeps
     the page exactly as wide as the screen (it re-lays itself out at the new size), so nothing
     ever sits off-screen; on big screens it can go above 1 to use the spare room. Browsers
     without zoom fall back to scaling. */
  const canZoom = CSS.supports && CSS.supports('zoom', '2');
  const viewH = () => Math.floor(window.visualViewport ? visualViewport.height : innerHeight);
  function scaleToFit(prep) {
    const VW = document.documentElement.clientWidth, VH = viewH();
    const apply = z => {
      const one = Math.abs(z - 1) < 0.002;
      if (canZoom) wrap.style.zoom = one ? '' : z.toFixed(4);
      else wrap.style.width = one ? '' : (VW / z) + 'px';
    };
    const visH = z => canZoom ? wrap.getBoundingClientRect().height : wrap.offsetHeight * z;
    const test = z => { apply(z); if (prep) prep(z, VH); return visH(z) <= VH - 2; };
    let lo = 0.15, hi = 2.2;
    if (test(1)) lo = 1; else hi = 1;
    for (let k = 0; k < 9; k++) { const mid = (lo + hi) / 2; if (test(mid)) lo = mid; else hi = mid; }
    test(lo);
    if (!canZoom) wrap.style.transform = Math.abs(lo - 1) < 0.002 ? '' : `scale(${lo.toFixed(4)})`;
    return lo;
  }
  function refresh() {
    if (typeof focusFront === 'function') focusFront(false);
    wrap.style.transform = ''; wrap.style.width = ''; wrap.style.zoom = '';
    if (fit) { bar.classList.remove('tiny'); bar.classList.add('compact', 'tight'); } else fitBar();
    if (!fit) {
      if (view === 'carousel') { sizeOrbit(viewH()); layoutOrbit(true); requestAnimationFrame(() => layoutOrbit()); }
      return;
    }
    if (view === 'tiles') {
      let best = null;
      const VW = document.documentElement.clientWidth;
      const maxN = Math.min(cards.length, Math.max(1, Math.floor(VW / 150)));
      for (let n = 1; n <= maxN; n++) {
        fitgrid.style.setProperty('--fitcols', n);
        const z = scaleToFit();
        const score = (VW / n) * Math.min(z, 1);   // on-screen card width, unless text would shrink
        if (!best || score > best.score + 1) best = { n, score };
      }
      fitgrid.style.setProperty('--fitcols', best.n);
      scaleToFit();
    } else {
      scaleToFit((z, VH) => sizeOrbit(VH / z));
      layoutOrbit(true); requestAnimationFrame(() => layoutOrbit());
    }
    scrollTo(0, 0);
  }
  function setView(v, save) {
    view = v === 'carousel' ? 'carousel' : 'tiles';
    place();
    if (save) store.set('obs.view', view);
  }
  fitBtn.addEventListener('click', () => { fit = !fit; store.set('obs.fit', fit ? '1' : '0'); place(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => refresh());
  addEventListener('load', () => refresh());
  viewBtns.forEach(b => b.addEventListener('click', () => setView(b.dataset.view, true)));

  /* ---------- Hover previews (desktop only, motion permitting) ---------- */
  if (canHover) {
    for (const c of cards) {
      const m = c.querySelector('.media'), v = m.querySelector('video');
      c.addEventListener('mouseenter', () => {
        if (reduce() || (view === 'carousel' && !c.classList.contains('ofront'))) return;
        if (!v.src) v.src = v.dataset.src;
        v.play().then(() => m.classList.add('playing')).catch(() => {});
      });
      c.addEventListener('mouseleave', () => { m.classList.remove('playing'); v.pause(); });
    }
  }

  /* ---------- Music (off unless chosen; browsers only allow sound after a tap or click) ---------- */
  const music = document.getElementById('music');
  const musicBtn = document.getElementById('musicBtn');
  music.volume = 0.35;
  let musicOn = false, ducked = false;
  const paintMusic = () => {
    musicBtn.setAttribute('aria-pressed', String(musicOn));
    musicBtn.setAttribute('aria-label', musicOn ? 'Mute music' : 'Turn music on');
    document.getElementById('musicIco').textContent = musicOn ? '♫' : '🔇';
    document.getElementById('musicTxt').textContent = musicOn ? 'Music on' : 'Music off';
  };
  const syncMusic = () => { if (musicOn && !ducked) music.play().catch(() => {}); else music.pause(); };
  const setMusic = (on, save) => { musicOn = on; paintMusic(); syncMusic(); if (save) store.set('obs.music', on ? '1' : '0'); };
  musicBtn.addEventListener('click', () => setMusic(!musicOn, true));
  if (store.get('obs.music') === '1') {
    musicOn = true; paintMusic();
    /* A remembered "on" starts with the visitor's first tap, click or key press. */
    const kick = () => { syncMusic(); removeEventListener('pointerdown', kick, true); removeEventListener('keydown', kick, true); };
    music.play().catch(() => { addEventListener('pointerdown', kick, true); addEventListener('keydown', kick, true); });
  }

  /* ---------- Demo player ---------- */
  const dlg = document.getElementById('player');
  const pv = document.getElementById('playerVideo');
  const tabs = document.getElementById('playerTabs');
  const openLink = document.getElementById('playerOpen');
  const load = (src, btn) => {
    pv.src = src; pv.play().catch(() => {});
    for (const b of tabs.children) b.setAttribute('aria-pressed', String(b === btn));
  };
  for (const m of document.querySelectorAll('.media')) {
    m.addEventListener('click', () => {
      const vids = JSON.parse(m.dataset.videos);
      document.getElementById('playerTitle').textContent = m.dataset.title;
      const about = document.getElementById('playerAbout');
      about.textContent = m.dataset.about || ''; about.hidden = !m.dataset.about;
      openLink.href = m.closest('.card').querySelector('a.body').href;
      tabs.innerHTML = '';
      vids.forEach(([label, src]) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label;
        b.addEventListener('click', () => load(src, b));
        tabs.appendChild(b);
      });
      tabs.hidden = vids.length < 2;
      dlg.showModal();
      ducked = true; syncMusic();   // the demo's own sound takes over
      load(vids[0][1], tabs.children[0]);
    });
  }
  const close = () => { pv.pause(); pv.removeAttribute('src'); pv.load(); dlg.close(); ducked = false; syncMusic(); };
  document.getElementById('playerClose').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });

  /* ---------- Restore saved choices ---------- */
  setTs(SIZES.includes(ts) ? ts : 1);
  fit = store.get('obs.fit') === '1';
  /* First visit: the carousel on tablets, Folds, laptops and big screens; tiles on phones. */
  setView(store.get('obs.view') || (Math.min(innerWidth, screen.width || innerWidth) >= 600 ? 'carousel' : 'tiles'));
  /* Shared with the WebGL carousel. */
  window.HQ = { cards, stage, getAngle: () => angle, frontIndex, step, refresh, layoutOrbit, isFocused: () => focused };
})();
