// ENDURANCE — the trailer. A frame-exact director: picture, title cards, narration subtitles and the
// score are all generated from one timeline, so every hit lands on its cut. Original music and words throughout.
import * as THREE from 'three';
import { RS } from './worlds/gargantua.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = id => document.getElementById(id);

// ——— the cut ———  [t0, t1, kind, world, shot, u0, u1, fx]
const TL = [
  [0.00, 2.40, 'black'],
  [2.40, 7.00, 'film', 'dust', 'fall', .12, .50],
  [7.00, 7.35, 'black'],
  [7.35, 10.50, 'film', 'dust', 'fall', .62, .95],
  [10.50, 11.00, 'black'],
  [11.00, 14.00, 'card', 'prod'],
  [14.00, 18.50, 'film', 'earth', 'dawn', .20, .95, { fadeIn: .8 }],
  [18.50, 20.50, 'card', 'c1'],
  [20.50, 24.00, 'film', 'earth', 'depart', .10, .90],
  [24.00, 27.50, 'film', 'saturn', 'vista', .10, .80],
  [27.50, 29.50, 'card', 'c2'],
  [29.50, 32.50, 'film', 'saturn', 'approach', .20, .90],
  [32.50, 34.00, 'film', 'saturn', 'enter', .30, 1, { warp: 'ramp', whiteOut: .3 }],
  [34.00, 37.00, 'film', 'garg', 'reveal', .35, .95, { whiteIn: .5 }],
  [37.00, 39.00, 'card', 'c3'],
  [39.00, 42.00, 'film', 'miller', 'calm', .30, .80],
  [42.00, 44.00, 'card', 'c4'],
  [44.00, 48.00, 'film', 'miller', 'low', .20, 1, { shake: .5 }],
  [48.00, 48.50, 'black'],
  [48.50, 51.50, 'film', 'dock', 'chase', 0, .60],
  [51.50, 53.50, 'card', 'c5'],
  [53.50, 58.00, 'film', 'dock', 'dock', .45, .97],
  // montage: the cuts accelerate
  [58.00, 59.50, 'film', 'garg', 'passby', .30, .75],
  [59.50, 60.70, 'film', 'tess', 'fall', .05, .30],
  [60.70, 61.70, 'film', 'miller', 'rise', .60, .90, { shake: .8 }],
  [61.70, 62.60, 'film', 'dock', 'wide', .20, .80],
  [62.60, 63.40, 'film', 'saturn', 'enter', .50, .90, { warp: 'ramp' }],
  [63.40, 64.10, 'film', 'garg', 'orbit', .20, .60],
  [64.10, 64.70, 'film', 'earth', 'dawn', .60, .85],
  [64.70, 65.20, 'film', 'dust', 'fall', .85, .95],
  [65.20, 65.70, 'film', 'garg', 'flyby', .30, .60],
  [65.70, 66.10, 'film', 'tess', 'drift', .20, .50],
  [66.10, 66.50, 'film', 'dock', 'dock', .60, .80],
  [66.50, 66.85, 'film', 'miller', 'low', .80, .95, { shake: .8 }],
  [66.85, 67.15, 'film', 'garg', 'orbit', .70, .80],
  [67.15, 69.00, 'film', 'garg', 'dive', .40, 1, { warp: 'end', shake: 1, whiteOut: .25 }],
  [69.00, 70.60, 'black'],                                  // total silence
  [70.60, 77.00, 'film', 'garg', 'reveal', .0, .5, { title: 1 }],
  [77.00, 78.00, 'black'],
  [78.00, 84.00, 'film', 'dust', 'stay', .20, .95, { fadeIn: .6, morse: 1 }],
  [84.00, 87.00, 'card', 'tag'],
  [87.00, 92.00, 'card', 'end'],
];
export const TRAILER_END = 92;

const CARDS = {
  prod: { en: 'A FILM RENDERED IN REAL TIME', zh: '一部在浏览器里实时渲染的电影', small: true },
  c1: { en: 'ONE LAST JOURNEY', zh: '最后一次远行' },
  c2: { en: 'ONE DOOR', zh: '一扇门' },
  c3: { en: 'ONE HOUR', zh: '一小时' },
  c4: { en: 'SEVEN YEARS', zh: '七年' },
  c5: { en: 'ONE CHANCE', zh: '只有一次机会' },
  tag: { en: 'TIME BENDS. LOVE DOESN’T.', zh: '时间会弯曲。爱不会。' },
};
// narration (English voice, Chinese subtitles) — start times; the clips are placed by the mixer at the same times
export const VO = [
  [0.55, 'The dust wasn’t falling at random.', '尘埃落下的方式，并不随机。'],
  [7.60, 'It was speaking — in gravity.', '它在说话——用引力。'],
  [14.70, 'So we looked up.', '于是，我们抬起头。'],
  [39.30, 'One hour here is seven years on Earth.', '这里的一小时，是地球上的七年。'],
  [48.80, 'Match its spin. Then close in.', '匹配它的转速，然后，靠上去。'],
  [78.40, 'Gravity crosses time. Perhaps love does too.', '引力能穿越时间——也许，爱也能。'],
];
let voDur = VO.map(() => 3);          // filled in from the generated clips (window.VO_DUR) for subtitle timing

let A;
export async function setup(api) {
  A = api;
  if (window.VO_DUR) voDur = window.VO_DUR;
  const css = document.createElement('style');
  css.textContent = `
    #tr { position: fixed; inset: 0; z-index: 40; pointer-events: none; font-family: var(--sans); }
    #tr-card { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    #tr-card .en { font: 300 92px/1.1 var(--sans); letter-spacing: .34em; padding-left: .34em; color: transparent;
      background: linear-gradient(100deg, #8a8172 0%, #e9e2d6 38%, #ffffff 50%, #e9e2d6 62%, #8a8172 100%); background-size: 260% 100%;
      -webkit-background-clip: text; background-clip: text; filter: drop-shadow(0 0 18px rgba(255,220,170,.18)); }
    #tr-card .zh { margin-top: 26px; font: 400 26px var(--serif); letter-spacing: .5em; padding-left: .5em; color: rgba(236,231,222,.72); }
    #tr-card.small .en { font-size: 30px; letter-spacing: .6em; padding-left: .6em; }
    #tr-card.small .zh { font-size: 18px; letter-spacing: .4em; }
    #tr-card.end .en { font-size: 120px; letter-spacing: .5em; padding-left: .5em; }
    #tr-card.tag .en { font-size: 64px; letter-spacing: .26em; padding-left: .26em; white-space: nowrap; }
    #tr-card .meta { margin-top: 46px; font: 400 15px var(--mono); letter-spacing: .32em; color: rgba(236,231,222,.6); line-height: 2.2; }
    #tr-card .meta b { color: #e8b46a; font-weight: 400; }
    #tr-title { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    #tr-title .t { font: 200 150px/1 var(--sans); letter-spacing: .52em; padding-left: .52em; color: transparent;
      background: linear-gradient(100deg, rgba(255,255,255,.55) 0%, #fff 45%, #fff6e8 50%, #fff 55%, rgba(255,255,255,.55) 100%); background-size: 300% 100%;
      -webkit-background-clip: text; background-clip: text; filter: drop-shadow(0 0 30px rgba(0,0,0,.9)) drop-shadow(0 0 60px rgba(255,200,140,.35)); }
    #tr-sub { position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; }
    #tr-sub .zh { font: 400 30px var(--serif); letter-spacing: .14em; color: #f3eee6; text-shadow: 0 1px 14px #000; }
    #tr-sub .en { margin-top: 8px; font: 300 15px var(--sans); letter-spacing: .24em; color: rgba(236,231,222,.66); text-shadow: 0 1px 10px #000; }
    #tr-morse { position: absolute; left: 0; right: 0; top: 40%; text-align: center; font: 300 56px var(--mono); letter-spacing: .7em; padding-left: .7em; color: #fff; text-shadow: 0 0 20px rgba(255,220,170,.6); }
    #tr-morse small { display: block; margin-top: 16px; font-size: 15px; letter-spacing: .4em; color: rgba(236,231,222,.6); }
    #film, #explore, #intro, #end { display: none !important; }
  `;
  document.head.appendChild(css);
  const tr = document.createElement('div'); tr.id = 'tr';
  tr.innerHTML = `<div id="tr-card"></div><div id="tr-title"><div class="t">ENDURANCE</div></div><div id="tr-morse"></div><div id="tr-sub"><div class="zh"></div><div class="en"></div></div>`;
  document.body.appendChild(tr);
  A.setState('film');
  await document.fonts.ready;
  window.render = render; window.PROMO_END = TRAILER_END;
  window.__ready = true;
}

const segAt = p => TL.find(s => p >= s[0] && p < s[1]) || TL[TL.length - 1];
const FILM_T = { fall: [0, 14], dawn: [14, 21.5], depart: [21.5, 28], vista: [28, 35.5], approach: [35.5, 41], enter: [41, 44], calm: [44, 49], low: [52.5, 60], rise: [52.5, 60], chase: [60, 63.2], dock: [63.2, 70], wide: [60, 63.2], reveal: [70, 79.5], passby: [79.5, 86], flyby: [79.5, 86], orbit: [70, 79.5], dive: [86, 94], drift: [102.5, 110], stay: [110, 122] };

export function render(p) {
  const W = A.W, post = A.post, U = post.u;
  const s = segAt(p), [t0, t1, kind] = s, d = t1 - t0, into = p - t0, left = t1 - p, lu = clamp(into / d, 0, 1);
  let world = W.garg, fade = 1, white = false, warp = 0, shake = 0;
  const bar = Math.max(0, (innerHeight - innerWidth / 2.39) / 2);
  document.documentElement.style.setProperty('--bar', (kind === 'film' ? bar : 0) + 'px');
  A.updateBars(kind === 'film');
  // ——— picture ———
  if (kind === 'film') {
    const [, , , w, shot, u0, u1, fx = {}] = s;
    world = W[w];
    const uu = lerp(u0, u1, lu), R = FILM_T[shot] || [0, 10], T = lerp(R[0], R[1], uu);
    if (w === 'garg') world.setDoppler(0);
    if (w === 'dust') world.manual = false;
    world.shots[shot](uu, T);
    world.update(T, 0, 'film');
    fade = 0;
    if (fx.warp === 'ramp') warp = Math.pow(lu, 2.2);
    if (fx.warp === 'end') warp = sm(.6, 1, lu) * .9;
    if (fx.shake) shake = fx.shake * sm(.2, 1, lu);
    if (fx.whiteOut) { const k = 1 - clamp(left / fx.whiteOut, 0, 1); if (k > 0) { fade = k; white = true; } }
    if (fx.whiteIn) { const k = 1 - clamp(into / fx.whiteIn, 0, 1); if (k > 0) { fade = Math.max(fade, k); white = true; } }
    if (fx.fadeIn) fade = Math.max(fade, 1 - clamp(into / fx.fadeIn, 0, 1));
    // a whisper of black between the slow shots, none in the montage
    if (d > 2 && !fx.whiteOut) fade = Math.max(fade, 1 - clamp(left / .18, 0, 1));
    if (fx.title) fade = Math.max(fade, sm(d - .9, d, into));
  }
  // ——— title cards ———
  const card = $('tr-card');
  if (kind === 'card') {
    const c = s[3];
    if (c === 'end') {
      card.className = 'end';
      card.innerHTML = `<div class="en">ENDURANCE</div><div class="zh">致敬《星际穿越》</div><div class="meta">每一帧都在浏览器里实时计算 · <b>每一行代码都由 AI 写成</b><br>ssasfaffssssssssa.github.io/endurance</div>`;
    } else {
      const C = CARDS[c]; card.className = C.small ? 'small' : c === 'tag' ? 'tag' : '';
      card.innerHTML = `<div class="en">${C.en}</div><div class="zh">${C.zh}</div>`;
    }
    const a = sm(0, .35, into) * (1 - sm(d - .3, d, into));
    card.style.opacity = a.toFixed(3);
    card.style.transform = `scale(${(1.045 - .045 * sm(0, d, into)).toFixed(4)})`;
    const en = card.querySelector('.en'); if (en) en.style.backgroundPosition = `${(100 - lu * 100).toFixed(1)}% 0`;
  } else card.style.opacity = 0;
  // ——— main title over Gargantua ———
  const tt = $('tr-title');
  if (kind === 'film' && s[7] && s[7].title) {
    const a = sm(.15, 1.4, into) * (1 - sm(d - 1.1, d - .2, into));
    tt.style.opacity = a.toFixed(3);
    tt.style.transform = `scale(${(1.08 - .08 * sm(0, d, into)).toFixed(4)})`;
    tt.firstChild.style.backgroundPosition = `${(100 - sm(.3, 3.2, into) * 100).toFixed(1)}% 0`;
  } else tt.style.opacity = 0;
  // ——— morse: S T A Y ———
  const mo = $('tr-morse');
  if (kind === 'film' && s[7] && s[7].morse) {
    const k = clamp(Math.floor((into - .9) / .85) + 1, 0, 4);
    mo.innerHTML = ('S T A Y'.slice(0, Math.max(1, k * 2 - 1)) || '&nbsp;') + '<small>· · · &nbsp;— &nbsp;· — &nbsp;— · — —</small>';
    mo.style.opacity = (sm(.7, 1.1, into) * (1 - sm(d - .6, d, into))).toFixed(3);
  } else mo.style.opacity = 0;
  // ——— narration subtitles ———
  const sb = $('tr-sub');
  const v = VO.findIndex((x, i) => p >= x[0] && p < x[0] + voDur[i] + .5);
  if (v >= 0) {
    sb.children[0].textContent = VO[v][2]; sb.children[1].textContent = VO[v][1];
    sb.style.opacity = Math.min(sm(VO[v][0], VO[v][0] + .25, p), 1 - sm(VO[v][0] + voDur[v] + .2, VO[v][0] + voDur[v] + .5, p)).toFixed(3);
    sb.style.bottom = (kind === 'film' ? Math.max(36, bar * .5 - 8) : 120) + 'px';
  } else sb.style.opacity = 0;
  // ——— finish ———
  const b = world.bloom;
  post.bloom.strength = b.strength; post.bloom.radius = b.radius; post.bloom.threshold = b.threshold;
  U.uExposure.value = world.exposure; U.uTime.value = p;
  U.uFade.value = fade; U.uFadeColor.value.setScalar(white ? 1 : 0);
  U.uWarp.value = warp; U.uShake.value = shake;
  U.uGrain.value = 1.35;
  if (world.camera.aspect !== innerWidth / innerHeight) { world.camera.aspect = innerWidth / innerHeight; world.camera.updateProjectionMatrix(); }
  post.render(world.scene, world.camera);
  return true;
}

// ——— the score: original, built on the same timeline ———
export function buildTrailerScore(n, ch) {
  const E = [];
  const add = (t, type, o) => E.push({ t, type, ...o });
  const organ = (t, dur, notes, vel, reg = 'flute', o = {}) => (Array.isArray(notes) ? notes : [notes]).forEach(m => add(t, 'organ', { dur, m: typeof m === 'string' ? n(m) : m, vel, reg, ...o }));
  const hit = (t, big = .5) => { add(t, 'taiko', { vel: .55 + big * .4 }); if (big > .4) add(t, 'braam', { vel: big * .8, dur: 1.6 + big * 2, notes: ch('A0 E1 A1 E2') }); add(t - .9, 'revcym', { dur: .9, vel: .18 + big * .2 }); };
  // COLD OPEN — a clock in the dark, dust in the light
  add(0, 'rumble', { dur: 11, vel: .25 });
  for (let t = .3; t < 10.6; t += 1) add(t, 'tick', { vel: .45, f: 2400 });
  organ(.4, 10.4, 'A1', .14, 'pedal', { att: 3 });
  organ(2.4, 8.1, ch('A3 C4 E4'), .06, 'flute', { att: 2.5 });
  [3.1, 4.2, 5.0, 6.1, 8.0, 8.9, 9.6].forEach((t, i) => add(t, 'bell', { m: ch('E6 B5 C6 A5 E6 G5 A5')[i], vel: .07 }));
  add(7.0, 'taiko', { vel: .35 });
  add(10.1, 'revcym', { dur: .9, vel: .3 });
  add(11.0, 'taiko', { vel: .8 }); add(11.0, 'subdrop', { vel: .6, dur: 2.6 });
  // ACT I — the theme: a rising organ figure over a tolling pedal
  organ(14.0, 4.6, ch('A1 A2'), .2, 'pedal', { att: .8 });
  add(14.0, 'strings', { notes: ch('A3 C4 E4 B4'), dur: 4.4, vel: .22, att: 2 });
  const motif = ch('A4 C5 E5 B4 C5 E5 A5 E5');
  for (let t = 14.2, k = 0; t < 34; t += .3333, k++) organ(t, .38, motif[k % 8] + (t > 24 ? 12 * (k % 16 === 0 ? 1 : 0) : 0), .045 + (t - 14) * .0028, t > 24 ? 'principal' : 'flute', { att: .01, rel: .35 });
  hit(18.5, .55);
  organ(18.5, 6, ch('F1 F2'), .22, 'pedal'); add(18.5, 'strings', { notes: ch('F3 A3 C4 E4'), dur: 5.5, vel: .24, att: .8 });
  organ(24.0, 3.6, ch('C2 C3'), .24, 'pedal'); add(24.0, 'strings', { notes: ch('G3 C4 E4 G4'), dur: 3.4, vel: .26, att: .6 });
  hit(27.5, .7);
  organ(27.5, 6.6, ch('E1 E2'), .26, 'pedal'); add(27.5, 'strings', { notes: ch('E3 G#3 B3 E4'), dur: 6.4, vel: .28, att: .5 });
  add(29.6, 'shepard', { dur: 4.4, vel: .5, cycle: 2.2 });
  add(32.4, 'whoosh', { dur: 1.6, vel: .5, f0: 200, f1: 7000 });
  add(33.1, 'revcym', { dur: .9, vel: .45 });
  // ACT II — first sight of Gargantua: the wall of sound
  add(34.0, 'braam', { vel: 1, dur: 4.5, notes: ch('A0 E1 A1 E2 A2'), bright: 2600 }); add(34.0, 'subdrop', { vel: .8, dur: 3 }); add(34.0, 'taiko', { vel: 1 });
  organ(34.1, 2.9, ch('A2 E3 A3 C4 E4 A4 C5'), .17, 'reed', { att: .4, rel: 1.6 });
  hit(37.0, .45);
  // Miller: every tick a day
  for (let t = 39.2; t < 48; t += 1.25 - Math.max(0, t - 44) * .12) add(t, 'tick', { vel: .6 + Math.max(0, t - 42) * .06, f: 2600, thud: t > 44 ? (t - 44) / 4 : 0 });
  organ(39.0, 5, 'D2', .2, 'pedal'); add(39.0, 'strings', { notes: ch('D4 E4 F4'), dur: 9, vel: .16, att: 3 });
  hit(42.0, .5);
  add(44.0, 'rumble', { dur: 4, vel: 1 }); add(44.2, 'shepard', { dur: 3.8, vel: .55, cycle: 1.9 });
  organ(44.0, 4, ch('D2 F2 A2 Bb2'), .2, 'reed', { att: 3, rel: .02 });
  add(48.0, 'impact', { vel: 1 }); add(48.0, 'subdrop', { vel: .9, dur: 2.4 });
  // the dock: a pulse that tightens
  organ(48.5, 9.5, 'A0', .3, 'pedal', { att: .5, rel: .05 });
  const dk = ch('A4 E5 A4 C5 A4 E5 B4 E5');
  for (let t = 48.6, k = 0; t < 58; k++) { organ(t, .3, dk[k % 8], .04 + (t - 48.6) * .006, t > 53.5 ? 'principal' : 'flute', { att: .01, rel: .3 }); if (k % 2 === 0) add(t, 'tick', { vel: .35 + (t - 48.6) * .03, f: 2900 }); t += t < 53.5 ? .3 : .2; }
  hit(51.5, .75);
  add(53.6, 'shepard', { dur: 4.4, vel: .6, cycle: 1.6 });
  add(53.5, 'strings', { notes: ch('A3 C4 E4 A4'), dur: 4.4, vel: .3, att: 3.5, rel: .05 });
  add(57.1, 'revcym', { dur: .9, vel: .55 });
  // ACT III — montage: a hit on every cut, the organ at full stretch
  const cuts = [58.0, 59.5, 60.7, 61.7, 62.6, 63.4, 64.1, 64.7, 65.2, 65.7, 66.1, 66.5, 66.85, 67.15];
  cuts.forEach((t, i) => { add(t, 'taiko', { vel: .7 + i * .015 }); if (i % 3 === 0) add(t, 'braam', { vel: .55 + i * .02, dur: 1.4, notes: ch('A0 E1 A1') }); });
  const chords = [[58, 'A1 A2 E3 A3 C4 E4 A4'], [60.7, 'F1 F2 C3 A3 C4 F4 A4'], [62.6, 'C2 C3 G3 C4 E4 G4 C5'], [64.7, 'E1 E2 B2 E3 G#3 B3 E4 G#4']];
  chords.forEach(([t, c], i) => organ(t, (chords[i + 1] ? chords[i + 1][0] : 69) - t, ch(c), .15 + i * .02, i >= 2 ? 'reed' : 'principal', { att: .1, rel: .02 }));
  for (let t = 58, k = 0; t < 69; t += .125, k++) add(t, 'tick', { vel: .3 + (t - 58) * .03, f: 3200 });
  add(67.15, 'shepard', { dur: 1.85, vel: .7, cycle: .9 }); add(67.2, 'swell', { dur: 1.8, f0: 200, f1: 9000, vel: .7, cut: true });
  // 69.0 – 70.6: silence. Then the title.
  add(70.6, 'braam', { vel: 1.1, dur: 6, notes: ch('A0 E1 A1 E2 A2'), bright: 3000, drive: 4.5 }); add(70.6, 'subdrop', { vel: 1, dur: 4 }); add(70.6, 'taiko', { vel: 1.1 }); add(70.6, 'impact', { vel: .9 });
  organ(70.7, 6, ch('A0 A1 E2 A2 C3 E3 A3 C4 E4 A4'), .14, 'principal', { att: 1.2, rel: 3 });
  // STAY — the watch, in the quiet
  organ(78.0, 6, ch('A3 C4 E4 B4'), .05, 'flute', { att: 2 });
  [78.6, 79.9, 81.0, 82.3].forEach((t, i) => add(t, 'bell', { m: ch('E5 A5 B5 C6')[i], vel: .08 }));
  let mt = 78.9;
  ['...', '-', '.-', '-.--'].forEach(l => { [...l].forEach(c => { add(mt, 'beep', { dur: c === '.' ? .09 : .27 }); mt += (c === '.' ? .09 : .27) + .09; }); mt += .4; });
  add(84.0, 'strings', { notes: ch('C3 G3 C4 E4 G4 D5'), dur: 3, vel: .2, att: 1.2 });
  organ(84.0, 3, ch('C2 C3'), .14, 'pedal');
  add(87.0, 'taiko', { vel: .8 }); add(87.0, 'subdrop', { vel: .7, dur: 3.5 }); add(87.0, 'braam', { vel: .55, dur: 4, notes: ch('A0 E1 A1'), bright: 1400 });
  organ(87.1, 4.2, ch('A1 A2 E3 A3 C4 E4 B4'), .1, 'principal', { att: .8, rel: 2.5 });
  E.sort((a, b) => a.t - b.t);
  return E;
}
