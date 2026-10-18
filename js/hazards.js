/* Crowd-control hazards: police water cannons and tear-gas launchers.
   Water cannon: telegraphs (turret swings + aim stripe), then fires a 3s jet. Getting hit throws you back, −30% health.
   Tear gas:     a shell is lobbed at where you're heading (red landing ring shows where); if it bursts within the
                 blast radius, −20% health + coughing (vision haze, slowed). The cloud lingers and drifts.
   game.js wires it up with JM.hazards.create(api). */
window.JM = window.JM || {};
JM.hazards = (() => {
  const TAU = Math.PI * 2;
  const JET = { lock: 28, range: 18, aim: 0.9, fire: 3.0, cool: 4.5, turn: 2.2, turnX: 0.75, hitR: 1.35, lead: 0.35 };
  const GAS = { blastR: 2.4, flight: 1.05, cloud: 5.5, cool: 12, gap: 3.5 }; // sparing: one shot per blockade as you approach
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);

  function create(api) {
    const E = JM.engine, A = JM.audio;
    let W = null, cannons = [], launchers = [], shells = [], cans = [], clouds = [], puddles = [], mist = [], drops = [];
    let gasGap = 0, haze = 0;

    function reset(world) {
      W = world;
      cannons = W.cannons.map((c) => ({ x: c.x, d: c.d, state: 'idle', t: 0, ax: c.x, ad: c.d - 8, hit: false, snd: null }));
      // tear-gas launchers: riot police at each blockade + a few in the footpath platoons
      launchers = [];
      for (const b of W.buses) {
        const g = W.guards.find((q) => q.look.id === 'para_blue' && Math.abs(q.d - (b.d0 - 1.9)) < 0.2 && q.x > b.x0 && q.x < b.x1);
        if (g && !launchers.some((L) => Math.abs(L.g.d - g.d) < 14)) { g.gas = true; launchers.push({ g, cool: rand(0.5, 2) }); } // one per blockade
      }
      shells = []; cans = []; clouds = []; puddles = []; mist = []; drops = []; gasGap = 0; haze = 0;
      W.fxGround = drawGround;
    }

    const nozzle = (c) => [c.x, c.d - 3.4, 3.25];

    // ---------- update ----------
    function update(dt) {
      const P = api.P(), playing = api.mode() === 'play';
      for (const c of cannons) updateCannon(c, dt, P, playing);
      updateGas(dt, P, playing);
      for (let i = mist.length - 1; i >= 0; i--) { const m = mist[i]; m.life += dt; m.x += m.vx * dt; m.d += m.vd * dt; m.h += m.vh * dt; m.vh -= 6 * dt; if (m.life > m.max || m.h < 0) mist.splice(i, 1); }
      for (let i = puddles.length - 1; i >= 0; i--) { puddles[i].life += dt; if (puddles[i].life > 9) puddles.splice(i, 1); }
      for (let i = drops.length - 1; i >= 0; i--) { const q = drops[i]; q.life += dt; q.y += q.vy * dt; q.vy += 40 * dt; if (q.life > q.max) drops.splice(i, 1); }
      // vision haze: from a gas hit, or from standing inside a lingering cloud
      let inside = 0;
      if (P) for (const cl of clouds) { const dd = Math.hypot(P.x - cl.x, P.d - cl.d); if (dd < cl.r) inside = Math.max(inside, (1 - dd / cl.r) * cl.a); }
      if (P && inside > 0.25 && playing) P.gas = Math.max(P.gas || 0, 0.4);
      haze = Math.max(haze - dt * 0.35, inside * 0.7);
    }

    function updateCannon(c, dt, P, playing) {
      const [nx, nd] = nozzle(c);
      c.t += dt;
      const inRange = P && playing && P.d < nd + 1 && nd - P.d < JET.lock && !P.hidden;
      if (c.state === 'idle') {
        if (inRange) { c.state = 'aim'; c.t = 0; c.hit = false; c.ax = c.x; c.ad = nd - 7; /* starts on its own side, then sweeps toward you */ A.siren(0.8); api.pop('bubble', 'PAANI CHHODO!', c.x, c.d - 3, 3.6, { max: 1 }); }
      } else if (c.state === 'aim' || c.state === 'fire') {
        if (P) {
          // the turret tracks you with a lag, so moving fast sideways or sprinting past dodges the stream
          const tx = P.x + (P.vx || 0) * 0.2, td = P.d + Math.max(0, P.vd || 0) * JET.lead;
          c.ax += (tx - c.ax) * Math.min(1, dt * JET.turnX); c.ad += (td - c.ad) * Math.min(1, dt * JET.turn);
          const dx = c.ax - nx, dd = c.ad - nd, len = Math.hypot(dx, dd);
          if (len > JET.range) { c.ax = nx + (dx / len) * JET.range; c.ad = nd + (dd / len) * JET.range; }
          c.ad = Math.min(c.ad, nd - 1.5); // the nozzle only points forward: get past the truck and you're clear
        }
        if (c.state === 'aim' && c.t > JET.aim) { c.state = 'fire'; c.t = 0; c.snd = A.waterJet(JET.fire); }
        if (c.state === 'fire') {
          // spray mist + wet patch where the stream lands
          for (let k = 0; k < 3; k++) mist.push({ x: c.ax + rand(-0.5, 0.5), d: c.ad + rand(-0.4, 0.4), h: rand(0.1, 0.6), vx: rand(-2, 2), vd: rand(-2, 1), vh: rand(1.5, 4), life: 0, max: rand(0.4, 0.8), r: rand(0.12, 0.26) });
          if (!puddles.length || Math.hypot(puddles[puddles.length - 1].x - c.ax, puddles[puddles.length - 1].d - c.ad) > 0.8) puddles.push({ x: c.ax, d: c.ad, r: rand(0.9, 1.4), life: 0 });
          if (P && playing && !c.hit && P.z < 1.5 && P.inv <= 0) {
            if (Math.hypot(P.x - c.ax, P.d - c.ad) < JET.hitR) {
              c.hit = true;
              const dx = P.x - nx, dd = P.d - nd, l = Math.hypot(dx, dd) || 1;
              api.damage(30, 'water', { knock: [(dx / l) * 6.5, (dd / l) * 6.5 - 1], hop: 5 });
              api.pop('burst', 'SPLAASH!', P.x, P.d, 2.3, { bg: '#4cc9f0', col: '#ffffff', max: 1, size: 1.1 });
              for (let k = 0; k < 26; k++) drops.push({ x: rand(0, 1), y: rand(0, 0.8), r: rand(4, 16), vy: rand(10, 60), life: 0, max: rand(1.2, 2.6) });
            }
          }
          if (c.t > JET.fire) { c.state = 'cool'; c.t = 0; }
        }
      } else if (c.state === 'cool' && c.t > JET.cool) c.state = 'idle';
      if (!playing && c.state !== 'idle' && c.state !== 'cool') { c.state = 'cool'; c.t = 0; if (c.snd) c.snd(); }
    }
    function updateGas(dt, P, playing) {
      gasGap = Math.max(0, gasGap - dt);
      for (const L of launchers) {
        L.cool = Math.max(0, L.cool - dt);
        const g = L.g;
        if (!P || !playing || L.cool > 0 || L.used || gasGap > 0 || shells.length >= 1) continue;
        const ahead = g.d - P.d;
        if (ahead < 5 || ahead > 26) continue;
        // lead the target a little (where you'll be when it lands) and scatter it so it's dodgeable
        const tx = clamp(P.x + (P.vx || 0) * GAS.flight * 0.8 + rand(-0.8, 0.8), -6.4, 6.4);
        const td = P.d + Math.max(0, P.vd || 0) * GAS.flight + rand(-0.8, 0.8);
        shells.push({ x0: g.x, d0: g.d - 0.3, h0: 1.7, x1: tx, d1: td, t: 0, spin: rand(7, 11) });
        L.cool = GAS.cool; L.used = true; gasGap = GAS.gap; // each trooper fires once per run
        A.gasLaunch();
      }
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i];
        s.t += dt / GAS.flight;
        const p = shellPos(s);
        if (Math.random() < 0.9) clouds.push({ x: p[0] + rand(-0.05, 0.05), d: p[1] + 0.1, h: p[2], r: 0.18, a: 0.45, life: 0, max: 1.1, trail: true });
        if (s.t >= 1) {
          shells.splice(i, 1);
          A.gasHiss();
          clouds.push({ x: s.x1, d: s.d1, h: 0.4, r: 0.6, a: 0.95, life: 0, max: GAS.cloud, grow: GAS.blastR + 0.9, seed: Math.random() * 6 });
          cans.push({ x: s.x1, d: s.d1, rot: Math.random() * Math.PI, roll: rand(0.4, 0.9) * (Math.random() < 0.5 ? -1 : 1), life: 0 });
          if (P && playing && P.inv <= 0 && P.z < 2 && Math.hypot(P.x - s.x1, P.d - s.d1) < GAS.blastR) {
            api.damage(20, 'gas', {});
            P.gas = 2.2; haze = 1;
            api.pop('bubble', 'KHAANS! KHAANS!', P.x, P.d, 2.4, { max: 1.4 });
            A.cough();
          }
        }
      }
      // landed canisters keep spewing gas, rolling a little at first
      for (let i = cans.length - 1; i >= 0; i--) {
        const k = cans[i];
        k.life += dt;
        if (k.life < 0.6) { k.x += k.roll * dt; k.rot += k.roll * dt * 4; }
        if (k.life < GAS.cloud - 1 && Math.random() < dt * 14) clouds.push({ x: k.x + rand(-0.1, 0.1), d: k.d, h: 0.12, r: 0.22, a: 0.6, life: 0, max: 1.6, trail: true });
        if (k.life > GAS.cloud + 3) cans.splice(i, 1);
      }
      for (let i = clouds.length - 1; i >= 0; i--) {
        const cl = clouds[i];
        cl.life += dt;
        if (cl.grow) { cl.r = Math.min(cl.grow, cl.r + dt * 3.2); cl.x += dt * 0.35; cl.d -= dt * 0.15; cl.h = Math.min(1.2, cl.h + dt * 0.2); }
        else { cl.r += dt * 0.6; cl.h += dt * 0.4; }
        const k = cl.life / cl.max;
        cl.a = (cl.grow ? 0.95 : 0.5) * (k < 0.7 ? 1 : (1 - k) / 0.3);
        if (cl.life > cl.max) clouds.splice(i, 1);
      }
    }
    const shellPos = (s) => [s.x0 + (s.x1 - s.x0) * s.t, s.d0 + (s.d1 - s.d0) * s.t, s.h0 * (1 - s.t) + Math.sin(s.t * Math.PI) * 7];

    // ---------- drawing ----------
    // ground layer (drawn by the world right after the road): wet patches, aim stripes, landing rings
    function drawGround() {
      const c = E.c, cd = E.cam.d;
      for (const p of puddles) {
        const q = E.P(p.x, p.d, 0.01), q2 = E.P(p.x, p.d + p.r * 0.6, 0.01);
        if (!q || !q2) continue;
        const a = 0.32 * (1 - p.life / 9), rx = p.r * q.s, ry = Math.max(1, q.y - q2.y);
        c.save(); c.translate(q.x, q.y); c.scale(1, ry / rx);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
        g.addColorStop(0, `rgba(30,35,45,${a})`); g.addColorStop(0.7, `rgba(30,35,45,${a * 0.7})`); g.addColorStop(1, 'rgba(30,35,45,0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill();
        c.fillStyle = `rgba(200,225,255,${a * 0.5})`; c.beginPath(); c.ellipse(-rx * 0.25, -rx * 0.15, rx * 0.35, rx * 0.12, -0.2, 0, TAU); c.fill();
        c.restore();
      }
      for (const cn of cannons) {
        if (cn.state !== 'aim' || cn.d < cd) continue;
        const [nx, nd] = nozzle(cn), dx = cn.ax - nx, dd = cn.ad - nd, l = Math.hypot(dx, dd) || 1, px = (-dd / l) * 0.55, pd = (dx / l) * 0.55;
        const pulse = 0.25 + Math.sin(cn.t * 18) * 0.12;
        E.fillW([[nx + px, nd + pd, 0.02], [nx - px, nd - pd, 0.02], [cn.ax - px * 1.8, cn.ad - pd * 1.8, 0.02], [cn.ax + px * 1.8, cn.ad + pd * 1.8, 0.02]], `rgba(76,201,240,${pulse})`);
      }
      for (const s of shells) {
        const pts = [];
        for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; pts.push([s.x1 + Math.cos(a) * GAS.blastR, s.d1 + Math.sin(a) * GAS.blastR, 0.02]); }
        const pulse = 0.18 + Math.sin(s.t * 20) * 0.08;
        E.fillW(pts, `rgba(230,57,70,${pulse})`, 'rgba(230,57,70,.85)', 2);
      }
    }

    function dyn(L) {
      const cd = E.cam.d;
      for (const cn of cannons) {
        if (cn.d + 4 < cd || cn.d > cd + 80) continue;
        L.push({ d: cn.d - 3.45, f: () => drawTurret(cn) });
        if (cn.state === 'fire') L.push({ d: Math.min(cn.ad, cn.d - 3.4) - 0.05, f: () => drawJet(cn) });
      }
      for (const m of mist) L.push({ d: m.d, f: () => drawMist(m) });
      for (const s of shells) { const p = shellPos(s); L.push({ d: p[1], f: () => drawCanister(p, s.t * s.spin) }); }
      for (const k of cans) L.push({ d: k.d - 0.9, f: () => drawCanister([k.x, k.d, 0.07], k.rot, true) });
      for (const cl of clouds) L.push({ d: cl.d, f: () => drawCloud(cl) });
    }
    function drawTurret(cn) {
      // swivelling nozzle that points at the aim point
      const [nx, nd, nh] = nozzle(cn), dx = cn.ax - nx, dd = cn.ad - nd, l = Math.hypot(dx, dd) || 1;
      const tip = [nx + (dx / l) * 0.9, nd + (dd / l) * 0.9, nh + 0.1];
      const a = E.P(nx, nd + 0.6, nh), b = E.P(...tip);
      if (!a || !b) return;
      const c = E.c;
      c.save(); c.lineCap = 'round';
      c.strokeStyle = '#2b2d42'; c.lineWidth = Math.max(3, a.s * 0.32); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      c.strokeStyle = '#8d99ae'; c.lineWidth = Math.max(1.5, a.s * 0.16); c.stroke();
      if (cn.state === 'aim' && Math.floor(cn.t * 10) % 2) { c.fillStyle = 'rgba(255,60,60,.9)'; c.beginPath(); c.arc(a.x, a.y - a.s * 0.4, a.s * 0.12, 0, TAU); c.fill(); }
      c.restore();
    }
    function drawJet(cn) {
      const c = E.c, [nx, nd, nh] = nozzle(cn), dx = cn.ax - nx, dd = cn.ad - nd, l = Math.hypot(dx, dd) || 1;
      const sx = nx + (dx / l) * 0.9, sd = nd + (dd / l) * 0.9;
      const pts = [];
      for (let k = 0; k <= 14; k++) {
        const u = k / 14, h = nh * (1 - u * u) + Math.sin(u * Math.PI) * 0.9 + (Math.random() - 0.5) * 0.05;
        const p = E.P(sx + (cn.ax - sx) * u, sd + (cn.ad - sd) * u, Math.max(0, h));
        if (p) pts.push(p);
      }
      if (pts.length < 2) return;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      const pass = (w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (const p of pts) c.lineTo(p.x, p.y); c.stroke(); };
      const s = pts[pts.length - 1].s;
      pass(Math.max(6, s * 0.55), 'rgba(170,215,255,.28)');   // spray halo
      pass(Math.max(3, s * 0.28), 'rgba(225,242,255,.75)');   // body of the stream
      pass(Math.max(1, s * 0.08), 'rgba(255,255,255,.95)');   // glint
      c.restore();
    }
    function drawMist(m) {
      const p = E.P(m.x, m.d, m.h);
      if (!p) return;
      const c = E.c, k = m.life / m.max;
      c.fillStyle = `rgba(220,238,255,${0.6 * (1 - k)})`;
      c.beginPath(); c.arc(p.x, p.y, p.s * m.r * (1 + k), 0, TAU); c.fill();
    }
    // tear-gas canister: a short metal cylinder with a coloured band and a vented end (not a grenade)
    function drawCanister(p, ang, onGround) {
      const q = E.P(...p);
      if (!q) return;
      const c = E.c, L = Math.max(10, q.s * 0.62), R = Math.max(3.5, q.s * 0.13);
      c.save(); c.translate(q.x, q.y); c.rotate(onGround ? ang * 0.35 : ang);
      if (onGround) { c.scale(1, 0.75); c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0, R * 1.4, L * 0.6, R * 0.8, 0, 0, TAU); c.fill(); }
      const g = c.createLinearGradient(0, -R, 0, R);
      g.addColorStop(0, '#e9ecef'); g.addColorStop(0.45, '#adb5bd'); g.addColorStop(1, '#5c636a');
      c.fillStyle = g; c.beginPath();
      if (c.roundRect) c.roundRect(-L / 2, -R, L, R * 2, R * 0.6); else c.rect(-L / 2, -R, L, R * 2);
      c.fill(); c.strokeStyle = 'rgba(30,30,30,.55)'; c.lineWidth = Math.max(1, R * 0.25); c.stroke();
      c.fillStyle = '#1d4e89'; c.fillRect(-L * 0.12, -R, L * 0.18, R * 2);         // blue band
      c.fillStyle = '#ffd23f'; c.fillRect(L * 0.1, -R, L * 0.05, R * 2);            // yellow stripe
      c.fillStyle = '#343a40'; c.fillRect(L / 2 - R * 0.7, -R * 0.8, R * 0.7, R * 1.6); // vented cap
      c.fillStyle = 'rgba(255,170,90,.55)'; c.beginPath(); c.arc(L / 2, 0, R * 0.55, 0, TAU); c.fill();       // hot vent
      c.restore();
    }
    function drawCloud(cl) {
      const c = E.c, p = E.P(cl.x, cl.d, cl.h);
      if (!p || cl.a <= 0.01) return;
      const n = cl.grow ? 7 : 1;
      for (let k = 0; k < n; k++) {
        const ang = (cl.seed || 0) + k * 2.4, off = cl.grow ? cl.r * 0.45 : 0;
        const q = cl.grow ? E.P(cl.x + Math.cos(ang) * off, cl.d + Math.sin(ang) * off * 0.6, cl.h + (k % 3) * 0.35) : p;
        if (!q) continue;
        const rr = q.s * cl.r * (cl.grow ? 0.75 : 1), ga = c.globalAlpha;
        c.globalAlpha = ga * 0.6 * cl.a; c.drawImage(E.blob('230,230,218', 0.55), q.x - rr, q.y - rr, rr * 2, rr * 2); c.globalAlpha = ga;
      }
    }
    // screen layer: water droplets on the "lens" + tear-gas haze
    function drawScreen() {
      const c = E.c, W2 = E.W, H2 = E.H;
      if (haze > 0.01) {
        const g = c.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.15, W2 / 2, H2 / 2, H2 * 0.85);
        g.addColorStop(0, `rgba(240,238,225,${0.18 * haze})`); g.addColorStop(1, `rgba(225,222,205,${0.6 * haze})`);
        c.fillStyle = g; c.fillRect(0, 0, W2, H2);
      }
      for (const q of drops) {
        const a = 1 - q.life / q.max, x = q.x * W2, y = q.y * H2, r = q.r * E.dpr;
        c.fillStyle = `rgba(190,220,255,${0.28 * a})`; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.strokeStyle = `rgba(255,255,255,${0.5 * a})`; c.lineWidth = 1.2 * E.dpr; c.beginPath(); c.arc(x, y, r * 0.8, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
      }
    }
    function stop() { for (const c of cannons) if (c.snd) { c.snd(); c.snd = null; } }

    return { reset, update, dyn, drawScreen, stop, get haze() { return haze; }, get cannons() { return cannons; }, get shells() { return shells; }, get cans() { return cans; }, get clouds() { return clouds; } };
  }
  return { create, JET, GAS };
})();
