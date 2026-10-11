// Procedural score: a pipe organ, a clock, the sea and the void — written for the film timeline.
// Audio time is the master clock while the film plays, so picture and score never drift apart.

const A4 = 440;
const mtof = m => A4 * Math.pow(2, (m - 69) / 12);
const N = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const n = s => { const m = /^([A-G][#b]?)(-?\d)$/.exec(s); return 12 * (+m[2] + 1) + N[m[1]]; };
const ch = str => str.split(' ').map(n);

function buildScore() {
  const E = [];
  const add = (t, type, o) => E.push({ t, type, ...o });
  const organ = (t, dur, notes, vel, reg = 'flute', o = {}) => (Array.isArray(notes) ? notes : [notes]).forEach(m => add(t, 'organ', { dur, m: typeof m === 'string' ? n(m) : m, vel, reg, ...o }));
  const rnd = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  // I — THE DUST (0–14)
  organ(.4, 13.8, 'A1', .17, 'pedal');
  organ(1.2, 13, ch('A3 C4 E4'), .075, 'flute', { att: 4 });
  organ(5.5, 8.6, ch('B4'), .055, 'flute', { att: 3 });
  const penta = ch('A5 C6 E6 G5 D6 E5 A6');
  for (let t = 2.2; t < 12.5; t += .55 + rnd() * 1.2) add(t, 'bell', { m: penta[Math.floor(rnd() * penta.length)], vel: .08 + rnd() * .08 });
  [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0].forEach((b, i) => add(11.1 + i * .2, 'tick', { vel: b ? .5 : .25, f: b ? 3200 : 2100 }));

  // II — ENDURANCE (14–28): the theme's ostinato wakes up
  const prog2 = [['F2', 'F3 A3 C4 E4', 'A4 C5 E5 C5'], ['E2', 'E3 G3 C4 E4', 'G4 C5 E5 C5'], ['D2', 'D3 F3 A3 C4', 'F4 A4 D5 A4'], ['A1', 'A2 E3 A3 C4', 'E4 A4 C5 A4']];
  prog2.forEach((c, i) => {
    const t = 14 + i * 3.5;
    organ(t, 3.6, c[0], .2, 'pedal');
    organ(t, 3.6, ch(c[1]), .08, 'principal', { att: .6 });
    const arp = ch(c[2]);
    for (let k = 0; k < 14; k++) organ(t + k * .25, .32, arp[k % 4], k % 2 ? .07 : .1, 'flute', { att: .01, rel: .5 });
  });
  organ(26.8, 1.6, ch('E4 A4 B4'), .1, 'flute', { att: 1 });

  // III — THE WORMHOLE (28–44): build, reeds enter, everything rises
  const prog3 = [['F1', 'F3 A3 C4 F4', 'C5 F5 A5 F5'], ['G1', 'G3 B3 D4 G4', 'D5 G5 B5 G5'], ['A1', 'A3 C4 E4 A4', 'E5 A5 C6 A5'], ['E1', 'E3 G3 B3 E4', 'B4 E5 G5 E5']];
  prog3.forEach((c, i) => {
    const t = 28 + i * 3.25;
    const v = .07 + i * .03;
    organ(t, 3.3, c[0], .26 + i * .04, 'pedal');
    organ(t, 3.3, ch(c[1]), v, i >= 2 ? 'reed' : 'principal', { att: .4 });
    const arp = ch(c[2]);
    for (let k = 0; k < 16; k++) organ(t + k * .203, .26, arp[k % 4], .06 + i * .02, 'flute', { att: .01, rel: .4 });
  });
  organ(41, 3, ch('A1 A2 E3 A3 C4 E4 A4 B4'), .2, 'reed', { att: 2.6, rel: .05, gliss: 1 });
  add(40.6, 'swell', { dur: 3.4, f0: 200, f1: 6000, vel: .5 });
  add(44.02, 'impact', { vel: .7 });

  // IV — MILLER (44–60): every tick is a day on Earth
  for (let t = 44.6; t < 60; t += 1.25) add(t, 'tick', { vel: .55 + (t - 44) / 16 * .45, f: 2600, thud: t > 52 ? (t - 52) / 8 : 0 });
  organ(44.5, 8, ch('D2'), .3, 'pedal');
  organ(45, 7.5, ch('E5 F5'), .05, 'flute', { att: 3 });
  organ(52.5, 2.5, 'D2', .35, 'pedal'); organ(55, 2.5, 'E2', .4, 'pedal'); organ(57.5, 2.5, 'F2', .48, 'pedal', { rel: .05 });
  organ(52.5, 7.5, ch('D4 F4 A4 Bb4'), .12, 'reed', { att: 5, rel: .05 });
  add(50, 'rumble', { dur: 10, vel: .9 });
  add(59.96, 'impact', { vel: 1 });

  // V — GARGANTUA (60–84): the full organ, then the silence of the horizon
  const big = [[60.6, 'A1 A2 E3 A3 C4 E4 A4 C5'], [66.3, 'F1 F2 C3 A3 C4 F4 A4 C5'], [71.5, 'C2 G2 C3 G3 C4 E4 G4 C5'], [75.8, 'D2 A2 D3 F3 A3 D4 F4 A4'], [79.2, 'E1 E2 B2 E3 G#3 B3 E4 G#4 B4 E5']];
  big.forEach(([t, c], i) => {
    const nx = big[i + 1] ? big[i + 1][0] : 81.9;
    organ(t, nx - t + (i === big.length - 1 ? 0 : .4), ch(c), .12 + i * .035, i >= 3 ? 'reed' : 'principal', { att: i === 0 ? 3.5 : 1.2, rel: i === big.length - 1 ? .02 : 1.5 });
  });
  organ(60.6, 21.3, 'A0', .35, 'pedal', { rel: .02 });
  for (let k = 0; k < 40; k++) organ(66.3 + k * .3, .4, ch('A5 C6 E6 C6 B5 E6 A5 G5')[k % 8], .035 + k * .0012, 'flute', { att: .02, rel: .4 });
  add(75.5, 'swell', { dur: 6.3, f0: 60, f1: 3000, vel: .45, cut: true });
  add(82.2, 'whine', { dur: 1.8, vel: .05 });

  // VI — TESSERACT (84–100): light, time folding over itself
  add(84, 'impact', { vel: .4, soft: true });
  const prog6 = [['C2', 'C4 E4 G4', 'C5 E5 G5 B5 C6 B5 G5 E5'], ['B1', 'B3 D4 G4', 'B4 D5 G5 A5 B5 A5 G5 D5'], ['A1', 'A3 C4 E4', 'A4 C5 E5 G5 A5 G5 E5 C5'], ['F1', 'F3 A3 C4 E4', 'A4 C5 F5 E5 F5 C5 A4 E5']];
  prog6.forEach((c, i) => {
    const t = 84.6 + i * 3.8;
    organ(t, 3.9, c[0], .22, 'pedal');
    organ(t, 3.9, ch(c[1]), .08, 'flute', { att: 1 });
    const arp = ch(c[2]);
    for (let k = 0; k < 24; k++) add(t + k * .158, 'bell', { m: arp[k % 8], vel: .035 + .02 * Math.sin(k * .7 + i) });
  });
  add(91.8, 'swell', { dur: 2.6, f0: 300, f1: 4000, vel: .22, rev: true });

  // VII — STAY (100–112)
  organ(100.3, 11.5, 'A1', .16, 'pedal');
  organ(100.6, 6, ch('A3 C4 E4 B4'), .08, 'flute', { att: 3 });
  organ(106.4, 5.4, ch('F3 A3 C4 E4 G4'), .09, 'flute', { att: 1.5 });
  const mel = [[101.5, 'E5', 1.2], [102.7, 'A5', .6], [103.3, 'B5', .6], [103.9, 'C6', 2], [106.3, 'B5', 1], [107.3, 'G5', 1], [108.3, 'A5', 3.5]];
  mel.forEach(([t, m, d]) => organ(t, d, m, .09, 'principal', { att: .15 }));
  // the watch: S T A Y in Morse
  let mt = 104.2;
  ['...', '-', '.-', '-.--'].forEach(l => { [...l].forEach(c => { add(mt, 'beep', { dur: c === '.' ? .09 : .27 }); mt += (c === '.' ? .09 : .27) + .09; }); mt += .2; });

  // the docking chapter (60–70) is inserted into the timeline: everything after the wave moves 10 s later
  E.forEach(e => { if (e.t >= 60.2) e.t += 10; });
  // DOCKING — a pulse that tightens as the spins converge
  add(60.4, 'rumble', { dur: 9.4, vel: .5 });
  organ(60.6, 9.3, 'A0', .3, 'pedal', { att: 1.5, rel: .05 });
  organ(60.6, 9.3, ch('A2 E3'), .1, 'principal', { att: 2, rel: .05 });
  const dk = ch('A4 E5 A4 C5 A4 E5 B4 E5');
  for (let k = 0; k < 37; k++) {
    const t = 60.8 + k * .25;
    organ(t, .3, dk[k % 8], .035 + k * .0022, k > 20 ? 'principal' : 'flute', { att: .01, rel: .35 });
    if (k % 2 === 0) add(t, 'tick', { vel: .3 + k * .012, f: 2800 });
  }
  organ(65.2, 4.7, ch('C4 E4 A4'), .07, 'reed', { att: 3.5, rel: .05 });
  add(67.4, 'swell', { dur: 2.55, f0: 120, f1: 5000, vel: .45, cut: true });
  E.sort((a, b) => a.t - b.t);
  return E;
}

// The Douyin cut (49 s): every chord change lands on a click or a cut.
export function buildTrailer() {
  const E = [];
  const add = (t, type, o) => E.push({ t, type, ...o });
  const organ = (t, dur, notes, vel, reg = 'flute', o = {}) => (Array.isArray(notes) ? notes : [notes]).forEach(m => add(t, 'organ', { dur, m: typeof m === 'string' ? n(m) : m, vel, reg, ...o }));
  const arp = (t0, t1, notes, step, vel, reg = 'flute') => { const ns = ch(notes); let k = 0; for (let t = t0; t < t1 - .05; t += step, k++) organ(t, step * 1.3, ns[k % ns.length], vel * (k % 2 ? .75 : 1), reg, { att: .01, rel: .35 }); };
  // HOOK — one huge chord, the void opening
  add(0, 'impact', { vel: .8 });
  organ(0, 3.3, ch('A1 A2 E3 A3 C4 E4 B4'), .16, 'principal', { att: .25, rel: 1.4 });
  organ(0, 3.3, 'A0', .3, 'pedal', { rel: 1 });
  [1.1, 1.6, 2.05, 2.5].forEach((t, i) => add(t, 'bell', { m: ch('E6 B5 C6 A5')[i], vel: .09 }));
  // EXPLORE — ostinato that changes chord on every click
  const ex = [
    [3.2, 4.9, 'A1', 'A3 C4 E4', 'A4 E5 C5 E5'],
    [4.9, 6.6, 'F1', 'F3 A3 C4 E4', 'A4 F5 C5 F5'],
    [6.6, 8.2, 'E1', 'E3 G3 C4 E4', 'G4 E5 C5 E5'],
    [8.2, 9.7, 'G1', 'G3 B3 D4 G4', 'B4 G5 D5 G5'],
    [9.7, 11.2, 'E1', 'E3 G3 B3 E4', 'B4 E5 G5 E5'],
    [11.2, 12.7, 'F1', 'F3 A3 C4 F4', 'C5 F5 A5 F5'],
    [12.7, 14.2, 'D1', 'D3 F3 A3 D4', 'A4 D5 F5 D5'],
    [14.2, 15.5, 'C2', 'C4 E4 G4 B4', 'C5 G5 E5 B5'],
    [15.5, 16.8, 'G1', 'G3 B3 D4 A4', 'B4 D5 G5 D5'],
    [16.8, 18.5, 'A1', 'A3 C4 E4 B4', 'A4 E5 B5 E5'],
    [18.5, 20.3, 'E1', 'E3 G#3 B3 E4', 'G#4 B4 E5 B4'],
  ];
  ex.forEach(([a, b, bass, pad, a4], i) => {
    const v = .045 + i * .006;
    organ(a, b - a + .1, bass, .2 + i * .012, 'pedal', { att: .05, rel: .4 });
    organ(a, b - a + .1, ch(pad), v + .02, i > 6 ? 'principal' : 'flute', { att: .12, rel: .5 });
    arp(a, b, a4, i < 3 ? .2 : .1667, .06 + i * .004);
  });
  [4.9, 8.2, 11.2, 14.2, 16.8, 20.3].forEach(t => add(t, 'tick', { vel: .22, f: 5200 }));
  add(5.5, 'swell', { dur: 2.7, f0: 120, f1: 1400, vel: .16 });          // the zoom toward the hole
  for (let k = 0; k < 4; k++) add(11.4 + k * .7, 'tick', { vel: .3, f: 2600 });  // Miller's clock
  add(18.6, 'swell', { dur: 1.7, f0: 200, f1: 7000, vel: .45, cut: true });
  // FILM — Earth and Saturn
  add(20.3, 'impact', { vel: .65 });
  organ(20.3, 3.8, ch('F1 F2 C3 A3 C4 F4 A4'), .14, 'principal', { att: .2 });
  organ(24.0, 2.7, ch('D2 A2 D3 F3 A3 D4 F4'), .14, 'principal', { att: .3 });
  arp(20.4, 26.6, 'A5 C6 F5 C6 E5 A5', .1667, .045, 'flute');
  organ(26.6, 2.05, ch('A1 A2 E3 A3 C4 E4 A4 B4'), .16, 'reed', { att: 1.6, rel: .03, gliss: 1 });
  add(26.6, 'swell', { dur: 2.0, f0: 300, f1: 8000, vel: .5, cut: true });
  // Miller — the clock, the sea, the wall
  add(28.6, 'impact', { vel: .7 });
  for (let t = 28.75; t < 33.4; t += .625) add(t, 'tick', { vel: .55 + (t - 28.6) * .08, f: 2600, thud: (t - 28.6) / 5 });
  organ(28.6, 1.7, 'D2', .3, 'pedal'); organ(30.2, 1.6, 'E2', .36, 'pedal'); organ(31.8, 1.6, 'F2', .44, 'pedal', { rel: .03 });
  organ(30.2, 3.2, ch('D4 F4 A4 Bb4'), .12, 'reed', { att: 2.2, rel: .03 });
  add(29.6, 'rumble', { dur: 3.8, vel: 1 });
  add(33.38, 'impact', { vel: 1 });
  // Gargantua — the full organ, then nothing
  organ(33.8, 3.1, ch('A1 A2 E3 A3 C4 E4 A4 C5'), .17, 'principal', { att: .6, rel: 1.2 });
  organ(33.8, 6.8, 'A0', .38, 'pedal', { rel: .02 });
  organ(36.8, 1.6, ch('F1 F2 C3 A3 C4 F4 A4 C5'), .19, 'principal', { att: .3, rel: 1 });
  organ(38.3, 2.3, ch('E1 E2 B2 E3 G#3 B3 E4 G#4 B4 E5'), .22, 'reed', { att: .5, rel: .02 });
  arp(34.0, 40.5, 'A5 C6 E6 C6 B5 E6 A5 G#5', .15, .04, 'flute');
  add(38.6, 'swell', { dur: 2.0, f0: 60, f1: 3000, vel: .5, cut: true });
  add(40.65, 'whine', { dur: .7, vel: .05 });
  // Tesseract — light
  add(41.3, 'impact', { vel: .45, soft: true });
  organ(41.3, 2.3, ch('C2 C4 E4 G4'), .09, 'flute', { att: .4 });
  for (let k = 0; k < 14; k++) add(41.35 + k * .158, 'bell', { m: ch('C5 E5 G5 B5 C6 B5 G5 E5')[k % 8], vel: .05 });
  // STAY
  organ(43.5, 5.4, 'A1', .17, 'pedal', { rel: 1.5 });
  organ(43.5, 2.5, ch('A3 C4 E4 B4'), .08, 'flute', { att: .6 });
  let mt = 44.0 - .4;
  ['...', '-', '.-', '-.--'].forEach((l, i) => { mt = MORSE_START[i]; [...l].forEach(c => { add(mt, 'beep', { dur: c === '.' ? .07 : .2 }); mt += (c === '.' ? .07 : .2) + .06; }); });
  organ(45.9, 3.4, ch('F3 A3 C4 E4 G4'), .09, 'flute', { att: .8, rel: 1.2 });
  [[45.9, 'E5', .5], [46.4, 'A5', .4], [46.8, 'B5', .4], [47.2, 'C6', 1.9]].forEach(([t, m, d]) => organ(t, d, m, .1, 'principal', { att: .08, rel: 1.4 }));
  E.sort((a, b) => a.t - b.t);
  return E;
}
const MORSE_START = [43.62, 44.12, 44.5, 44.86];

const REG = {
  flute: [1, .32, .06, .03],
  principal: [1, .55, .32, .2, .12, .08, .05, .035, .02],
  reed: [1, .8, .7, .55, .5, .4, .32, .26, .2, .16, .12, .1],
  pedal: [1, .7, .4, .25, .1, .06],
};

export class Score {
  constructor(events) { this.events = events || buildScore(); this.ctx = null; this.live = new Set(); this.ptr = 0; this.muted = false; this.anchor = 0; this.playing = false; this.pausedAt = 0; }
  get ok() { return !!this.ctx; }
  init(given) {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC && !given) return;
    const ctx = this.ctx = given || new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : .9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .02; comp.release.value = .4;
    this.master.connect(comp).connect(ctx.destination);
    this.dry = ctx.createGain(); this.dry.gain.value = .55; this.dry.connect(this.master);
    this.rev = ctx.createConvolver(); this.rev.buffer = this.impulse(6.5, 2.4);
    this.wet = ctx.createGain(); this.wet.gain.value = .75; this.rev.connect(this.wet).connect(this.master);
    this.waves = {}; for (const k in REG) { const h = REG[k]; const re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1); h.forEach((a, i) => im[i + 1] = a); this.waves[k] = ctx.createPeriodicWave(re, im); }
    const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.ambient = null;
  }
  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const x = Math.random() * 2 - 1; lp = lp * .55 + x * .45; d[i] = lp * Math.pow(1 - i / len, decay) * (i < 200 ? i / 200 : 1); } }
    return b;
  }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : .9, this.ctx.currentTime, .08); }
  // ——— film transport ———
  running() { return this.ctx && this.ctx.state === 'running'; }
  time() { if (!this.running()) return null; return this.playing ? this.ctx.currentTime - this.anchor : this.pausedAt; }
  resync(t) { if (this.ctx && !this.running()) { this.anchor = this.ctx.currentTime - t; this.seekPtr(t, false); } }
  play(from) { if (!this.ctx) return; this.stopAll(); this.anchor = this.ctx.currentTime - from; this.playing = true; this.seekPtr(from, true); }
  pause() { if (!this.ctx) return; this.pausedAt = this.time(); this.playing = false; this.stopAll(); }
  seek(t) { if (!this.ctx) return; if (this.playing) this.play(t); else { this.pausedAt = t; } }
  seekPtr(t, resumeHeld) {
    this.ptr = this.events.findIndex(e => e.t >= t - 25); if (this.ptr < 0) this.ptr = this.events.length;
    while (this.ptr < this.events.length && this.events[this.ptr].t < t) {
      const e = this.events[this.ptr];
      if (resumeHeld && e.dur && e.t + e.dur > t + .3 && (e.type === 'organ' || e.type === 'rumble')) this.fire({ ...e, dur: e.t + e.dur - t, att: Math.min(e.att || .3, .4) }, this.ctx.currentTime + .02);
      this.ptr++;
    }
  }
  pump() {
    if (!this.running() || !this.playing) return;
    const now = this.time(), ahead = now + .35;
    while (this.ptr < this.events.length && this.events[this.ptr].t < ahead) {
      const e = this.events[this.ptr++];
      this.fire(e, Math.max(this.ctx.currentTime, this.anchor + e.t));
    }
  }
  stopAll() { const t = this.ctx.currentTime; for (const nd of this.live) { try { if (nd.gain) { nd.gain.cancelScheduledValues(t); nd.gain.setTargetAtTime(0, t, .05); } else nd.stop(t + .25); } catch (e) { } } this.live.clear(); }
  track(...nodes) { nodes.forEach(x => { this.live.add(x); if (x.onended !== undefined) x.onended = () => this.live.delete(x); }); }
  out(node, wet = .6) { node.connect(this.dry); const s = this.ctx.createGain(); s.gain.value = wet; node.connect(s).connect(this.rev); }
  fire(e, at) {
    const f = this['_' + e.type]; if (f) f.call(this, e, at);
  }
  _organ(e, at) {
    const ctx = this.ctx, f = mtof(e.m), att = e.att ?? .25, rel = e.rel ?? 1.2, dur = Math.max(.05, e.dur);
    const g = ctx.createGain(); const peak = e.vel * (e.m < 40 ? 1.2 : 1) * .5;
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + att); g.gain.setValueAtTime(peak, at + Math.max(att, dur)); g.gain.linearRampToValueAtTime(0, at + Math.max(att, dur) + rel);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(12000, f * (e.reg === 'reed' ? 14 : 8)); lp.Q.value = .3;
    const end = at + Math.max(att, dur) + rel + .1;
    for (const det of [-4, 3.5]) {
      const o = ctx.createOscillator(); o.setPeriodicWave(this.waves[e.reg] || this.waves.flute);
      o.frequency.value = f; o.detune.value = det + (Math.random() - .5) * 2;
      if (e.gliss) o.detune.linearRampToValueAtTime(det + 120, end);
      o.connect(lp); o.start(at); o.stop(end); this.track(o);
    }
    // wind noise in the pipe
    lp.connect(g); this.out(g, e.reg === 'pedal' ? .45 : .7); this.track(g);
  }
  _bell(e, at) {
    const ctx = this.ctx, f = mtof(e.m);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(e.vel, at + .005); g.gain.exponentialRampToValueAtTime(.0001, at + 2.6);
    [[1, 1], [2.76, .35], [5.4, .12]].forEach(([r, a]) => { const o = ctx.createOscillator(); o.frequency.value = f * r; const og = ctx.createGain(); og.gain.value = a; o.connect(og).connect(g); o.start(at); o.stop(at + 2.7); this.track(o); });
    this.out(g, .9); this.track(g);
  }
  _tick(e, at) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = e.f || 2600; bp.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(e.vel * .9, at); g.gain.exponentialRampToValueAtTime(.001, at + .05);
    s.connect(bp).connect(g); this.out(g, .5); s.start(at, Math.random()); s.stop(at + .07); this.track(s, g);
    if (e.thud) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, at); o.frequency.exponentialRampToValueAtTime(38, at + .4); const og = ctx.createGain(); og.gain.setValueAtTime(e.thud * .7, at); og.gain.exponentialRampToValueAtTime(.001, at + .6); o.connect(og); this.out(og, .3); o.start(at); o.stop(at + .65); this.track(o, og); }
  }
  _beep(e, at) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.frequency.value = 1760; o.type = 'sine';
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.05, at + .01); g.gain.setValueAtTime(.05, at + e.dur - .01); g.gain.linearRampToValueAtTime(0, at + e.dur);
    o.connect(g); this.out(g, .5); o.start(at); o.stop(at + e.dur + .05); this.track(o, g);
  }
  _swell(e, at) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(e.f0, at); bp.frequency.exponentialRampToValueAtTime(e.f1, at + e.dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(e.vel * .5, at + e.dur * (e.rev ? .95 : .9));
    g.gain.linearRampToValueAtTime(0, at + e.dur + (e.cut ? .02 : .3));
    s.connect(bp).connect(g); this.out(g, .6); s.start(at); s.stop(at + e.dur + .4); this.track(s, g);
  }
  _rumble(e, at) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(e.vel * .9, at + e.dur); g.gain.linearRampToValueAtTime(0, at + e.dur + .03);
    s.connect(lp).connect(g); g.connect(this.dry); s.start(at); s.stop(at + e.dur + .1); this.track(s, g);
  }
  _impact(e, at) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.frequency.setValueAtTime(e.soft ? 70 : 110, at); o.frequency.exponentialRampToValueAtTime(28, at + 1.4);
    const g = ctx.createGain(); g.gain.setValueAtTime(e.vel * .9, at); g.gain.exponentialRampToValueAtTime(.001, at + 2.2);
    o.connect(g); this.out(g, .5); o.start(at); o.stop(at + 2.3); this.track(o, g);
    const s = ctx.createBufferSource(); s.buffer = this.noise; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(e.soft ? 1500 : 4000, at); lp.frequency.exponentialRampToValueAtTime(80, at + 1.5);
    const ng = ctx.createGain(); ng.gain.setValueAtTime(e.vel * .6, at); ng.gain.exponentialRampToValueAtTime(.001, at + 1.8);
    s.connect(lp).connect(ng); this.out(ng, .7); s.start(at); s.stop(at + 2); this.track(s, ng);
  }
  _whine(e, at) {
    const ctx = this.ctx, o = ctx.createOscillator(); o.frequency.value = 7040;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(e.vel * .15, at + .5); g.gain.linearRampToValueAtTime(0, at + e.dur);
    o.connect(g); g.connect(this.dry); o.start(at); o.stop(at + e.dur + .05); this.track(o, g);
  }
  // ——— explore ambience: a slow chord per world ———
  ambience(chord) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    if (this.ambient) { const a = this.ambient; a.g.gain.cancelScheduledValues(t); a.g.gain.setTargetAtTime(0, t, .8); setTimeout(() => a.os.forEach(o => { try { o.stop(); } catch (e) { } }), 4000); this.ambient = null; }
    if (!chord) return;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + 3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.connect(g); this.out(g, .9);
    const os = [];
    ch(chord).forEach((m, i) => {
      const o = ctx.createOscillator(); o.setPeriodicWave(i === 0 ? this.waves.pedal : this.waves.flute); o.frequency.value = mtof(m);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .05 + i * .03; lg.gain.value = .35;
      const og = ctx.createGain(); og.gain.value = i === 0 ? .6 : .32;
      lfo.connect(lg).connect(og.gain); o.connect(og).connect(lp); o.start(); lfo.start(); os.push(o, lfo);
    });
    this.ambient = { g, os };
  }
}
