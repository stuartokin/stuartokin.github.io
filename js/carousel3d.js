/* HorizonQ Observatories — the 3D carousel, drawn with WebGL (three.js).
   The page (js/site.js) still owns the state: which card is in front, turning, focus.
   This file only draws the ring and tells the page where things are on screen.
   If WebGL is unavailable, nothing here runs and the page keeps its CSS carousel. */
import * as THREE from './vendor/three.module.min.js';

const HQ = window.HQ;
if (HQ) init();

function init() {
  const root = document.documentElement;
  const stage = HQ.stage;
  const cards = HQ.cards;
  const N = cards.length;

  /* ---------- Renderer ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }           // no WebGL: keep the CSS carousel
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'gl3d';
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100);

  /* ---------- Geometry (units: a card is 1 wide, 1.6 tall) ---------- */
  const CW = 1, CH = 1.6, CR = 0.06;
  const R = (CW / 2) / Math.tan(Math.PI / N) * 1.3;          // ring radius, as in the CSS version
  const PR = R * 1.22, PH = 0.2;                              // platform radius and height
  const dark = () => root.dataset.theme !== 'light';
  const css = name => getComputedStyle(root).getPropertyValue(name).trim();

  function roundedCard(depth) {
    const s = new THREE.Shape(), w = CW / 2, h = CH / 2, r = CR;
    s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
    s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
    g.translate(0, 0, -depth);        // front face at z = 0, thickness behind it
    return g;
  }

  /* ---------- Card faces, painted onto a 2D canvas from each card's own content ---------- */
  const TW = 640, TH = 1024;
  const posters = new Map();
  function poster(src, onload) {
    if (posters.has(src)) { const im = posters.get(src); if (!im.complete) im.addEventListener('load', onload, { once: true }); return im; }
    const im = new Image(); im.decoding = 'async'; im.src = src; posters.set(src, im);
    im.addEventListener('load', onload, { once: true });
    return im;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    const words = text.split(/\s+/); let line = '', lines = [];
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return y + lines.length * lh;
  }
  function paintFace(card, tex) {
    const c = tex.image, ctx = c.getContext('2d');
    const panel = css('--ground-panel'), ink = css('--ink'), muted = css('--ink-muted'), faint = css('--ink-faint');
    const accent = css('--accent'), onAccent = css('--on-accent'), amber = css('--amber'), hair = css('--hairline');
    const mono = "'IBM Plex Mono', ui-monospace, monospace", disp = "'Archivo', 'Helvetica Neue', sans-serif", body = "'Newsreader', Georgia, serif";
    ctx.clearRect(0, 0, TW, TH);
    rr(ctx, 0, 0, TW, TH, 38); ctx.fillStyle = panel; ctx.fill();
    // picture
    const imgH = 372, img = card.querySelector('.media img');
    ctx.save(); rr(ctx, 0, 0, TW, TH, 38); ctx.clip();
    ctx.fillStyle = '#0b0f17'; ctx.fillRect(0, 0, TW, imgH);
    const im = img && poster(img.getAttribute('src'), () => { paintFace(card, tex); tex.needsUpdate = true; requestRender(); });
    if (im && im.complete && im.naturalWidth) {
      const s = Math.max(TW / im.naturalWidth, imgH / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (TW - w) / 2, (imgH - h) / 2, w, h);
    }
    ctx.restore();
    ctx.fillStyle = hair; ctx.fillRect(0, imgH, TW, 2);
    // badges on the picture
    ctx.font = `500 22px ${mono}`;
    const pill = (x, y, label, ic) => {
      const w = ctx.measureText(label).width + (ic ? 74 : 48);
      rr(ctx, x, y, w, 50, 25); ctx.fillStyle = 'rgba(7,11,20,0.78)'; ctx.fill();
      ctx.strokeStyle = 'rgba(230,237,247,0.25)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#e6edf7'; ctx.fillText(label, x + (ic ? 58 : 24), y + 33);
      return w;
    };
    const w1 = pill(28, imgH - 74, 'WATCH DEMO', true);
    ctx.fillStyle = '#3de0c0'; ctx.beginPath(); ctx.moveTo(48, imgH - 61); ctx.lineTo(48, imgH - 37); ctx.lineTo(68, imgH - 49); ctx.closePath(); ctx.fill();
    if (card.querySelector('.article')) {
      const lw = ctx.measureText('ARTICLE').width + 84;
      pill(TW - 28 - lw, 26, 'ARTICLE', true);
      ctx.fillStyle = '#4aa3f0'; ctx.font = `700 26px ${disp}`; ctx.fillText('in', TW - 28 - lw + 20, 60);
    }
    // text block
    let y = imgH + 64; const x = 44, maxW = TW - 88;
    const meta = card.querySelector('.meta'), tagEl = meta && meta.firstElementChild;
    const tagTxt = (tagEl ? tagEl.textContent : '').trim().toUpperCase();
    const topic = (meta && meta.lastElementChild ? meta.lastElementChild.textContent : '').trim().toUpperCase();
    ctx.font = `500 22px ${mono}`;
    let tx = x;
    if (tagEl && tagEl.classList.contains('tag--live')) {
      const tw = ctx.measureText(tagTxt).width + 52;
      rr(ctx, tx, y - 30, tw, 42, 6); ctx.fillStyle = accent; ctx.fill();
      ctx.fillStyle = onAccent; ctx.beginPath(); ctx.arc(tx + 18, y - 9, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(tagTxt, tx + 32, y); tx += tw + 14;
    } else {
      ctx.fillStyle = tagEl && tagEl.classList.contains('tag--fun') ? amber : accent;
      ctx.fillText(tagTxt, tx, y); tx += ctx.measureText(tagTxt).width + 16;
    }
    ctx.fillStyle = faint; ctx.fillText(topic, tx, y);
    y += 44;
    ctx.fillStyle = muted; ctx.fillText((card.querySelector('.upd')?.textContent || '').trim().toUpperCase(), x, y);
    y += 70;
    ctx.fillStyle = ink; ctx.font = `700 50px ${disp}`;
    y = wrapText(ctx, card.querySelector('h3').textContent.trim(), x, y, maxW, 58, 2) + 16;
    ctx.fillStyle = muted; ctx.font = `400 32px ${body}`;
    const lines = Math.max(2, Math.floor((TH - 130 - y) / 42));
    wrapText(ctx, card.querySelector('.desc').textContent.trim(), x, y, maxW, 42, lines);
    // Open
    ctx.font = `500 24px ${mono}`;
    const go = (card.querySelector('.go')?.textContent || 'Open ↗').trim().toUpperCase();
    const gw = ctx.measureText(go).width + 50;
    rr(ctx, x, TH - 104, gw, 56, 28); ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = accent; ctx.fillText(go, x + 25, TH - 67);
    // outline
    rr(ctx, 1.5, 1.5, TW - 3, TH - 3, 37); ctx.strokeStyle = hair; ctx.lineWidth = 3; ctx.stroke();
  }

  /* ---------- Build the ring ---------- */
  const ring = new THREE.Group(); scene.add(ring);
  let sideMat, faceGeoDepth = 0;
  const meshes = cards.map((card, i) => {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.repeat.set(1 / CW, 1 / CH); tex.offset.set(0.5, 0.5);
    const face = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const m = new THREE.Mesh(new THREE.BufferGeometry(), [face, null]);
    m.userData = { i, tex, face, card };
    ring.add(m);
    return m;
  });

  const platform = new THREE.Group(); scene.add(platform);
  let platTopTex, shadowMesh, rim;

  function radialTexture(stops, size = 512, extra) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d'), g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    if (extra) extra(ctx, size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  function buildTheme() {
    const D = dark(), accent = new THREE.Color(css('--accent'));
    const depth = D ? 0.08 : 0.11;
    if (depth !== faceGeoDepth) {
      const g = roundedCard(depth);
      meshes.forEach(m => { m.geometry.dispose(); m.geometry = g; });
      faceGeoDepth = depth;
    }
    if (sideMat) sideMat.dispose();
    sideMat = D
      ? new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.45, transparent: true, opacity: 0.8, roughness: 0.25, metalness: 0.2 })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color('#cdbfa6'), roughness: 0.75, metalness: 0 });
    meshes.forEach(m => { m.material[1] = sideMat; paintFace(m.userData.card, m.userData.tex); m.userData.tex.needsUpdate = true; });

    // platform
    platform.clear();
    const top = D
      ? radialTexture([[0, '#13304a'], [0.55, '#0d1828'], [1, '#0a121e']], 512, (ctx, s) => { ctx.strokeStyle = 'rgba(61,224,192,0.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2); ctx.stroke(); })
      : radialTexture([[0, '#f3eee4'], [0.6, '#e8e1d4'], [1, '#ddd4c3']], 512, (ctx, s) => { ctx.strokeStyle = 'rgba(60,45,25,0.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2); ctx.stroke(); });
    platTopTex = top;
    const topMat = new THREE.MeshStandardMaterial({ map: top, roughness: D ? 0.55 : 0.9, metalness: D ? 0.2 : 0 });
    const sideM = D
      ? new THREE.MeshStandardMaterial({ color: new THREE.Color('#0b1522'), emissive: accent, emissiveIntensity: 0.035, roughness: 0.5, metalness: 0.35 })
      : new THREE.MeshStandardMaterial({ color: new THREE.Color('#c8bca6'), roughness: 0.85 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR * 1.015, PH, 128, 1), [sideM, topMat, sideM]);
    cyl.position.y = -PH / 2; platform.add(cyl);
    rim = new THREE.Mesh(new THREE.TorusGeometry(PR, D ? 0.012 : 0.01, 8, 160),
      new THREE.MeshBasicMaterial({ color: D ? accent : new THREE.Color('#ffffff'), transparent: true, opacity: D ? 0.85 : 0.9 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.001; platform.add(rim);
    const sh = radialTexture(D ? [[0, 'rgba(0,0,0,0.6)'], [0.7, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']] : [[0, 'rgba(60,45,25,0.35)'], [0.7, 'rgba(60,45,25,0.12)'], [1, 'rgba(60,45,25,0)']], 256);
    shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(PR * 2.9, PR * 2.9), new THREE.MeshBasicMaterial({ map: sh, transparent: true, depthWrite: false }));
    shadowMesh.rotation.x = -Math.PI / 2; shadowMesh.position.y = -PH - 0.02; platform.add(shadowMesh);
    if (D) {   // a soft teal glow on the platform's centre
      const glow = radialTexture([[0, 'rgba(61,224,192,0.18)'], [1, 'rgba(61,224,192,0)']], 256);
      const gm = new THREE.Mesh(new THREE.CircleGeometry(PR * 0.95, 64), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false }));
      gm.rotation.x = -Math.PI / 2; gm.position.y = 0.002; platform.add(gm);
    }
    requestRender();
  }

  /* ---------- Lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-2, 6, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(4, 2, -4); scene.add(fill);

  /* ---------- Camera framing: the whole ring and platform, as large as the stage allows ---------- */
  const ELEV = 0.25;                 // radians above the horizontal
  const target = new THREE.Vector3(0, 0.6, 0);
  let dist = 10;
  function frame() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // points that must be visible
    const pts = [];
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.sin(a) * PR, -PH, Math.cos(a) * PR));
      pts.push(new THREE.Vector3(Math.sin(a) * (R + 0.15), CH + 0.03, Math.cos(a) * (R + 0.15)));
    }
    const place = d => {
      camera.position.set(0, target.y + Math.sin(ELEV) * d, Math.cos(ELEV) * d);
      camera.lookAt(target); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      let minX = 1, maxX = -1, minY = 1, maxY = -1;
      for (const p of pts) { const v = p.clone().project(camera); minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); }
      return { minX, maxX, minY, maxY };
    };
    // centre vertically, then find the closest distance that fits
    for (let pass = 0; pass < 3; pass++) {
      let lo = 2, hi = 60;
      for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2, b = place(mid); if (Math.max(b.maxX, -b.minX, b.maxY, -b.minY) <= 0.96) hi = mid; else lo = mid; }
      dist = hi;
      const b = place(dist);
      const cy = (b.maxY + b.minY) / 2;
      // move the look-at point so the picture sits in the middle of the stage
      const v = new THREE.Vector3(0, cy, 0.5).unproject(camera), v0 = new THREE.Vector3(0, 0, 0.5).unproject(camera);
      target.y += (v.y - v0.y) * 0.9;
    }
    place(dist);
    requestRender();
  }

  /* ---------- Turning ---------- */
  let cur = HQ.getAngle(), goal = cur, front = HQ.frontIndex(), focusing = false, anim = 0;
  const stepDeg = 360 / N;
  function placeCards() {
    meshes.forEach((m, i) => {
      let rel = i * stepDeg - cur; rel = ((rel % 360) + 540) % 360 - 180;
      const t = THREE.MathUtils.degToRad(rel);
      m.position.set(Math.sin(t) * R, CH / 2 + 0.01, Math.cos(t) * R);
      m.rotation.set(0, t * 0.38, 0);
      const a = Math.abs(rel);
      const isFront = i === front;
      let dim = isFront ? 0 : Math.min(0.72, 0.18 + a / 230);
      if (focusing && !isFront) dim = 0.8;
      const g = 1 - dim * (dark() ? 0.85 : 0.6);
      m.userData.face.color.setRGB(g, g, g);
      m.visible = !(focusing && isFront);
      m.renderOrder = Math.round(100 + Math.cos(t) * 50);
    });
    if (sideMat) sideMat.emissiveIntensity = dark() ? 0.45 : 0;
  }
  function tick() {
    anim = 0;
    const d = goal - cur;
    cur = Math.abs(d) < 0.05 ? goal : cur + d * 0.16;
    placeCards();
    renderer.render(scene, camera);
    if (cur !== goal) anim = requestAnimationFrame(tick);
  }
  function requestRender() { if (!anim) anim = requestAnimationFrame(tick); }

  /* ---------- Talking to the page ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  window.HQ3D = {
    ready: true,
    update(angle, frontI, instant, isFocusing) {
      goal = angle; front = frontI; focusing = !!isFocusing;
      if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) cur = goal;
      requestRender();
    },
    resize() { frame(); },
    pick(x, y) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes.filter(m => m.visible), false)[0];
      return hit ? hit.object.userData.i : -1;
    },
    frontRect() {
      const m = meshes[front], r = canvas.getBoundingClientRect();
      // where the front card would be if it were settled
      const keep = cur; cur = goal; placeCards(); m.updateMatrixWorld(true); cur = keep;
      let l = Infinity, t = Infinity, rgt = -Infinity, b = -Infinity;
      for (const [px, py] of [[-0.5, 0], [0.5, 0], [-0.5, CH], [0.5, CH]]) {
        const v = new THREE.Vector3(px, py - CH / 2, 0).applyMatrix4(m.matrixWorld).project(camera);
        const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
        l = Math.min(l, sx); rgt = Math.max(rgt, sx); t = Math.min(t, sy); b = Math.max(b, sy);
      }
      placeCards();
      return { left: l, top: t, right: rgt, bottom: b, width: rgt - l, height: b - t, x: l, y: t };
    },
  };

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    window.HQ3D.ready = false; root.classList.remove('gl'); canvas.remove(); HQ.refresh();
  });
  new MutationObserver(() => buildTheme()).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  root.classList.remove('lite');
  root.classList.add('gl');
  buildTheme();
  const go = () => { meshes.forEach(m => { paintFace(m.userData.card, m.userData.tex); m.userData.tex.needsUpdate = true; }); HQ.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  HQ.refresh();
}
