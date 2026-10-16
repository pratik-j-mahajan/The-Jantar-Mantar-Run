/* Level layout + world rendering: Jantar Mantar Road, a chowk, and the Jantar Mantar compound. */
window.JM = window.JM || {};
JM.world = (() => {
  const LANES = [-5, -2.5, 0, 2.5, 5];
  const ROAD = 7, GOAL = 560, CHOWK = 280, ISLAND_R = 4.4, FAR = 115;
  const E = () => JM.engine, T = () => JM.props.T;

  // ---------- generation ----------
  function makeFoe(R, type, x, d, p) {
    const S = JM.sprites, police = type === 'police', span = 3 + R() * 3;
    return {
      type, x, d, hx: x, hd: d, a: Math.max(-6.2, x - span), b: Math.min(6.2, x + span),
      dir: R() < 0.5 ? -1 : 1, pv: 1.6 + R() * 1.2, cr: police ? 10 : 12,
      cv: (police ? 7.0 : 8.0) * (1 + p * 0.15), state: 'patrol', cool: 0, t: R() * 10, near: 0,
      look: police ? S.POLICE[R() < 0.5 ? 0 : 1] : S.ORANGE[R() < 0.5 ? 0 : 1],
    };
  }
  function build(seed) {
    const R = JM.props.rng(seed), S = JM.sprites, Tx = T();
    const W = { bars: [], vans: [], autos: [], foes: [], crowd: [], trees: [], lamps: [], banners: [], blds: [], stalls: [], buses: [], cannons: [], trucks: [], tents: [], guards: [], flags: [], cones: [], stage: null };
    const inChowk = (d, pad = 16) => Math.abs(d - CHOWK) < pad;

    for (const side of [-1, 1]) {
      let d = -40;
      while (d < 498) {
        const len = 11 + R() * 8;
        if (d + len > CHOWK - 18 && d < CHOWK + 18) { d = CHOWK + 18; continue; }
        const colon = d > 370 && R() < 0.75;
        W.blds.push({
          x0: side < 0 ? -23 : 12.4, x1: side < 0 ? -12.4 : 23, d0: d, d1: Math.min(d + len, 500),
          h: colon ? 8.5 + R() * 2 : 9 + R() * 6, side,
          face: colon ? Tx.colonnade[(R() * 2) | 0] : Tx.facades[(R() * Tx.facades.length) | 0],
          end: Tx.sidewalls[(R() * Tx.sidewalls.length) | 0], col: colon ? '#f3ead8' : '#e9d8a6',
        });
        d += len + 0.5 + R() * 1.4;
      }
      for (let d = 4; d < 548; d += 9 + R() * 4) if (!inChowk(d, 15)) W.trees.push({ x: side * (9.7 + R() * 0.5), d, img: Tx.trees[(R() * 3) | 0] });
      for (let d = 10; d < 548; d += 18) if (!inChowk(d, 15)) W.lamps.push({ x: side * 7.7, d });
    }
    [12, 75, 145, 215, 345, 415, 485].forEach((d, i) => W.banners.push({ d, img: i === 0 ? Tx.startBanner : Tx.banners[(i - 1) % Tx.banners.length] }));
    [[-9.9, 60], [9.9, 190], [-9.9, 330], [9.9, 455]].forEach(([x, d]) => W.stalls.push({ x, d }));

    // crowds on the footpaths
    const crowdAt = (d0, d1, n) => { for (let k = 0; k < n; k++) { const side = R() < 0.5 ? -1 : 1; W.crowd.push({ x: side * (side < 0 ? 9.4 + R() * 1.4 : 8.2 + R() * 2.4), d: d0 + R() * (d1 - d0), look: S.CROWD[(R() * S.CROWD.length) | 0], t: R() * 6 }); } };
    crowdAt(-4, 30, 14); crowdAt(520, 556, 16);
    for (let d = 50; d < 500; d += 26) if (!inChowk(d, 14)) crowdAt(d, d + 6, 2);

    // parked autos at the kerb
    for (let d = 30; d < 520; d += 22 + R() * 30) if (!inChowk(d, 18)) W.autos.push({ x: (R() < 0.5 ? -1 : 1) * 6.15, d });

    // ---- police bus blockades: buses parked across the road, a wide gap guarded by slow officers ----
    const BLOCKS = [95, 178, 330, 398, 468];
    const CANNONS = [[5.15, 252], [-5.15, 432]];
    const TRUCKS = [[-5.15, 150], [5.15, 372], [-5.15, 520]];
    const reserved = (d) => BLOCKS.some((b) => d > b - 11 && d < b + 16) || CANNONS.some(([, cd]) => Math.abs(d - cd) < 8) || TRUCKS.some(([, td]) => Math.abs(d - td) < 9);
    const policeLine = (x0, x1, d, n, looks = S.POLICE) => { for (let k = 0; k < n; k++) W.guards.push({ x: x0 + ((x1 - x0) * (k + 0.5)) / n, d, look: looks[k % looks.length], t: R() * 6 }); };
    const platoon = (x0, x1, d, rows, cols, look) => { for (let r = 0; r < rows; r++) policeLine(x0, x1, d + r * 1.1, cols, [look]); };
    BLOCKS.forEach((bd, i) => {
      const left = i % 2 === 0, kind = R() < 0.5 ? 'dtc' : 'police';
      const add = (d0, onLeft, k) => {
        const x0 = onLeft ? -7.1 : -0.6, x1 = onLeft ? 0.6 : 7.1;
        W.buses.push({ x0, x1, d0, d1: d0 + 2.5, kind: k });
        policeLine(x0 + 0.6, x1 - 0.6, d0 - 0.8, 4);              // officers lined up in front of the bus (decor)
        policeLine(x0 + 1.0, x1 - 1.0, d0 - 1.9, 4, [S.PARA[0]]);  // riot-gear row in front of them
        for (let x = x0 + 0.4; x < x1; x += 1.6) W.cones.push({ x, d: d0 - 0.25 });
        const gx = onLeft ? x1 + 0.9 : x0 - 0.9;                  // one slow guard at the open end
        const g = makeFoe(R, 'police', gx, d0 - 1.4, 0);
        g.cr = 3; g.cv = 5; g.pv = 0; g.a = g.b = gx; g.leash = 5; g.guard = true;
        W.foes.push(g);
      };
      add(bd, left, kind);
      if (i >= 2) add(bd + 8, !left, kind === 'dtc' ? 'police' : 'dtc'); // later ones form a chicane
    });
    TRUCKS.forEach(([x, d], i) => {
      W.trucks.push({ x, d });
      platoon(Math.sign(x) * 7.7, Math.sign(x) * 10.6, d - 1.5, 2, 3, S.PARA[i % 2]); // troops unloading onto the footpath
    });
    [[1, 70], [-1, 205], [1, 345], [-1, 410], [1, 492]].forEach(([sd, d], i) => platoon(sd * 7.7, sd * 10.4, d, 2, 3, S.PARA[i % 2]));
    CANNONS.forEach(([x, d]) => { W.cannons.push({ x, d }); policeLine(Math.sign(x) * 7.8, Math.sign(x) * 9.6, d - 4, 2); });

    // ---- protest set dressing ----
    [[1, 30], [-1, 140], [1, 300], [-1, 362], [1, 446], [-1, 505]].forEach(([side, d0]) => {
      W.tents.push({ side, d0, d1: d0 + 9, val: Tx.valance[(R() * Tx.valance.length) | 0] });
      for (let k = 0; k < 6; k++) W.crowd.push({ x: side * (8.6 + R() * 2.2), d: d0 + 1 + R() * 7, look: k === 0 ? S.CROWD[4] : S.CROWD[(R() * S.CROWD.length) | 0], t: R() * 6 });
      for (const fd of [d0 - 1, d0 + 10]) W.flags.push({ x: side * 7.9, d: fd, col: ['#e63946', '#2a9d8f', '#ffb703', '#7b2cbf', '#f77f00'][(R() * 5) | 0] });
    });
    W.stage = { d0: 230, d1: 244 };
    W.crowd.push({ x: 10.1, d: 237, h: 1.0, look: S.CROWD[1], t: 0 });
    for (let k = 0; k < 7; k++) W.crowd.push({ x: 7.8 + R() * 0.7, d: 231 + R() * 12, look: S.CROWD[(R() * S.CROWD.length) | 0], t: R() * 6 });
    [60, 125, 215, 285, 350, 420, 490].forEach((d, i) => { const sd = i % 2 ? 1 : -1; policeLine(sd * 7.75, sd * 7.75, d, 1); policeLine(sd * 8.3, sd * 8.3, d + 1.3, 1); policeLine(sd * 7.9, sd * 7.9, d + 2.6, 1); });
    const clear = (o) => !W.tents.some((t) => Math.sign(o.x) === t.side && o.d > t.d0 - 2 && o.d < t.d1 + 2) && !(o.x > 0 && o.d > 228 && o.d < 246);
    W.trees = W.trees.filter(clear); W.stalls = W.stalls.filter(clear);

    // obstacles
    let d = 42, i = 0;
    while (d < 528) {
      if (inChowk(d, 15)) { d = CHOWK + 15; continue; }
      if (reserved(d)) { d += 4; continue; }
      const p = d / 530, roll = R();
      if (i % 3 === 0 || roll < 0.22) {
        const open = new Set([(R() * 5) | 0]);
        if (R() < 0.55 - p * 0.35) open.add((R() * 5) | 0);
        LANES.forEach((x, k) => { if (!open.has(k)) W.bars.push({ x, d }); });
        if (R() < 0.3 + p * 0.45) W.foes.push(makeFoe(R, 'police', LANES[(R() * 5) | 0], d + 7, p));
      } else if (roll < 0.42) {
        const k = (R() * 5) | 0;
        W.vans.push({ x: LANES[k], d: d + 2.4, dir: R() < 0.5 ? 1 : -1, moving: false, v: 0, flash: R() < 0.6 });
        if (R() < p) W.foes.push(makeFoe(R, 'police', LANES[(k + 2) % 5], d + 3, p));
      } else if (roll < 0.58 && d > 90 && !BLOCKS.some((b) => b > d - 60 && b < d + 45) && !CANNONS.some(([, cd]) => cd > d - 60 && cd < d + 45) && !TRUCKS.some(([, td]) => td > d - 60 && td < d + 45)) {
        W.vans.push({ x: LANES[(R() * 5) | 0], d: d + 34, dir: -1, moving: true, v: 0, active: false, flash: true });
      } else {
        const n = 1 + (R() < 0.3 + p * 0.5 ? 1 : 0) + (p > 0.55 && R() < 0.45 ? 1 : 0);
        for (let k = 0; k < n; k++) W.foes.push(makeFoe(R, R() < 0.45 ? 'police' : 'orange', LANES[(R() * 5) | 0], d + k * 3.5, p));
      }
      d += 17 - p * 4 + R() * 7;
      i++;
    }
    const para = (x, d) => { const f = makeFoe(R, 'police', x, d, 0.3); f.look = S.PARA[R() < 0.5 ? 0 : 1]; f.para = true; f.cr = 7; f.cv = 6.2; f.pv = 1.2; return f; };
    for (let d = 120; d < 520; d += 46 + R() * 20) if (!reserved(d) && !inChowk(d, 15)) W.foes.push(para(LANES[(R() * 5) | 0], d));
    W.foes.push(para(-4, GOAL - 30), para(0, GOAL - 12));
    W.foes.push(makeFoe(R, 'police', -2.5, GOAL - 16, 1), makeFoe(R, 'orange', 2.5, GOAL - 24, 1), makeFoe(R, 'police', 4, GOAL - 9, 1));
    return W;
  }

  // ---------- collision ----------
  function blocked(W, x, d, z) {
    if (Math.hypot(x, d - CHOWK) < ISLAND_R + 0.4) return true;
    if (z < 0.95) for (const b of W.bars) if (Math.abs(b.d - d) < 0.55 && Math.abs(b.x - x) < 1.55) return true;
    for (const v of W.vans) if (!v.moving && Math.abs(v.d - d) < 2.7 && Math.abs(v.x - x) < 1.35) return true;
    for (const b of W.buses) if (x + 0.35 > b.x0 && x - 0.35 < b.x1 && d + 0.3 > b.d0 && d - 0.3 < b.d1) return true;
    for (const cn of W.cannons) if (Math.abs(cn.x - x) < 1.55 && Math.abs(cn.d - d) < 3.6) return true;
    for (const tk of W.trucks) if (Math.abs(tk.x - x) < 1.55 && Math.abs(tk.d - d) < 3.4) return true;
    return false;
  }

  // ---------- drawing helpers ----------
  function groundStrip(x0, x1, d0, d1, col, h = 0) {
    E().fillW([[x0, d0, h], [x1, d0, h], [x1, d1, h], [x0, d1, h]], col);
  }
  function drawSky(t) {
    const e = E(), c = e.c, W = e.W, H = e.H, hy = e.horizonY();
    const g = c.createLinearGradient(0, 0, 0, Math.max(hy, 1) + H * 0.05);
    g.addColorStop(0, '#f6b26b'); g.addColorStop(0.6, '#ffd7a0'); g.addColorStop(1, '#fff0d6');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sun glare (golden hour, upper left)
    const sg = c.createRadialGradient(W * 0.18, hy - H * 0.12, 0, W * 0.18, hy - H * 0.12, H * 0.5);
    sg.addColorStop(0, 'rgba(255,250,220,.95)'); sg.addColorStop(0.15, 'rgba(255,230,160,.55)'); sg.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    // soft drifting clouds
    for (let k = 0; k < (JM.quality.clouds ? 7 : 0); k++) {
      const cx = ((k * 331 + t * 6 * e.dpr - e.cam.x * 2 * e.dpr) % (W + 400) + W + 400) % (W + 400) - 200;
      const cy = hy - H * (0.05 + ((k * 37) % 9) / 60), cw = (120 + (k * 53) % 140) * e.dpr;
      for (let j = 0; j < 4; j++) {
        const gx = cx + (j - 1.5) * cw * 0.35, gy = cy + Math.sin(j * 2 + k) * cw * 0.06, r = cw * (0.32 + (j % 2) * 0.12);
        const cg = c.createRadialGradient(gx, gy, 0, gx, gy, r); cg.addColorStop(0, 'rgba(255,244,228,.55)'); cg.addColorStop(1, 'rgba(255,236,210,0)');
        c.fillStyle = cg; c.fillRect(gx - r, gy - r, r * 2, r * 2);
      }
    }
    c.fillStyle = 'rgba(255,248,220,.9)'; c.beginPath(); c.arc(W * 0.18, hy - H * 0.1, H * 0.035, 0, Math.PI * 2); c.fill();
    // distant hazy skyline with parallax
    const off = -e.cam.x * 6 * e.dpr;
    c.fillStyle = 'rgba(214,150,105,.55)';
    for (let k = -2; k < 22; k++) {
      const bx = ((k * 97 + off) % (W + 200) + W + 200) % (W + 200) - 100, bw = 40 + ((k * 37) % 50), bh = 18 + ((k * 53) % 46);
      c.fillRect(bx, hy - bh * e.dpr, bw * e.dpr, bh * e.dpr + 2);
    }
    c.fillStyle = 'rgba(120,140,90,.45)';
    for (let k = 0; k < 30; k++) { const bx = ((k * 61 + off * 1.4) % (W + 100) + W + 100) % (W + 100) - 50; c.beginPath(); c.arc(bx, hy, (14 + (k * 13) % 18) * e.dpr, Math.PI, 0); c.fill(); }
    c.fillStyle = '#d8b48a'; c.fillRect(0, hy, W, H - hy);
  }

  function drawGround(W, t) {
    const e = E(), cd = e.cam.d, n0 = cd + 0.5, n1 = cd + FAR;
    // dusty verge, footpaths, road
    groundStrip(-40, 40, n0, n1, '#cfae84');
    groundStrip(-11.4, 11.4, n0, Math.min(n1, GOAL + 2), '#9c6f58');
    groundStrip(-ROAD, ROAD, n0, Math.min(n1, GOAL + 2), '#4f5057');
    const Tx = T(), endD = Math.min(n1, GOAL + 2);
    for (const sd of (JM.quality.pavers ? [-1, 1] : [])) {
      const a = sd < 0 ? -11.4 : 7.35, b = sd < 0 ? -7.35 : 11.4;
      if (CHOWK - 13 > n0) Tx.pavers && E().texGround(Tx.pavers, a, b, n0, Math.min(endD, CHOWK - 13), 4, 50);
      if (endD > CHOWK + 13) E().texGround(Tx.pavers, a, b, Math.max(n0, CHOWK + 13), endD, 4, 50);
    }
    if (JM.quality.groundTex) E().texGround(Tx.asphalt, -ROAD, ROAD, n0, endD, 14, 75);
    if (n1 > CHOWK - 20 && n0 < CHOWK + 20) {
      groundStrip(-60, 60, CHOWK - 13, CHOWK + 13, '#545660');
      for (const z of [CHOWK - 15.5, CHOWK + 13.5]) for (let x = -6.6; x < 6.6; x += 1.2) groundStrip(x, x + 0.7, z, z + 2, '#f1f1f1');
      for (const s of [-1, 1]) for (let dd = CHOWK - 11; dd < CHOWK + 11; dd += 1.2) groundStrip(s * 9, s * 11, dd, dd + 0.7, '#f1f1f1');
    }
    // compound lawn past the gate
    if (n1 > GOAL) { groundStrip(-12, 12, GOAL + 1, n1, '#86a95a'); groundStrip(-2.4, 2.4, GOAL + 1, n1, '#e3c79a'); groundStrip(-22, 22, GOAL - 1, GOAL + 1, '#cfae84'); }
    const near = Math.min(cd + 60, GOAL);
    // footpath tiles + kerbs
    for (let d = Math.floor(n0 / 1.5) * 1.5; d < near; d += 1.5) {
      if (Math.abs(d - CHOWK) < 13) continue;
      const k = Math.round(d / 1.5);
      for (const s of [-1, 1]) {
        groundStrip(s * 7, s * 7.35, d, d + 1.5, k & 1 ? '#ffd23f' : '#1f1f1f');
      }
    }
    // lane dashes + edge lines
    for (let d = Math.floor(n0 / 7) * 7; d < near; d += 7) {
      if (Math.abs(d - CHOWK) < 14) continue;
      for (const x of [-3.75, -1.25, 1.25, 3.75]) groundStrip(x - 0.08, x + 0.08, d, d + 3, 'rgba(235,232,220,.55)');
    }
    for (const s of [-1, 1]) groundStrip(s * 6.65, s * 6.8, n0, Math.min(near, CHOWK - 13), '#f2c14e');
    if (near > CHOWK + 13) for (const s of [-1, 1]) groundStrip(s * 6.65, s * 6.8, Math.max(n0, CHOWK + 13), near, '#f2c14e');
    // start + finish
    for (const [dd, txt] of [[3, 'START'], [GOAL, 'FINISH']]) {
      if (dd < n0 - 3 || dd > n1) continue;
      for (let x = -7, k = 0; x < 7; x += 0.7, k++) { groundStrip(x, x + 0.7, dd, dd + 0.6, k & 1 ? '#fff' : '#111'); groundStrip(x, x + 0.7, dd + 0.6, dd + 1.2, k & 1 ? '#111' : '#fff'); }
    }
  }

  // ---------- static objects ----------
  function drawBld(b) {
    const e = E();
    e.box(b.x0, b.x1, b.d0, b.d1, 0, b.h, b.col, { tex: b.side < 0 ? { right: b.face, front: b.end } : { left: b.face, front: b.end }, cols: 6 });
    // parapet water tank
    const tx = b.side < 0 ? b.x0 + 3 : b.x1 - 4;
    e.box(tx, tx + 1.4, b.d0 + 3, b.d0 + 4.4, b.h, b.h + 1.3, '#2b2d42', { lw: 1.6 });
  }
  function drawBanner(bn) {
    const e = E();
    for (const s of [-1, 1]) e.box(s * 7.5 - 0.1, s * 7.5 + 0.1, bn.d - 0.1, bn.d + 0.1, 0, 6.4, '#495057', { lw: 1.4 });
    e.texQuad(bn.img, [[-7.4, bn.d, 6.3], [7.4, bn.d, 6.3], [7.4, bn.d, 4.5], [-7.4, bn.d, 4.5]], 1);
  }
  function drawVan(v, t) {
    const e = E(), Tx = T();
    e.box(v.x - 1, v.x + 1, v.d - 2.4, v.d + 2.4, 0.12, 2.3, '#f1f3f5', {
      tex: { left: Tx.vanSide, right: Tx.vanSide, front: v.dir > 0 ? Tx.vanRear : Tx.vanFront, back: v.dir > 0 ? Tx.vanFront : Tx.vanRear }, cols: 3,
    });
    const on = v.flash && Math.floor(t * 6) % 2;
    e.box(v.x - 0.65, v.x, v.d - 0.3, v.d + 0.3, 2.3, 2.55, on ? '#ff3b3b' : '#9b1d20', { lw: 1.5 });
    e.box(v.x, v.x + 0.65, v.d - 0.3, v.d + 0.3, 2.3, 2.55, on ? '#5a8dee' : '#3a86ff', { lw: 1.5 });
    if (v.flash) {
      const p = e.P(on ? v.x - 0.35 : v.x + 0.35, v.d - 0.3, 2.45);
      if (p) {
        const c = e.c, r = p.s * 1.6, g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, on ? 'rgba(255,60,60,.55)' : 'rgba(60,120,255,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
    }
  }
  function drawAuto(a) {
    const Tx = T();
    E().box(a.x - 0.7, a.x + 0.7, a.d - 1.3, a.d + 1.3, 0.05, 1.75, '#ffd60a', { tex: { front: Tx.autoRear, left: Tx.autoSide, right: Tx.autoSide }, cols: 2 });
  }
  function drawIsland(t) {
    const e = E(), c = e.c, ring = (r, h) => { const pts = []; for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; pts.push([Math.cos(a) * r, CHOWK + Math.sin(a) * r, h]); } return pts; };
    e.fillW(ring(ISLAND_R, 0), '#1f1f1f', e.EDGE, 2);
    e.fillW(ring(ISLAND_R - 0.05, 0.35), '#ffd23f', e.EDGE, 2);
    e.fillW(ring(ISLAND_R - 0.35, 0.36), '#5c9b3a');
    e.fillW(ring(2.6, 0.36), '#8d99ae', e.EDGE, 2);
    e.fillW(ring(2.3, 0.75), '#bfc6d1', e.EDGE, 2);
    e.fillW(ring(2.0, 0.76), '#4cc9f0');
    e.box(-0.3, 0.3, CHOWK - 0.3, CHOWK + 0.3, 0.75, 2.2, '#dee2e6', { lw: 1.6 });
    e.fillW(ring(1, 2.2), '#bfc6d1', e.EDGE, 2);
    // water jets
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, ph = (t * 1.6 + k * 0.1) % 1;
      for (let j = 1; j < 6; j++) {
        const u = j / 6, p = e.P(Math.cos(a) * (0.9 + u * 1.1), CHOWK + Math.sin(a) * (0.9 + u * 1.1), 2.3 + Math.sin(u * Math.PI) * 1.1 - u * 1.4);
        if (p) { c.fillStyle = `rgba(220,245,255,${0.85 - u * 0.4})`; c.beginPath(); c.arc(p.x, p.y, p.s * (0.07 + ((ph + u) % 1) * 0.05), 0, 7); c.fill(); }
      }
    }
    // tall tricolour
    e.box(-4.0, -3.85, CHOWK - 0.08, CHOWK + 0.08, 0.3, 13, '#ced4da', { lw: 1.4 });
    const fw = (u) => Math.sin(t * 3 + u * 5) * 0.35;
    ['#ff9933', '#ffffff', '#138808'].forEach((col, k) => {
      const pts = [];
      for (let u = 0; u <= 1.001; u += 0.2) pts.push([-3.85 + u * 4.2, CHOWK + fw(u), 12.9 - k * 0.8]);
      for (let u = 1; u >= -0.001; u -= 0.2) pts.push([-3.85 + u * 4.2, CHOWK + fw(u), 12.1 - k * 0.8]);
      e.fillW(pts, col, e.EDGE, 1.2);
    });
    const ch = e.P(-1.75, CHOWK + fw(0.5), 12.1);
    if (ch) { c.strokeStyle = '#000080'; c.lineWidth = Math.max(1, ch.s * 0.05); c.beginPath(); c.arc(ch.x, ch.y, ch.s * 0.3, 0, 7); c.stroke(); }
  }

  function drawBus(b) {
    const Tx = T();
    E().box(b.x0, b.x1, b.d0, b.d1, 0.12, 3.1, b.kind === 'dtc' ? '#d62828' : '#f1f3f5', {
      tex: { front: Tx.busSide[b.kind], back: Tx.busSide[b.kind], left: Tx.busEnd[b.kind], right: Tx.busEnd[b.kind] }, cols: 1,
    });
  }
  function drawCannon(cn, t) {
    const e = E(), Tx = T();
    e.box(cn.x - 1.2, cn.x + 1.2, cn.d - 3.3, cn.d + 3.3, 0.15, 2.9, '#1d3557', { tex: { left: Tx.cannon, right: Tx.cannon, front: Tx.busEnd.police }, cols: 3 });
    e.box(cn.x - 0.45, cn.x + 0.45, cn.d - 2.3, cn.d - 1.4, 2.9, 3.45, '#adb5bd', { lw: 1.6 });
    e.box(cn.x - 0.12, cn.x + 0.12, cn.d - 3.4, cn.d - 2.3, 3.15, 3.35, '#6c757d', { lw: 1.4 });
  }
  function drawTruck(tk) {
    const e = E(), Tx = T();
    e.box(tk.x - 1.2, tk.x + 1.2, tk.d - 3.2, tk.d + 3.2, 0.15, 3.0, '#5f6b3a', { tex: { left: Tx.truck, right: Tx.truck, front: Tx.truckEnd }, cols: 3 });
  }
  function drawTent(tn, part) {
    const e = E(), s = tn.side, xi = s * 8.0, xo = s * 11.3, a = Math.min(xi, xo), b = Math.max(xi, xo);
    if (part === 'back') {
      // fabric back wall + far valance + rear poles
      e.texQuad(tn.val, s > 0 ? [[xo, tn.d1, 3.0], [xo, tn.d0, 3.0], [xo, tn.d0, 0], [xo, tn.d1, 0]] : [[xo, tn.d0, 3.0], [xo, tn.d1, 3.0], [xo, tn.d1, 0], [xo, tn.d0, 0]], 3);
      for (const dd of [tn.d0, tn.d1]) e.box(xi - 0.07, xi + 0.07, dd - 0.07, dd + 0.07, 0, 2.6, '#8d6e48', { lw: 1.2 });
      e.texQuad(tn.val, [[a, tn.d1, 3.0], [b, tn.d1, 3.0], [b, tn.d1, 2.35], [a, tn.d1, 2.35]], 1);
    } else {
      e.texQuad(tn.val, [[a, tn.d0, 3.0], [b, tn.d0, 3.0], [b, tn.d0, 2.35], [a, tn.d0, 2.35]], 1);
      e.texQuad(tn.val, s > 0 ? [[xi, tn.d1, 3.0], [xi, tn.d0, 3.0], [xi, tn.d0, 2.35], [xi, tn.d1, 2.35]] : [[xi, tn.d0, 3.0], [xi, tn.d1, 3.0], [xi, tn.d1, 2.35], [xi, tn.d0, 2.35]], 4);
    }
  }
  function drawStage(st) {
    const e = E(), Tx = T();
    e.box(8.0, 11.3, st.d0, st.d1, 0, 1.0, '#6d4c41');
    e.texQuad(Tx.stage, [[11.3, st.d1, 4.6], [11.3, st.d0, 4.6], [11.3, st.d0, 1.0], [11.3, st.d1, 1.0]], 5);
    for (const dd of [st.d0 + 0.7, st.d1 - 0.7]) e.bill(Tx.speaker, 8.6, dd, 1.0, 0.9);
  }
  function drawFlag(f, t) {
    const e = E();
    e.box(f.x - 0.05, f.x + 0.05, f.d - 0.05, f.d + 0.05, 0, 4.6, '#6c757d', { lw: 1 });
    const pts = [], dir = -Math.sign(f.x);
    for (let u = 0; u <= 1.001; u += 0.25) pts.push([f.x + dir * u * 1.4, f.d + Math.sin(t * 4 + u * 4) * 0.15, 4.5 - u * 0.4]);
    pts.push([f.x, f.d, 3.7]);
    e.fillW(pts, f.col, e.EDGE, 1.2);
  }
  function drawCone(cn) {
    const e = E(), p = e.P(cn.x, cn.d, 0);
    if (!p) return;
    const c = e.c, w = p.s * 0.22, h = p.s * 0.55;
    c.beginPath(); c.moveTo(p.x - w, p.y); c.lineTo(p.x - w * 0.18, p.y - h); c.lineTo(p.x + w * 0.18, p.y - h); c.lineTo(p.x + w, p.y); c.closePath();
    c.fillStyle = '#ff6b1a'; c.fill(); c.lineWidth = 1.5 * e.dpr; c.strokeStyle = e.EDGE; c.stroke();
    c.fillStyle = '#fff'; c.fillRect(p.x - w * 0.55, p.y - h * 0.55, w * 1.1, h * 0.16);
  }

  // Jantar Mantar compound
  function drawGate() {
    const e = E(), red = '#c0563b';
    for (const s of [-1, 1]) {
      e.box(s * 7.6 - 0.8, s * 7.6 + 0.8, GOAL - 0.8, GOAL + 0.8, 0, 6, red);
      e.box(s * 7.6 - 1, s * 7.6 + 1, GOAL - 1, GOAL + 1, 6, 6.5, '#f3e4c8');
    }
    e.box(-8.6, 8.6, GOAL - 0.7, GOAL + 0.7, 6.5, 8.8, red);
    e.texQuad(T().gate, [[-5.6, GOAL - 0.72, 8.6], [5.6, GOAL - 0.72, 8.6], [5.6, GOAL - 0.72, 6.7], [-5.6, GOAL - 0.72, 6.7]], 1);
    e.box(-9, 9, GOAL - 0.9, GOAL + 0.9, 8.8, 9.2, '#f3e4c8');
  }
  function drawWall(s, d0, d1) { E().box(s < 0 ? -12.6 : 11.6, s < 0 ? -11.6 : 12.6, d0, d1, 0, 2.6, '#c96f53'); E().box(s < 0 ? -12.75 : 11.45, s < 0 ? -11.45 : 12.75, d0, d1, 2.6, 2.9, '#f3e4c8', { lw: 1.4 }); }
  function drawSamrat() {
    const e = E(), red = '#c65d3b', cream = '#f4e6cc', d0 = 590, d1 = 632, top = 24;
    e.box(-15, 15, d0 - 4, d1 + 4, 0, 0.7, '#b5543c');
    // quadrant wings
    for (const s of [-1, 1]) {
      const cx = s * 3, R = 8.5, ch = R + 0.7, dd0 = 606, dd1 = 618, arc = [];
      for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * (Math.PI / 2); arc.push([cx + s * Math.cos(a) * R, Math.sin(a) * R + ch]); }
      e.fillW([...arc.map(([x, h]) => [x, dd0, h]), [cx + s * R, dd0, 0.7], [cx, dd0, 0.7]], red, e.EDGE, 2);
      for (let k = 0; k < 12; k++) {
        const [xa, ha] = arc[k], [xb, hb] = arc[k + 1];
        e.fillW([[xa, dd0, ha], [xb, dd0, hb], [xb, dd1, hb], [xa, dd1, ha]], k % 2 ? cream : '#e9d5b0', 'rgba(29,20,36,.5)', 1);
      }
    }
    // gnomon (giant right-triangle with a staircase)
    for (const x of [-3, 3]) if ((x < 0 && e.cam.x < x) || (x > 0 && e.cam.x > x)) e.fillW([[x, d0, 0.7], [x, d1, 0.7], [x, d1, top]], x < 0 ? '#d36d4b' : '#a94a2e', e.EDGE, 2.4);
    e.fillW([[-3, d0, 0.7], [3, d0, 0.7], [3, d1, top], [-3, d1, top]], red, e.EDGE, 2.4);
    for (let k = 1; k < 26; k++) {
      const u = k / 26;
      e.fillW([[-2.2, d0 + (d1 - d0) * u, 0.7 + (top - 0.7) * u], [2.2, d0 + (d1 - d0) * u, 0.7 + (top - 0.7) * u], [2.2, d0 + (d1 - d0) * u + 0.35, 0.7 + (top - 0.7) * u], [-2.2, d0 + (d1 - d0) * u + 0.35, 0.7 + (top - 0.7) * u]], cream);
    }
    e.box(-3.3, 3.3, d1 - 1, d1 + 0.6, top - 0.6, top + 1.4, cream);
  }
  function drawRamYantra(x, d) {
    const e = E(), c = e.c, b = e.P(x, d, 0), tp = e.P(x, d, 6);
    if (!b || !tp) return;
    const w = 2.8 * b.s, h = b.y - tp.y;
    const g = c.createLinearGradient(b.x - w, 0, b.x + w, 0);
    g.addColorStop(0, '#e07a55'); g.addColorStop(0.5, '#c65d3b'); g.addColorStop(1, '#8f3b22');
    c.fillStyle = g; c.fillRect(b.x - w, tp.y, w * 2, h);
    c.fillStyle = '#5a1f12';
    for (let k = 0; k < 4; k++) {
      const ax = b.x - w + w * 0.18 + k * w * 0.46, aw = w * 0.26;
      c.fillRect(ax, tp.y + h * 0.35, aw, h * 0.55);
      c.beginPath(); c.arc(ax + aw / 2, tp.y + h * 0.35, aw / 2, Math.PI, 0); c.fill();
    }
    c.strokeStyle = e.EDGE; c.lineWidth = 2.4 * e.dpr; c.strokeRect(b.x - w, tp.y, w * 2, h);
    c.fillStyle = '#f4e6cc'; c.beginPath(); c.ellipse(b.x, tp.y, w * 1.05, w * 0.22, 0, 0, 7); c.fill(); c.stroke();
  }

  // ---------- full frame ----------
  let post = null;
  function makePost(W2, H2) {
    const cv = document.createElement('canvas'), s = 0.5; // half-res is plenty for soft gradients
    cv.width = Math.max(1, Math.round(W2 * s)); cv.height = Math.max(1, Math.round(H2 * s));
    const c = cv.getContext('2d'), w = cv.width, h = cv.height;
    const lk = c.createRadialGradient(w * 0.12, 0, 0, w * 0.12, 0, h * 0.9);
    lk.addColorStop(0, 'rgba(255,190,110,.18)'); lk.addColorStop(1, 'rgba(255,190,110,0)');
    c.fillStyle = lk; c.fillRect(0, 0, w, h);
    const vg = c.createRadialGradient(w / 2, h * 0.55, h * 0.35, w / 2, h * 0.55, h * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,25,5,.38)');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
    return { cv, w: W2, h: H2 };
  }
  function render(W, t, dyn) {
    const e = E(), c = e.c, cd = e.cam.d, fogA = (d) => e.fog(e.depth(d));
    drawSky(t);
    drawGround(W, t);

    // cast shadows (sun low, front-left): one union path so overlaps don't double-darken
    if (JM.quality.shadows) {
    c.beginPath();
    const addPoly = (pts) => { const sp = e.polyW(pts); if (!sp) return; c.moveTo(sp[0][0], sp[0][1]); for (let i = 1; i < sp.length; i++) c.lineTo(sp[i][0], sp[i][1]); c.closePath(); };
    for (const b of W.blds) if (b.side < 0 && b.d1 > cd && b.d0 < cd + 80) {
      const dx = b.h * 0.6, dd = -b.h * 0.22;
      addPoly([[b.x1, b.d0, 0.01], [b.x1, b.d1, 0.01], [b.x1 + dx, b.d1 + dd, 0.01], [b.x1 + dx, b.d0 + dd, 0.01]]);
    }
    for (const bs of W.buses) if (bs.d1 > cd && bs.d0 < cd + 80) addPoly([[bs.x0, bs.d0, 0.01], [bs.x1, bs.d0, 0.01], [bs.x1 + 1.9, bs.d0 - 0.7, 0.01], [bs.x0 + 1.9, bs.d0 - 0.7, 0.01]]);
    for (const tk of W.trucks) if (tk.d > cd && tk.d < cd + 80) addPoly([[tk.x + 1.2, tk.d - 3.2, 0.01], [tk.x + 1.2, tk.d + 3.2, 0.01], [tk.x + 3, tk.d + 2.5, 0.01], [tk.x + 3, tk.d - 3.9, 0.01]]);
    for (const v of W.vans) if (v.d > cd && v.d < cd + 80) addPoly([[v.x + 1, v.d - 2.4, 0.01], [v.x + 1, v.d + 2.4, 0.01], [v.x + 2.4, v.d + 1.9, 0.01], [v.x + 2.4, v.d - 2.9, 0.01]]);
    c.fillStyle = 'rgba(48,24,58,.24)'; c.fill();
    }

    // contact shadows
    for (const o of dyn) if (o.shadow) e.shadow(o.x + 0.25, o.d - 0.1, o.shadow, 0.38 * fogA(o.d));
    for (const v of W.vans) if (v.d > cd && v.d < cd + FAR) e.shadow(v.x + 0.3, v.d, 1.6, 0.35 * fogA(v.d), 2.6);
    for (const g of W.guards) if (g.d > cd && g.d < cd + 50) e.shadow(g.x + 0.25, g.d - 0.1, 0.5, 0.3);
    for (const b of W.buses) if (b.d1 > cd && b.d0 < cd + FAR) e.shadow((b.x0 + b.x1) / 2 + 0.4, b.d0 + 1.3, (b.x1 - b.x0) * 0.6, 0.3, 1.8);
    for (const tr of W.trees) if (tr.d > cd && tr.d < cd + 60) { e.shadow(tr.x + 2.2, tr.d - 0.8, 3.4, 0.22, 1.8); e.shadow(tr.x + 0.2, tr.d, 0.6, 0.3); }

    // buildings and walls (always behind road-level objects; see notes)
    const blds = W.blds.filter((b) => b.d1 > cd + 0.5 && b.d0 < cd + FAR).sort((a, b) => e.depth(b.d0) - e.depth(a.d0));
    for (const b of blds) { c.globalAlpha = fogA(b.d0); drawBld(b); }
    if (cd + FAR > 500) for (const s of [-1, 1]) { c.globalAlpha = fogA(500); drawWall(s, 500, GOAL - 1); drawWall(s, GOAL + 1, 700); }
    c.globalAlpha = 1;

    // depth-sorted world objects
    const L = [];
    const vis = (d) => d > cd + 0.6 && d < cd + FAR;
    for (const tr of W.trees) if (vis(tr.d)) L.push({ d: tr.d, f: () => e.bill(tr.img, tr.x, tr.d, 0, 6.6, { alpha: fogA(tr.d) }) });
    for (const l of W.lamps) if (vis(l.d)) L.push({ d: l.d, f: () => e.bill(T().lamp, l.x, l.d, 0, 2.1, { alpha: fogA(l.d) }) });
    for (const s of W.stalls) if (vis(s.d)) L.push({ d: s.d, f: () => e.bill(T().chai, s.x, s.d, 0, 3.2, { alpha: fogA(s.d) }) });
    for (const bn of W.banners) if (vis(bn.d)) L.push({ d: bn.d, f: () => { const z = e.depth(bn.d); c.globalAlpha = Math.min(fogA(bn.d), Math.max(0, Math.min(1, (z - 8) / 6))); if (c.globalAlpha > 0.02) drawBanner(bn); c.globalAlpha = 1; } });
    for (const b of W.bars) if (vis(b.d)) L.push({ d: b.d - 0.22, f: () => { c.globalAlpha = fogA(b.d); e.box(b.x - 1.18, b.x + 1.18, b.d - 0.22, b.d + 0.22, 0, 1.05, '#ffcc00', { tex: { front: T().barricade, back: T().barricade } }); c.globalAlpha = 1; } });
    for (const v of W.vans) if (vis(v.d + 2.4)) L.push({ d: v.d - 2.4, f: () => { c.globalAlpha = fogA(v.d); drawVan(v, t); c.globalAlpha = 1; } });
    for (const b of W.buses) if (vis(b.d1)) L.push({ d: b.d0, f: () => { c.globalAlpha = fogA(b.d0); drawBus(b); c.globalAlpha = 1; } });
    for (const tk of W.trucks) if (vis(tk.d + 3)) L.push({ d: tk.d - 3.2, f: () => { c.globalAlpha = fogA(tk.d); drawTruck(tk); c.globalAlpha = 1; } });
    for (const cn of W.cannons) if (vis(cn.d + 3)) L.push({ d: cn.d - 3.3, f: () => { c.globalAlpha = fogA(cn.d); drawCannon(cn, t); c.globalAlpha = 1; } });
    for (const tn of W.tents) if (vis(tn.d1) || vis(tn.d0)) { L.push({ d: tn.d1, f: () => { c.globalAlpha = fogA(tn.d0); drawTent(tn, 'back'); c.globalAlpha = 1; } }); L.push({ d: tn.d0 - 0.05, f: () => { c.globalAlpha = fogA(tn.d0); drawTent(tn, 'front'); c.globalAlpha = 1; } }); }
    if (W.stage && (vis(W.stage.d0) || vis(W.stage.d1))) L.push({ d: W.stage.d1, f: () => { c.globalAlpha = fogA(W.stage.d0); drawStage(W.stage); c.globalAlpha = 1; } });
    for (const f of W.flags) if (vis(f.d)) L.push({ d: f.d, f: () => { c.globalAlpha = fogA(f.d); drawFlag(f, t); c.globalAlpha = 1; } });
    for (const cn of W.cones) if (vis(cn.d) && cn.d < cd + 70) L.push({ d: cn.d, f: () => drawCone(cn) });
    for (const g of W.guards) if (vis(g.d) && g.d < cd + 75) L.push({ d: g.d, f: () => e.sprite(JM.sprites.get(g.look, 'front', 'idle', Math.floor(t * 3 + g.t) % JM.sprites.FRAMES), g.x, g.d, 0, { alpha: fogA(g.d) }) });
    for (const a of W.autos) if (vis(a.d)) L.push({ d: a.d - 1.3, f: () => { c.globalAlpha = fogA(a.d); drawAuto(a); c.globalAlpha = 1; } });
    for (const p of W.crowd) if (vis(p.d) && p.d < cd + JM.quality.crowdRange) L.push({ d: p.d, f: () => e.sprite(JM.sprites.get(p.look, 'front', 'cheer', Math.floor(t * 8 + p.t * 3) % JM.sprites.FRAMES), p.x, p.d, p.h || 0, { alpha: fogA(p.d) }) });
    if (vis(CHOWK)) L.push({ d: CHOWK - ISLAND_R, f: () => drawIsland(t) });
    if (cd + FAR > GOAL) {
      L.push({ d: GOAL - 1, f: drawGate });
      L.push({ d: 590, f: () => { c.globalAlpha = fogA(590); drawSamrat(); c.globalAlpha = 1; } });
      for (const s of [-1, 1]) L.push({ d: 600, f: () => { c.globalAlpha = fogA(600); drawRamYantra(s * 8.5, 600); c.globalAlpha = 1; } });
    }
    for (const o of dyn) L.push(o);
    L.sort((a, b) => b.d - a.d);
    for (const o of L) o.f();
    c.globalAlpha = 1;

    // atmospheric haze near the horizon + warm light leak
    const W2 = e.W, H2 = e.H, hy2 = e.horizonY();
    const hz = c.createLinearGradient(0, hy2 - H2 * 0.08, 0, hy2 + H2 * 0.22);
    hz.addColorStop(0, 'rgba(255,222,180,0)'); hz.addColorStop(0.35, 'rgba(255,214,168,.38)'); hz.addColorStop(1, 'rgba(255,214,168,0)');
    c.fillStyle = hz; c.fillRect(0, 0, W2, H2);
    // light leak + vignette never change for a given screen size: pre-render once, blit each frame
    if (!post || post.w !== W2 || post.h !== H2) post = makePost(W2, H2);
    c.drawImage(post.cv, 0, 0, W2, H2);
  }

  return { build, blocked, render, LANES, ROAD, GOAL, CHOWK, ISLAND_R };
})();
