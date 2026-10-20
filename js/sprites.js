/* Comic-shaded character art, drawn with canvas vectors and cached as sprite frames. */
window.JM = window.JM || {};
JM.sprites = (() => {
  const OUT = 'rgba(32,20,24,.62)'; // soft outline: semi-realistic rather than comic ink
  const W = 180, H = 260, AX = 90, AY = 250; // sprite canvas + feet anchor
  const PPU = 96;                             // sprite px per world unit (figure ≈ 1.75u)
  const FRAMES = 6;
  const TAU = Math.PI * 2;

  // ---------- helpers ----------
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
  }
  function lgH(c, x0, x1, col) {
    const g = c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, shade(col, 0.2)); g.addColorStop(0.35, col); g.addColorStop(0.8, shade(col, -0.22)); g.addColorStop(1, shade(col, -0.4));
    return g;
  }
  function fs(c, fill, lw = 3) {
    c.fillStyle = fill; c.fill();
    if (lw) { c.lineWidth = lw * 0.5; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke(); }
  }
  const ell = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
  const circ = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  function rrect(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function limb(c, x0, y0, x1, y1, w, col, lw = 2.6) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
    c.save(); c.translate(x0, y0); c.rotate(a);
    rrect(c, -w / 2, -w / 2, L + w, w, w / 2);
    const g = c.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, shade(col, -0.38)); g.addColorStop(0.55, col); g.addColorStop(1, shade(col, 0.18));
    fs(c, g, lw);
    c.restore();
  }
  function line(c, x0, y0, x1, y1, w, col) {
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
    c.lineCap = 'round'; c.lineWidth = w + 1.6; c.strokeStyle = OUT; c.stroke();
    c.lineWidth = w; c.strokeStyle = col; c.stroke();
  }

  // ---------- cast ----------
  const CHARS = [
    { id: 'neha', name: 'Neha', tag: 'Loudest slogan in Delhi.', bg: '#ffb703',
      skin: '#c98b62', hair: '#1b1220', hairStyle: 'braid', top: '#f4a259', long: true, bottom: '#7b2d26', shoe: '#5a2a1a',
      expr: 'shout', extra: ['dupatta', 'jhola'], accent: '#d62828', speed: 1 },
    { id: 'abhijit', name: 'Abhijit', tag: 'Topper. Carries receipts.', bg: '#8ecae6',
      skin: '#b97a50', hair: '#2b1d14', hairStyle: 'curly', top: '#3a86ff', pattern: 'plaid', bottom: '#3d405b', shoe: '#222222',
      expr: 'happy', extra: ['glasses', 'backpack', 'stubble'], accent: '#9d0208', speed: 0.7 },
    { id: 'nsui', name: 'NSUI', tag: 'Flag up. Voice up.', bg: '#a2d2ff',
      skin: '#c68a5a', hair: '#140f0f', hairStyle: 'side', top: '#f8f9fa', long: true, bottom: '#ececec', shoe: '#6b4423',
      expr: 'shout', extra: ['sash', 'flag'], accent: '#1d4ed8', speed: 0.7 },
    { id: 'genz', name: 'GenZ', tag: 'Going live. No cap.', bg: '#caffbf',
      skin: '#d9a066', hair: '#7b2cbf', hairStyle: 'bucket', top: '#ff7a00', bottom: '#6c757d', shoe: '#ffffff',
      expr: 'happy', extra: ['shades', 'hoodie', 'selfie'], accent: '#ffafcc', speed: 1.06 },
    { id: 'minister', name: 'Ex Minister', tag: 'Lost his convoy. Here to "clarify".', bg: '#ffd6a5',
      skin: '#c48a5e', hair: '#bdbdbd', hairStyle: 'bald', top: '#fbfaf5', long: true, bottom: '#fbfaf5', shoe: '#3e2723',
      build: 1.28, short: true, expr: 'nervous', extra: ['jacket', 'garland', 'specs', 'mustache', 'files'], accent: '#6d6875', speed: 0.3 },
    { id: 'wheels', name: 'Wheelchair Warrior', tag: 'Ramp ya na ho, aa raha hai.', bg: '#bde0fe',
      skin: '#c68650', hair: '#2a1a12', hairStyle: 'short', top: '#1e6fd9', bottom: '#2f3e46', shoe: '#222222',
      expr: 'happy', extra: [], grinFace: true, accent: '#1e6fd9', speed: 0.8, wheelchair: true, callout: 'हम भी आए हैं!' },
    { id: 'chhota', name: 'Chhota Badmaash', tag: 'Chhota packet, bada dhamaka.', bg: '#e0c3fc',
      skin: '#c68650', hair: '#2a1a12', hairStyle: 'short', top: '#c49be8', bottom: '#dfe3e8', shoe: '#1d1d1d',
      expr: 'happy', extra: [], grinFace: true, fringe: true, halfSleeve: true, build: 1.18, bow: [5, 3], accent: '#7b5cc4', speed: 0.8, mini: 0.58, callout: 'बौना बदमाश!' },
  ];
  const POLICE = [
    { id: 'police_a', skin: '#a8734a', hair: '#111111', hairStyle: 'beret', top: '#c2a36b', bottom: '#b0915a', shoe: '#3b2414',
      expr: 'angry', extra: ['mustache', 'uniform', 'lathi'], accent: '#1d3557' },
    { id: 'police_b', skin: '#8d5b3a', hair: '#111111', hairStyle: 'beret', top: '#c2a36b', bottom: '#b0915a', shoe: '#3b2414',
      build: 1.12, expr: 'angry', extra: ['uniform', 'lathi', 'shield', 'stubble'], accent: '#1d3557' },
  ];
  // paramilitary riot units (generic; no real insignia)
  const PARA = [
    { id: 'para_blue', skin: '#a8734a', hair: '#111111', hairStyle: 'helmet', top: '#5f7fae', bottom: '#4f6d99', pattern: 'camo', camo: ['#3f5c8a', '#8aa6cf', '#2c4366'],
      shoe: '#1a1a1a', expr: 'angry', extra: ['vest', 'riotshield', 'lathi'], accent: '#24324a', build: 1.1 },
    { id: 'para_olive', skin: '#8d5b3a', hair: '#111111', hairStyle: 'helmet', top: '#5f6b3a', bottom: '#555f33', pattern: 'camo', camo: ['#3e4626', '#8a8f5a', '#2f341c'],
      shoe: '#1a1a1a', expr: 'angry', extra: ['vest', 'lathi', 'mustache'], accent: '#3b4223', build: 1.12 },
  ];
  const ORANGE = [
    { id: 'orange_a', skin: '#a46b3c', hair: '#111111', hairStyle: 'band', top: '#ff7b00', bottom: '#2b2d42', shoe: '#222222',
      expr: 'angry', extra: ['danda'], accent: '#ffb000' },
    { id: 'orange_b', skin: '#8a5530', hair: '#111111', hairStyle: 'capback', top: '#ff8800', bottom: '#3a3a52', shoe: '#111111',
      build: 1.14, expr: 'angry', extra: ['danda', 'stubble'], accent: '#3a3a3a' },
  ];
  const MEDIA = [
    { id: 'samdish', name: 'Samdish', skin: '#c48a5e', hair: '#151012', hairStyle: 'short', top: '#22223b', bottom: '#4a5d7e', shoe: '#f1f1f1',
      expr: 'shout', extra: ['beard', 'mic'], accent: '#e63946' },
    { id: 'parth', name: 'Camera Person Parth', skin: '#b97a50', hair: '#1a1a1a', hairStyle: 'capback', top: '#e9c46a', bottom: '#3d405b', shoe: '#222222',
      expr: 'happy', extra: ['camera', 'stubble'], accent: '#3a3a3a', build: 1.08 },
  ];
  const CROWD = [
    { id: 'crowd_a', skin: '#c68a5a', hair: '#1a1a1a', hairStyle: 'long', top: '#e63946', bottom: '#264653', shoe: '#222222', expr: 'shout', extra: ['placard'], text: 'न्याय दो', board: '#fff3b0' },
    { id: 'crowd_b', skin: '#a8734a', hair: '#1a1a1a', hairStyle: 'short', top: '#2a9d8f', bottom: '#3d405b', shoe: '#222222', expr: 'shout', extra: ['placard', 'glasses'], text: 'RE-EXAM!', board: '#ffffff' },
    { id: 'crowd_c', skin: '#d9a066', hair: '#3b1f0e', hairStyle: 'side', top: '#ffb703', bottom: '#14213d', shoe: '#6b4423', expr: 'happy', extra: ['placard'], text: 'हम देखेंगे', board: '#caf0f8' },
    { id: 'crowd_e', skin: '#a8734a', hair: '#1a1a1a', hairStyle: 'band', top: '#fb8500', long: true, bottom: '#f1faee', shoe: '#5a2a1a', expr: 'happy', extra: ['dhol'], accent: '#e63946' },
    { id: 'crowd_d', skin: '#b97a50', hair: '#1a1a1a', hairStyle: 'long', top: '#9b5de5', long: true, bottom: '#f1faee', shoe: '#5a2a1a', expr: 'shout', extra: ['placard'], text: 'NO LEAKS', board: '#ffd6e0' },
  ];

  // ---------- parts ----------
  function face(c, d, ext, y, expr) {
    c.fillStyle = 'rgba(200,70,60,.12)';
    ell(c, -13, y + 7, 5, 3); c.fill(); ell(c, 13, y + 7, 5, 3); c.fill();
    if (ext.has('beard')) {
      c.save(); circ(c, 0, y, 23); c.clip();
      c.beginPath(); c.moveTo(-24, y + 1); c.quadraticCurveTo(-20, y + 30, 0, y + 30); c.quadraticCurveTo(20, y + 30, 24, y + 1);
      c.lineTo(15, y + 6); c.quadraticCurveTo(0, y + 22, -15, y + 6); c.closePath();
      c.fillStyle = d.hair; c.fill(); c.restore();
    }
    if (ext.has('stubble')) {
      c.save(); circ(c, 0, y, 23); c.clip();
      c.fillStyle = 'rgba(30,20,20,.2)'; ell(c, 0, y + 17, 19, 11); c.fill(); c.restore();
    }
    if (ext.has('shades')) {
      rrect(c, -19, y - 7, 38, 12, 5);
      const g = c.createLinearGradient(0, y - 7, 0, y + 5); g.addColorStop(0, '#ff8fab'); g.addColorStop(1, '#b5179e');
      fs(c, g, 2.5);
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-14, y - 5, 7, 2); c.fillRect(5, y - 5, 7, 2);
    } else if (expr === 'dizzy') {
      c.strokeStyle = OUT; c.lineWidth = 2.6; c.lineCap = 'round';
      for (const sd of [-1, 1]) {
        c.beginPath(); c.moveTo(sd * 8 - 4, y - 4); c.lineTo(sd * 8 + 4, y + 4); c.moveTo(sd * 8 + 4, y - 4); c.lineTo(sd * 8 - 4, y + 4); c.stroke();
      }
    } else {
      for (const sd of [-1, 1]) {
        ell(c, sd * 8, y, 4.4, 3.4); fs(c, '#f4efe6', 1.2);
        circ(c, sd * 8 + 0.5, y, 2.6); c.fillStyle = '#2a1a12'; c.fill();
        circ(c, sd * 8 + 1.3, y - 1, 0.8); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill();
      }
    }
    if (ext.has('glasses') || ext.has('specs')) {
      c.strokeStyle = OUT; c.lineWidth = 2.2;
      for (const sd of [-1, 1]) { circ(c, sd * 8, y - 1, 7.5); c.stroke(); }
      c.beginPath(); c.moveTo(-1, y - 2); c.lineTo(1, y - 2); c.stroke();
    }
    // brows
    c.strokeStyle = 'rgba(40,25,20,.85)'; c.lineWidth = 2.4; c.lineCap = 'round';
    const tilt = expr === 'angry' ? 5 : expr === 'nervous' ? -4 : 0;
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 13, y - 11); c.lineTo(sd * 4, y - 11 + tilt); c.stroke(); }
    // nose
    c.lineWidth = 2; c.beginPath(); c.moveTo(-1, y + 3); c.quadraticCurveTo(4, y + 6, -1, y + 8); c.stroke();
    if (ext.has('mustache')) {
      for (const sd of [-1, 1]) { ell(c, sd * 5.5, y + 11, 7, 3.6, sd * 0.25); fs(c, d.hairStyle === 'bald' ? '#9e9e9e' : '#1a1a1a', 1.5); }
    }
    // mouth
    const my = y + (ext.has('mustache') ? 16 : 13);
    if (expr === 'happy') { c.lineWidth = 2.6; c.beginPath(); c.arc(0, my - 3, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (expr === 'shout') { ell(c, 0, my, 6, 6.5); fs(c, '#5c0f1a', 2.2); ell(c, 0, my + 3.5, 3.5, 2); c.fillStyle = '#ff6b81'; c.fill(); }
    else if (expr === 'angry') { rrect(c, -7, my - 3, 14, 6, 2); fs(c, '#ffffff', 2.2); c.beginPath(); c.moveTo(-7, my); c.lineTo(7, my); c.lineWidth = 1; c.stroke(); }
    else { c.lineWidth = 2.4; c.beginPath(); c.moveTo(-6, my); c.quadraticCurveTo(-3, my - 3, 0, my); c.quadraticCurveTo(3, my + 3, 6, my); c.stroke(); }
  }

  function capPath(c, y, hairline = -14) {
    c.beginPath();
    c.moveTo(-24, y + 4);
    c.bezierCurveTo(-28, y - 32, 28, y - 32, 24, y + 4);
    c.quadraticCurveTo(14, y + hairline, 1, y + hairline - 1);
    c.quadraticCurveTo(-14, y + hairline, -24, y + 4);
    c.closePath();
  }
  function shine(c, y) {
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.arc(-3, y - 2, 17, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
  }

  function hair(c, d, y, back) {
    const col = d.hair;
    switch (d.hairStyle) {
      case 'braid': case 'long': case 'short': case 'side':
        if (back) {
          circ(c, 0, y - 1, 24.5); fs(c, col);
          if (d.hairStyle === 'long') { rrect(c, -22, y, 44, 30, 10); fs(c, col); }
          if (d.hairStyle === 'braid') {
            for (let i = 0; i < 6; i++) { ell(c, (i % 2 ? 2 : -2), y + 26 + i * 10, 6.5, 7, i % 2 ? 0.4 : -0.4); fs(c, col, 2); }
            rrect(c, -6, y + 84, 12, 6, 2); fs(c, '#d62828', 2);
          }
        } else {
          if (d.hairStyle === 'long') { rrect(c, -27, y - 6, 12, 36, 6); fs(c, col); rrect(c, 15, y - 6, 12, 36, 6); fs(c, col); }
          if (d.hairStyle === 'side') {
            c.beginPath(); c.moveTo(-24, y + 3); c.bezierCurveTo(-28, y - 32, 30, y - 32, 24, y);
            c.quadraticCurveTo(10, y - 18, -10, y - 10); c.quadraticCurveTo(-18, y - 6, -24, y + 3); c.closePath(); fs(c, col);
          } else { capPath(c, y, d.hairStyle === 'short' ? -12 : -14); fs(c, col); }
          if (d.hairStyle === 'braid') { for (let i = 0; i < 4; i++) { ell(c, 22 + i, y + 14 + i * 9, 5.5, 6, 0.3); fs(c, col, 2); } }
        }
        shine(c, y); break;
      case 'curly': {
        if (back) { circ(c, 0, y - 1, 24); fs(c, col); }
        else { capPath(c, y, -11); fs(c, col); }
        const n = back ? 12 : 9;
        for (let k = 0; k <= n; k++) {
          const a = back ? Math.PI * 0.85 + (k / n) * Math.PI * 1.3 : Math.PI * 1.02 + (k / n) * Math.PI * 0.96;
          circ(c, Math.cos(a) * 21, y - 3 + Math.sin(a) * 21, 8); fs(c, col, 2.4);
        }
        shine(c, y); break;
      }
      case 'bucket':
        ell(c, -19, y + 4, 6, 9); fs(c, col, 2); ell(c, 19, y + 4, 6, 9); fs(c, col, 2);
        if (back) { rrect(c, -20, y - 4, 40, 24, 10); fs(c, col); }
        ell(c, 0, y - 12, 32, 8.5); fs(c, shade(d.accent, -0.15));
        c.beginPath(); c.moveTo(-19, y - 13); c.lineTo(-15, y - 32); c.quadraticCurveTo(0, y - 37, 15, y - 32); c.lineTo(19, y - 13); c.closePath();
        fs(c, lgH(c, -19, 19, d.accent));
        c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-18, y - 19, 36, 4);
        break;
      case 'bald':
        c.save(); circ(c, 0, y, 23); c.clip();
        c.fillStyle = col;
        if (back) c.fillRect(-24, y + 1, 48, 14); else { c.fillRect(-24, y - 6, 7, 14); c.fillRect(17, y - 6, 7, 14); }
        c.restore();
        c.fillStyle = 'rgba(255,255,255,.4)'; ell(c, -7, y - 14, 8, 4, -0.3); c.fill();
        break;
      case 'beret':
        if (back) { c.save(); circ(c, 0, y, 23); c.clip(); c.fillStyle = col; c.fillRect(-24, y - 10, 48, 24); c.restore(); }
        else { c.fillStyle = col; c.fillRect(-23, y - 8, 5, 10); c.fillRect(18, y - 8, 5, 10); }
        ell(c, -2, y - 16, 27, 10, -0.12); fs(c, lgH(c, -28, 26, d.accent));
        ell(c, 3, y - 25, 3, 2); fs(c, d.accent, 2);
        if (!back) { circ(c, -12, y - 16, 4.2); fs(c, '#ffd166', 2); }
        break;
      case 'band':
        if (back) { circ(c, 0, y - 1, 24); fs(c, col); }
        c.beginPath(); c.moveTo(-23, y - 3);
        for (let k = 0; k <= 8; k++) { const a = Math.PI + (k / 8) * Math.PI; const r = k % 2 ? 31 : 24; c.lineTo(Math.cos(a) * r, y - 4 + Math.sin(a) * r); }
        c.closePath(); fs(c, col);
        c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.arc(0, y + 4, 24, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
        c.strokeStyle = d.accent; c.lineWidth = 6.5; c.stroke();
        if (back) { c.beginPath(); c.moveTo(0, y - 14); c.lineTo(-8, y + 8); c.lineTo(3, y + 6); c.closePath(); fs(c, d.accent, 2); }
        break;
      case 'helmet': {
        c.save(); circ(c, 0, y - 2, 26.5); c.clip();
        c.fillStyle = lgH(c, -27, 27, d.accent); c.fillRect(-28, y - 30, 56, back ? 44 : 24);
        c.restore();
        c.beginPath(); c.arc(0, y - 2, 26.5, Math.PI * (back ? 0.92 : 1.02), Math.PI * (back ? 2.08 : 1.98)); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.25)'; ell(c, -9, y - 18, 9, 4, -0.3); c.fill();
        if (!back) {
          rrect(c, -22, y - 9, 44, 20, 6);
          const vg = c.createLinearGradient(0, y - 9, 0, y + 11); vg.addColorStop(0, 'rgba(180,215,240,.55)'); vg.addColorStop(1, 'rgba(120,160,200,.25)');
          fs(c, vg, 2); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-16, y - 7, 10, 2);
        }
        break;
      }
      case 'capback':
        if (back) { circ(c, 0, y - 1, 24); fs(c, col); }
        ell(c, 0, y - 13, 25, 15); fs(c, lgH(c, -25, 25, '#3a3a3a'));
        if (back) { ell(c, 0, y - 2, 16, 6); fs(c, '#222'); } else { ell(c, 0, y - 27, 14, 4); fs(c, '#222', 2); }
        break;
    }
  }

  function held(c, d, ext, hand, other, p, pose, m) {
    const [hx, hy] = hand;
    if (ext.has('lathi')) {
      line(c, hx - 6 * m, hy + 24, hx + 14 * m, hy - 58, 6, '#d4a373');
      c.strokeStyle = '#8d6e48'; c.lineWidth = 2;
      for (let k = 1; k < 4; k++) { const t = k / 4, x = hx - 6 * m + 20 * m * t, yy = hy + 24 - 82 * t; c.beginPath(); c.moveTo(x - 3, yy); c.lineTo(x + 3, yy); c.stroke(); }
    }
    if (ext.has('danda')) {
      const a = pose === 'swing' ? -0.3 - (Math.sin(p * 2) * 0.5 + 0.5) * 1.6 : -0.25;
      line(c, hx, hy, hx + Math.sin(-a) * 62 * m, hy - Math.cos(a) * 62, 7, '#7f5539');
    }
    if (ext.has('flag')) {
      line(c, hx, hy + 22, hx, hy - 112, 4, '#8d6e48');
      const fx = hx, fy = hy - 112, w = 58 * m, wv = (x) => Math.sin(p * 2 + x * 0.12) * 4;
      c.beginPath(); c.moveTo(fx, fy);
      for (let x = 0; x <= 58; x += 6) c.lineTo(fx + x * m, fy + wv(x));
      for (let x = 58; x >= 0; x -= 6) c.lineTo(fx + x * m, fy + 36 + wv(x));
      c.closePath(); fs(c, lgH(c, fx, fx + w, d.accent));
      c.fillStyle = '#ffffff'; c.beginPath();
      for (let x = 0; x <= 58; x += 6) c.lineTo(fx + x * m, fy + 14 + wv(x));
      for (let x = 58; x >= 0; x -= 6) c.lineTo(fx + x * m, fy + 22 + wv(x));
      c.fill();
    }
    if (ext.has('selfie')) {
      const tx = hx + 22 * m, ty = hy - 84;
      line(c, hx, hy, tx, ty, 3, '#adb5bd');
      rrect(c, tx - 11, ty - 30, 22, 34, 4); fs(c, '#212529', 2.5);
      if (m < 0) { // back view: we see the screen
        rrect(c, tx - 8, ty - 27, 16, 28, 2); c.fillStyle = '#8ecae6'; c.fill();
        circ(c, tx, ty - 15, 5); c.fillStyle = d.skin; c.fill();
        c.fillStyle = '#e63946'; c.fillRect(tx - 8, ty - 27, 11, 5);
      } else { circ(c, tx - 4, ty - 23, 2.5); c.fillStyle = '#555'; c.fill(); }
      circ(c, tx + 7, ty - 34, 3); c.fillStyle = '#ff1744'; c.fill();
    }
    if (ext.has('placard')) {
      line(c, hx, hy + 4, hx, hy - 48, 4, '#8d6e48');
      rrect(c, hx - 38, hy - 88, 76, 44, 3); fs(c, d.board || '#fff');
      c.fillStyle = '#c1121f'; c.font = '800 17px "Yatra One","Bangers",system-ui,sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.text || '', hx, hy - 65, 70);
    }
    if (ext.has('mic')) {
      const tx = hx - 9 * m, ty = hy - 30;
      line(c, hx, hy + 4, tx, ty, 5, '#222');
      c.save(); c.translate((hx + tx) / 2 - 2 * m, (hy + ty) / 2 + 2);
      rrect(c, -11, -8, 22, 16, 2); fs(c, d.accent, 2.4);
      c.fillStyle = '#fff'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('UNFILTERED', 0, 0.5, 20);
      c.restore();
      circ(c, tx, ty - 4, 7.5); fs(c, '#4a4a4a', 2.4);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx - 6, ty - 4); c.lineTo(tx + 6, ty - 4); c.moveTo(tx, ty - 10); c.lineTo(tx, ty + 2); c.stroke();
    }
    if (ext.has('files')) {
      const [ox, oy] = other;
      c.save(); c.translate(ox + 4 * -m, oy - 18); c.rotate(-0.15 * m);
      ['#e63946', '#ffb703', '#457b9d'].forEach((col, i) => { rrect(c, -14, -i * 7, 28, 8, 2); fs(c, col, 2); });
      c.fillStyle = '#fff'; c.font = '800 7px system-ui'; c.textAlign = 'center'; c.fillText('EXAM', 0, -10);
      c.restore();
    }
  }

  // ---------- full character ----------
  // ---------- original stylised face: spiky swept hair, big grin, squint eyes, moustache + jaw beard ----------
  function grinHead(c, d, y, back, dizzy) {
    const hairCol = d.hair, beard = 'rgba(38,24,16,.92)';
    c.save(); c.translate(0, y); c.rotate(back ? 0 : -0.14); c.translate(0, -y);   // cheeky head tilt
    if (!back) {
      // jaw beard (chin strap + goatee), clipped to the head
      c.save(); circ(c, 0, y, 23); c.clip();
      c.fillStyle = beard;
      c.beginPath(); c.moveTo(-22, y + 2); c.quadraticCurveTo(-20, y + 24, 0, y + 27); c.quadraticCurveTo(20, y + 24, 22, y + 2);
      c.lineTo(17, y + 6); c.quadraticCurveTo(12, y + 19, 0, y + 20); c.quadraticCurveTo(-12, y + 19, -17, y + 6); c.closePath(); c.fill();
      c.restore();
      // eyebrows: thick, lifted
      c.strokeStyle = hairCol; c.lineWidth = 3.6; c.lineCap = 'round';
      for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 14, y - 9); c.quadraticCurveTo(sd * 9, y - 13, sd * 3, y - 11); c.stroke(); }
      // smiling squint eyes
      if (dizzy) { c.lineWidth = 2.4; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 8 - 4, y - 4); c.lineTo(sd * 8 + 4, y + 3); c.moveTo(sd * 8 + 4, y - 4); c.lineTo(sd * 8 - 4, y + 3); c.stroke(); } }
      else {
        c.lineWidth = 2.6; c.strokeStyle = '#20140e';
        for (const sd of [-1, 1]) { c.beginPath(); c.arc(sd * 8, y + 1, 4.6, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
        c.lineWidth = 1; c.strokeStyle = 'rgba(60,30,15,.45)';
        for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(sd * 13, y + 2); c.lineTo(sd * 15, y + 4); c.stroke(); } // smile creases
      }
      // nose
      c.strokeStyle = 'rgba(70,35,15,.75)'; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(0, y + 1); c.quadraticCurveTo(4, y + 7, 0, y + 9); c.quadraticCurveTo(-2, y + 9, -3, y + 8); c.stroke();
      // big open grin with teeth
      c.beginPath(); c.moveTo(-10, y + 12); c.quadraticCurveTo(0, y + 15, 10, y + 11); c.quadraticCurveTo(7, y + 21, 0, y + 21); c.quadraticCurveTo(-8, y + 21, -10, y + 12); c.closePath();
      c.fillStyle = '#5a1e14'; c.fill();
      c.save(); c.clip(); c.fillStyle = '#fbf6ec'; c.fillRect(-11, y + 11, 22, 5.5); c.restore();
      c.strokeStyle = '#3a160e'; c.lineWidth = 1.4; c.stroke();
      // moustache
      c.fillStyle = beard;
      c.beginPath(); c.moveTo(-11, y + 12); c.quadraticCurveTo(-5, y + 8, 0, y + 10); c.quadraticCurveTo(5, y + 8, 11, y + 11); c.quadraticCurveTo(5, y + 11.5, 0, y + 12.5); c.quadraticCurveTo(-5, y + 11.5, -11, y + 12); c.fill();
      c.fillStyle = 'rgba(255,170,120,.18)'; ell(c, -13, y + 6, 4, 2.4); c.fill(); ell(c, 13, y + 6, 4, 2.4); c.fill(); // cheeks
    }
    if (d.fringe) { // messy mop with a long side fringe falling over the eyes
      if (back) { circ(c, 0, y - 1, 24.5); c.fillStyle = hairCol; c.fill(); }
      c.beginPath(); c.moveTo(-25, y + 6);
      for (const [tx, ty] of [[-29, -8], [-34, -16], [-26, -22], [-30, -32], [-16, -34], [-10, -44], [2, -36], [12, -42], [18, -32], [28, -30], [26, -18], [30, -6], [25, 6]]) c.lineTo(tx, y + ty);
      if (!back) { c.lineTo(20, y - 4); c.lineTo(16, y + 4); c.lineTo(10, y - 3); c.lineTo(4, y + 3); c.lineTo(0, y - 5); c.lineTo(-8, y - 2); c.lineTo(-14, y - 8); c.lineTo(-20, y - 2); }
      c.closePath(); c.fillStyle = hairCol; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = 'rgba(150,100,70,.5)'; c.lineWidth = 1.5;
      for (const [a, b, e, f] of [[-18, -26, -6, -8], [-2, -30, 8, -6], [12, -30, 18, -10]]) { c.beginPath(); c.moveTo(a, y + b); c.quadraticCurveTo((a + e) / 2 + 4, y + (b + f) / 2, e, y + f); c.stroke(); }
      c.restore(); return;
    }
    // spiky, swept-up hair
    if (back) { circ(c, 0, y - 1, 24.5); c.fillStyle = hairCol; c.fill(); }
    c.beginPath(); c.moveTo(-24, y + 3);
    const tips = [[-28, -6], [-30, -20], [-22, -24], [-24, -38], [-12, -30], [-8, -44], [0, -32], [8, -46], [12, -32], [22, -40], [22, -26], [30, -24], [25, -10], [27, 2]];
    for (const [tx, ty] of tips) c.lineTo(tx + 3, y + ty);
    c.lineTo(23, y + 3); c.quadraticCurveTo(18, y - 12, 4, y - 14); c.quadraticCurveTo(-12, y - 14, -24, y + 3); c.closePath();
    c.fillStyle = hairCol; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(120,80,55,.55)'; c.lineWidth = 1.6;
    for (const [x0, y0, x1, y1] of [[-14, -16, -6, -36], [0, -18, 7, -40], [10, -16, 20, -34]]) { c.beginPath(); c.moveTo(x0, y + y0); c.lineTo(x1, y + y1); c.stroke(); }
    c.restore();
  }

  // ---------- seated rider in a manual wheelchair ----------
  function drawWheelchair(c, d, o) {
    const back = o.facing === 'back', pose = o.pose || 'idle', p = o.phase || 0;
    const ext = new Set(d.extra || []);
    const roll = pose === 'walk' ? p * 2 : 0;           // wheels turn as he rolls
    const metal = '#9aa3ad', dark = '#2b2d33';
    c.save();
    if (pose === 'hit') c.rotate(-0.22);
    if (pose === 'jump') c.rotate(back ? 0.1 : -0.1);    // little wheelie
    // big rear wheels (seen nearly edge-on), tyres + push-rims + spokes
    const wheel = (x) => {
      ell(c, x, -36, 11, 36); fs(c, dark, 2.5);
      ell(c, x, -36, 7, 31); c.fillStyle = '#596270'; c.fill();
      c.strokeStyle = '#d0d6dc'; c.lineWidth = 1.2;
      for (let k = 0; k < 6; k++) { const a = roll + (k / 6) * TAU; c.beginPath(); c.moveTo(x, -36); c.lineTo(x + Math.cos(a) * 6, -36 + Math.sin(a) * 30); c.stroke(); }
      ell(c, x + (x < 0 ? -4 : 4), -36, 4, 28); c.strokeStyle = metal; c.lineWidth = 2.2; c.stroke();
      circ(c, x, -36, 3); c.fillStyle = '#e9ecef'; c.fill();
    };
    // frame, seat and footrest
    const frame = () => {
      c.strokeStyle = metal; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-24, -36); c.lineTo(24, -36); c.stroke();
      c.beginPath(); c.moveTo(-22, -58); c.lineTo(-20, -18); c.moveTo(22, -58); c.lineTo(20, -18); c.stroke();
      rrect(c, -24, -62, 48, 8, 3); fs(c, '#1d1d22', 2);            // seat
      c.strokeStyle = metal; c.lineWidth = 3;
      c.beginPath(); c.moveTo(-14, -20); c.lineTo(-12, -6); c.moveTo(14, -20); c.lineTo(12, -6); c.stroke();
      rrect(c, -18, -8, 36, 5, 2); fs(c, '#3a3f47', 1.6);            // footplate
      for (const sx of [-15, 15]) { circ(c, sx, -3, 4); fs(c, dark, 1.6); } // front casters
    };
    const backrest = () => {
      rrect(c, -22, -104, 44, 46, 5); fs(c, lgH(c, -22, 22, '#24262b'));
      c.strokeStyle = metal; c.lineWidth = 3.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-22, -60); c.lineTo(-22, -108); c.lineTo(-30, -110); c.moveTo(22, -60); c.lineTo(22, -108); c.lineTo(30, -110); c.stroke();
      c.strokeStyle = '#111'; c.lineWidth = 5; c.beginPath(); c.moveTo(-31, -110); c.lineTo(-36, -111); c.moveTo(31, -110); c.lineTo(36, -111); c.stroke(); // grips
    };
    const shY = -104, headY = -130, wave = Math.sin(p * 1.3) * 3;
    // raised "yo" hand (index + pinky up) on his right; left hand on the push-rim
    const yoSide = back ? -1 : 1;
    const yoHand = [yoSide * 30, shY - 34 + wave], rimHand = [-yoSide * 30, -50];
    const torso = () => {
      const tp = new Path2D();
      tp.moveTo(-19, shY + 8); tp.quadraticCurveTo(-19, shY - 3, -9, shY - 3); tp.lineTo(9, shY - 3); tp.quadraticCurveTo(19, shY - 3, 19, shY + 8);
      tp.lineTo(17, -60); tp.lineTo(-17, -60); tp.closePath();
      c.fillStyle = lgH(c, -19, 19, d.top); c.fill(tp);
      c.save(); c.clip(tp); c.fillStyle = 'rgba(255,255,255,.14)'; ell(c, -8, shY + 12, 7, 16); c.fill(); c.restore();
      c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke(tp);
      if (!back) { c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, shY - 1, 7, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); } // crew neck
    };
    const legs = () => { // seated: thighs forward (foreshortened), shins down to the footplate
      for (const sd of [-1, 1]) {
        rrect(c, sd * 10 - 7, -66, 14, 14, 5); fs(c, lgH(c, sd * 10 - 7, sd * 10 + 7, d.bottom), 1.6);
        limb(c, sd * 10, -54, sd * 11, -14, 12, d.bottom, 1.6);
        ell(c, sd * 11, -10, 8, 4.5); fs(c, d.shoe, 1.6);
      }
    };
    const arms = () => {
      limb(c, -yoSide * 17, shY + 6, rimHand[0], rimHand[1], 11, d.top);
      circ(c, rimHand[0], rimHand[1], 5.6); fs(c, d.skin, 1.6);
      limb(c, yoSide * 17, shY + 6, yoSide * 26, shY - 10, 11, d.top);    // upper arm
      limb(c, yoSide * 26, shY - 10, yoHand[0], yoHand[1] + 6, 9, d.skin); // forearm
      const [hx, hy] = yoHand;
      rrect(c, hx - 6, hy - 2, 12, 11, 4); fs(c, d.skin, 1.6);            // fist
      c.fillStyle = d.skin; c.strokeStyle = OUT; c.lineWidth = 1.2;
      for (const fx of [-4.5, 4.5]) { rrect(c, hx + fx - 1.8, hy - 12, 3.6, 12, 1.8); c.fill(); c.stroke(); } // index + pinky up
      if (!back) { c.strokeStyle = 'rgba(80,40,20,.5)'; c.beginPath(); c.moveTo(hx - 2, hy + 3); c.lineTo(hx + 3, hy + 3); c.stroke(); }
    };
    const head = () => {
      c.save(); c.translate(0, headY); c.scale(0.8, 0.8); c.translate(0, -headY);
      c.fillStyle = shade(d.skin, -0.28); c.fillRect(-6, headY + 15, 12, 12);
      for (const sd of [-1, 1]) { circ(c, sd * 22, headY + 2, 5.5); fs(c, d.skin, 2.5); }
      circ(c, 0, headY, 23);
      const hg = c.createRadialGradient(-8, headY - 10, 3, 0, headY, 27);
      hg.addColorStop(0, shade(d.skin, 0.18)); hg.addColorStop(0.6, d.skin); hg.addColorStop(1, shade(d.skin, -0.3));
      fs(c, hg);
      if (d.grinFace) grinHead(c, d, headY, back, pose === 'hit');
      else { if (!back) face(c, d, ext, headY, pose === 'hit' ? 'dizzy' : 'happy'); hair(c, d, headY, back); }
      c.restore();
    };
    if (back) { wheel(-31); wheel(31); frame(); legs(); torso(); backrest(); arms(); head(); }
    else { wheel(-31); wheel(31); backrest(); frame(); torso(); legs(); arms(); head(); }
    c.restore();
  }

  function drawChar(c, d, o = {}) {
    if (d.wheelchair) return drawWheelchair(c, d, o);
    if (d.mini) { c.save(); c.scale(0.74, d.mini); drawChar(c, Object.assign({}, d, { mini: 0 }), o); c.restore(); return; }
    const back = o.facing === 'back', m = back ? -1 : 1;
    const pose = o.pose || 'idle', p = o.phase || 0;
    const bw = d.build || 1, ext = new Set(d.extra || []);
    const legLen = d.short ? 58 : 68;
    let lift = [0, 0], spread = 0, bob = 0, hands, expr = d.expr;
    if (pose === 'walk' || pose === 'swing') {
      const s = Math.sin(p);
      lift = [Math.max(0, s) * 13, Math.max(0, -s) * 13];
      bob = -(1 - Math.abs(s)) * 3;
      hands = [[0, Math.max(0, -s) * 12], [0, Math.max(0, s) * 12]];
    } else if (pose === 'jump') { lift = [22, 22]; spread = 6; bob = -3; hands = 'up'; }
    else if (pose === 'hit') { lift = [6, 18]; spread = 4; hands = 'flail'; expr = 'dizzy'; }
    else if (pose === 'cheer') { bob = -Math.abs(Math.sin(p)) * 7; hands = [[0, 4], [0, 72]]; }
    else { bob = Math.sin(p) * 1.2; hands = [[0, 0], [0, 0]]; }

    const hipY = -6 - legLen + bob, shY = hipY - (d.short ? 50 : 56), headY = shY - 23;
    const sw = 22 * bw, hw = 16 * bw * (bw > 1.1 ? 1.15 : 1);
    const handPos = [-1, 1].map((sd, i) => {
      if (hands === 'up') return [sd * (sw + 12), shY - 34];
      if (hands === 'flail') return [sd * (sw + 18), shY - 14 + (i ? -14 : 6)];
      const [dx, r] = hands[i];
      return [sd * (sw + 3) + dx, shY + 56 - r];
    });
    const hi = back ? 0 : 1; // character's right hand on screen
    if (ext.has('mic')) handPos[hi] = [m * 12, shY + 8];
    if (ext.has('camera')) handPos[hi] = [m * (sw + 2), shY - 2];

    c.save();
    if (pose === 'hit') c.rotate(-0.28);
    if (back) held(c, d, ext, handPos[hi], handPos[1 - hi], p, pose, m);

    // legs + shoes
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1, fx = sd * (9 * bw + 1 + spread + (d.bow ? d.bow[i] : 0)), fy = -5 - lift[i];
      limb(c, sd * 9 * bw, hipY + 4, fx, fy - 6, 15 * Math.min(bw, 1.15), d.bottom);
      ell(c, fx + sd * 2, fy - 2, 10.5, 6.5); fs(c, back && lift[i] > 4 ? shade(d.shoe, 0.35) : lgH(c, fx - 10, fx + 10, d.shoe), 2.5);
    }

    // torso
    const bot = d.long ? hipY + 24 : hipY + 6, fw = d.long ? hw + 6 : hw, bulge = bw > 1.1 ? 9 : 2;
    const tp = new Path2D();
    tp.moveTo(-sw, shY + 10);
    tp.quadraticCurveTo(-sw, shY - 2, -sw + 10, shY - 3);
    tp.lineTo(sw - 10, shY - 3);
    tp.quadraticCurveTo(sw, shY - 2, sw, shY + 10);
    tp.quadraticCurveTo(hw + bulge, (shY + hipY) / 2 + 6, hw, hipY);
    tp.lineTo(fw, bot); tp.lineTo(-fw, bot); tp.lineTo(-hw, hipY);
    tp.quadraticCurveTo(-hw - bulge, (shY + hipY) / 2 + 6, -sw, shY + 10);
    tp.closePath();
    c.fillStyle = lgH(c, -sw, sw, d.top); c.fill(tp);
    c.save(); c.clip(tp);
    if (d.pattern === 'camo') {
      const R = (k) => ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1;
      for (let k = 0; k < 26; k++) { c.fillStyle = d.camo[k % 3]; ell(c, -sw + R(k) * sw * 2, shY - 4 + R(k + 50) * (bot - shY + 6), 5 + R(k + 9) * 7, 3 + R(k + 3) * 4, R(k + 7) * 3); c.fill(); }
    }
    if (ext.has('vest')) {
      c.fillStyle = 'rgba(28,32,40,.88)'; c.fillRect(-sw + 3, shY + 2, sw * 2 - 6, hipY - shY - 4);
      c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-sw + 6, shY + 6, sw - 6, 3);
      if (!back) { c.fillStyle = 'rgba(60,66,80,.95)'; for (const sd of [-1, 1]) c.fillRect(sd * 10 - 6, shY + 16, 12, 12); }
    }
    if (d.pattern === 'plaid') {
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(255,255,255,.35)';
      for (let x = -sw; x < sw; x += 9) { c.beginPath(); c.moveTo(x, shY - 4); c.lineTo(x, bot); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,50,.25)';
      for (let y = shY; y < bot; y += 9) { c.beginPath(); c.moveTo(-sw, y); c.lineTo(sw, y); c.stroke(); }
    }
    if (ext.has('jacket')) {
      c.fillStyle = lgH(c, -sw, sw, d.accent);
      if (back) c.fillRect(-sw, shY - 4, sw * 2, hipY - shY + 10);
      else {
        c.beginPath(); c.moveTo(-sw, shY - 4); c.lineTo(-5, shY - 4); c.lineTo(-2, hipY + 6); c.lineTo(-sw - 10, hipY + 6); c.fill();
        c.beginPath(); c.moveTo(sw, shY - 4); c.lineTo(5, shY - 4); c.lineTo(2, hipY + 6); c.lineTo(sw + 10, hipY + 6); c.fill();
        c.fillStyle = '#e9c46a'; for (let k = 0; k < 4; k++) { circ(c, -7, shY + 14 + k * 10, 2); c.fill(); }
      }
    }
    if (ext.has('hoodie') && !back) {
      rrect(c, -16, hipY - 22, 32, 16, 6); c.fillStyle = shade(d.top, -0.18); c.fill();
    }
    if (ext.has('backpack') && !back) {
      c.fillStyle = shade(d.accent, -0.1); c.fillRect(-sw + 4, shY - 4, 7, 36); c.fillRect(sw - 11, shY - 4, 7, 36);
    }
    c.fillStyle = 'rgba(255,255,255,.14)'; ell(c, -sw * 0.45, shY + 12, sw * 0.35, 18); c.fill();
    c.restore();
    c.lineWidth = 3; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke(tp);

    if (ext.has('uniform')) {
      c.fillStyle = '#6b4226'; c.fillRect(-hw, hipY - 7, hw * 2, 7); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(-hw, hipY - 7, hw * 2, 7);
      if (!back) {
        rrect(c, -5, hipY - 8, 10, 9, 2); fs(c, '#ffd166', 2);
        for (const sd of [-1, 1]) { rrect(c, sd * 11 - 6, shY + 10, 12, 11, 2); fs(c, shade(d.top, -0.1), 2); }
        c.fillStyle = '#e63946'; c.fillRect(-sw + 3, shY + 6, 6, 3);
      }
      for (const sd of [-1, 1]) { rrect(c, sd * (sw - 9) - 7, shY - 4, 14, 5, 2); fs(c, d.accent, 1.6); }
    }
    if (ext.has('sash') || ext.has('dupatta')) {
      const col = ext.has('sash') ? d.accent : '#d62828', w = ext.has('sash') ? 9 : 13;
      if (back && ext.has('dupatta')) {
        for (const sd of [-1, 1]) { rrect(c, sd * (sw - 10) - 7, shY - 4, 14, bot - shY + 8, 5); fs(c, col, 2.4); }
      } else {
        c.beginPath(); c.moveTo(-sw * m + 2 * m, shY - 3); c.lineTo(-sw * m + (2 + w) * m, shY - 3);
        c.lineTo(hw * m + 2 * m, hipY + 4); c.lineTo(hw * m + (2 - w) * m, hipY + 4); c.closePath(); fs(c, col, 2.4);
        if (ext.has('dupatta')) { c.fillStyle = '#ffd166'; for (let k = 1; k < 6; k++) { circ(c, (-sw + 8 + (hw + sw - 6) * k / 6) * m, shY + (hipY - shY + 6) * k / 6, 1.8); c.fill(); } }
      }
    }
    if (ext.has('jhola')) {
      const bx = -m * (hw + 6);
      c.strokeStyle = '#8d6e48'; c.lineWidth = 3; c.beginPath(); c.moveTo(sw * m * 0.8, shY - 2); c.lineTo(bx, hipY - 8); c.stroke();
      rrect(c, bx - 12, hipY - 10, 24, 24, 4); fs(c, '#e9c46a', 2.4);
      c.fillStyle = '#9d0208'; for (let k = 0; k < 4; k++) { circ(c, bx - 6 + (k % 2) * 12, hipY - 3 + (k >> 1) * 10, 2.2); c.fill(); }
    }
    if (ext.has('backpack') && back) {
      rrect(c, -sw + 3, shY + 2, sw * 2 - 6, 54, 12); fs(c, lgH(c, -sw, sw, d.accent));
      rrect(c, -sw + 10, shY + 30, sw * 2 - 20, 20, 6); fs(c, shade(d.accent, -0.15), 2.2);
      c.strokeStyle = '#ffd166'; c.lineWidth = 2; c.beginPath(); c.moveTo(-sw + 10, shY + 12); c.lineTo(sw - 10, shY + 12); c.stroke();
    }
    if (ext.has('garland')) {
      const dip = back ? 8 : 48;
      for (let k = 0; k <= 12; k++) {
        const t = k / 12, x = (1 - t) * (1 - t) * (-sw + 7) + 2 * (1 - t) * t * 0 + t * t * (sw - 7);
        const y = (1 - t) * (1 - t) * shY + 2 * (1 - t) * t * (shY + dip * 2) + t * t * shY;
        circ(c, x, y, 5.6); fs(c, k % 2 ? '#ffb703' : '#fb8500', 1.4);
      }
    }

    // arms
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1, [hx, hy] = handPos[i];
      const ax = sd * (sw - 5), ay = shY + 6;
      if (d.halfSleeve) { limb(c, ax, ay, hx, hy, 11, d.skin); limb(c, ax, ay, ax + (hx - ax) * 0.42, ay + (hy - ay) * 0.42, 14.5, d.top); }
      else limb(c, ax, ay, hx, hy, 12.5, d.top);
      circ(c, hx, hy, 6.6); fs(c, d.skin, 2.5);
    }
    if (ext.has('riotshield') && !back) {
      const [sx, sy] = handPos[0];
      rrect(c, sx - 16, sy - 62, 44, 96, 5);
      const sg = c.createLinearGradient(sx - 16, 0, sx + 28, 0); sg.addColorStop(0, 'rgba(210,230,245,.55)'); sg.addColorStop(1, 'rgba(150,180,210,.3)');
      fs(c, sg, 2.4);
      c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(sx - 12, sy - 58, 5, 86);
      c.fillStyle = 'rgba(20,30,60,.55)'; c.font = '800 9px system-ui'; c.textAlign = 'center'; c.fillText('POLICE', sx + 6, sy - 18);
    }
    if (ext.has('shield') && !back) {
      const [sx, sy] = handPos[0];
      ell(c, sx + 4, sy - 14, 22, 30); fs(c, lgH(c, sx - 18, sx + 26, '#c9a227'));
      c.save(); ell(c, sx + 4, sy - 14, 22, 30); c.clip();
      c.strokeStyle = 'rgba(80,50,10,.45)'; c.lineWidth = 2;
      for (let k = -40; k < 40; k += 7) { c.beginPath(); c.moveTo(sx + k, sy - 50); c.lineTo(sx + k + 30, sy + 20); c.stroke(); c.beginPath(); c.moveTo(sx + k + 30, sy - 50); c.lineTo(sx + k, sy + 20); c.stroke(); }
      c.restore();
    }

    if (ext.has('dhol') && !back) {
      const y = hipY - 14;
      rrect(c, -30, y - 15, 60, 32, 14); fs(c, lgH(c, -30, 30, '#c1121f'));
      c.strokeStyle = '#ffd166'; c.lineWidth = 2.5; c.beginPath();
      for (let k = 0; k <= 6; k++) c.lineTo(-24 + k * 8, y + (k % 2 ? 12 : -12));
      c.stroke();
      for (const sd of [-1, 1]) { ell(c, sd * 30, y + 1, 6, 15); fs(c, '#f1e3c2', 2.5); }
      const [hx, hy] = handPos[1];
      line(c, hx, hy, hx + 8, hy + 22, 3, '#8d6e48');
    }
    // head (scaled to ~0.8 for natural proportions)
    c.save(); c.translate(0, headY); c.scale(0.8, 0.8); c.translate(0, -headY);
    c.fillStyle = shade(d.skin, -0.28); c.fillRect(-6, headY + 15, 12, 12);
    for (const sd of [-1, 1]) { circ(c, sd * 22, headY + 2, 5.5); fs(c, d.skin, 2.5); }
    circ(c, 0, headY, 23);
    const hg = c.createRadialGradient(-8, headY - 10, 3, 0, headY, 27);
    hg.addColorStop(0, shade(d.skin, 0.18)); hg.addColorStop(0.6, d.skin); hg.addColorStop(1, shade(d.skin, -0.3));
    fs(c, hg);
    if (d.grinFace) grinHead(c, d, headY, back, expr === 'dizzy');
    else { if (!back) face(c, d, ext, headY, expr); hair(c, d, headY, back); }
    if (ext.has('hoodie') && back) { ell(c, 0, headY + 22, 24, 11); fs(c, shade(d.top, -0.15)); }
    if (ext.has('camera')) {
      const cx = m * (sw + 6), cy = headY + 10;
      rrect(c, cx - 24, cy - 16, 48, 28, 5); fs(c, lgH(c, cx - 24, cx + 24, '#2b2d42'));
      rrect(c, cx - 8, cy - 26, 16, 10, 3); fs(c, '#3a3a52', 2.4);
      if (back) {
        rrect(c, cx - 15, cy - 9, 18, 13, 2); c.fillStyle = '#8ecae6'; c.fill();
        circ(c, cx + 12, cy - 6, 4.5); c.fillStyle = '#ff1744'; c.fill();
        c.fillStyle = '#fff'; c.font = '700 7px system-ui'; c.textAlign = 'center'; c.fillText('REC', cx + 12, cy + 7);
      } else {
        circ(c, cx, cy - 2, 12); fs(c, '#111', 2.6);
        circ(c, cx - 3, cy - 5, 4); c.fillStyle = 'rgba(140,200,255,.8)'; c.fill();
        circ(c, cx + 18, cy - 12, 3.5); c.fillStyle = '#ff1744'; c.fill();
      }
    }
    if (ext.has('hoodie') && !back) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, shY); c.lineTo(-6, shY + 18); c.moveTo(5, shY); c.lineTo(6, shY + 18); c.stroke(); }

    c.restore();
    if (!back) held(c, d, ext, handPos[hi], handPos[1 - hi], p, pose, m);
    c.restore();
  }

  // ---------- cache ----------
  const cache = new Map();
  function get(d, facing, pose, frame = 0) {
    const key = d.id + '|' + facing + '|' + pose + '|' + frame;
    let cv = cache.get(key);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const c = cv.getContext('2d'); c.translate(AX, AY);
      drawChar(c, d, { facing, pose, phase: (frame / FRAMES) * TAU });
      cache.set(key, cv);
    }
    return cv;
  }
  // live-draw into any canvas (character cards, win screen)
  function portrait(canvas, d, phase = 0, pose = 'idle', zoom = 1) {
    const c = canvas.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    const k = (h * dpr / 250) * zoom;
    c.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height - 8 * dpr);
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c, 0, 0, 30 * (d.build || 1), 8); c.fill();
    drawChar(c, d, { facing: 'front', pose, phase });
  }

  return { CHARS, POLICE, PARA, ORANGE, CROWD, MEDIA, FRAMES, PPU, W, H, AX, AY, OUT, get, portrait, drawChar, shade, lgH, fs, ell, circ, rrect, line };
})();
