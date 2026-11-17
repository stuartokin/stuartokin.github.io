// Restricted cards ("restricted" in tools/boards.json): shown dimmed with "Access by request" until this device
// has opened the board with its key. The board (e.g. horizonqltd.com/energy-resilience/) shares this site's
// address, so its key store (IndexedDB, name in data-keydb) can be read here. The stored key is checked against
// the board's seal.json, so an old key that no longer fits keeps the card dimmed. Nothing is sent anywhere.
(() => {
  const cards = () => [...document.querySelectorAll('.card--restricted[data-keydb]')];
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const stored = name => new Promise(ok => {
    try {
      const r = indexedDB.open(name, 1);
      r.onupgradeneeded = () => { r.transaction.abort(); ok(null); }; // the board hasn't been opened on this device
      r.onerror = () => ok(null);
      r.onsuccess = () => { try { const q = r.result.transaction('k').objectStore('k').get('raw'); q.onsuccess = () => ok(q.result || null); q.onerror = () => ok(null); } catch (e) { ok(null); } };
    } catch (e) { ok(null); }
  });
  const fits = async (raw, repo) => {
    try {
      const s = await (await fetch(`/${repo}/seal.json`, { cache: 'no-store' })).json();
      if (!s.check) return true; // the board isn't sealed any more
      const k = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
      const c = b64(s.check);
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: c.slice(0, 12) }, k, c.slice(12));
      return true;
    } catch (e) { return false; }
  };
  // Lock again on this device: forget the board's stored keys and stop its unlock helper, so both the board
  // (key screen) and this card (dimmed) are locked, as for someone who has never had the key.
  const lock = async (keydb, repo) => {
    await new Promise(ok => { try { const r = indexedDB.open(keydb, 1); r.onupgradeneeded = () => r.result.createObjectStore('k');
      r.onsuccess = () => { const t = r.result.transaction('k', 'readwrite'); t.objectStore('k').delete('raw'); t.objectStore('k').delete('raw2'); t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => ok(); };
      r.onerror = () => ok(); } catch (e) { ok(); } });
    try { for (const reg of await navigator.serviceWorker.getRegistrations()) if (new URL(reg.scope).pathname.startsWith(`/${repo}/`)) await reg.unregister(); } catch (e) { /* none */ }
    location.reload();
  };
  const showLock = (title, keydb, repo) => {
    const box = document.getElementById('accessBox'); if (!box) return;
    const row = document.createElement('div'); row.className = 'unlock__form';
    row.innerHTML = '<span class="unlock__on"></span> <button type="button" class="unlock__btn"></button>';
    row.firstChild.textContent = `🔓 ${title} open on this device`;
    const b = row.querySelector('button'); b.textContent = 'Lock'; b.setAttribute('aria-label', `Lock ${title} on this device`);
    b.addEventListener('click', () => lock(keydb, repo));
    box.appendChild(row); box.hidden = false;
  };
  const open = repo => {
    for (const c of document.querySelectorAll(`.card--restricted[data-repo="${repo}"]`)) {
      c.classList.remove('card--restricted');
      const go = c.querySelector('.go'); if (go && go.dataset.open) go.textContent = go.dataset.open;
    }
    window.HQ3D && window.HQ3D.repaint && window.HQ3D.repaint();
  };
  const run = async () => {
    if (!window.indexedDB || !window.crypto || !crypto.subtle) return;
    const seen = new Set();
    for (const c of cards()) {
      const repo = c.dataset.repo; if (seen.has(repo)) continue; seen.add(repo);
      const raw = await stored(c.dataset.keydb);
      if (raw && await fits(raw, repo)) { open(repo); showLock(c.querySelector('h3')?.textContent.trim() || repo, c.dataset.keydb, repo); }
    }
  };
  window.HQAccess = { run, open };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
