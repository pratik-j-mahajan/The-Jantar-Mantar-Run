/* Procedural Indian-flavoured audio: dhol + tabla groove, shehnai melody (raag Bhupali),
   tanpura drone, street ambience and SFX. Pure WebAudio, no sound files. */
window.JM = window.JM || {};
JM.audio = (() => {
  let ctx = null, master, music, sfx, amb, droneBus, noise, voice = null, crowd = null;
  let muted = false, playing = false, timer = null;
  let nextT = 0, step = 0, bpm = 112, intensity = 0, melIdx = 0, melLeft = 0, autoT = 0;

  const SA = 293.66; // D4 as Sa
  const SCALE = [0, 2, 3, 5, 7, 9, 10]; // Kafi: Sa Re ga Ma Pa Dha ni (folk / protest-song feel)
  const hz = (deg) => {
    const n = SCALE.length, o = Math.floor(deg / n), s = SCALE[((deg % n) + n) % n];
    return SA * Math.pow(2, (s + 12 * o) / 12);
  };
  // bansuri hook: [degree, length in 16th steps]; each line = one bar (16 steps)
  const TUNE = [
    [4, 2], [4, 2], [5, 2], [4, 2], [3, 4], [2, 4],
    [3, 2], [2, 2], [1, 2], [2, 2], [0, 8],
    [0, 2], [2, 2], [3, 2], [4, 2], [5, 4], [4, 4],
    [6, 2], [5, 2], [4, 2], [3, 2], [4, 8],
    [7, 4], [6, 2], [5, 2], [6, 4], [4, 4],
    [5, 2], [4, 2], [3, 2], [2, 2], [3, 4], [1, 4],
    [2, 2], [3, 2], [4, 4], [3, 2], [2, 2], [1, 4],
    [0, 12], [-1, 2], [0, 2],
  ];
  const CHORDS = [0, 3, 0, 4, 5, 3, 4, 0]; // harmonium chord root (scale degree) per bar
  // call-and-response slogans, sung by a synthesized leader + crowd (formant voices, no samples)
  // syllable: [consonant, vowel]; vowels map to formant pairs below
  const CHANTS = [
    { call: [['', 'i'], ['k', 'i'], ['l', 'a']], resp: [['z', 'i'], ['d', 'a'], ['b', 'a']] },          // In-qui-lab / Zin-da-baad
    { call: [['', 'i'], ['k', 'i'], ['l', 'a']], resp: [['z', 'i'], ['d', 'a'], ['b', 'a']] },
    { call: [['h', 'u'], ['d', 'e'], ['k', 'e'], ['g', 'e']], resp: [['h', 'u'], ['d', 'e'], ['k', 'e'], ['g', 'e']] }, // Hum de-khen-ge
    { call: [['', 'a'], ['w', 'a'], ['d', 'o']], resp: [['h', 'u'], ['', 'e'], ['h', 'e']] },           // Aa-waaz do / Hum ek hain
  ];
  const VOWEL = { a: [780, 1250], e: [470, 1950], i: [310, 2250], o: [520, 900], u: [340, 820] };
  // daphli (protest frame drum): DUM . tak DUM . tak tak . | DUM . tak DUM . tak tak .
  const PAT = {
    low:  [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    na:   [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    ti:   [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    stab: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    bass: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
  };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
    master.connect(comp); comp.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.5; music.connect(master);
    sfx = ctx.createGain(); sfx.gain.value = 0.85; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0; amb.connect(master);
    droneBus = ctx.createBiquadFilter(); droneBus.type = 'lowpass'; droneBus.frequency.value = 900;
    droneBus.connect(music);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    voice = makeShehnai();
    crowd = makeCrowd();
  }

  // ---------- building blocks ----------
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(dest, type, f0, f1, t, a, peak, dec) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + dec);
    env(g, t, a, peak, dec);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + dec + 0.05);
    return o;
  }
  function hiss(dest, type, freq, q, t, peak, dec, a = 0.003) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, a, peak, dec);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + a + dec + 0.05);
  }

  function makeShehnai() { // now a bansuri: soft triangle + sine, breathy, gentle delayed vibrato
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine';
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; lp.Q.value = 0.7;
    const mix2 = ctx.createGain(); mix2.gain.value = 0.55;
    const g = ctx.createGain(); g.gain.value = 0;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.2; lg.gain.value = 14;
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    // breath: filtered noise riding the same envelope
    const br = ctx.createBufferSource(); br.buffer = noise; br.loop = true;
    const bf = ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 1900; bf.Q.value = 1.4;
    const bg = ctx.createGain(); bg.gain.value = 0.22;
    br.connect(bf); bf.connect(bg); bg.connect(g);
    o1.connect(lp); o2.connect(mix2); mix2.connect(lp); lp.connect(g); g.connect(music);
    o1.start(); o2.start(); lfo.start(); br.start();
    return { o1, o2, g };
  }
  // one melody note with a meend (glide) into the pitch
  function note(t, f, dur, vol = 0.1) {
    for (const o of [voice.o1, voice.o2]) o.frequency.setTargetAtTime(f, t, 0.035);
    const g = voice.g.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(vol, t, 0.02);
    g.setTargetAtTime(vol * 0.55, t + 0.09, 0.15);
    g.setTargetAtTime(0, t + Math.max(0.05, dur - 0.05), 0.03);
  }

  function makeCrowd() {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.09;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.35; lg.gain.value = 0.04;
    lfo.connect(lg); lg.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(amb);
    s.start(); lfo.start();
    return g;
  }

  // ---------- drums ----------
  const dholBass = (t, v = 1) => { tone(music, 'sine', 125, 46, t, 0.004, 0.9 * v, 0.34); hiss(music, 'lowpass', 280, 1, t, 0.35 * v, 0.07); };
  const tilli = (t, v = 1) => { hiss(music, 'bandpass', 2700, 1.6, t, 0.32 * v, 0.055); tone(music, 'triangle', 840, 760, t, 0.002, 0.1 * v, 0.06); };
  const tablaNa = (t, v = 1) => { tone(music, 'sine', 587, 0, t, 0.002, 0.24 * v, 0.24); tone(music, 'sine', 1174, 0, t, 0.002, 0.07 * v, 0.1); hiss(music, 'highpass', 3200, 1, t, 0.1 * v, 0.02); };
  const tablaGe = (t, v = 1) => tone(music, 'sine', 88, 132, t, 0.006, 0.5 * v, 0.32);
  // crowd taali: a few slightly offset clap layers
  const clap = (t, v = 1) => { for (let k = 0; k < 3; k++) hiss(music, 'bandpass', 1300 + k * 350, 1.2, t + k * 0.008, 0.22 * v, 0.08); };
  // harmonium chord stab: reedy detuned saws through a soft lowpass
  function harmonium(t, root, dur, v = 1) {
    for (const k of [0, 2, 4]) {
      const f = hz(root + k) / 2;
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        lp.type = 'lowpass'; lp.frequency.value = 1500;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022 * v, t + 0.03);
        g.gain.setValueAtTime(0.022 * v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(lp); lp.connect(g); g.connect(music); o.start(t); o.stop(t + dur + 0.05);
      }
    }
  }
  const bass = (t, f, dur) => tone(droneBus, 'triangle', f, 0, t, 0.01, 0.16, dur);

  const daphliDum = (t, v = 1) => { tone(music, 'sine', 140, 72, t, 0.004, 0.6 * v, 0.22); hiss(music, 'lowpass', 500, 1, t, 0.25 * v, 0.05); };
  const daphliTak = (t, v = 1) => { hiss(music, 'bandpass', 1100, 1.8, t, 0.4 * v, 0.07); tone(music, 'triangle', 330, 260, t, 0.002, 0.12 * v, 0.08); };
  const daphliTi = (t, v = 1) => hiss(music, 'highpass', 3600, 1, t, 0.1 * v, 0.03);

  // one sung syllable by n voices: sawtooth "vocal cords" through two formant filters
  function syllable(t, dur, [cons, vowel], pitch, n, vol, fall) {
    const [f1, f2] = VOWEL[vowel];
    if (cons === 'z' || cons === 's') hiss(music, 'highpass', 4200, 1, t - 0.05, 0.08 * vol * n, 0.06);
    else if ('kdbg'.includes(cons) && cons) hiss(music, 'bandpass', 1800, 1, t - 0.012, 0.12 * vol * n, 0.02);
    else if (cons === 'h') hiss(music, 'bandpass', 1400, 0.8, t - 0.04, 0.05 * vol * n, 0.05);
    for (let k = 0; k < n; k++) {
      const jt = t + (n > 1 ? Math.random() * 0.035 : 0), p = pitch * (n > 1 ? [1, 0.75, 1.25, 0.5, 1.5, 0.66][k % 6] * (1 + (Math.random() - 0.5) * 0.04) : 1);
      const o = ctx.createOscillator(), a = ctx.createBiquadFilter(), b = ctx.createBiquadFilter(), g = ctx.createGain(), mix = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(p, jt);
      if (fall) o.frequency.exponentialRampToValueAtTime(p * 0.8, jt + dur);
      a.type = b.type = 'bandpass'; a.frequency.value = f1; b.frequency.value = f2; a.Q.value = 7; b.Q.value = 9;
      mix.gain.value = 0.6;
      g.gain.setValueAtTime(0.0001, jt); g.gain.exponentialRampToValueAtTime(vol, jt + 0.03);
      g.gain.setValueAtTime(vol, jt + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, jt + dur);
      o.connect(a); o.connect(b); a.connect(g); b.connect(mix); mix.connect(g); g.connect(music);
      o.start(jt); o.stop(jt + dur + 0.05);
    }
  }
  function chant(t, spb, c) {
    const crowd = 4 + Math.round(intensity * 4);
    c.call.forEach((sy, i) => {
      const last = i === c.call.length - 1;
      syllable(t + i * 2 * spb, (last ? 3 : 1.6) * spb, sy, last ? 190 : 165, 1, 0.55, last);
    });
    c.resp.forEach((sy, i) => {
      const last = i === c.resp.length - 1;
      syllable(t + (8 + i * 2) * spb, (last ? 4 : 1.7) * spb, sy, last ? 160 : 175, crowd, 0.3, last);
    });
    clap(t + 14 * spb, 1); clap(t + 15 * spb, 0.8);
  }

  function tick() {
    if (!ctx || !playing) return;
    const spb = 60 / (bpm * (1 + intensity * 0.16)) / 4;
    while (nextT < ctx.currentTime + 0.14) {
      const s = step % 16, bar = Math.floor(step / 16), t = nextT, root = CHORDS[bar % CHORDS.length];
      const chantBar = bar % 8 >= 4 || (intensity > 0.75 && bar % 2 === 1);
      if (PAT.low[s]) daphliDum(t, s === 0 ? 1 : 0.8);
      if (PAT.na[s]) daphliTak(t, 0.85);
      if (PAT.ti[s]) daphliTi(t, 0.8);
      if (chantBar && s === 0) chant(t, spb, CHANTS[bar % CHANTS.length]);
      if (PAT.clap[s]) clap(t, 1);
      if (intensity > 0.45 && (s === 7 || s === 15)) clap(t, 0.55);     // crowd gets louder near the goal
      if (intensity > 0.7 && s % 2 === 1) daphliTi(t, 0.5);
      if (PAT.stab[s]) harmonium(t, root, spb * (s === 0 ? 5 : 3), chantBar ? 0.5 : s === 0 ? 1 : 0.8);
      if (PAT.bass[s]) bass(t, hz(root) / 4, spb * 3);
      if (!chantBar) {          // bansuri sings between the slogans
        if (melLeft <= 0) {
          const [deg, len] = TUNE[melIdx % TUNE.length];
          melIdx++; melLeft = len;
          note(t, hz(deg) * 2, len * spb * 0.96, 0.09);
        }
        melLeft--;
      } else melLeft = 0;
      nextT += spb * (s % 2 ? 0.92 : 1.08); // light swing
      step++;
    }
    if (ctx.currentTime > autoT) { autoHorn(); autoT = ctx.currentTime + 7 + Math.random() * 10; }
  }

  // ---------- SFX ----------
  function whistle() {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), l = ctx.createOscillator();
    const lg = ctx.createGain(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 2900;
    l.type = 'square'; l.frequency.value = 27; lg.gain.value = 170;
    l.connect(lg); lg.connect(o.frequency);
    env(g, t, 0.01, 0.13, 0.42);
    o.connect(g); g.connect(sfx);
    o.start(t); l.start(t); o.stop(t + 0.5); l.stop(t + 0.5);
    hiss(sfx, 'bandpass', 3000, 2, t, 0.04, 0.4);
  }
  function siren(dur = 2.4) {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1800;
    for (let i = 0; i < dur / 0.3; i++) o.frequency.setValueAtTime(i % 2 ? 640 : 900, t + i * 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
    g.gain.setValueAtTime(0.07, t + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function busHorn() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const [dt, len] of [[0, 0.16], [0.24, 0.55]]) {
      for (const f of [233, 294]) tone(sfx, 'square', f, 0, t + dt, 0.01, 0.06, len);
    }
  }
  function autoHorn() {
    if (!ctx || !playing) return;
    const t = ctx.currentTime, v = 0.025 + Math.random() * 0.02, f = 600 + Math.random() * 120;
    tone(amb, 'square', f, 0, t, 0.005, v, 0.1);
    tone(amb, 'square', f, 0, t + 0.16, 0.005, v, 0.12);
  }
  const thak = () => { if (!ctx) return; const t = ctx.currentTime; hiss(sfx, 'bandpass', 1300, 3, t, 0.5, 0.09); tone(sfx, 'sine', 190, 70, t, 0.003, 0.5, 0.18); };
  const dhishum = () => { if (!ctx) return; thak(); const t = ctx.currentTime; tone(sfx, 'sine', 95, 38, t, 0.004, 0.8, 0.45); hiss(sfx, 'lowpass', 600, 1, t, 0.4, 0.3); };
  const jump = () => { if (!ctx) return; const t = ctx.currentTime; tone(sfx, 'sine', 320, 880, t, 0.005, 0.12, 0.14); tilli(t + 0.01, 0.6); };
  const land = () => { if (!ctx) return; hiss(sfx, 'lowpass', 400, 1, ctx.currentTime, 0.12, 0.06); };
  function bell(t0, base = 880, v = 0.12) {
    if (!ctx) return;
    const t = t0 || ctx.currentTime;
    [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.9, 0.12]].forEach(([m, a]) => tone(sfx, 'sine', base * m, 0, t, 0.002, v * a, 1.6 / Math.sqrt(m)));
  }
  const pickup = () => bell(0, 1320, 0.1);
  function count(n) {
    if (!ctx) return;
    const t = ctx.currentTime;
    if (n > 0) { tablaNa(t, 1); tablaGe(t, 0.6); }
    else { dholBass(t, 1); dholBass(t + 0.12, 0.8); bell(t, 880, 0.14); }
  }
  function fanfare() {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 24; i++) { (i % 3 === 0 ? dholBass : tilli)(t + i * 0.085, 1); }
    [0, 1, 2, 3, 4, 5, 7, 6, 5].forEach((d, i) => note(t + 0.1 + i * 0.16, hz(d) * 2, i === 8 ? 1.4 : 0.16, 0.13));
    bell(t + 1.5, 880, 0.16); bell(t + 1.9, 1175, 0.12);
  }
  function sad() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [5, 4, 3, 2, 1, 0].forEach((d, i) => note(t + i * 0.28, hz(d) * 1.88, i === 5 ? 1.2 : 0.28, 0.11));
    dholBass(t, 1); dholBass(t + 1.4, 1);
  }

  function say(text, lang = 'hi-IN') {
    if (muted || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = speechSynthesis.getVoices().find((x) => x.lang === lang) || speechSynthesis.getVoices().find((x) => x.lang === 'en-IN');
      if (!v) return; // no Indian voice installed: stay silent instead of sounding wrong
      u.voice = v; u.lang = v.lang; u.rate = 1.05; u.pitch = 1.1; u.volume = 0.9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (_) {}
  }

  // ---------- public ----------
  return {
    init,
    start() {
      init(); if (!ctx) return;
      playing = true; step = 0; melIdx = 0; melLeft = 0; intensity = 0;
      nextT = ctx.currentTime + 0.08; autoT = ctx.currentTime + 4;
      music.gain.setTargetAtTime(0.5, ctx.currentTime, 0.1);
      amb.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
      clearInterval(timer); timer = setInterval(tick, 40);
    },
    stop() {
      playing = false; clearInterval(timer);
      if (!ctx) return;
      voice.g.gain.cancelScheduledValues(ctx.currentTime);
      voice.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      amb.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    },
    duck(on) { if (ctx) music.gain.setTargetAtTime(on ? 0.12 : 0.5, ctx.currentTime, 0.15); },
    setIntensity(x) { intensity = x; },
    setMuted(m) { muted = m; if (ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); if (m && 'speechSynthesis' in window) speechSynthesis.cancel(); },
    whistle, siren, busHorn, thak, dhishum, jump, land, pickup, count, fanfare, sad, say,
  };
})();
