/* द जंतर मंतर रन — state, input, AI, juice, screens and analytics. */
(() => {
  'use strict';
  const S = JM.sprites, E = JM.engine, WD = JM.world, A = JM.audio;
  const LANES = WD.LANES, GOAL = WD.GOAL, TAU = Math.PI * 2;
  const RUN = 11, BACK = 6, JUMP_V = 8.4, GRAV = 26, DETAIN_MS = 5000, CAPTURE = 5;
  const $ = (q) => document.querySelector(q);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const isHindi = (s) => /[ऀ-ॿ]/.test(s);
  const track = (name, params) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (_) {} };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  const ui = {
    title: $('#title'), select: $('#select'), detained: $('#detained'), over: $('#over'), won: $('#won'),
    hud: $('#hud'), pad: $('#pad'), cards: $('#cards'), count: $('#count'),
    hpWrap: $('#hpWrap'), hpTxt: $('#hpTxt'), runner: $('#runner'), progFill: $('#progFill'), dist: $('#dist'),
    timer: $('#timer'), vans: $('#vans'), mute: $('#mute'), overTxt: $('#overTxt'), winStats: $('#winStats'),
  };
  const show = (el, on = true) => el.classList.toggle('hidden', !on);

  let mode = 'boot', modeT = 0, clock = 0;
  let char = S.CHARS.find((c) => c.id === store.get('cjm_char')) || S.CHARS[0];
  let W = null, P = null, G = null;
  let flashPhoto = 0, parts = [], pops = [], shake = 0, flash = 0, attempts = 0, attractD = 20, lastTimer = '', hover = -1;
  const camS = { x: 0, d: 0, h: 5.6, p: 0.36 };
  const inp = { up: false, down: false, left: false, right: false, jumpQ: false };
  const SIDE = 8.5, EDGE = 6.4;
  const setMode = (m) => { mode = m; modeT = 0; };
  let HZ = null; // water cannons + tear gas (js/hazards.js)
  const progress = () => (P ? clamp((P.d - 6) / (GOAL - 6), 0, 1) : 0);
  const pct = () => Math.round(progress() * 100);

  // ---------- muting ----------
  let muted = store.get('cjm_muted') === '1';
  A.setMuted(muted); ui.mute.classList.toggle('off', muted);
  ui.mute.addEventListener('click', () => { muted = !muted; A.setMuted(muted); store.set('cjm_muted', muted ? '1' : '0'); ui.mute.classList.toggle('off', muted); });

  // ---------- effects ----------
  function puff(x, d, n, col = '#eedcbc') {
    for (let i = 0; i < n; i++) parts.push({ type: 'dust', x: x + rand(-0.3, 0.3), d: d + rand(-0.2, 0.2), h: 0.1, vx: rand(-1.4, 1.4), vd: rand(-0.9, 0.9), vh: rand(0.2, 1.4), life: 0, max: rand(0.45, 0.75), size: rand(0.18, 0.32), col });
  }
  function stars(x, d, h, n) {
    for (let i = 0; i < n; i++) parts.push({ type: 'star', x, d, h, vx: rand(-3, 3), vd: rand(-1.5, 1.5), vh: rand(2.5, 5.5), life: 0, max: rand(0.6, 0.9), size: rand(0.16, 0.26), rot: rand(0, 6), col: Math.random() < 0.5 ? '#ffd23f' : '#ffffff' });
  }
  function debris(x, d) {
    for (let i = 0; i < 14; i++) parts.push({ type: 'debris', x: x + rand(-1, 1), d, h: rand(0.2, 1), vx: rand(-4, 4), vd: rand(-6, -1), vh: rand(3, 7), life: 0, max: 1.1, size: rand(0.15, 0.3), rot: rand(0, 6), col: i % 2 ? '#ffcc00' : '#151515' });
  }
  function petals(n, d0) {
    for (let i = 0; i < n; i++) parts.push({ type: 'petal', x: rand(-8, 8), d: d0 + rand(-6, 10), h: rand(4, 11), vx: 0, vd: 0, vh: rand(-1.8, -1), life: 0, max: rand(4, 7), size: rand(0.11, 0.17), rot: rand(0, 6), seed: rand(0, 6), col: ['#ff9f1c', '#ffbf00', '#f77f00', '#e63946'][i % 4] });
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      if (p.type === 'petal') { p.vx = Math.sin(p.life * 2.4 + p.seed) * 1.1; p.rot += dt * 4; }
      else if (p.type === 'dust') { p.vx *= 0.92; p.vd *= 0.92; p.vh *= 0.9; }
      else { p.vh -= 14 * dt; p.rot += dt * 9; }
      p.x += p.vx * dt; p.d += p.vd * dt; p.h += p.vh * dt;
      if (p.h < 0 && p.type !== 'dust') { p.h = 0; p.vh *= -0.3; p.vx *= 0.5; p.vd *= 0.5; }
      if (p.life > p.max) parts.splice(i, 1);
    }
  }
  function drawPart(p) {
    const q = E.P(p.x, p.d, p.h);
    if (!q) return;
    const c = E.c, k = p.life / p.max, r = q.s * p.size;
    c.save();
    c.globalAlpha = p.type === 'dust' ? (1 - k) * 0.75 : k > 0.8 ? (1 - k) * 5 : 1;
    c.translate(q.x, q.y);
    if (p.type === 'dust') { c.fillStyle = p.col; c.beginPath(); c.arc(0, 0, r * (1 + k * 1.6), 0, TAU); c.fill(); }
    else if (p.type === 'star') {
      c.rotate(p.rot); c.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.4 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fillStyle = p.col; c.fill(); c.lineWidth = 1.5 * E.dpr; c.strokeStyle = E.OUT; c.stroke();
    } else if (p.type === 'petal') { c.rotate(p.rot); c.fillStyle = p.col; c.beginPath(); c.ellipse(0, 0, r, r * 0.55, 0, 0, TAU); c.fill(); }
    else { c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-r, -r * 0.5, r * 2, r); }
    c.restore();
  }

  function pop(kind, text, x, d, h, o = {}) { pops.push({ kind, text, x, d, h: o.h || h, obj: o.obj, t: 0, max: o.max || 1.1, col: o.col || '#ffffff', bg: o.bg || '#ffd23f', size: o.size || 1 }); }
  const popCenter = (text, o = {}) => { pops = pops.filter((p) => p.kind !== 'center'); pop('center', text, 0, 0, 0, o); };
  function drawPops(dt) {
    const c = E.c, dpr = E.dpr;
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += dt;
      if (p.t > p.max) { pops.splice(i, 1); continue; }
      const k = p.t / p.max, ein = Math.min(1, p.t / 0.16), sc = ein < 1 ? 0.4 + 0.75 * Math.sin(ein * Math.PI * 0.6) : 1;
      let x, y, px;
      if (p.kind === 'center') { x = E.W / 2; y = E.H * 0.36; px = Math.min(E.H * 0.16, E.W * 0.14) * p.size; }
      else {
        const q = p.obj ? E.P(p.obj.x, p.obj.d, p.h) : E.P(p.x, p.d, p.h);
        if (!q) continue;
        x = q.x; y = q.y - k * 40 * dpr; px = clamp(q.s * 0.5, 20 * dpr, 60 * dpr) * p.size;
      }
      px *= sc;
      c.save();
      c.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      c.translate(x, y); c.rotate(p.kind === 'bubble' ? 0 : -0.08);
      c.font = `${px}px ${isHindi(p.text) ? '"Yatra One"' : '"Bangers"'}, Impact, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = c.measureText(p.text).width;
      if (p.kind === 'burst') {
        const R = tw * 0.62 + px * 0.5;
        c.beginPath();
        for (let j = 0; j < 22; j++) { const a = (j / 22) * TAU, rr = j % 2 ? R * 0.72 : R; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.62); }
        c.closePath(); c.fillStyle = p.bg; c.fill(); c.lineWidth = 4 * dpr; c.strokeStyle = E.OUT; c.stroke();
      } else if (p.kind === 'bubble') {
        const bw = tw + px * 0.8, bh = px * 1.25;
        c.beginPath(); if (c.roundRect) c.roundRect(-bw / 2, -bh / 2, bw, bh, bh * 0.4); else c.rect(-bw / 2, -bh / 2, bw, bh);
        c.moveTo(-px * 0.2, bh / 2); c.lineTo(-px * 0.5, bh / 2 + px * 0.5); c.lineTo(px * 0.15, bh / 2);
        c.fillStyle = '#fff'; c.fill(); c.lineWidth = 3 * dpr; c.strokeStyle = E.OUT; c.stroke();
      }
      c.lineJoin = 'round';
      c.lineWidth = px * (p.kind === 'center' ? 0.2 : 0.16); c.strokeStyle = E.OUT;
      if (p.kind === 'center') { c.fillStyle = E.OUT; c.fillText(p.text, px * 0.06, px * 0.08); }
      if (p.kind !== 'bubble') c.strokeText(p.text, 0, 0);
      c.fillStyle = p.kind === 'bubble' ? E.OUT : p.col; c.fillText(p.text, 0, 0);
      c.restore();
    }
  }
  function speedLines() {
    if (!P || mode !== 'play' || P.vd < 9.5) return;
    const c = E.c, cx = E.W / 2, cy = E.H * 0.55, r0 = Math.max(E.W, E.H) * 0.42;
    c.save(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = rand(0, TAU), l = rand(0.1, 0.25) * r0;
      c.lineWidth = rand(1.5, 4) * E.dpr;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * (r0 + l), cy + Math.sin(a) * (r0 + l)); c.stroke();
    }
    c.restore();
  }

  // ---------- media crew on the footpath (pure atmosphere: never touches the player) ----------
  const media = {
    d: 14, v: 0, gap: 4.5, phase: 'run', pt: 0, talk: 2.5, next: 18,
    rep: { x: -9.5, d: 14, th: 2.25, look: S.MEDIA[0], rot: 0 },
    cam: { x: -7.75, d: 12, th: 2.25, look: S.MEDIA[1], rot: 0 },
    cops: [{ x: -7.7, d: 8, look: S.POLICE[0] }, { x: -8.7, d: 6, look: S.POLICE[1] }],
  };
  const LINES = {
    rep: ['Live from Jantar Mantar!', 'Bhaiya, ek sawaal!', 'Parth, camera chalu rakh!', 'Dekhiye kya ho raha hai!', 'Subscribe kar lena!'],
    cam: ['Rolling!', 'Battery 10%!', 'Focus aa gaya!', 'Sir, peeche police!'],
    cop: ['Camera band karo!', 'Permission hai?', 'Oye reporter!'],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  function resetMedia(ref) { media.d = Math.max(8, ref - 14); media.gap = 4.5; media.phase = 'run'; media.pt = 0; }
  const INTERVIEW = {
    rep: ['Aapko kyun pakda ja raha hai?', 'Kuch kehna chahenge?', 'Ye dekhiye, seedha van mein!', 'Sir, ek byte de dijiye!', 'Loktantra LIVE!'],
    cam: ['Zoom in kar raha hoon!', 'Sab record ho raha hai!', 'Frame mein aao!'],
    cop: ['Camera band karo!', 'Peeche hato!', 'Koi interview nahi!'],
  };
  function updateMedia(dt) {
    if (P && G && G.captors && (mode === 'detaining' || mode === 'detained')) {
      // rush in: Samdish beyond the player facing the camera with the mic out, Parth filming from our side
      const f = G.from, s = G.side, a = Math.min(1, dt * 2.6);
      media.rep.x = lerp(media.rep.x, clamp(f.x + s * 1.6, -7, 7), a); media.rep.d = lerp(media.rep.d, f.d + 1.6, a);
      media.cam.x = lerp(media.cam.x, clamp(f.x + s * 2.4, -7, 7), a); media.cam.d = lerp(media.cam.d, f.d - 1.9, a);
      media.d = media.rep.d; media.v = 1; media.phase = 'run'; media.gap = lerp(media.gap, 6, a);
      media.cops[0].d = media.cam.d - media.gap; media.cops[1].d = media.cam.d - media.gap - 1.7;
      G.media -= dt;
      if (G.media <= 0 && modeT > (mode === 'detaining' ? 0.8 : 0)) {
        G.media = 1.5 + Math.random() * 0.6;
        const r = Math.random();
        if (r < 0.55) pop('bubble', pick(INTERVIEW.rep), 0, 0, 0, { obj: media.rep, max: 1.4, size: 0.7, h: 3 });
        else if (r < 0.8) pop('bubble', pick(INTERVIEW.cam), 0, 0, 0, { obj: media.cam, max: 1.3, size: 0.7, h: 3 });
        else pop('bubble', pick(INTERVIEW.cop), 0, 0, 0, { obj: G.captors[0], max: 1.3, size: 0.7, h: 2.6 });
      }
      if (Math.random() < dt * 1.2) { flashPhoto = 0.35; }
      return;
    }
    media.rep.x = lerp(media.rep.x, -9.5, Math.min(1, dt * 2)); media.cam.x = lerp(media.cam.x, -7.75, Math.min(1, dt * 2));
    const ref = P ? P.d : E.cam.d + 8;
    const target = clamp(ref + 10 + Math.sin(clock * 0.35) * 3, 8, GOAL - 4);
    if (Math.abs(target - media.d) > 45) resetMedia(ref);
    media.v = clamp((target - media.d) * 2.2, 0, 13); // never moonwalk: wait for the player instead
    media.pt += dt; media.next -= dt; media.talk -= dt;
    let gapT = 4.5 + Math.sin(clock * 0.9) * 0.8;
    if (media.phase === 'run' && media.next <= 0 && Math.abs(media.d - ref) < 25) {
      media.phase = 'caught'; media.pt = 0;
      pop('burst', 'CAMERA BAND KARO!', 0, 0, 2.5, { obj: media.cops[0], bg: '#4cc9f0', max: 1.6, size: 0.75 });
      A.whistle();
    }
    if (media.phase === 'caught') {
      gapT = 0.5; media.v *= 0.25;
      media.cam.rot = Math.sin(media.pt * 18) * 0.15;
      if (media.pt > 0.7 && !media.said) { media.said = true; pop('bubble', 'PRESS HAI BHAI, PRESS!', 0, 0, 2.6, { obj: media.rep, max: 1.4, size: 0.75 }); }
      if (media.pt > 2.2) {
        media.phase = 'escape'; media.pt = 0; media.said = false; media.cam.rot = 0;
        pop('burst', 'BHAAGO PARTH!', 0, 0, 2.6, { obj: media.rep, bg: '#ffd23f', max: 1.2, size: 0.75 });
        puff(media.cam.x, media.cam.d, 8);
      }
    } else if (media.phase === 'escape') {
      gapT = 8; media.v = Math.max(media.v, 9);
      if (media.pt > 2.5) { media.phase = 'run'; media.next = 18 + Math.random() * 12; }
    } else if (media.talk <= 0 && Math.abs(media.d - ref) < 30) {
      media.talk = 3.5 + Math.random() * 3;
      const who = Math.random();
      if (who < 0.5) pop('bubble', pick(LINES.rep), 0, 0, 2.6, { obj: media.rep, max: 1.6, size: 0.7, h: 3 });
      else if (who < 0.8) pop('bubble', pick(LINES.cam), 0, 0, 2.6, { obj: media.cam, max: 1.4, size: 0.7, h: 3 });
      else pop('bubble', pick(LINES.cop), 0, 0, 2.5, { obj: media.cops[0], max: 1.4, size: 0.7 });
    }
    media.d += media.v * dt;
    media.gap = lerp(media.gap, gapT, Math.min(1, dt * 3));
    const sm = Math.min(1, dt * 6);
    media.rep.d = lerp(media.rep.d, media.d, sm); media.cam.d = lerp(media.cam.d, media.d - 3.4, sm);
    media.cops[0].d = media.cam.d - media.gap; media.cops[1].d = media.cam.d - media.gap - 1.7;
  }
  function tag(o, text, col) {
    const q = E.P(o.x, o.d, o.th || 2.15);
    if (!q || q.z > 45) return;
    const c = E.c, px = clamp(q.s * 0.17, 9 * E.dpr, 18 * E.dpr);
    c.save();
    c.font = `${px}px "Bangers", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const w = c.measureText(text).width + px * 0.9, h = px * 1.35;
    c.globalAlpha = E.fog(q.z);
    c.fillStyle = col; c.strokeStyle = E.OUT; c.lineWidth = 2 * E.dpr;
    c.beginPath(); if (c.roundRect) c.roundRect(q.x - w / 2, q.y - h, w, h, h / 3); else c.rect(q.x - w / 2, q.y - h, w, h); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.fillText(text, q.x, q.y - h / 2 + px * 0.05);
    c.restore();
  }
  function mediaDyn(L, cd) {
    const moving = media.v > 0.5 || media.phase !== 'run';
    const run = Math.floor(clock * 11) % S.FRAMES, idle = Math.floor(clock * 3) % S.FRAMES;
    const add = (o, facing, label, col) => {
      if (o.d < cd + 0.8 || o.d > cd + 80) return;
      L.push({ x: o.x, d: o.d, shadow: 0.5, f: () => {
        E.sprite(S.get(o.look, facing, moving ? 'walk' : 'idle', moving ? run : idle), o.x, o.d, 0, { rot: o.rot || 0, alpha: E.fog(E.depth(o.d)) });
        if (label) tag(o, label, col);
      } });
    };
    add(media.rep, 'front', 'SAMDISH · UNFILTERED', '#e63946');
    add(media.cam, 'back', 'CAMERA PERSON PARTH', '#2b2d42');
    media.cops[0].x = -7.7; media.cops[1].x = -8.7;
    media.cops.forEach((cop) => add(cop, 'back'));
  }

  // ---------- run lifecycle ----------
  function startRun() {
    A.init();
    W = WD.build((Math.random() * 1e9) | 0);
    HZ.reset(W);
    P = { lane: 2, x: 0, vx: 0, d: 6, z: 0, vz: 0, vd: 0, inv: 0, sx: 1, sy: 1, phase: 0, tilt: 0, rot: 0, kb: 0, kbx: 0, kbd: 0, gas: 0, facing: 'back', hidden: false, walk: false, cheer: false, bumpCD: 0 };
    G = { health: 100, cause: 'stick', detentions: 0, hits: 0, time: 0, until: 0, van: null, catcher: null, from: null, almost: false, half: false, shown: 0 };
    parts = []; pops = []; shake = 0; flash = 0;
    inp.up = inp.down = inp.left = inp.right = inp.jumpQ = false;
    attempts++;
    resetMedia(6); media.next = 12;
    [ui.title, ui.select, ui.detained, ui.over, ui.won].forEach((el) => show(el, false));
    show(ui.hud); show(ui.pad);
    camS.x = 0; camS.d = P.d - 8.2; camS.h = 5.4; camS.p = 0.38;
    updateHud();
    A.start();
    setMode('count');
    track('game_start', { character: char.id, attempt: attempts });
    if (counters.plays) counters.plays.hit();
  }
  function goTitle() {
    setMode('title'); P = null;
    [ui.select, ui.detained, ui.over, ui.won, ui.hud, ui.pad].forEach((el) => show(el, false));
    show(ui.title);
  }
  function goSelect() {
    A.init(); A.start(); A.duck(true);
    setMode('select'); P = null;
    [ui.title, ui.detained, ui.over, ui.won, ui.hud, ui.pad].forEach((el) => show(el, false));
    show(ui.select);
  }

  function updateHud() {
    ui.hpWrap.style.setProperty('--hp', G.health / 100);
    ui.hpWrap.classList.toggle('low', G.health <= 50);
    ui.hpTxt.textContent = G.health + '%';
    ui.vans.textContent = '×' + G.detentions;
  }
  function hudFrame() {
    if (!G) return;
    const pr = progress();
    ui.progFill.style.transform = `scaleX(${pr.toFixed(3)})`;
    ui.runner.style.left = (pr * 100).toFixed(1) + '%';
    const ts = G.time.toFixed(1) + 's';
    if (ts !== lastTimer) { ui.timer.textContent = ts; lastTimer = ts; ui.dist.textContent = Math.max(0, Math.round((GOAL - P.d) * 2)) + 'm'; }
  }

  // ---------- player ----------
  // swipe = quick sideways dash
  function nudge(dir) {
    if (mode !== 'play' || !P) return;
    P.vx = dir * SIDE * 1.4;
    puff(P.x, P.d, 3);
  }
  function bump() {
    if (P.bumpCD > 0) return;
    P.bumpCD = 0.4; shake = Math.max(shake, 0.12); A.thak(); puff(P.x, P.d + 0.4, 5);
  }
  function updatePlayer(dt) {
    P.inv = Math.max(0, P.inv - dt); P.bumpCD = Math.max(0, P.bumpCD - dt);
    P.gas = Math.max(0, (P.gas || 0) - dt);
    const slow = P.gas > 0 ? 0.55 : 1; // coughing in tear gas
    const target = (inp.up ? RUN * char.speed : inp.down ? -BACK : 0) * slow;
    P.vd += (target - P.vd) * Math.min(1, dt * (target ? 6 : 9));
    const nd = clamp(P.d + P.vd * dt, 2, GOAL + 2);
    if (!WD.blocked(W, P.x, nd, P.z)) P.d = nd;
    else { if (Math.abs(P.vd) > 3) bump(); P.vd = 0; }
    // free sideways movement: accelerate while held, glide to a stop on release
    const sx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    P.vx += (sx * SIDE * slow - P.vx) * Math.min(1, dt * (sx ? 9 : 7));
    if (Math.abs(P.vx) < 0.02) P.vx = 0;
    const nx = clamp(P.x + P.vx * dt, -EDGE, EDGE);
    if (nx !== P.x) {
      if (WD.blocked(W, nx, P.d, P.z)) { if (Math.abs(P.vx) > 4) bump(); P.vx = 0; } else P.x = nx;
    }
    if (P.x === -EDGE || P.x === EDGE) P.vx = 0;
    if (inp.jumpQ) {
      inp.jumpQ = false;
      if (P.z === 0) { P.vz = JUMP_V; P.sx = 0.78; P.sy = 1.26; A.jump(); puff(P.x, P.d, 6); }
    }
    if (P.z > 0 || P.vz > 0) {
      P.vz -= GRAV * dt; P.z += P.vz * dt;
      if (P.z <= 0) {
        P.z = 0; P.vz = 0; P.sx = 1.28; P.sy = 0.72; A.land(); puff(P.x, P.d, 7);
        for (let i = 0; i < 30 && WD.blocked(W, P.x, P.d, 0); i++) P.d += 0.08;
      }
    }
    P.sx += (1 - P.sx) * Math.min(1, dt * 11); P.sy += (1 - P.sy) * Math.min(1, dt * 11);
    P.tilt = lerp(P.tilt, P.vx / SIDE, Math.min(1, dt * 10));
    P.phase += dt * (Math.abs(P.vd) * 1.25 + Math.abs(P.vx) * 0.9);
    if (P.vd > 9 && Math.random() < dt * 10) puff(P.x, P.d - 0.3, 1);
  }

  // ---------- enemies + vans ----------
  function updateFoes(dt) {
    for (const f of W.foes) {
      const ref = P ? P.d : E.cam.d + 10;
      if (f.hidden || Math.abs(f.d - ref) > 75) continue;
      f.t += dt; f.cool = Math.max(0, f.cool - dt); f.near = Math.max(0, f.near - dt);
      const police = f.type === 'police';
      let vx = 0, vd = 0;
      if (P && mode === 'play') {
        const dx = P.x - f.x, dd = P.d - f.d, dist = Math.hypot(dx, dd) || 1;
        const home = Math.hypot(f.x - f.hx, f.d - f.hd);
        const can = f.cool <= 0 && P.inv <= 0;
        const leash = f.leash || 20;
        if (f.state !== 'chase' && can && dist < f.cr && home < leash * 0.7) {
          f.state = 'chase';
          pop('bubble', f.guard ? 'IDHAR NAHI!' : f.para ? 'PEECHE HATO!' : police ? 'OYE! RUK!' : 'PAKDO!', f.x, f.d, 2.5, { max: 0.9 });
          if (police) A.whistle();
        } else if (f.state === 'chase' && (!can || dist > f.cr * 1.8 || home > leash)) f.state = 'return';
        if (f.state === 'chase') { vx = (dx / dist) * f.cv; vd = (dd / dist) * f.cv; }
        if (dist < 1.9) f.close = true;
        else if (f.close && dist > 2.7) {
          f.close = false;
          if (f.near <= 0) { f.near = 3; puff(P.x, P.d, 8, '#ffffff'); pop('burst', P.z > 0.5 ? 'WHOOSH!' : 'BACH GAYA!', P.x, P.d, 2.4, { bg: '#06d6a0', max: 0.8, size: 0.8 }); }
        }
        if (P.inv <= 0 && P.z < 1.0 && dist < 0.85) { caught(f); return; }
      } else if (f.state === 'chase') f.state = 'return';
      if (f.state === 'return') {
        const rx = f.hx - f.x, rd = f.hd - f.d, r = Math.hypot(rx, rd);
        if (r < 0.2) f.state = 'patrol'; else { vx = (rx / r) * f.pv * 2; vd = (rd / r) * f.pv * 2; }
      } else if (f.state === 'patrol') {
        if (f.x <= f.a) f.dir = 1; else if (f.x >= f.b) f.dir = -1;
        vx = f.dir * f.pv;
      }
      f.x = clamp(f.x + vx * dt, -6.6, 6.6); f.d += vd * dt; f.moving = !!(vx || vd);
      const ix = f.x, id = f.d - WD.CHOWK, ir = Math.hypot(ix, id);
      if (ir < WD.ISLAND_R + 0.4) { const k = (WD.ISLAND_R + 0.4) / (ir || 1); f.x = ix * k; f.d = WD.CHOWK + id * k; }
    }
  }
  function updateVans(dt) {
    for (let i = W.vans.length - 1; i >= 0; i--) {
      const v = W.vans[i];
      if (!v.moving) continue;
      if (!v.active && P && P.d > v.d - 50 && mode === 'play') { v.active = true; A.siren(1.8); pop('bubble', 'PEE-POO!', v.x, v.d - 2, 3, { max: 1 }); }
      if (!v.active) continue;
      v.v = Math.min(10.5, v.v + dt * 8);
      const nd = v.d - v.v * dt, front = nd - 2.4;
      const hitsParked = W.vans.some((o) => o !== v && !o.moving && Math.abs(o.x - v.x) < 2 && front < o.d + 2.6 && front > o.d - 2.4)
        || W.trucks.some((o) => Math.abs(o.x - v.x) < 2.2 && front < o.d + 3.4 && front > o.d - 3.2)
        || W.cannons.some((o) => Math.abs(o.x - v.x) < 2.2 && front < o.d + 3.5 && front > o.d - 3.3)
        || W.buses.some((o) => v.x + 1 > o.x0 && v.x - 1 < o.x1 && front < o.d1 && front > o.d0 - 0.5);
      if (hitsParked) { v.moving = false; v.active = false; v.v = 0; A.busHorn(); pop('bubble', 'SCREECH!', v.x, v.d - 2.4, 2.2, { max: 0.8, size: 0.8 }); continue; }
      v.d = nd;
      for (let j = W.bars.length - 1; j >= 0; j--) {
        const b = W.bars[j];
        if (Math.abs(b.x - v.x) < 1.6 && Math.abs(b.d - (v.d - 2.4)) < 0.7) { W.bars.splice(j, 1); debris(b.x, b.d); A.thak(); pop('burst', 'CRASH!', b.x, b.d, 1.5, { bg: '#ffd23f', max: 0.7, size: 0.8 }); }
      }
      if (P && mode === 'play' && P.inv <= 0 && Math.abs(P.x - v.x) < 1.35 && Math.abs(P.d - v.d) < 2.7 && P.z < 2.1) detain(null, v);
      if (v.d < E.cam.d - 10) W.vans.splice(i, 1);
    }
  }

  function caught(f) { if (f.type === 'police') detain(f, null); else hit(f); }
  function detain(f, van) {
    HZ.stop();
    G.detentions++;
    setMode('detaining');
    A.whistle(); A.duck(true);
    shake = 0.45; flash = 0.25; P.vd = 0; P.z = 0; P.vz = 0;
    pop('burst', 'PAKDA GAYA!', P.x, P.d, 2.3, { bg: '#4cc9f0', max: 1.2 });
    if (!van) {
      const vx = clamp(P.x + (P.x >= 0 ? -2.9 : 2.9), -5.5, 5.5);
      van = { x: vx, d: P.d + 30, dir: -1, moving: false, flash: true, temp: true, target: P.d + 0.3 };
      W.vans.push(van);
    } else { van.moving = false; van.target = van.d; }
    G.van = van; G.catcher = f; G.from = { x: P.x, d: P.d };
    G.side = van.x < P.x ? 1 : -1; // media stands on the side away from the van
    G.doorX = clamp(van.x + (P.x < van.x ? -1.35 : 1.35), -6.6, 6.6);
    G.grab = G.thrown = G.honk = G.slam = false; G.media = 0;
    // two officers do the lifting: the one who caught you, plus one who hops out of the van
    G.captors = [
      { x: f ? f.x : P.x - 1.5, d: f ? f.d : P.d - 1, look: f ? f.look : S.POLICE[0] },
      { x: van.x, d: van.d - 1, look: S.POLICE[1], wait: true },
    ];
    if (f) { f.hidden = true; f.state = 'patrol'; f.cool = 99; }
    updateHud();
    track('player_detained', { character: char.id, detentions: G.detentions, progress_pct: pct(), by: f ? 'police' : 'police_van' });
  }
  function release() {
    show(ui.detained, false); A.duck(false);
    W.vans = W.vans.filter((x) => x !== G.van);
    P.hidden = false; P.walk = false; P.carried = false; P.z = 0; P.vd = 0; P.rot = 0;
    G.captors = null;
    if (G.catcher) G.catcher.hidden = false;
    let d = Math.max(4, G.from.d - 14), placed = false;
    for (let tries = 0; tries < 25 && !placed; tries++) {
      for (const l of [P.lane, 2, 1, 3, 0, 4]) if (!WD.blocked(W, LANES[l], d, 0)) { P.lane = l; P.x = LANES[l]; P.vx = 0; P.d = d; placed = true; break; }
      d -= 1.5;
    }
    P.inv = 2.2;
    for (const f of W.foes) if (Math.abs(f.d - P.d) < 32) { f.x = f.hx; f.d = f.hd; f.state = 'patrol'; f.cool = 2.2; }
    if (G.catcher) G.catcher.cool = 2.2;
    popCenter('रिहा!', { col: '#06d6a0', max: 1 });
    A.count(0);
    setMode('play');
  }
  // one health meter for everything that hurts: stick squad 50, water cannon 30, tear gas 20
  function damage(amount, cause, o = {}) {
    if (!P || mode !== 'play' || P.inv > 0) return false;
    G.hits++;
    const before = G.health;
    G.health = Math.max(0, G.health - amount); G.cause = cause;
    track('player_hit', { character: char.id, by: cause, damage: amount, health_before: before, progress_pct: pct() });
    flash = cause === 'gas' ? 0.35 : cause === 'water' ? 0.5 : 1; shake = cause === 'gas' ? 0.25 : 0.7;
    ui.hpWrap.classList.remove('shake'); void ui.hpWrap.offsetWidth; ui.hpWrap.classList.add('shake');
    if (G.health <= 0) {
      setMode('dying'); A.sad(); HZ.stop();
      track('game_over', { character: char.id, by: cause, progress_pct: pct(), time_sec: Math.round(G.time), detentions: G.detentions, hits: G.hits });
    } else if (o.knock) {
      P.vd = 0; P.vx = 0; P.kbx = o.knock[0]; P.kbd = o.knock[1];
      if (o.hop) { P.vz = o.hop; P.z = Math.max(P.z, 0.01); }
      setMode('hit');
    } else P.inv = 1.5;
    updateHud();
    return true;
  }
  function hit(f) {
    f.cool = 3.5; f.state = 'return';
    if (!damage(50, 'stick', { knock: [0, -4.5] })) return;
    A.dhishum();
    pop('burst', 'DHISHUM!', P.x, P.d, 2.2, { bg: '#ffd23f', col: '#e63946', max: 1.1, size: 1.2 });
    stars(P.x, P.d, 1.6, 10);
  }
  function win() {
    setMode('winning');
    P.vd = 0; P.walk = true; P.inv = 99;
    A.fanfare(); A.say('जंतर मंतर पहुँच गए!');
    petals(70, GOAL + 6);
    popCenter('पहुँच गए!', { col: '#ffd23f', max: 1.6 });
    const best = parseFloat(store.get('cjm_best') || '0'), isBest = !best || G.time < best;
    if (isBest) store.set('cjm_best', G.time.toFixed(1));
    ui.winStats.innerHTML =
      `<b>${char.name}</b> reached in <b>${G.time.toFixed(1)}s</b><br>` +
      `Van rides: ${G.detentions} · Health: ${G.health}%<br>` +
      (isBest ? '<span class="pb">NEW PERSONAL BEST!</span>' : `Best: ${best.toFixed(1)}s`);
    track('game_won', { character: char.id, time_sec: Math.round(G.time), detentions: G.detentions, hits: G.hits, health: G.health });
  }

  // ---------- per-mode step ----------
  function step(dt, now) {
    modeT += dt;
    shake = Math.max(0, shake - dt * 1.6); flash = Math.max(0, flash - dt * 2.4); flashPhoto = Math.max(0, flashPhoto - dt * 2.5);
    updateParts(dt);
    if (HZ && W && mode !== 'boot') HZ.update(dt);
    if (W && mode !== 'boot') updateMedia(dt);
    if (W) { for (const p of W.crowd) p.t += dt * 0.2; }
    switch (mode) {
      case 'title': case 'select':
        attractD += dt * 6; if (attractD > 530) attractD = 20;
        updateFoes(dt);
        break;
      case 'count': {
        const n = 3 - Math.floor(modeT / 0.7);
        if (n !== G.shown && n >= 0) { G.shown = n; if (n > 0) { popCenter(String(n), { max: 0.68, col: '#ffd23f' }); A.count(n); } else { popCenter('चलो!', { max: 0.9, col: '#ff5d5d' }); A.count(0); setMode('play'); } }
        updateFoes(dt);
        break;
      }
      case 'play':
        G.time += dt;
        updatePlayer(dt); updateFoes(dt); updateVans(dt);
        A.setIntensity(progress());
        if (!G.half && progress() > 0.5) { G.half = true; popCenter('आधा रास्ता!', { max: 1.2, col: '#4cc9f0', size: 0.7 }); }
        if (!G.almost && progress() > 0.88) { G.almost = true; popCenter('बस थोड़ा और!', { max: 1.3, col: '#ffd23f', size: 0.7 }); }
        if (P.d >= GOAL) win();
        break;
      case 'detaining': {
        // 5-second capture: van pulls up -> officers grab -> carry -> throw into the van -> door slams
        G.time += dt;
        const v = G.van, T = modeT, [c0, c1] = G.captors, k = (r) => Math.min(1, dt * r);
        v.d = lerp(v.d, v.target, k(2.6));
        if (T > 1.0 && !G.honk) { G.honk = true; A.busHorn(); pop('bubble', 'PEE-POO!', v.x, v.d, 2.9, { max: 0.9, size: 0.7 }); }
        if (T > 1.0) c1.wait = false;
        if (T < 1.5) {
          // officers close in from both sides
          c0.x = lerp(c0.x, P.x - 0.7, k(5)); c0.d = lerp(c0.d, P.d - 0.25, k(5));
          if (!c1.wait) { c1.x = lerp(c1.x, P.x + 0.7, k(4)); c1.d = lerp(c1.d, P.d - 0.25, k(4)); }
          P.rot = Math.sin(T * 10) * 0.08;
        }
        if (T > 1.5 && !G.grab) {
          G.grab = true; P.carried = true; A.thak(); shake = 0.25;
          pop('burst', 'UTHAO ISSE!', c0.x, c0.d, 2.4, { bg: '#4cc9f0', max: 1.1, size: 0.8 });
        }
        if (T > 1.5 && T < 3.6) {
          // lifted, kicking and struggling, carried toward the van door
          P.z = lerp(P.z, 0.65 + Math.sin(T * 13) * 0.1, k(6));
          P.rot = Math.sin(T * 16) * 0.3;
          P.x = lerp(P.x, G.doorX - (G.doorX > v.x ? -0.9 : 0.9), k(1.2));
          P.d = lerp(P.d, v.d - 0.6, k(1.2));
          c0.x = lerp(c0.x, P.x - 0.7, k(8)); c0.d = lerp(c0.d, P.d - 0.25, k(8));
          c1.x = lerp(c1.x, P.x + 0.7, k(8)); c1.d = lerp(c1.d, P.d - 0.25, k(8));
          if (Math.random() < dt * 3) puff(P.x, P.d, 2);
        }
        if (T >= 3.6 && !G.thrown) {
          G.thrown = true; G.tf = { x: P.x, d: P.d, z: P.z };
          pop('burst', 'EK, DO, TEEN... DHAPP!', P.x, P.d, 2.6, { bg: '#ffd23f', col: '#e63946', max: 1.1, size: 0.75 });
          A.jump();
        }
        if (T >= 3.6 && T < 4.3) {
          const u = (T - 3.6) / 0.7, f0 = G.tf;
          P.x = lerp(f0.x, v.x, u); P.d = lerp(f0.d, v.d - 0.4, u);
          P.z = lerp(f0.z, 1.3, u) + Math.sin(u * Math.PI) * 1.9;
          P.rot = u * 7;
        }
        if (T >= 4.3 && !P.hidden) {
          P.hidden = true; P.carried = false; P.rot = 0; shake = 0.45; A.dhishum(); puff(v.x, v.d - 2.4, 12);
          pop('burst', 'THUD!', v.x, v.d - 2.4, 2, { bg: '#ff9f1c', max: 0.9 });
          c0.d -= 0.3; c1.d -= 0.3;
        }
        if (T > 4.6 && !G.slam) { G.slam = true; A.siren(2); }
        if (T > CAPTURE) {
          setMode('detained'); G.until = now + DETAIN_MS;
          ui.count.textContent = '5'; show(ui.detained);
        }
        break;
      }
      case 'detained': {
        G.time += dt;
        const left = Math.max(0, G.until - now);
        ui.count.textContent = String(Math.ceil(left / 1000));
        if (left <= 0) release();
        break;
      }
      case 'hit': {
        G.time += dt;
        const k = Math.min(1, dt * 7), mx = P.kbx * k, md = P.kbd * k;
        const nx = clamp(P.x + mx, -6.4, 6.4), nd = clamp(P.d + md, 2, GOAL - 1);
        if (!WD.blocked(W, nx, nd, P.z)) { P.x = nx; P.d = nd; }
        P.kbx -= mx; P.kbd -= md;
        if (P.z > 0 || P.vz > 0) { P.vz -= GRAV * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z === 0) { P.vz = 0; puff(P.x, P.d, 8); } }
        P.rot = G.cause === 'water' ? Math.min(modeT * 9, 6.28) * (modeT < 0.7 ? 1 : 0) : Math.sin(modeT * 22) * 0.35 * (1 - modeT);
        updateFoes(dt);
        if (modeT > 0.9) { P.rot = 0; P.inv = 2; setMode('play'); }
        break;
      }
      case 'dying':
        P.rot = Math.min(1.45, modeT * 2.2);
        if (modeT > 1.0 && ui.over.classList.contains('hidden')) {
          const why = { stick: 'The stick squad got you', water: 'The water cannon knocked you flat', gas: 'Too much tear gas' }[G.cause] || 'You went down';
          ui.overTxt.textContent = `${why} at ${pct()}% of the way. Have some haldi-doodh and go again.`;
          show(ui.over); show(ui.pad, false); setMode('over');
        }
        break;
      case 'winning':
        P.d = Math.min(GOAL + 5, P.d + dt * 5); P.x = lerp(P.x, 0, Math.min(1, dt * 2)); P.phase += dt * 8;
        if (modeT > 1.3) { P.walk = false; P.facing = 'front'; P.cheer = true; }
        if (modeT > 2.4) { pops = []; setMode('won'); show(ui.won); show(ui.hud, false); show(ui.pad, false); }
        break;
      case 'won':
        if (Math.random() < dt * 6) petals(2, GOAL + 6);
        break;
    }
  }

  function updateCam(dt) {
    let tx, td, th, tp, k = 7;
    if (mode === 'title' || mode === 'select') { tx = Math.sin(clock * 0.3) * 2.2; td = attractD; th = 5.8; tp = 0.36; k = 3; }
    else if (mode === 'winning' || mode === 'won') { tx = Math.sin(clock * 0.35) * 2.6; td = GOAL - 7; th = 2.4; tp = 0.05; k = 1.6; }
    else if (mode === 'detaining' || mode === 'detained') { tx = G.from.x * 0.6; td = G.from.d - 7.8; th = 4.6; tp = 0.32; k = 2.5; }
    else { tx = P.x * 0.55; td = P.d - 8.2; th = 5.4 + P.z * 0.25; tp = 0.38; }
    const a = Math.min(1, dt * k);
    camS.x = lerp(camS.x, tx, a); camS.d = lerp(camS.d, td, a); camS.h = lerp(camS.h, th, a); camS.p = lerp(camS.p, tp, a);
    const j = shake * 0.35;
    E.setCam(camS.x + rand(-j, j), camS.d, camS.h + rand(-j, j) * 0.5, camS.p);
  }

  // ---------- drawing ----------
  function drawPlayer() {
    const c = E.c, g = E.P(P.x, P.d, 0);
    if (g && mode === 'play') {
      const q = E.P(P.x, P.d + 0.55, 0), ry = q ? Math.max(2, g.y - q.y) : 6;
      c.save(); c.globalAlpha = 0.85; c.strokeStyle = '#ffd23f'; c.lineWidth = 3 * E.dpr;
      c.beginPath(); c.ellipse(g.x, g.y, 0.62 * g.s, ry, 0, 0, TAU); c.stroke(); c.restore();
    }
    let pose = 'idle', frame = Math.floor(clock * 4) % S.FRAMES;
    if (mode === 'hit' || mode === 'dying' || mode === 'over' || P.carried) { pose = 'hit'; frame = 0; }
    else if (P.z > 0.05) { pose = 'jump'; frame = 0; }
    else if (P.cheer) { pose = 'cheer'; frame = Math.floor(clock * 9) % S.FRAMES; }
    else if (Math.abs(P.vd) > 0.6 || P.walk || Math.abs(P.vx) > 0.6) { pose = 'walk'; frame = Math.floor((P.phase / TAU) * S.FRAMES) % S.FRAMES; }
    const blink = P.inv > 0 && P.inv < 50 && Math.floor(clock * 14) % 2;
    E.sprite(S.get(char, P.facing, pose, frame), P.x, P.d, P.z, { sx: P.sx, sy: P.sy, rot: P.rot + P.tilt * 0.14, alpha: blink ? 0.4 : 1 });
  }
  function drawFoe(f) {
    const chasing = f.state === 'chase';
    const facing = P && chasing && f.d < P.d - 0.3 ? 'back' : 'front';
    const pose = f.type === 'orange' && chasing ? 'swing' : f.moving === false ? 'idle' : 'walk';
    const frame = Math.floor(f.t * (chasing ? 11 : 6)) % S.FRAMES;
    const p = E.sprite(S.get(f.look, facing, pose, frame), f.x, f.d, 0, { alpha: E.fog(E.depth(f.d)) });
    if (p && chasing) {
      const h = E.P(f.x, f.d, 2.3);
      if (!h) return;
      const c = E.c, r = Math.max(6 * E.dpr, h.s * 0.2);
      c.fillStyle = f.type === 'police' ? '#1d4e89' : '#e63946'; c.beginPath(); c.arc(h.x, h.y, r, 0, TAU); c.fill();
      c.lineWidth = 2 * E.dpr; c.strokeStyle = E.OUT; c.stroke();
      c.fillStyle = '#fff'; c.font = `${r * 1.5}px "Bangers", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', h.x, h.y + r * 0.08);
    }
  }
  function dyn() {
    const L = [], cd = E.cam.d;
    if (P && !P.hidden) L.push({ x: P.x, d: P.d, shadow: 0.55 * (1 - Math.min(P.z, 2) / 3), f: drawPlayer });
    if (G && G.captors && (mode === 'detaining' || mode === 'detained')) {
      const fr = Math.floor(clock * 9) % S.FRAMES;
      for (const c of G.captors) if (!c.wait) L.push({ x: c.x, d: c.d, shadow: 0.55, f: () => E.sprite(S.get(c.look, 'back', P.carried ? 'walk' : 'idle', fr), c.x, c.d, 0) });
    }
    for (const f of W.foes) if (!f.hidden && f.d > cd + 0.6 && f.d < cd + 90) L.push({ x: f.x, d: f.d, shadow: 0.55, f: () => drawFoe(f) });
    mediaDyn(L, cd);
    if (HZ) HZ.dyn(L);
    for (const p of parts) L.push({ d: p.d, f: () => drawPart(p) });
    return L;
  }
  function render(dt) {
    const c = E.c;
    c.save();
    if (shake > 0.02) c.translate(rand(-1, 1) * shake * 22 * E.dpr, rand(-1, 1) * shake * 22 * E.dpr);
    WD.render(W, clock, dyn());
    HZ.drawScreen();
    speedLines();
    drawPops(dt);
    c.restore();
    if (flashPhoto > 0) { const q = E.P(media.cam.x + 0.3, media.cam.d + 0.3, 2.1); if (q) { const r = q.s * 1.4 * flashPhoto * 3, g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(q.x - r, q.y - r, r * 2, r * 2); } }
    if (flash > 0) { c.fillStyle = `rgba(255,40,40,${(flash * 0.45).toFixed(3)})`; c.fillRect(0, 0, E.W, E.H); }
  }

  // ---------- input ----------
  const inGame = () => ['count', 'play', 'detaining', 'detained', 'hit'].includes(mode);
  addEventListener('keydown', (e) => {
    const k = e.code;
    if (inGame()) {
      if (k === 'ArrowLeft' || k === 'KeyA') { inp.left = true; e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'KeyD') { inp.right = true; e.preventDefault(); }
      else if (k === 'ArrowUp' || k === 'KeyW') { inp.up = true; e.preventDefault(); }
      else if (k === 'ArrowDown' || k === 'KeyS') { inp.down = true; e.preventDefault(); }
      else if (k === 'Space') { if (!e.repeat && mode === 'play') inp.jumpQ = true; e.preventDefault(); }
      if (k === 'Escape') { quitRun(); e.preventDefault(); }
    } else if (k === 'Escape' && mode === 'select') { goTitle();
    } else if (k === 'Enter') {
      if (mode === 'title') goSelect();
      else if (mode === 'over' || mode === 'won') startRun();
    }
  });
  addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') inp.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') inp.down = false;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') inp.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') inp.right = false;
  });
  addEventListener('blur', () => { inp.up = inp.down = inp.left = inp.right = false; });
  document.addEventListener('visibilitychange', () => { A.pause(document.hidden); if (document.hidden) inp.up = inp.down = inp.left = inp.right = false; });
  addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true, passive: true });

  function padBtn(id, down, up) {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} down(); });
    const end = () => { b.classList.remove('on'); if (up) up(); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  padBtn('#bL', () => { inp.left = true; }, () => { inp.left = false; });
  padBtn('#bR', () => { inp.right = true; }, () => { inp.right = false; });
  padBtn('#bU', () => { inp.up = true; }, () => { inp.up = false; });
  padBtn('#bD', () => { inp.down = true; }, () => { inp.down = false; });
  padBtn('#bJ', () => { if (mode === 'play') inp.jumpQ = true; });
  // swipe on the canvas: left/right = lane, up = jump
  let sw = null;
  const cv = $('#game');
  cv.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) nudge(dx > 0 ? 1 : -1);
    else if (dy < -40 && mode === 'play') inp.jumpQ = true;
  });

  // ---------- screens ----------
  function quitRun() {
    if (HZ) HZ.stop();
    if (!G || !['count', 'play', 'detaining', 'detained', 'hit'].includes(mode)) return;
    track('game_quit', { character: char.id, progress_pct: pct(), time_sec: Math.round(G.time) });
    inp.up = inp.down = inp.left = inp.right = inp.jumpQ = false;
    pops = [];
    goSelect();
  }
  $('#quitBtn').addEventListener('click', quitRun);
  $('#playBtn').addEventListener('click', goSelect);
  $('#linkedin').addEventListener('click', () => track('linkedin_click', { from: mode }));
  $('#backBtn').addEventListener('click', goTitle);
  $('#retry').addEventListener('click', startRun);
  $('#again').addEventListener('click', startRun);
  $('#change1').addEventListener('click', goSelect);
  $('#change2').addEventListener('click', goSelect);
  $('#share').addEventListener('click', async () => {
    const text = `Main ${char.name} ban ke ${G ? G.time.toFixed(1) : '?'}s mein Jantar Mantar pahunch gaya! Tum try karo:`;
    try {
      if (navigator.share) await navigator.share({ title: 'द जंतर मंतर रन', text, url: location.href });
      else { await navigator.clipboard.writeText(text + ' ' + location.href); popCenter('LINK COPIED!', { max: 1, size: 0.5 }); }
    } catch (_) {}
  });

  const cardCanvases = [];
  function buildCards() {
    S.CHARS.forEach((ch, i) => {
      const b = document.createElement('button');
      b.className = 'card';
      b.style.setProperty('--bg', ch.bg);
      b.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (1 + (i % 3))) + 'deg');
      b.innerHTML = `<canvas></canvas><b>${ch.name}</b><small>${ch.tag}</small><span class="spd">SPEED <i style="--s:${ch.speed}"></i></span>`;
      b.addEventListener('mouseenter', () => { hover = i; warmPlayer(ch); });
      b.addEventListener('mouseleave', () => { if (hover === i) hover = -1; });
      b.addEventListener('focus', () => { hover = i; });
      b.addEventListener('click', () => { char = ch; store.set('cjm_char', ch.id); warmPlayer(ch); track('character_selected', { character: ch.id }); startRun(); });
      ui.cards.appendChild(b);
      cardCanvases.push(b.querySelector('canvas'));
    });
  }
  function drawCards() {
    cardCanvases.forEach((cv, i) => S.portrait(cv, S.CHARS[i], clock * (hover === i ? 9 : 3) + i, hover === i ? 'walk' : 'idle', 1.18));
  }

  // ---------- loop ----------
  let last = performance.now();
  // frame-time watchdog: if the device can't hold ~40fps during a run, drop one quality level
  const perf = { ema: 16, slow: 0, cool: 2, cpu: 4, good: 0, dropped: false };
  function watchPerf(raw, dt) {
    if (!['play', 'count', 'title', 'select'].includes(mode) || document.hidden || raw > 250) return;
    perf.ema += (raw - perf.ema) * 0.08;
    perf.cool = Math.max(0, perf.cool - dt);
    if (perf.cool > 0) return;
    perf.slow = perf.ema > 20 ? perf.slow + dt : 0;   // below ~50fps for 1.2s -> step down
    if (perf.slow > 1.2 && JM.quality.level > 0) { JM.quality.set(JM.quality.level - 1); perf.slow = 0; perf.cool = 3; perf.ema = 16; perf.dropped = true; }
    // headroom: steady ~60fps and cheap frames for 4s -> one step up (never after a drop, to avoid flip-flopping)
    perf.good = !perf.dropped && perf.ema < 17.8 && perf.cpu < 5 ? perf.good + dt : 0;
    if (perf.good > 4 && JM.quality.level < 3) { JM.quality.set(JM.quality.level + 1); perf.good = 0; perf.cool = 3; }
  }
  function frame(now) {
    // 120/144Hz screens: draw at ~60fps (every other vsync) instead of doubling the work
    if (now - last < 12) { requestAnimationFrame(frame); return; }
    const raw = now - last;
    let dt = clamp(raw / 1000, 0, 0.05);
    last = now;
    watchPerf(raw, dt);
    if (mode === 'dying') dt *= 0.45;
    clock += dt;
    try {
      if (mode !== 'boot') {
        step(dt, now);
        updateCam(dt);
        const t0 = performance.now();
        render(dt);
        perf.cpu += (performance.now() - t0 - perf.cpu) * 0.1;
        if (P) hudFrame();
        if (mode === 'select') drawCards();
      }
    } catch (err) {
      // never let one bad frame freeze the game; report it once so it can be fixed
      if (!frame.reported) { frame.reported = true; console.error(err); track('exception', { description: String(err && err.message || err).slice(0, 150), fatal: false }); }
    }
    requestAnimationFrame(frame);
  }

  // pre-render character frames in idle time so nothing has to be drawn mid-run (avoids hitches on phones)
  const warmQ = [];
  const idle = window.requestIdleCallback || ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 30));
  function warm(look, facing, poses) { for (const pose of poses) for (let f = 0; f < S.FRAMES; f++) warmQ.push([look, facing, pose, f]); }
  function warmTick(dl) {
    while (warmQ.length && dl.timeRemaining() > 2) { const [l, fc, ps, f] = warmQ.shift(); S.get(l, fc, ps, ps === 'jump' || ps === 'hit' ? 0 : f); }
    if (warmQ.length) idle(warmTick);
  }
  function warmWorld() {
    for (const l of [...S.POLICE, ...S.PARA]) { warm(l, 'front', ['idle', 'walk']); }
    for (const l of S.ORANGE) warm(l, 'front', ['walk', 'swing']);
    for (const l of S.CROWD) warm(l, 'front', ['cheer']);
    warm(S.MEDIA[0], 'front', ['walk', 'idle']); warm(S.MEDIA[1], 'back', ['walk', 'idle']);
    for (const l of [...S.POLICE, ...S.PARA]) warm(l, 'back', ['walk']);
    idle(warmTick);
  }
  function warmPlayer(ch) { warmQ.unshift(...(() => { const q = []; for (const p of ['walk', 'idle', 'cheer']) for (let f = 0; f < S.FRAMES; f++) q.push([ch, 'back', p, f]); q.push([ch, 'back', 'jump', 0], [ch, 'back', 'hit', 0]); return q; })()); idle(warmTick); }

  // ---------- live counters: visits (game opened, once per tab session) + plays (every run started) ----------
  // Free Abacus counter API. Open pages get every change pushed live over server-sent events (polling fallback).
  // If the service is unreachable the badge stays hidden; the game never depends on it.
  const COUNTER = 'https://abacus.jasoncameron.dev', CNS = 'the-jantar-mantar-run';
  const CLICK_BASE = 2000; // shown = base + real clicks (the stored counter keeps the true count)
  const testVisit = /^(localhost|127\.|\[::1\])/.test(location.hostname) || /[?&]debug\b/.test(location.search);
  const counters = {};
  function liveCounter(key, el, base = 0) {
    const box = $('#visits');
    let shown = -1, es = null, poll = null;
    const set = (v) => {
      if (!el || typeof v !== 'number' || v < 0) return;
      if (shown >= 0 && v !== shown) { box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); }
      shown = v; el.textContent = (base + v).toLocaleString('en-IN'); show(box);
    };
    const req = (op) => fetch(`${COUNTER}/${op}/${CNS}/${key}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) set(j.value); return j; }).catch(() => null);
    const pollOnce = () => req('get');
    const start = () => {
      if (es || poll || document.hidden) return;
      if (!('EventSource' in window)) { poll = setInterval(pollOnce, 30000); return; }
      es = new EventSource(`${COUNTER}/stream/${CNS}/${key}`);
      es.onmessage = (e) => { try { set(JSON.parse(e.data).value); } catch (_) {} };
      es.onerror = () => { if (es) es.close(); es = null; if (!poll) poll = setInterval(pollOnce, 30000); };
    };
    const stop = () => { if (es) { es.close(); es = null; } if (poll) { clearInterval(poll); poll = null; } };
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    return { req, start, hit: () => (testVisit ? null : req('hit')) };
  }
  function initVisits() {
    if (!$('#visits')) return;
    counters.visits = liveCounter('visits', $('#visitsNum'), CLICK_BASE);
    counters.plays = liveCounter('plays', null); // counted, not shown
    let counted = false;
    try { counted = sessionStorage.getItem('cjm_counted') === '1'; } catch (_) {}
    if (!counted && !testVisit) counters.visits.hit().then((j) => { if (j) try { sessionStorage.setItem('cjm_counted', '1'); } catch (_) {} });
    else counters.visits.req('get');
    counters.visits.start();
  }

  function boot() {
    E.init(cv);
    JM.props.build();
    W = WD.build(20251016);
    HZ = JM.hazards.create({ P: () => P, mode: () => mode, damage, pop });
    HZ.reset(W);
    buildCards();
    initVisits();
    document.body.classList.remove('loading');
    try { performance.mark('jm-ready'); } catch (_) {}
    warmWorld();
    goTitle();
  }
  const fontLoads = document.fonts ? ['48px "Yatra One"', '48px "Bangers"'].map((f) => document.fonts.load(f).catch(() => {})) : [];
  Promise.race([Promise.all(fontLoads), new Promise((r) => setTimeout(r, 1200))]).then(boot);
  requestAnimationFrame(frame);

  if (/[?&]debug\b/.test(location.search)) {
    window.__jm = { get P() { return P; }, get G() { return G; }, get W() { return W; }, get mode() { return mode; }, inp, startRun, step, setMode, nudge, media, get HZ() { return HZ; },
      run(sec) { let now = performance.now(); for (let i = 0; i < Math.round(sec * 60); i++) { now += 1000 / 60; clock += 1 / 60; step(1 / 60, now); updateCam(1 / 60); } render(1 / 60); if (P) hudFrame(); return mode; } };
  }
})();
