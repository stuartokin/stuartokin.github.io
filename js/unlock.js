// Hidden cards. Runs before the rest of the page: if this device holds the key, it decrypts sealed.json
// (written by tools/seal.py from the HUB_UNLOCK_KEY secret) and puts the hidden cards back in their places,
// then starts site.js and the 3D carousel as usual, so they see every card.
// Unlock: the ⓘ panel's key field, or a link ending #key=…  (the key is wiped from the address straight away).
// The device keeps the derived AES key (not the key itself) until "Lock" is pressed.
(() => {
  const me = document.currentScript, STORE = 'obs.unlock';
  const get = () => { try { return localStorage.getItem(STORE); } catch (e) { return null; } };
  const put = v => { try { v ? localStorage.setItem(STORE, v) : localStorage.removeItem(STORE); } catch (e) {} };
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const enc = u => btoa(String.fromCharCode(...new Uint8Array(u)));
  const subtle = window.crypto && crypto.subtle;
  let sealedP = null;
  const sealed = () => sealedP || (sealedP = fetch('sealed.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null));

  async function rawFromKey(key, s) {
    const base = await subtle.importKey('raw', new TextEncoder().encode(key), 'PBKDF2', false, ['deriveBits']);
    return subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(s.salt), iterations: s.iter }, base, 256);
  }
  async function open(raw, s) {
    const k = await subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: b64(s.iv) }, k, b64(s.data));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function insert(p) {
    for (const c of p.cards || []) {
      if (document.querySelector(`.card[data-repo="${CSS.escape(c.repo)}"]`)) continue;
      const t = document.createElement('template'); t.innerHTML = c.html.trim();
      const el = t.content.firstElementChild; if (!el) continue;
      const after = c.after && document.querySelector(`.card[data-repo="${CSS.escape(c.after)}"]`);
      const grid = document.querySelector(`.group[data-group="${CSS.escape(c.sec)}"] .grid`);
      if (after) after.after(el); else if (grid) grid.prepend(el); else continue;
      el.dataset.unlocked = '';
    }
    // the header line "N boards · M maintained by agents" is rebuilt by site.js from the cards on the page
    document.documentElement.classList.add('unlocked');
  }
  function start() {
    // the rest of the page, in the order the HTML used to load it
    const s = document.createElement('script'); s.src = me.dataset.site; s.async = false;
    s.onload = () => { const m = document.createElement('script'); m.type = 'module'; m.src = me.dataset.c3d; document.body.appendChild(m); };
    document.body.appendChild(s);
    panel();
  }

  // ---- the ⓘ panel: a key field, or "Hidden cards shown · Lock" (nothing when no card is hidden) ----
  async function panel() {
    const box = document.getElementById('unlockBox'); if (!box) return;
    const on = !!get();
    // no hidden cards to unlock: no key field (it only confused people; restricted cards use js/access.js)
    if (!on) { const s = await sealed(); if (!s || !s.sealed) { box.hidden = true; return; } }
    box.innerHTML = on
      ? '<span class="unlock__on">🔓 Hidden cards shown on this device</span> <button type="button" class="unlock__btn" id="lockBtn">Lock</button>'
      : '<form class="unlock__form" id="unlockForm" autocomplete="off"><label class="sr" for="unlockKey">Key</label>' +
        '<input id="unlockKey" type="password" placeholder="Key" autocomplete="off" spellcheck="false" />' +
        '<button type="submit" class="unlock__btn">Unlock</button><span class="unlock__msg" id="unlockMsg" role="status"></span></form>';
    const lock = document.getElementById('lockBtn');
    if (lock) lock.addEventListener('click', () => { put(null); location.reload(); });
    const f = document.getElementById('unlockForm');
    if (f) f.addEventListener('submit', async e => {
      e.preventDefault(); const msg = document.getElementById('unlockMsg'), v = document.getElementById('unlockKey').value.trim();
      if (!v) return; msg.textContent = 'Checking…';
      const ok = await tryKey(v);
      if (ok) { msg.textContent = 'Unlocked'; location.reload(); } else msg.textContent = 'That key doesn’t fit.';
    });
  }
  async function tryKey(key) {
    if (!subtle) return false;
    const s = await sealed(); if (!s || !s.sealed) return false;
    try { const raw = await rawFromKey(key, s); await open(raw, s); put(enc(raw) + '.' + s.salt); return true; } catch (e) { return false; }
  }

  (async () => {
    try {
      // a link ending #key=… unlocks this device, then the key is taken out of the address
      const m = location.hash.match(/(?:^#|&)key=([^&]+)/);
      if (m) {
        const key = decodeURIComponent(m[1]);
        history.replaceState(null, '', location.pathname + location.search + location.hash.replace(/(?:^#|&)key=[^&]+/, '').replace(/^#?&/, '#').replace(/^#$/, ''));
        await tryKey(key);
      }
      const held = get();
      if (held && subtle) {
        const s = await sealed(), [raw, salt] = held.split('.');
        // a new key (or new salt) means the stored one no longer fits: forget it quietly
        if (!s || !s.sealed || salt !== s.salt) { if (s && s.sealed) put(null); }
        else { try { insert(await open(b64(raw), s)); } catch (e) { put(null); } }
      }
    } catch (e) { /* never block the page */ }
    start();
  })();
  // a #key= link pasted into a tab that already shows the page
  addEventListener('hashchange', async () => {
    const m = location.hash.match(/(?:^#|&)key=([^&]+)/); if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    if (await tryKey(decodeURIComponent(m[1]))) location.reload();
  });
})();
