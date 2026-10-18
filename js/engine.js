/* Tiny 2.5D renderer: perspective chase camera, shaded boxes, texture-mapped quads,
   billboard sprites and soft shadows, all on a plain 2D canvas.
   World axes: x = left/right, d = distance down the road, h = height. */
window.JM = window.JM || {};
// Adaptive quality: 3 = full detail ... 0 = potato mode. Steps down automatically on slow devices.
JM.quality = (() => {
  const LEVELS = [
    // maxPx = total canvas pixel budget: big/Retina screens render at a capped resolution and are upscaled smoothly
    { dprCap: 0.75, maxPx: 0.5e6, groundTex: false, pavers: false, shadows: false, clouds: false, grain: false, crowdRange: 35 },
    { dprCap: 1.0, maxPx: 0.9e6, groundTex: false, pavers: false, shadows: false, clouds: false, grain: false, crowdRange: 45 },
    { dprCap: 1.35, maxPx: 1.5e6, groundTex: true, pavers: false, shadows: true, clouds: true, grain: true, crowdRange: 60 },
    { dprCap: 1.6, maxPx: 2.4e6, groundTex: true, pavers: true, shadows: true, clouds: true, grain: true, crowdRange: 70 },
  ];
  let saved = null;
  try { saved = localStorage.getItem('cjm_q'); } catch (_) {}
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3 || matchMedia('(pointer: coarse)').matches;
  const q = { level: saved != null ? +saved : weak ? 1 : 2 };
  q.set = (lv) => {
    q.level = Math.max(0, Math.min(3, lv));
    Object.assign(q, LEVELS[q.level]);
    document.documentElement.classList.toggle('lowfx', !q.grain);
    try { localStorage.setItem('cjm_q', String(q.level)); } catch (_) {}
    if (JM.engine && JM.engine.c) JM.engine.resize();
  };
  q.set(q.level);
  return q;
})();
JM.engine = (() => {
  const OUT = '#1d1424';                 // UI ink (pop-ups)
  const EDGE = 'rgba(30,18,22,.42)';    // soft world edges for a more natural look
  const NEAR = 0.35, FOG0 = 60, FOG1 = 105;
  let cv, c, W = 1, H = 1, dpr = 1, F = 1, cx0 = 0, cy0 = 0;
  const cam = { x: 0, d: 0, h: 5.2, pitch: 0.43 };
  let ca = Math.cos(cam.pitch), sa = Math.sin(cam.pitch);

  function init(canvas) {
    cv = canvas; c = cv.getContext('2d'); resize();
    addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); // also catches rotation / browser-UI changes after layout
  }
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, JM.quality.dprCap);
    const css = Math.max(1, r.width * r.height);
    if (css * dpr * dpr > JM.quality.maxPx) dpr = Math.max(0.5, Math.sqrt(JM.quality.maxPx / css));
    W = cv.width = Math.max(1, Math.round(r.width * dpr));
    H = cv.height = Math.max(1, Math.round(r.height * dpr));
    F = Math.min(H * 0.98, W * 0.86);
    cx0 = W / 2; cy0 = H * 0.5;
  }
  function setCam(x, d, h, pitch) {
    cam.x = x; cam.d = d; cam.h = h; cam.pitch = pitch;
    ca = Math.cos(pitch); sa = Math.sin(pitch);
  }

  // ---------- projection ----------
  function P(x, d, h) {
    const rx = x - cam.x, rd = d - cam.d, rh = h - cam.h;
    const Z = rd * ca - rh * sa;
    if (Z < NEAR) return null;
    const s = F / Z;
    return { x: cx0 + rx * s, y: cy0 - (rd * sa + rh * ca) * s, s, z: Z };
  }
  const depth = (d, h = 0) => (d - cam.d) * ca - (h - cam.h) * sa;
  const fog = (z) => (z < FOG0 ? 1 : z > FOG1 ? 0 : 1 - (z - FOG0) / (FOG1 - FOG0));
  const horizonY = () => cy0 - F * Math.tan(cam.pitch);

  function polyW(pts) {
    const cp = [];
    for (const p of pts) {
      const rx = p[0] - cam.x, rd = p[1] - cam.d, rh = p[2] - cam.h;
      cp.push([rx, rd * sa + rh * ca, rd * ca - rh * sa]);
    }
    const out = [];
    for (let i = 0; i < cp.length; i++) {
      const a = cp[i], b = cp[(i + 1) % cp.length], ina = a[2] >= NEAR, inb = b[2] >= NEAR;
      if (ina) out.push(a);
      if (ina !== inb) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]); }
    }
    if (out.length < 3) return null;
    return out.map((p) => [cx0 + (p[0] * F) / p[2], cy0 - (p[1] * F) / p[2]]);
  }
  function path(s) { c.beginPath(); c.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) c.lineTo(s[i][0], s[i][1]); c.closePath(); }
  function fillW(pts, fill, stroke, lw = 2) {
    const s = polyW(pts);
    if (!s) return null;
    path(s);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.lineWidth = lw * dpr; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke(); }
    return s;
  }

  // ---------- lit colours (sun from the left, slightly behind the camera) ----------
  const shadeCache = new Map();
  function lit(hex) {
    let v = shadeCache.get(hex);
    if (!v) {
      const sh = JM.sprites.shade;
      v = { top: sh(hex, 0.16), front: sh(hex, -0.06), left: sh(hex, 0.12), right: sh(hex, -0.34), back: sh(hex, -0.18) };
      shadeCache.set(hex, v);
    }
    return v;
  }

  // ---------- textured quads (affine per triangle, subdivided) ----------
  function tri(img, s0, s1, s2, d0, d1, d2) {
    const ux1 = s1[0] - s0[0], uy1 = s1[1] - s0[1], ux2 = s2[0] - s0[0], uy2 = s2[1] - s0[1];
    const det = ux1 * uy2 - ux2 * uy1;
    if (!det) return;
    const vx1 = d1[0] - d0[0], vy1 = d1[1] - d0[1], vx2 = d2[0] - d0[0], vy2 = d2[1] - d0[1];
    const a = (vx1 * uy2 - vx2 * uy1) / det, cc = (vx2 * ux1 - vx1 * ux2) / det;
    const b = (vy1 * uy2 - vy2 * uy1) / det, d = (vy2 * ux1 - vy1 * ux2) / det;
    const e = d0[0] - a * s0[0] - cc * s0[1], f = d0[1] - b * s0[0] - d * s0[1];
    // grow the clip triangle ~0.7px to hide seams
    const mx = (d0[0] + d1[0] + d2[0]) / 3, my = (d0[1] + d1[1] + d2[1]) / 3;
    const g = (p) => { const dx = p[0] - mx, dy = p[1] - my, l = Math.hypot(dx, dy) || 1; return [p[0] + (dx / l) * 0.7, p[1] + (dy / l) * 0.7]; };
    const q0 = g(d0), q1 = g(d1), q2 = g(d2);
    c.save();
    c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.lineTo(q2[0], q2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    c.drawImage(img, 0, 0);
    c.restore();
  }
  // w = [topLeft, topRight, bottomRight, bottomLeft] world points; image mapped across
  function texQuad(img, w, cols = 1) {
    const iw = img.width, ih = img.height;
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    let prevT = null, prevB = null, prevU = 0;
    for (let k = 0; k <= cols; k++) {
      const u = k / cols;
      const t = P(...lerp(w[0], w[1], u)), b = P(...lerp(w[3], w[2], u));
      if (k > 0 && prevT && prevB && t && b) {
        const sx0 = prevU * iw, sx1 = u * iw;
        tri(img, [sx0, 0], [sx1, 0], [sx1, ih], [prevT.x, prevT.y], [t.x, t.y], [b.x, b.y]);
        tri(img, [sx0, 0], [sx1, ih], [sx0, ih], [prevT.x, prevT.y], [b.x, b.y], [prevB.x, prevB.y]);
      }
      prevT = t; prevB = b; prevU = u;
    }
  }

  // map image sub-rect (sx,sy,sw,sh) onto world quad [TL, TR, BR, BL]
  function texRect(img, sx, sy, sw, sh, w) {
    const a = P(...w[0]), b = P(...w[1]), cc = P(...w[2]), d = P(...w[3]);
    if (!a || !b || !cc || !d) return false;
    tri(img, [sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [a.x, a.y], [b.x, b.y], [cc.x, cc.y]);
    tri(img, [sx, sy], [sx + sw, sy + sh], [sx, sy + sh], [a.x, a.y], [cc.x, cc.y], [d.x, d.y]);
    return true;
  }
  // tile a texture across a ground rectangle, locked to world space (no swimming)
  function texGround(img, x0, x1, d0, d1, tile, maxD) {
    const iw = img.width, ih = img.height, end = Math.min(d1, cam.d + maxD);
    let d = Math.max(d0, cam.d + 1.2);
    while (d < end) {
      const z = depth(d), hi = JM.quality.level >= 3, n = z < 10 ? (hi ? 3 : 2) : z < 26 && hi ? 2 : 1, seg = tile / n;
      const t0 = Math.floor(d / seg + 1e-6) * seg;
      let t1 = Math.min(t0 + seg, end);
      if (t1 <= d + 1e-6) t1 = Math.min(d + seg, end); // floating-point guard: always make progress
      const da = Math.max(t0, d);
      const va = (((da % tile) + tile) % tile) / tile, vb = Math.min(1, va + (t1 - da) / tile);
      if (vb > va) texRect(img, 0, (1 - vb) * ih, iw, (vb - va) * ih, [[x0, t1, 0], [x1, t1, 0], [x1, da, 0], [x0, da, 0]]);
      d = t1;
    }
  }

  // ---------- boxes ----------
  // col: hex base colour (auto-lit) ; o.tex: {front,left,right,back,top} images ; o.cols subdivisions
  function box(x0, x1, d0, d1, h0, h1, col, o = {}) {
    const L = lit(col), tex = o.tex || {}, lw = (o.lw == null ? 2.2 : o.lw) * 0.5;
    const faces = [];
    if (cam.x < x0) faces.push(['left', [[x0, d1, h1], [x0, d0, h1], [x0, d0, h0], [x0, d1, h0]]]);
    if (cam.x > x1) faces.push(['right', [[x1, d0, h1], [x1, d1, h1], [x1, d1, h0], [x1, d0, h0]]]);
    if (cam.d > d1) faces.push(['back', [[x1, d1, h1], [x0, d1, h1], [x0, d1, h0], [x1, d1, h0]]]);
    if (cam.d < d0) faces.push(['front', [[x0, d0, h1], [x1, d0, h1], [x1, d0, h0], [x0, d0, h0]]]);
    if (cam.h > h1) faces.push(['top', [[x0, d1, h1], [x1, d1, h1], [x1, d0, h1], [x0, d0, h1]]]);
    for (const [name, w] of faces) {
      const s = polyW(w);
      if (!s) continue;
      path(s);
      c.fillStyle = L[name]; c.fill();
      if (tex[name] && polyW(w).length === 4) {
        let cols = name === 'left' || name === 'right' ? (o.cols || 4) : 1;
        if (cols > 1) { const zc = depth((w[0][1] + w[1][1]) / 2); cols = Math.max(1, Math.round(cols * (zc > 35 ? 0.34 : zc > 18 ? 0.6 : 1) * (JM.quality.level >= 3 ? 1 : 0.67))); }
        texQuad(tex[name], w, cols);
        if (name === 'right' || name === 'back') { path(s); c.fillStyle = 'rgba(40,10,30,.22)'; c.fill(); }
      }
      if (lw) { path(s); c.lineWidth = lw * dpr; c.strokeStyle = EDGE; c.lineJoin = 'round'; c.stroke(); }
    }
  }

  // ---------- sprites ----------
  // character sprite (JM.sprites canvas) with feet anchored at (x, d, h)
  function sprite(img, x, d, h, o = {}) {
    const p = P(x, d, h);
    if (!p) return null;
    const S = JM.sprites, k = (p.s / S.PPU) * (o.scale || 1);
    c.save();
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.translate(p.x, p.y);
    if (o.rot) c.rotate(o.rot);
    c.scale(k * (o.sx || 1) * (o.flip ? -1 : 1), k * (o.sy || 1));
    c.drawImage(img, -S.AX, -S.AY);
    c.restore();
    return p;
  }
  // generic image billboard: width in world units, anchored bottom-centre
  function bill(img, x, d, h, wUnits, o = {}) {
    const p = P(x, d, h);
    if (!p) return null;
    const w = wUnits * p.s, hh = w * (img.height / img.width);
    c.save();
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.drawImage(img, p.x - w / 2, p.y - hh * (o.ay == null ? 1 : o.ay), w, hh);
    c.restore();
    return p;
  }
  // soft round blobs, rendered once and reused (a fresh gradient per call is costly on weak GPUs)
  const blobs = {};
  function blob(rgb, mid = 0.6) {
    const key = rgb + mid;
    if (blobs[key]) return blobs[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(mid, `rgba(${rgb},.6)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return (blobs[key] = cv);
  }
  function shadow(x, d, r, a = 0.35, rd) {
    const p = P(x, d, 0), q = P(x, d + (rd || r * 0.6), 0);
    if (!p || !q) return;
    const rx = r * p.s, ry = Math.max(1, p.y - q.y);
    const ga = c.globalAlpha; c.globalAlpha = ga * a;
    c.drawImage(blob('60,25,10'), p.x - rx, p.y - ry, rx * 2, ry * 2);
    c.globalAlpha = ga;
  }
  // text painted on a vertical plane facing the camera (constant d)
  function wtext(text, x, d, h, size, fill, o = {}) {
    const p = P(x, d, h);
    if (!p) return;
    const px = size * p.s;
    if (px < 3) return;
    c.save();
    c.globalAlpha = o.alpha == null ? 1 : o.alpha;
    c.font = `${o.weight || 800} ${px}px ${o.font || '"Bangers", system-ui, sans-serif'}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (o.stroke) { c.lineWidth = px * 0.16; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(text, p.x, p.y, o.max ? o.max * p.s : undefined); }
    c.fillStyle = fill; c.fillText(text, p.x, p.y, o.max ? o.max * p.s : undefined);
    c.restore();
  }

  return {
    init, resize, setCam, cam, P, depth, fog, blob, horizonY, polyW, fillW, path, box, texQuad, texRect, texGround, EDGE, sprite, bill, shadow, wtext, lit, OUT,
    get c() { return c; }, get W() { return W; }, get H() { return H; }, get dpr() { return dpr; }, get F() { return F; },
  };
})();
