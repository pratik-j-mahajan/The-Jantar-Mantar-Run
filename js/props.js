/* Pre-rendered prop textures: Delhi facades, police vans, autos, barricades, banners, trees.
   Built once (after fonts load) into offscreen canvases. */
window.JM = window.JM || {};
JM.props = (() => {
  const OUT = 'rgba(30,18,22,.55)'; // soft edges for a grounded, less cartoony look
  const HINDI = '"Yatra One", "Noto Sans Devanagari", system-ui, sans-serif';
  const COMIC = '"Bangers", Impact, system-ui, sans-serif';
  let shade, rrect, circ, ell;

  function rng(seed) {
    return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function mk(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); return cv; }
  function speckle(c, w, h, R, n, a) {
    for (let i = 0; i < n; i++) { c.fillStyle = R() < 0.5 ? `rgba(0,0,0,${a * R()})` : `rgba(255,255,255,${a * R()})`; c.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
  }
  function grime(c, w, h, R, n = 40) {
    speckle(c, w, h, R, w * h / 60, 0.12);
    // rain streaks under ledges
    for (let i = 0; i < 18; i++) { const x = R() * w, y = R() * h * 0.7, g = c.createLinearGradient(0, y, 0, y + 60 + R() * 80); g.addColorStop(0, 'rgba(70,50,30,.12)'); g.addColorStop(1, 'rgba(70,50,30,0)'); c.fillStyle = g; c.fillRect(x, y, 3 + R() * 8, 140); }
    for (let i = 0; i < n; i++) {
      c.fillStyle = `rgba(110,70,30,${0.03 + R() * 0.05})`;
      ell(c, R() * w, R() * h, 10 + R() * 50, 6 + R() * 30); c.fill();
    }
  }
  function txt(c, s, x, y, size, fill, font, stroke, max) {
    c.font = `${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (stroke) { c.lineWidth = size * 0.18; c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(s, x, y, max); }
    c.fillStyle = fill; c.fillText(s, x, y, max);
  }
  const font = (s) => (/[ऀ-ॿ]/.test(s) ? HINDI : COMIC);

  const SIGNS = ['SHARMA STATIONERY', 'दिल्ली स्वीट्स', 'XEROX • PRINT', 'GUPTA COACHING', 'चाय नाश्ता', 'MOBILE REPAIR', 'BOOK DEPOT', 'जनता होटल', 'PHOTOSTAT', 'CYBER CAFE', 'छोले भटूरे', 'LAW BOOKS'];
  const SIGN_COL = ['#e63946', '#1d3557', '#2a9d8f', '#f4a261', '#6a040f', '#ffb703', '#023047', '#7b2cbf'];

  // ---------- buildings ----------
  function window_(c, x, y, w, h, trim, R) {
    rrect(c, x - 4, y - 4, w + 8, h + 8, 3); c.fillStyle = shade(trim, 0.1); c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#a9d6e5'); g.addColorStop(0.5, '#3d5a80'); g.addColorStop(1, '#1b263b');
    c.fillStyle = R() < 0.3 ? shade(trim, -0.2) : g; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(x + 4, y + h - 6); c.lineTo(x + w * 0.5, y + 4); c.lineTo(x + w * 0.65, y + 4); c.lineTo(x + 10, y + h - 6); c.fill();
    c.strokeStyle = 'rgba(20,20,20,.55)'; c.lineWidth = 2;
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + (w * k) / 4, y); c.lineTo(x + (w * k) / 4, y + h); c.stroke(); }
    c.fillStyle = shade(trim, -0.15); c.fillRect(x - 8, y + h + 4, w + 16, 6);
    if (R() < 0.35) { rrect(c, x + w - 30, y + h + 12, 34, 20, 3); c.fillStyle = '#e9ecef'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#adb5bd'; for (let k = 0; k < 4; k++) c.fillRect(x + w - 26, y + h + 16 + k * 4, 26, 1.5); }
  }
  function facade(seed) {
    const R = rng(seed * 977 + 13);
    const pal = [['#f2e3c6', '#2a9d8f'], ['#f6d6ad', '#3d5a80'], ['#f7c5bf', '#386641'], ['#d8e2dc', '#9c6644'], ['#fff1c1', '#bc4749'], ['#cfe1f2', '#6b705c'], ['#e9d8a6', '#005f73']];
    const [wall, trim] = pal[seed % pal.length];
    return mk(512, 420, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, shade(wall, 0.12)); g.addColorStop(1, shade(wall, -0.12));
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      grime(c, w, h, R);
      c.fillStyle = shade(wall, -0.22); c.fillRect(0, 0, w, 16);
      c.fillStyle = shade(wall, 0.25); c.fillRect(0, 16, w, 4);
      const shopH = 120, floors = 3, fh = (h - shopH - 20) / floors;
      for (let f = 0; f < floors; f++) {
        const y = 32 + f * fh;
        for (let k = 0; k < 4; k++) window_(c, 30 + k * 122, y, 70, fh - 52, trim, R);
        if (f === 1 && R() < 0.7) {
          c.fillStyle = shade(wall, -0.25); c.fillRect(10, y + fh - 26, w - 20, 8);
          c.strokeStyle = OUT; c.lineWidth = 2;
          for (let x = 14; x < w - 10; x += 12) { c.beginPath(); c.moveTo(x, y + fh - 26); c.lineTo(x, y + fh - 46); c.stroke(); }
          c.beginPath(); c.moveTo(10, y + fh - 46); c.lineTo(w - 10, y + fh - 46); c.lineWidth = 3; c.stroke();
        }
      }
      // shops
      const bays = 2 + (R() < 0.5 ? 1 : 0), bw = w / bays;
      for (let b = 0; b < bays; b++) {
        const x = b * bw, y = h - shopH;
        const sc = SIGN_COL[(seed + b * 3) % SIGN_COL.length], sign = SIGNS[(seed * 3 + b * 5) % SIGNS.length];
        rrect(c, x + 8, y, bw - 16, 34, 4); c.fillStyle = sc; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke();
        txt(c, sign, x + bw / 2, y + 18, 24, '#fff', font(sign), OUT, bw - 30);
        const sy = y + 40;
        if (R() < 0.45) {
          c.fillStyle = '#9aa3ab'; c.fillRect(x + 14, sy, bw - 28, shopH - 44);
          c.fillStyle = 'rgba(0,0,0,.18)'; for (let yy = sy + 4; yy < h - 4; yy += 7) c.fillRect(x + 14, yy, bw - 28, 2);
        } else {
          const ig = c.createLinearGradient(0, sy, 0, h); ig.addColorStop(0, '#2b1d14'); ig.addColorStop(1, '#5c4033');
          c.fillStyle = ig; c.fillRect(x + 14, sy, bw - 28, shopH - 44);
          for (let k = 0; k < 14; k++) { c.fillStyle = SIGN_COL[Math.floor(R() * SIGN_COL.length)]; c.fillRect(x + 20 + R() * (bw - 50), sy + 8 + Math.floor(R() * 3) * 22, 14, 16); }
        }
        c.strokeStyle = OUT; c.lineWidth = 2.5; c.strokeRect(x + 14, sy, bw - 28, shopH - 44);
      }
      // drooping Delhi cables
      c.strokeStyle = 'rgba(20,20,20,.75)'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const y = h - shopH - 8 - k * 7; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(w / 2, y + 26 + R() * 18, w, y + R() * 10); c.stroke(); }
      c.strokeStyle = OUT; c.lineWidth = 6; c.strokeRect(0, 0, w, h);
    });
  }
  function colonnade(seed) {
    const R = rng(seed * 31 + 7);
    return mk(512, 420, (c, w, h) => {
      const base = '#b5543c', wall = '#f3ead8';
      c.fillStyle = wall; c.fillRect(0, 0, w, h);
      c.fillStyle = shade(wall, -0.1); c.fillRect(0, 0, w, 40);
      c.fillStyle = shade(wall, 0.15); c.fillRect(0, 40, w, 8);
      for (let x = 10; x < w; x += 64) {
        c.fillStyle = '#4a3b30'; c.fillRect(x + 24, 60, 40, h - 150);
        c.fillStyle = 'rgba(255,220,150,.25)'; c.fillRect(x + 24, 60, 40, 10);
        const g = c.createLinearGradient(x, 0, x + 24, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfc4ae');
        c.fillStyle = g; c.fillRect(x, 52, 24, h - 130);
        c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(x, 52, 24, h - 130);
      }
      grime(c, w, h, R, 25);
      const bg = c.createLinearGradient(0, h - 80, 0, h); bg.addColorStop(0, shade(base, 0.1)); bg.addColorStop(1, shade(base, -0.2));
      c.fillStyle = bg; c.fillRect(0, h - 80, w, 80);
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2;
      for (let y = h - 60; y < h; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = OUT; c.lineWidth = 6; c.strokeRect(0, 0, w, h);
    });
  }
  function sidewall(seed) {
    const R = rng(seed + 99);
    const walls = ['#e9d8a6', '#f2e3c6', '#f7c5bf', '#d8e2dc', '#fff1c1'];
    return mk(256, 420, (c, w, h) => {
      const wall = walls[seed % walls.length];
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, shade(wall, 0.05)); g.addColorStop(1, shade(wall, -0.15));
      c.fillStyle = g; c.fillRect(0, 0, w, h); grime(c, w, h, R, 18);
      for (let k = 0; k < 3; k++) window_(c, 90, 50 + k * 100, 60, 56, '#6b705c', R);
      c.strokeStyle = OUT; c.lineWidth = 6; c.strokeRect(0, 0, w, h);
    });
  }

  // ---------- vehicles ----------
  function vanSide() {
    return mk(512, 230, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9dde3');
      rrect(c, 4, 4, w - 8, h - 40, 18); c.fillStyle = g; c.fill();
      c.fillStyle = '#1d4e89'; c.fillRect(4, 118, w - 8, 30);
      c.fillStyle = '#e63946'; c.fillRect(4, 150, w - 8, 6);
      for (let k = 0; k < 4; k++) {
        rrect(c, 24 + k * 118, 22, 100, 62, 8);
        const wg = c.createLinearGradient(0, 22, 0, 84); wg.addColorStop(0, '#5e7f9c'); wg.addColorStop(1, '#1b263b');
        c.fillStyle = wg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(34 + k * 118, 28, 18, 50);
      }
      txt(c, 'DILLI POLICE', w / 2, 134, 32, '#ffffff', COMIC, '#0b2545');
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(250, 90); c.lineTo(250, 186); c.stroke();
      rrect(c, 4, 4, w - 8, h - 40, 18); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke();
      for (const x of [104, 410]) {
        c.fillStyle = '#2b2d42'; c.beginPath(); c.arc(x, h - 36, 40, Math.PI, 0); c.fill();
        circ(c, x, h - 36, 33); c.fillStyle = '#111'; c.fill();
        circ(c, x, h - 36, 14); c.fillStyle = '#adb5bd'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      }
    });
  }
  function vanEnd(front) {
    return mk(220, 230, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d4d8de');
      rrect(c, 4, 4, w - 8, h - 30, 16); c.fillStyle = g; c.fill();
      if (front) {
        rrect(c, 16, 14, w - 32, 76, 10);
        const wg = c.createLinearGradient(0, 14, 0, 90); wg.addColorStop(0, '#89a7c2'); wg.addColorStop(1, '#1b263b'); c.fillStyle = wg; c.fill();
        c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
        c.fillStyle = '#1d4e89'; c.fillRect(4, 100, w - 8, 26);
        txt(c, 'POLICE', w / 2, 113, 24, '#fff', COMIC, '#0b2545');
        for (const x of [30, w - 30]) { circ(c, x, 150, 14); c.fillStyle = '#fff8c5'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); }
        c.fillStyle = '#343a40'; c.fillRect(60, 140, w - 120, 22);
      } else {
        for (const x of [16, w / 2 + 6]) {
          rrect(c, x, 18, w / 2 - 22, 62, 8);
          const wg = c.createLinearGradient(0, 18, 0, 80); wg.addColorStop(0, '#5e7f9c'); wg.addColorStop(1, '#1b263b'); c.fillStyle = wg; c.fill();
          c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
        }
        c.fillStyle = '#1d4e89'; c.fillRect(4, 98, w - 8, 28);
        txt(c, 'POLICE', w / 2, 112, 26, '#fff', COMIC, '#0b2545');
        for (const x of [12, w - 32]) { rrect(c, x, 132, 20, 34, 4); c.fillStyle = '#e63946'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke(); }
        rrect(c, w / 2 - 44, 150, 88, 24, 3); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
        txt(c, 'DL 1C 0420', w / 2, 163, 16, '#111', COMIC);
      }
      c.fillStyle = '#343a40'; c.fillRect(4, h - 40, w - 8, 14);
      rrect(c, 4, 4, w - 8, h - 30, 16); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke();
    });
  }
  function autoRear() {
    return mk(180, 200, (c, w, h) => {
      // canopy (yellow) top half, body (green) bottom half
      const yg = c.createLinearGradient(0, 0, w, 0); yg.addColorStop(0, '#ffe066'); yg.addColorStop(1, '#e0a800');
      rrect(c, 6, 6, w - 12, 96, 30); c.fillStyle = yg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      rrect(c, 30, 26, w - 60, 46, 12); c.fillStyle = '#1b1b1b'; c.fill();
      c.fillStyle = '#e63946'; for (let x = 12; x < w - 12; x += 10) { c.beginPath(); c.moveTo(x, 96); c.lineTo(x + 5, 106); c.lineTo(x + 10, 96); c.fill(); }
      const gg = c.createLinearGradient(0, 0, w, 0); gg.addColorStop(0, '#52b788'); gg.addColorStop(1, '#1b4332');
      rrect(c, 10, 104, w - 20, 74, 14); c.fillStyle = gg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      txt(c, 'HORN OK PLEASE', w / 2, 122, 17, '#ffd166', COMIC, OUT, w - 34);
      rrect(c, w / 2 - 34, 138, 68, 18, 3); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke();
      txt(c, 'DL 1R 7777', w / 2, 148, 12, '#111', COMIC);
      for (const x of [20, w - 32]) { rrect(c, x, 160, 12, 12, 3); c.fillStyle = '#ff4d4d'; c.fill(); }
      circ(c, 32, 186, 13); c.fillStyle = '#111'; c.fill(); circ(c, w - 32, 186, 13); c.fill();
    });
  }
  function autoSide() {
    return mk(260, 200, (c, w, h) => {
      const yg = c.createLinearGradient(0, 0, 0, 100); yg.addColorStop(0, '#ffe066'); yg.addColorStop(1, '#e0a800');
      c.beginPath(); c.moveTo(20, 104); c.quadraticCurveTo(10, 10, 90, 8); c.lineTo(w - 20, 8); c.quadraticCurveTo(w - 6, 10, w - 10, 104); c.closePath();
      c.fillStyle = yg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      rrect(c, 70, 30, 120, 70, 10); c.fillStyle = '#1b1b1b'; c.fill();
      const gg = c.createLinearGradient(0, 100, 0, 180); gg.addColorStop(0, '#52b788'); gg.addColorStop(1, '#1b4332');
      rrect(c, 8, 100, w - 16, 70, 16); c.fillStyle = gg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#ffd166'; c.fillRect(10, 128, w - 20, 6);
      for (const x of [40, w - 50]) { circ(c, x, 178, 20); c.fillStyle = '#111'; c.fill(); circ(c, x, 178, 8); c.fillStyle = '#adb5bd'; c.fill(); }
    });
  }

  // ---------- street furniture ----------
  function barricade() {
    return mk(260, 112, (c, w, h) => {
      c.fillStyle = '#ffcc00'; c.fillRect(0, 0, w, h - 14);
      c.save(); c.beginPath(); c.rect(0, 0, w, h - 14); c.clip();
      c.fillStyle = '#151515';
      for (let x = -60; x < w + 60; x += 34) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 17, h); c.lineTo(x + 17 + 60, 0); c.lineTo(x + 60, 0); c.fill(); }
      c.restore();
      rrect(c, w / 2 - 70, 22, 140, 44, 4); c.fillStyle = '#1d4e89'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
      txt(c, 'POLICE', w / 2, 45, 30, '#fff', COMIC, '#0b2545');
      c.fillStyle = '#555'; c.fillRect(10, h - 14, 14, 14); c.fillRect(w - 24, h - 14, 14, 14);
      c.strokeStyle = OUT; c.lineWidth = 5; c.strokeRect(2, 2, w - 4, h - 18);
    });
  }
  function banner(text, bg, fg) {
    return mk(640, 120, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, shade(bg, 0.15)); g.addColorStop(1, shade(bg, -0.2));
      c.beginPath(); c.moveTo(0, 8); c.quadraticCurveTo(w / 2, 18, w, 8); c.lineTo(w, h - 8); c.quadraticCurveTo(w / 2, h + 2, 0, h - 8); c.closePath();
      c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([10, 8]); c.lineWidth = 2;
      c.beginPath(); c.moveTo(8, 18); c.quadraticCurveTo(w / 2, 28, w - 8, 18); c.stroke();
      c.beginPath(); c.moveTo(8, h - 18); c.quadraticCurveTo(w / 2, h - 8, w - 8, h - 18); c.stroke(); c.setLineDash([]);
      txt(c, text, w / 2, h / 2 + 4, /[ऀ-ॿ]/.test(text) ? 60 : 66, fg, font(text), OUT, w - 40);
      c.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < w; x += 80) c.fillRect(x, 0, 30, h);
    });
  }
  function tree(seed) {
    const R = rng(seed + 5);
    return mk(320, 440, (c, w, h) => {
      // trunk with bark texture, whitewashed base (very Delhi)
      const tg = c.createLinearGradient(140, 0, 182, 0); tg.addColorStop(0, '#7a5435'); tg.addColorStop(0.5, '#5b3d26'); tg.addColorStop(1, '#2e1f14');
      c.beginPath(); c.moveTo(140, h); c.bezierCurveTo(148, 330, 132, 270, 138, 200); c.lineTo(184, 200); c.bezierCurveTo(176, 270, 172, 330, 182, h); c.closePath();
      c.fillStyle = tg; c.fill();
      c.strokeStyle = 'rgba(20,10,5,.35)'; c.lineWidth = 1.5;
      for (let i = 0; i < 22; i++) { const x = 144 + R() * 34, y = 210 + R() * 220; c.beginPath(); c.moveTo(x, y); c.lineTo(x + R() * 3 - 1.5, y + 10 + R() * 18); c.stroke(); }
      c.fillStyle = '#ece4d4'; c.fillRect(139, h - 52, 44, 30); c.fillStyle = '#b5543c'; c.fillRect(139, h - 24, 44, 8);
      // branches
      c.strokeStyle = '#4a3220'; c.lineCap = 'round';
      for (const [x1, y1, x2, y2, lw] of [[160, 220, 90, 120, 9], [162, 215, 240, 110, 9], [160, 205, 165, 80, 8]]) { c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + 10, (y1 + y2) / 2, x2, y2); c.stroke(); }
      // foliage: many small leaf clusters, lit from the upper left, darker underside
      const greens = ['#1f4d2b', '#2d6a3e', '#3f8150', '#5a9a5f', '#7fb36a'];
      const clusters = [];
      for (let i = 0; i < 260; i++) {
        const a = R() * Math.PI * 2, r = Math.sqrt(R());
        clusters.push([160 + Math.cos(a) * r * 140, 120 + Math.sin(a) * r * 100, 7 + R() * 12]);
      }
      clusters.sort((p, q) => p[1] - q[1]);
      for (const [x, y, r] of clusters) {
        const light = Math.max(0, Math.min(4, Math.round(2.4 - (y - 120) / 50 - (x - 160) / 120 + (R() - 0.5) * 1.6)));
        c.fillStyle = greens[light];
        c.beginPath(); c.ellipse(x, y, r, r * 0.8, R() * 3, 0, Math.PI * 2); c.fill();
      }
      // sun-dappled highlights and gaps of sky
      for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,236,170,${0.15 + R() * 0.25})`; ell(c, 60 + R() * 150, 30 + R() * 110, 3 + R() * 4, 2 + R() * 2, R() * 3); c.fill(); }
      const sh = c.createRadialGradient(160, 210, 10, 160, 170, 150); sh.addColorStop(0, 'rgba(10,25,10,.35)'); sh.addColorStop(1, 'rgba(10,25,10,0)');
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = sh; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    });
  }
  // ---------- ground textures ----------
  function asphalt() {
    const R = rng(77);
    return mk(512, 512, (c, w, h) => {
      c.fillStyle = '#4d4e55'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) { const v = 40 + R() * 70 | 0; c.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + R() * 0.35})`; c.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); }
      // repaired patches + tyre polish along wheel paths
      for (let i = 0; i < 4; i++) { const x = R() * (w - 140), y = R() * (h - 110), pw = 40 + R() * 90, ph = 30 + R() * 70, g = c.createRadialGradient(x + pw / 2, y + ph / 2, 0, x + pw / 2, y + ph / 2, Math.max(pw, ph) * 0.7); g.addColorStop(0, 'rgba(30,30,34,.1)'); g.addColorStop(1, 'rgba(30,30,34,0)'); c.fillStyle = g; c.fillRect(x, y, pw, ph); }
      for (const x of [0.18, 0.32, 0.68, 0.82]) { const g = c.createLinearGradient(x * w - 18, 0, x * w + 18, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(20,20,24,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x * w - 18, 0, 36, h); }
      // oil stains
      for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * h, r = 8 + R() * 22, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(15,12,18,.35)'); g.addColorStop(1, 'rgba(15,12,18,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
      // hairline cracks
      c.strokeStyle = 'rgba(20,20,22,.5)'; c.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) { let x = R() * w, y = R() * h; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += (R() - 0.3) * 30; c.lineTo(x, y); } c.stroke(); }
      // dust drift
      c.fillStyle = 'rgba(190,160,120,.06)'; c.fillRect(0, 0, w, h);
    });
  }
  function pavers() {
    const R = rng(91);
    return mk(256, 256, (c, w, h) => {
      c.fillStyle = '#6e5a4c'; c.fillRect(0, 0, w, h);
      const cols = ['#a8644a', '#b4735a', '#9a5a44', '#8f8a84', '#a39d95'];
      for (let row = 0; row < 8; row++) for (let k = -1; k < 5; k++) {
        const x = k * 64 + (row % 2) * 32, y = row * 32;
        const col = (row + k) % 5 === 0 ? cols[3 + (R() < 0.5 ? 0 : 1)] : cols[(R() * 3) | 0];
        rrect(c, x + 2, y + 2, 60, 28, 4); c.fillStyle = col; c.fill();
        c.fillStyle = 'rgba(255,240,220,.12)'; c.fillRect(x + 4, y + 3, 56, 4);
        c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + 4, y + 24, 56, 4);
      }
      speckle(c, w, h, R, 3500, 0.18);
      for (let i = 0; i < 5; i++) { const x = R() * w, y = R() * h, r = 10 + R() * 25, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(60,40,25,.25)'); g.addColorStop(1, 'rgba(60,40,25,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
    });
  }
  function lamp() {
    return mk(160, 520, (c, w, h) => {
      const pg = c.createLinearGradient(74, 0, 86, 0); pg.addColorStop(0, '#6c757d'); pg.addColorStop(1, '#212529');
      c.fillStyle = pg; c.fillRect(74, 60, 12, h - 60); c.strokeStyle = OUT; c.lineWidth = 3; c.strokeRect(74, 60, 12, h - 60);
      c.fillStyle = '#343a40'; c.fillRect(64, h - 40, 32, 40); c.strokeRect(64, h - 40, 32, 40);
      c.lineWidth = 7; c.strokeStyle = OUT; c.beginPath(); c.moveTo(80, 70); c.quadraticCurveTo(80, 30, 20, 34); c.moveTo(80, 70); c.quadraticCurveTo(80, 30, 140, 34); c.stroke();
      c.lineWidth = 4; c.strokeStyle = '#495057'; c.stroke();
      for (const x of [20, 140]) { ell(c, x, 40, 22, 9); c.fillStyle = '#fff3b0'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); }
    });
  }
  function chai() {
    return mk(300, 300, (c, w, h) => {
      rrect(c, 20, 150, 260, 100, 8); c.fillStyle = '#9c6644'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#7f5539'; for (let x = 30; x < 280; x += 22) c.fillRect(x, 156, 10, 88);
      c.fillStyle = OUT; c.fillRect(30, 40, 8, 120); c.fillRect(262, 40, 8, 120);
      c.beginPath(); c.moveTo(6, 60); c.lineTo(150, 18); c.lineTo(294, 60); c.closePath(); c.fillStyle = '#e63946'; c.fill(); c.lineWidth = 4; c.stroke();
      c.fillStyle = '#fff'; for (let x = 20; x < 290; x += 36) { c.beginPath(); c.moveTo(x, 60); c.lineTo(x + 18, 60); c.lineTo(150 + (x + 9 - 150) * 0.1, 22); c.fill(); }
      rrect(c, 70, 80, 160, 50, 6); c.fillStyle = '#ffb703'; c.fill(); c.lineWidth = 3; c.stroke();
      txt(c, 'चाय ₹10', 150, 106, 34, '#6a040f', HINDI);
      ell(c, 90, 148, 26, 20); c.fillStyle = '#adb5bd'; c.fill(); c.stroke();
      for (let k = 0; k < 5; k++) { rrect(c, 150 + k * 20, 134, 12, 16, 2); c.fillStyle = '#f4d58d'; c.fill(); c.lineWidth = 1.5; c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(84 + k * 8, 124); c.bezierCurveTo(74 + k * 8, 110, 96 + k * 8, 100, 86 + k * 8, 86); c.stroke(); }
    });
  }
  function gateSign() {
    return mk(720, 220, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9d0208'); g.addColorStop(1, '#5a0005');
      rrect(c, 6, 6, w - 12, h - 12, 18); c.fillStyle = g; c.fill(); c.strokeStyle = '#ffd166'; c.lineWidth = 10; c.stroke();
      c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      txt(c, 'जंतर मंतर', w / 2, 92, 104, '#ffd166', HINDI, OUT);
      txt(c, 'JANTAR MANTAR', w / 2, 178, 44, '#fff', COMIC, OUT);
    });
  }

  // ---------- blockade buses, protest set dressing ----------
  function busSide(kind) {
    const dtc = kind === 'dtc';
    return mk(768, 250, (c, w, h) => {
      const body = dtc ? '#d62828' : '#f1f3f5', band = dtc ? '#fcbf49' : '#1d4e89';
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, shade(body, 0.15)); g.addColorStop(1, shade(body, -0.2));
      rrect(c, 4, 4, w - 8, h - 44, 14); c.fillStyle = g; c.fill();
      c.fillStyle = band; c.fillRect(4, 132, w - 8, 22);
      for (let k = 0; k < 7; k++) {
        rrect(c, 22 + k * 104, 22, 88, 88, 6);
        const wg = c.createLinearGradient(0, 22, 0, 110); wg.addColorStop(0, '#6c8eaf'); wg.addColorStop(1, '#1b263b');
        c.fillStyle = wg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(30 + k * 104, 28, 14, 74);
        // detained protesters' heads in a few windows
        if (k % 2) { circ(c, 66 + k * 104, 92, 13); c.fillStyle = '#b97a50'; c.fill(); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(66 + k * 104, 89, 13, Math.PI, 0); c.fill(); }
      }
      txt(c, dtc ? 'DTC  •  DILLI POLICE DUTY' : 'DILLI POLICE', w / 2, 172, 34, dtc ? '#fff' : '#1d4e89', COMIC, dtc ? OUT : '#fff');
      rrect(c, 4, 4, w - 8, h - 44, 14); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke();
      for (const x of [120, 640]) {
        c.fillStyle = '#2b2d42'; c.beginPath(); c.arc(x, h - 42, 44, Math.PI, 0); c.fill();
        circ(c, x, h - 40, 36); c.fillStyle = '#111'; c.fill(); circ(c, x, h - 40, 15); c.fillStyle = '#adb5bd'; c.fill();
      }
    });
  }
  function busEnd(kind) {
    const dtc = kind === 'dtc';
    return mk(240, 250, (c, w, h) => {
      const body = dtc ? '#d62828' : '#f1f3f5';
      rrect(c, 4, 4, w - 8, h - 30, 14); c.fillStyle = body; c.fill();
      rrect(c, 18, 16, w - 36, 100, 8); const wg = c.createLinearGradient(0, 16, 0, 116); wg.addColorStop(0, '#8fb0cf'); wg.addColorStop(1, '#1b263b'); c.fillStyle = wg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
      rrect(c, 40, 124, w - 80, 26, 3); c.fillStyle = '#111'; c.fill(); txt(c, dtc ? '966  JANTAR MANTAR' : 'POLICE', w / 2, 137, 15, '#ffb703', COMIC);
      for (const x of [30, w - 30]) { circ(c, x, 186, 13); c.fillStyle = '#fff8c5'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); }
      rrect(c, 4, 4, w - 8, h - 30, 14); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke();
    });
  }
  function valance(text, a, b) {
    return mk(512, 110, (c, w, h) => {
      for (let x = 0, k = 0; x < w; x += 32, k++) { c.fillStyle = k % 2 ? a : b; c.fillRect(x, 0, 32, h - 26); }
      for (let x = 0, k = 0; x < w; x += 32, k++) { c.fillStyle = k % 2 ? a : b; c.beginPath(); c.arc(x + 16, h - 26, 16, 0, Math.PI); c.fill(); }
      if (text) { rrect(c, 40, 12, w - 80, 56, 6); c.fillStyle = '#fff3dc'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke(); txt(c, text, w / 2, 41, 34, '#9d0208', font(text), null, w - 100); }
      c.strokeStyle = OUT; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 30);
    });
  }
  function stageBack() {
    return mk(640, 300, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9d0208'); g.addColorStop(1, '#6a040f');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffd166'; for (let x = 0; x < w; x += 40) { c.beginPath(); c.arc(x + 20, 0, 20, 0, Math.PI); c.fill(); }
      txt(c, 'धरना स्थल', w / 2, 110, 92, '#ffd23f', HINDI, OUT);
      txt(c, "STUDENTS' SATYAGRAH • DAY 47", w / 2, 210, 40, '#fff', COMIC, OUT, w - 40);
      c.strokeStyle = OUT; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    });
  }
  function speaker() {
    return mk(120, 200, (c, w, h) => {
      rrect(c, 6, 6, w - 12, h - 12, 8); c.fillStyle = '#212529'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
      for (const [y, r] of [[56, 36], [148, 26]]) { circ(c, w / 2, y, r); c.fillStyle = '#495057'; c.fill(); circ(c, w / 2, y, r * 0.4); c.fillStyle = '#111'; c.fill(); circ(c, w / 2 - r * 0.3, y - r * 0.3, r * 0.15); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); }
    });
  }
  function cannonSide() {
    return mk(560, 260, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a6ea5'); g.addColorStop(1, '#1d3557');
      rrect(c, 4, 30, w - 8, h - 70, 12); c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 5; c.stroke();
      rrect(c, w - 150, 40, 120, 70, 8); c.fillStyle = '#a9d6e5'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#ffd23f'; c.fillRect(4, 150, w - 8, 14);
      txt(c, 'WATER CANNON', w / 2 - 60, 100, 44, '#fff', COMIC, OUT);
      for (const x of [110, 300, 460]) { circ(c, x, h - 40, 36); c.fillStyle = '#111'; c.fill(); circ(c, x, h - 40, 14); c.fillStyle = '#adb5bd'; c.fill(); }
    });
  }

  function truckSide() {
    return mk(600, 280, (c, w, h) => {
      // canvas-covered troop carrier: olive cab + arched tarp bed
      const tg = c.createLinearGradient(0, 10, 0, 170); tg.addColorStop(0, '#7a805a'); tg.addColorStop(1, '#4e5436');
      c.beginPath(); c.moveTo(150, 170); c.lineTo(150, 50); c.quadraticCurveTo(150, 14, 190, 14); c.lineTo(w - 20, 14); c.quadraticCurveTo(w - 6, 14, w - 6, 40); c.lineTo(w - 6, 170); c.closePath();
      c.fillStyle = tg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
      c.strokeStyle = 'rgba(30,32,20,.35)'; c.lineWidth = 3;
      for (let x = 200; x < w - 20; x += 70) { c.beginPath(); c.moveTo(x, 18); c.lineTo(x, 168); c.stroke(); }
      const bg = c.createLinearGradient(0, 150, 0, 230); bg.addColorStop(0, '#556b2f'); bg.addColorStop(1, '#3a4a1f');
      rrect(c, 6, 150, w - 12, 72, 8); c.fillStyle = bg; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
      rrect(c, 8, 70, 138, 152, 14); c.fillStyle = bg; c.fill(); c.stroke();
      rrect(c, 22, 84, 100, 56, 6); const wg = c.createLinearGradient(0, 84, 0, 140); wg.addColorStop(0, '#8fb0cf'); wg.addColorStop(1, '#2b3a4a'); c.fillStyle = wg; c.fill(); c.stroke();
      c.fillStyle = '#f1f1f1'; c.fillRect(170, 182, 150, 22); txt(c, 'ON DUTY', 245, 194, 18, '#2f3a1a', COMIC);
      for (const x of [80, 400, 500]) { circ(c, x, h - 44, 38); c.fillStyle = '#111'; c.fill(); circ(c, x, h - 44, 15); c.fillStyle = '#7a7a6a'; c.fill(); }
    });
  }

  function truckEnd() {
    return mk(240, 250, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#6b7a3c'); g.addColorStop(1, '#46522a');
      rrect(c, 4, 4, w - 8, h - 30, 12); c.fillStyle = g; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
      rrect(c, 20, 18, w - 40, 78, 6); const wg = c.createLinearGradient(0, 18, 0, 96); wg.addColorStop(0, '#8fb0cf'); wg.addColorStop(1, '#2b3a4a'); c.fillStyle = wg; c.fill(); c.stroke();
      c.fillStyle = '#2f3520'; for (let x = 70; x < w - 70; x += 14) c.fillRect(x, 120, 8, 52);
      for (const x of [34, w - 34]) { circ(c, x, 146, 15); c.fillStyle = '#fff3c4'; c.fill(); c.stroke(); }
      c.fillStyle = '#1f2414'; c.fillRect(4, h - 52, w - 8, 18);
    });
  }
  const T = {};
  function build() {
    const S = JM.sprites; shade = S.shade; rrect = S.rrect; circ = S.circ; ell = S.ell;
    T.facades = [0, 1, 2, 3, 4, 5, 6].map(facade);
    T.colonnade = [colonnade(1), colonnade(2)];
    T.sidewalls = [0, 1, 2, 3, 4].map(sidewall);
    T.vanSide = vanSide(); T.vanRear = vanEnd(false); T.vanFront = vanEnd(true);
    T.autoRear = autoRear(); T.autoSide = autoSide();
    T.barricade = barricade();
    T.banners = [
      banner('हम देखेंगे', '#e63946', '#fff'), banner('RE-EXAM NOW!', '#ffb703', '#1d1424'),
      banner('NO PAPER LEAKS', '#1d3557', '#ffd166'), banner('इंक़लाब ज़िंदाबाद', '#2a9d8f', '#fff'),
      banner('STUDENTS UNITE', '#7b2cbf', '#fff'), banner('न्याय दो', '#f77f00', '#fff'),
    ];
    T.startBanner = banner('चलो जंतर मंतर', '#d00000', '#ffd166');
    T.trees = [tree(1), tree(2), tree(3)];
    T.asphalt = asphalt(); T.pavers = pavers();
    T.lamp = lamp(); T.chai = chai(); T.gate = gateSign();
    T.busSide = { dtc: busSide('dtc'), police: busSide('police') }; T.busEnd = { dtc: busEnd('dtc'), police: busEnd('police') };
    T.valance = [valance('अनिश्चितकालीन धरना', '#e63946', '#ffd23f'), valance('STUDENTS SIT-IN', '#2a9d8f', '#f1faee'), valance('', '#f77f00', '#fff3b0'), valance('हमारी माँगें पूरी करो', '#7b2cbf', '#ffd6e0')];
    T.stage = stageBack(); T.speaker = speaker(); T.cannon = cannonSide(); T.truck = truckSide(); T.truckEnd = truckEnd();
    return T;
  }
  return { build, T, rng };
})();
