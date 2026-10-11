// ENDURANCE — the trailer (cut 2). One timeline drives picture, type, narration subtitles and the score,
// so every hit lands on its cut. Original music, words and design; a tribute to Interstellar.
import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const $ = id => document.getElementById(id);

// fx: zoom (push-in factor on the field of view), ramp (slow then surge), flash (white frames on the cut),
//     warp, shake, whiteIn/whiteOut/fadeIn, title, morse
const TL = [
  // ——— flash-forward: the hook ———
  [0.00, 1.60, 'film', 'garg', 'dive', .62, .86, { shake: .6, zoom: .9 }],
  [1.60, 2.40, 'black'],
  // ——— the quiet beginning ———
  [2.40, 7.20, 'film', 'dust', 'fall', .10, .45, { fadeIn: .7, zoom: .86 }],
  [7.20, 7.30, 'black'],
  [7.30, 10.80, 'film', 'dust', 'fall', .62, .95, { zoom: .9 }],
  [10.80, 13.20, 'card', 'prod'],
  // ——— act one ———
  [13.20, 17.20, 'film', 'earth', 'dawn', .25, .95, { fadeIn: .6, zoom: .9 }],
  [17.20, 20.20, 'film', 'earth', 'depart', .15, .85],
  [20.20, 24.20, 'film', 'saturn', 'vista', .10, .80, { zoom: .84 }],
  [24.20, 25.80, 'card', 'c1'],
  [25.80, 28.60, 'film', 'saturn', 'approach', .30, .95, { ramp: 1 }],
  [28.60, 30.00, 'film', 'saturn', 'enter', .40, 1, { warp: 'ramp', whiteOut: .3 }],
  // ——— act two: the drop ———
  [30.00, 34.40, 'film', 'garg', 'reveal', .30, .95, { whiteIn: .45, zoom: .78 }],
  [34.40, 38.00, 'film', 'miller', 'calm', .30, .80, { zoom: .9 }],
  [38.00, 39.60, 'card', 'c2'],
  [39.60, 43.60, 'film', 'miller', 'low', .15, 1, { ramp: 1, shake: .6 }],
  [43.60, 44.00, 'black'],
  [44.00, 47.00, 'film', 'dock', 'chase', 0, .60],
  [47.00, 48.60, 'card', 'c3'],
  [48.60, 52.40, 'film', 'dock', 'dock', .45, .97, { ramp: 1 }],
  // ——— act three: montage on a 100 BPM grid (beat = 0.6 s) ———
  [52.40, 53.60, 'film', 'garg', 'passby', .30, .75, { flash: 1 }],
  [53.60, 54.80, 'film', 'tess', 'fall', .05, .30],
  [54.80, 56.00, 'film', 'miller', 'rise', .60, .90, { shake: .8 }],
  [56.00, 56.60, 'film', 'dock', 'wide', .20, .80, { flash: 1 }],
  [56.60, 57.20, 'film', 'saturn', 'enter', .50, .90, { warp: 'ramp' }],
  [57.20, 57.80, 'film', 'garg', 'orbit', .20, .60, { flash: 1 }],
  [57.80, 58.40, 'film', 'earth', 'dawn', .60, .85],
  [58.40, 58.70, 'film', 'garg', 'flyby', .30, .50, { flash: 1 }],
  [58.70, 59.00, 'film', 'tess', 'drift', .20, .50],
  [59.00, 59.30, 'film', 'dock', 'dock', .60, .80, { flash: 1 }],
  [59.30, 59.60, 'film', 'miller', 'low', .80, .95, { shake: .8 }],
  [59.60, 59.90, 'film', 'garg', 'orbit', .70, .80, { flash: 1 }],
  [59.90, 60.20, 'film', 'dust', 'fall', .85, .95],
  [60.20, 62.60, 'film', 'garg', 'dive', .40, 1, { warp: 'end', shake: 1, whiteOut: .25, ramp: 1 }],
  [62.60, 64.20, 'black'],                                    // total silence
  [64.20, 71.00, 'film', 'garg', 'reveal', 0, .45, { title: 1 }],
  [71.00, 71.60, 'black'],
  // ——— the button ———
  [71.60, 78.40, 'film', 'dust', 'stay', .20, .95, { fadeIn: .6, morse: 1 }],
  [78.40, 81.00, 'card', 'tag'],
  [81.00, 81.60, 'black'],
  [81.60, 88.00, 'card', 'end'],
];
export const TRAILER_END = 88;

const CARDS = {
  c1: { en: 'ONE DOOR', zh: '一扇门' },
  c2: { en: 'ONE HOUR · SEVEN YEARS', zh: '一小时 · 七年' },
  c3: { en: 'ONE CHANCE', zh: '只有一次机会' },
  tag: { en: 'TIME BENDS', en2: 'LOVE DOESN’T', zh: '时间会弯曲　爱不会' },
};
export const VO = [
  [3.00, 'The dust wasn’t falling at random.', '尘埃落下的方式，并不随机。'],
  [7.60, 'It was speaking — in gravity.', '它在说话——用引力。'],
  [13.90, 'So we looked up.', '于是，我们抬起头。'],
  [34.80, 'One hour here is seven years on Earth.', '这里的一小时，是地球上的七年。'],
  [44.30, 'Match its spin. Then close in.', '匹配它的转速，然后，靠上去。'],
  [76.40, 'Gravity crosses time. Perhaps love does too.', '引力能穿越时间——也许，爱也能。'],
];
// the four letters of the Morse word appear on these beats (and the watch beeps them)
export const MORSE_AT = [72.5, 73.35, 74.2, 75.05];
let voDur = VO.map(() => 3);

let A, dust = null;
export async function setup(api) {
  A = api;
  if (window.VO_DUR) voDur = window.VO_DUR;
  const css = document.createElement('style');
  css.textContent = `
    #tr { position: fixed; inset: 0; z-index: 40; pointer-events: none; }
    .metal { color: transparent; -webkit-background-clip: text; background-clip: text; background-size: 320% 100%;
      background-image: linear-gradient(100deg, #5f584c 0%, #b9b0a0 22%, #f4efe4 40%, #ffffff 48%, #fff4dc 52%, #f1ebdf 60%, #a39a8a 80%, #5f584c 100%); }
    .flare { position: absolute; left: 50%; top: 50%; width: 80vw; height: 2px; margin-left: -40vw; transform-origin: center;
      background: linear-gradient(90deg, transparent, rgba(150,190,255,.5) 22%, #eaf3ff 46%, #fff 50%, #eaf3ff 54%, rgba(150,190,255,.5) 78%, transparent);
      box-shadow: 0 0 18px 2px rgba(170,205,255,.75), 0 0 60px 6px rgba(120,170,255,.35); }
    #tr-card { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    #tr-card .en { font: 600 76px/1.15 'Cinzel', serif; letter-spacing: .14em; padding-left: .14em; filter: drop-shadow(0 2px 0 rgba(0,0,0,.6)) drop-shadow(0 0 22px rgba(255,214,160,.16)); }
    #tr-card .zh { margin-top: 24px; font: 600 28px 'Noto Serif SC', serif; letter-spacing: .6em; padding-left: .6em; color: rgba(236,229,214,.78); }
    #tr-card .lbl { font: 300 15px 'Oswald', sans-serif; letter-spacing: .55em; padding-left: .55em; color: rgba(236,229,214,.55); }
    #tr-card.prod .zh1 { font: 700 70px 'Noto Serif SC', serif; letter-spacing: .38em; padding-left: .38em; filter: drop-shadow(0 0 24px rgba(255,214,160,.18)); }
    #tr-card.prod .en { margin-top: 22px; font: 500 19px 'Cinzel', serif; letter-spacing: .62em; padding-left: .62em; }
    #tr-card.tag .en { font-size: 64px; letter-spacing: .2em; padding-left: .2em; }
    #tr-card.end .title { font: 700 128px/1 'Cinzel', serif; letter-spacing: .16em; padding-left: .16em; filter: drop-shadow(0 0 30px rgba(255,214,160,.2)); }
    #tr-card.end .tribute { margin-top: 26px; font: 400 19px 'Noto Serif SC', serif; letter-spacing: .5em; padding-left: .5em; color: rgba(236,229,214,.62); }
    #tr-card.end .rule { width: 520px; height: 1px; margin: 54px auto 30px; background: linear-gradient(90deg, transparent, rgba(236,229,214,.4), transparent); }
    #tr-card.end .who { margin-top: 12px; font: 700 46px 'Noto Serif SC', serif; letter-spacing: .5em; padding-left: .5em; }
    #tr-card.end .whoen { margin-top: 12px; font: 500 18px 'Cinzel', serif; letter-spacing: .55em; padding-left: .55em; color: rgba(236,229,214,.7); }
    #tr-title { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    #tr-title .t { font: 700 168px/1 'Cinzel', serif; letter-spacing: .14em; padding-left: .14em; filter: drop-shadow(0 0 28px rgba(0,0,0,.85)) drop-shadow(0 0 70px rgba(255,200,140,.32)); }
    #tr-dust { position: absolute; inset: 0; width: 100%; height: 100%; }
    #tr-sub { position: absolute; left: 0; right: 0; bottom: 64px; text-align: center; }
    #tr-sub .zh { font: 500 30px 'Noto Serif SC', serif; letter-spacing: .12em; color: #f3eee6; text-shadow: 0 1px 14px #000; }
    #tr-sub .en { margin-top: 8px; font: 400 15px 'Cinzel', serif; letter-spacing: .2em; color: rgba(236,231,222,.62); text-shadow: 0 1px 10px #000; }
    #tr-morse { position: absolute; left: 0; right: 0; top: 40%; text-align: center; font: 600 60px 'Cinzel', serif; letter-spacing: .8em; padding-left: .8em; color: #fff; text-shadow: 0 0 22px rgba(255,220,170,.6); }
    #tr-morse small { display: block; margin-top: 18px; font: 300 15px 'Oswald', sans-serif; letter-spacing: .5em; color: rgba(236,231,222,.6); }
    #film, #explore, #intro, #end { display: none !important; }
  `;
  document.head.appendChild(css);
  const tr = document.createElement('div'); tr.id = 'tr';
  tr.innerHTML = `<div id="tr-card"></div>
    <div id="tr-title"><canvas id="tr-dust"></canvas><div class="flare" id="tr-flare"></div><div class="t metal">ENDURANCE</div></div>
    <div id="tr-morse"></div><div id="tr-sub"><div class="zh"></div><div class="en"></div></div>`;
  document.body.appendChild(tr);
  const cv = $('tr-dust'); cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
  // seeded dust motes that drift through the title light
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  dust = Array.from({ length: 320 }, () => ({ x: rnd(), y: .3 + rnd() * .4, z: rnd(), vx: (rnd() - .5) * .02, vy: -.004 - rnd() * .01, ph: rnd() * 6.28 }));
  A.setState('film');
  await Promise.all(['700 100px Cinzel', '600 50px Cinzel', '500 20px Cinzel', '700 60px "Noto Serif SC"', '600 30px "Noto Serif SC"', '300 16px Oswald'].map(f => document.fonts.load(f, 'ENDURANCE 张程豪出品一扇门小时七年只有次机会时间会弯曲爱不致敬星际穿越制片人')));
  await document.fonts.ready;
  window.render = render; window.PROMO_END = TRAILER_END;
  window.__ready = true;
}

const segAt = p => TL.find(s => p >= s[0] && p < s[1]) || TL[TL.length - 1];
const FILM_T = { fall: [0, 14], dawn: [14, 21.5], depart: [21.5, 28], vista: [28, 35.5], approach: [35.5, 41], enter: [41, 44], calm: [44, 49], low: [52.5, 60], rise: [52.5, 60], chase: [60, 63.2], dock: [63.2, 70], wide: [60, 63.2], reveal: [70, 79.5], passby: [79.5, 86], flyby: [79.5, 86], orbit: [70, 79.5], dive: [86, 94], drift: [102.5, 110], stay: [110, 122] };
const rampF = x => x < .55 ? .22 * x / .55 : .22 + .78 * Math.pow((x - .55) / .45, 1.25);

function sweep(el, k) { if (el) el.style.backgroundPosition = `${(100 - k * 100).toFixed(1)}% 0`; }

export function render(p) {
  const W = A.W, post = A.post, U = post.u;
  const s = segAt(p), [t0, t1, kind] = s, d = t1 - t0, into = p - t0, left = t1 - p, lu = clamp(into / d, 0, 1);
  const fx = (kind === 'film' && s[7]) || {};
  let world = W.garg, fade = 1, white = false, warp = 0, shake = 0;
  const bar = Math.max(0, (innerHeight - innerWidth / 2.39) / 2);
  document.documentElement.style.setProperty('--bar', (kind === 'film' ? bar : 0) + 'px');
  A.updateBars(kind === 'film');
  // ——— picture ———
  if (kind === 'film') {
    const [, , , w, shot, u0, u1] = s;
    world = W[w];
    const uu = lerp(u0, u1, fx.ramp ? rampF(lu) : lu), R = FILM_T[shot] || [0, 10], T = lerp(R[0], R[1], uu);
    if (w === 'garg') world.setDoppler(0);
    if (w === 'dust') world.manual = false;
    world.shots[shot](uu, T);
    if (fx.zoom) world.camera.fov *= lerp(1, fx.zoom, sm(0, 1, lu));
    world.update(T, 0, 'film');
    fade = 0;
    if (fx.warp === 'ramp') warp = Math.pow(lu, 2.2);
    if (fx.warp === 'end') warp = sm(.6, 1, lu) * .9;
    if (fx.shake) shake = fx.shake * sm(.2, 1, lu);
    if (fx.whiteOut) { const k = 1 - clamp(left / fx.whiteOut, 0, 1); if (k > 0) { fade = k; white = true; } }
    if (fx.whiteIn) { const k = 1 - clamp(into / fx.whiteIn, 0, 1); if (k > 0) { fade = Math.max(fade, k); white = true; } }
    if (fx.flash) { const k = 1 - clamp(into / .09, 0, 1); if (k > 0) { fade = Math.max(fade, k * .85); white = true; } }
    if (fx.fadeIn) fade = Math.max(fade, 1 - clamp(into / fx.fadeIn, 0, 1));
    if (d > 2.5 && !fx.whiteOut && !fx.title) fade = Math.max(fade, 1 - clamp(left / .16, 0, 1));
    if (fx.title) fade = Math.max(fade, sm(d - .8, d, into));
  }
  // ——— cards ———
  const card = $('tr-card');
  if (kind === 'card') {
    const c = s[3];
    if (card.dataset.c !== c) {
      card.dataset.c = c;
      if (c === 'prod') { card.className = 'prod'; card.innerHTML = `<div class="flare"></div><div class="zh1 metal">张程豪 出品</div><div class="en metal">A ZHANG CHENGHAO PRODUCTION</div>`; }
      else if (c === 'end') {
        card.className = 'end';
        card.innerHTML = `<div class="flare"></div><div class="title metal">ENDURANCE</div><div class="tribute">致敬《星际穿越》</div><div class="rule"></div>
          <div class="lbl">制片人　·　PRODUCED BY</div><div class="who metal">张程豪</div><div class="whoen">ZHANG CHENGHAO</div>`;
      } else if (c === 'tag') { card.className = 'tag'; const C = CARDS.tag; card.innerHTML = `<div class="flare"></div><div class="en metal">${C.en}</div><div class="en metal">${C.en2}</div><div class="zh">${C.zh}</div>`; }
      else { const C = CARDS[c]; card.className = ''; card.innerHTML = `<div class="flare"></div><div class="en metal">${C.en}</div><div class="zh">${C.zh}</div>`; }
    }
    const a = sm(0, .28, into) * (1 - sm(d - .25, d, into));
    card.style.opacity = a.toFixed(3);
    card.style.transform = `scale(${(1.06 - .06 * sm(0, d * 1.2, into)).toFixed(4)})`;
    card.querySelectorAll('.metal').forEach(el => sweep(el, sm(.1, d - .2, into)));
    const fl = card.querySelector('.flare');
    if (fl) { fl.style.opacity = (sm(0, .08, into) * (1 - sm(.15, .7, into))).toFixed(3); fl.style.transform = `scaleX(${(.15 + .85 * sm(0, .4, into)).toFixed(3)})`; }
  } else { card.style.opacity = 0; card.dataset.c = ''; }
  // ——— the title, forged out of a line of light ———
  const tt = $('tr-title');
  if (fx.title) {
    tt.style.opacity = (1 - sm(d - .8, d - .1, into)).toFixed(3);
    const fl = $('tr-flare');
    fl.style.opacity = (sm(0, .06, into) * (1 - sm(.6, 1.6, into)) + .25 * sm(1.6, 2.2, into) * (1 - sm(d - 1, d, into))).toFixed(3);
    fl.style.transform = `scaleX(${(.05 + .95 * sm(0, .45, into)).toFixed(3)}) translateY(${(sm(1.2, 2.2, into) * 105).toFixed(1)}px)`;
    const open = sm(.25, 1.25, into) * 50;
    const t = tt.querySelector('.t');
    t.style.clipPath = `inset(-20% ${(50 - open).toFixed(2)}% -20% ${(50 - open).toFixed(2)}%)`;
    t.style.transform = `scale(${(1.1 - .1 * sm(0, d, into)).toFixed(4)})`;
    sweep(t, sm(.8, 4.2, into));
    // dust in the light
    const cv = $('tr-dust'), g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height);
    const k = sm(.4, 1.6, into) * (1 - sm(d - 1, d, into));
    for (const m of dust) {
      const x = ((m.x + m.vx * into) % 1 + 1) % 1 * cv.width, y = (m.y + m.vy * into) * cv.height;
      const tw = .5 + .5 * Math.sin(m.ph + into * 3);
      g.fillStyle = `rgba(255,236,205,${(k * (.15 + .55 * m.z) * tw).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, (.6 + 1.8 * m.z) * devicePixelRatio, 0, 6.283); g.fill();
    }
  } else tt.style.opacity = 0;
  // ——— S T A Y ———
  const mo = $('tr-morse');
  if (fx.morse) {
    const k = MORSE_AT.filter(m => p >= m).length;
    mo.innerHTML = ('S T A Y'.slice(0, Math.max(1, k * 2 - 1))) + '<small>· · ·　—　· —　— · — —</small>';
    mo.style.opacity = (sm(MORSE_AT[0] - .25, MORSE_AT[0], p) * (1 - sm(t1 - .6, t1, p))).toFixed(3);
  } else mo.style.opacity = 0;
  // ——— narration subtitles ———
  const sb = $('tr-sub');
  const v = VO.findIndex((x, i) => p >= x[0] && p < x[0] + voDur[i] + .5);
  if (v >= 0) {
    sb.children[0].textContent = VO[v][2]; sb.children[1].textContent = VO[v][1];
    sb.style.opacity = Math.min(sm(VO[v][0], VO[v][0] + .2, p), 1 - sm(VO[v][0] + voDur[v] + .2, VO[v][0] + voDur[v] + .5, p)).toFixed(3);
    sb.style.bottom = (kind === 'film' ? Math.max(30, bar * .5 - 14) : 110) + 'px';
  } else sb.style.opacity = 0;
  // ——— finish ———
  const b = world.bloom;
  post.bloom.strength = b.strength; post.bloom.radius = b.radius; post.bloom.threshold = b.threshold;
  U.uExposure.value = world.exposure; U.uTime.value = p;
  U.uFade.value = fade; U.uFadeColor.value.setScalar(white ? 1 : 0);
  U.uWarp.value = warp; U.uShake.value = shake;
  U.uGrain.value = 1.4;
  if (world.camera.aspect !== innerWidth / innerHeight) { world.camera.aspect = innerWidth / innerHeight; world.camera.updateProjectionMatrix(); }
  post.render(world.scene, world.camera);
  return true;
}

// ——— the score (original), built on the same timeline ———
export function buildTrailerScore(n, ch) {
  const E = [];
  const add = (t, type, o) => E.push({ t, type, ...o });
  const organ = (t, dur, notes, vel, reg = 'flute', o = {}) => (Array.isArray(notes) ? notes : [notes]).forEach(m => add(t, 'organ', { dur, m: typeof m === 'string' ? n(m) : m, vel, reg, ...o }));
  const card = (t, big) => { add(t - 1.0, 'revcym', { dur: 1.0, vel: .25 + big * .25 }); add(t - .7, 'whoosh', { dur: .8, vel: .3 + big * .2, f0: 300, f1: 6000 }); add(t, 'taiko', { vel: .75 + big * .3 }); add(t, 'braam', { vel: .45 + big * .4, dur: 1.4 + big, notes: ch('A0 E1 A1 E2') }); add(t, 'subdrop', { vel: .4 + big * .3, dur: 2 }); };
  // HOOK — a single wall of sound, ringing into the dark
  add(0, 'braam', { vel: 1, dur: 2.2, notes: ch('A0 E1 A1 E2 A2'), bright: 2800 }); add(0, 'taiko', { vel: 1 }); add(0, 'subdrop', { vel: .8, dur: 2.4 });
  organ(.02, 1.5, ch('A2 E3 A3 C4 E4'), .14, 'reed', { att: .05, rel: 2.5 });
  // QUIET — a clock in the dark, dust in the light
  add(2.4, 'rumble', { dur: 8.4, vel: .2 });
  for (let t = 2.6; t < 10.8; t += 1) add(t, 'tick', { vel: .42, f: 2400 });
  organ(2.5, 8.2, 'A1', .13, 'pedal', { att: 2.5 });
  organ(3.0, 7.8, ch('A3 C4 E4'), .055, 'flute', { att: 2.5 });
  [4.1, 5.2, 6.3, 8.2, 9.1, 9.9].forEach((t, i) => add(t, 'bell', { m: ch('E6 B5 C6 E6 G5 A5')[i], vel: .065 }));
  add(7.2, 'taiko', { vel: .4 });
  // PRODUCTION CARD
  add(9.8, 'revcym', { dur: 1.0, vel: .35 }); add(10.8, 'taiko', { vel: .9 }); add(10.8, 'subdrop', { vel: .7, dur: 2.6 });
  organ(10.85, 2.2, ch('A1 E2 A2'), .12, 'pedal', { att: .05, rel: 2 });
  // ACT ONE — the theme: a rising organ figure that keeps gaining voices
  organ(13.2, 4.0, ch('A1 A2'), .2, 'pedal', { att: .6 });
  add(13.2, 'strings', { notes: ch('A3 C4 E4 B4'), dur: 3.8, vel: .22, att: 1.8 });
  const motif = ch('A4 C5 E5 B4 C5 E5 A5 E5');
  for (let t = 13.4, k = 0; t < 30; t += .3, k++) organ(t, .34, motif[k % 8] + (t > 22 && k % 8 === 6 ? 12 : 0), .045 + (t - 13.4) * .003, t > 22 ? 'principal' : 'flute', { att: .01, rel: .3 });
  organ(17.2, 3.0, ch('F1 F2'), .22, 'pedal'); add(17.2, 'strings', { notes: ch('F3 A3 C4 E4'), dur: 3, vel: .24, att: .8 });
  organ(20.2, 4.0, ch('C2 C3'), .24, 'pedal'); add(20.2, 'strings', { notes: ch('G3 C4 E4 G4'), dur: 3.8, vel: .26, att: .6 });
  card(24.2, .5);
  organ(24.2, 5.8, ch('E1 E2'), .26, 'pedal'); add(24.2, 'strings', { notes: ch('E3 G#3 B3 E4'), dur: 5.6, vel: .28, att: .4 });
  add(25.9, 'shepard', { dur: 4.1, vel: .55, cycle: 2.05 });
  add(28.5, 'whoosh', { dur: 1.5, vel: .55, f0: 200, f1: 8000 }); add(29.0, 'revcym', { dur: 1.0, vel: .5 });
  // ACT TWO — the drop: first sight of Gargantua
  add(30.0, 'braam', { vel: 1.05, dur: 4.6, notes: ch('A0 E1 A1 E2 A2'), bright: 3000, drive: 4 }); add(30.0, 'subdrop', { vel: .9, dur: 3.4 }); add(30.0, 'taiko', { vel: 1.05 }); add(30.0, 'impact', { vel: .7 });
  organ(30.1, 4.2, ch('A2 E3 A3 C4 E4 A4 C5 E5'), .16, 'reed', { att: .5, rel: 1.8 });
  add(30.1, 'strings', { notes: ch('A2 E3 A3 C4 E4 A4'), dur: 4.2, vel: .3, att: 1, rel: 2 });
  // Miller — the clock: every tick a day
  for (let t = 34.6; t < 43.6; t += t < 39.6 ? 1.25 : Math.max(.3, 1.25 - (t - 39.6) * .28)) add(t, 'tick', { vel: .6 + Math.max(0, t - 38) * .05, f: 2600, thud: t > 39.6 ? (t - 39.6) / 4 : 0 });
  organ(34.4, 5.2, 'D2', .2, 'pedal'); add(34.4, 'strings', { notes: ch('D4 E4 F4'), dur: 9, vel: .17, att: 3 });
  card(38.0, .6);
  add(39.6, 'rumble', { dur: 4, vel: 1 }); add(39.8, 'shepard', { dur: 3.8, vel: .6, cycle: 1.6 });
  organ(39.6, 4.0, ch('D2 F2 A2 Bb2'), .2, 'reed', { att: 3, rel: .02 });
  add(43.6, 'impact', { vel: 1.05 }); add(43.6, 'subdrop', { vel: 1, dur: 2.4 }); add(43.6, 'taiko', { vel: 1 });
  // the dock — a pulse that tightens
  organ(44.0, 8.4, 'A0', .3, 'pedal', { att: .4, rel: .05 });
  const dk = ch('A4 E5 A4 C5 A4 E5 B4 E5');
  for (let t = 44.1, k = 0; t < 52.4; k++) { organ(t, .28, dk[k % 8], .04 + (t - 44.1) * .0065, t > 48.6 ? 'principal' : 'flute', { att: .01, rel: .28 }); if (k % 2 === 0) add(t, 'tick', { vel: .35 + (t - 44) * .035, f: 2900 }); t += t < 48.6 ? .3 : .15; }
  card(47.0, .8);
  add(48.7, 'shepard', { dur: 3.7, vel: .65, cycle: 1.2 });
  add(48.6, 'strings', { notes: ch('A3 C4 E4 A4'), dur: 3.8, vel: .3, att: 3, rel: .03 });
  add(51.4, 'revcym', { dur: 1.0, vel: .6 });
  // ACT THREE — 100 BPM: a drum on every cut, a wall of brass on every bar
  const B = .6, M0 = 52.4;
  const cuts = [52.4, 53.6, 54.8, 56.0, 56.6, 57.2, 57.8, 58.4, 58.7, 59.0, 59.3, 59.6, 59.9, 60.2];
  cuts.forEach((t, i) => add(t, 'taiko', { vel: .75 + i * .018, f: 120 + (i % 2) * 25 }));
  for (let bar = 0; bar < 4; bar++) add(M0 + bar * 4 * B, 'braam', { vel: .7 + bar * .08, dur: 2.2, notes: ch(['A0 E1 A1 E2', 'F0 C1 F1 C2', 'C1 G1 C2 G2', 'E0 B0 E1 B1'][bar]) });
  [[52.4, 'A1 A2 E3 A3 C4 E4 A4'], [54.8, 'F1 F2 C3 A3 C4 F4 A4'], [57.2, 'C2 C3 G3 C4 E4 G4 C5'], [59.6, 'E1 E2 B2 E3 G#3 B3 E4 G#4']]
    .forEach(([t, c], i, arr) => organ(t, (arr[i + 1] ? arr[i + 1][0] : 62.6) - t, ch(c), .15 + i * .022, i >= 2 ? 'reed' : 'principal', { att: .08, rel: .02 }));
  for (let t = M0; t < 62.6; t += B / 2) add(t, 'tick', { vel: .32 + (t - M0) * .035, f: 3200 });
  for (let t = M0 + B; t < 60.2; t += B * 2) add(t, 'taiko', { vel: .45, f: 180 });
  add(60.25, 'shepard', { dur: 2.35, vel: .75, cycle: .8 }); add(60.3, 'swell', { dur: 2.3, f0: 200, f1: 9000, vel: .75, cut: true });
  // 62.6 – 64.2: nothing. Then the title.
  add(64.2, 'braam', { vel: 1.15, dur: 6, notes: ch('A0 E1 A1 E2 A2'), bright: 3200, drive: 4.5 }); add(64.2, 'subdrop', { vel: 1.05, dur: 4.2 }); add(64.2, 'taiko', { vel: 1.15 }); add(64.2, 'impact', { vel: .95 });
  organ(64.3, 6.2, ch('A0 A1 E2 A2 C3 E3 A3 C4 E4 A4'), .14, 'principal', { att: 1, rel: 3 });
  add(64.3, 'strings', { notes: ch('A2 E3 A3 C4 E4 A4 E5'), dur: 6, vel: .3, att: 1.5, rel: 3 });
  // STAY — the watch, in the quiet
  organ(71.6, 6.6, ch('A3 C4 E4 B4'), .05, 'flute', { att: 2 });
  organ(71.6, 6.6, 'A1', .1, 'pedal', { att: 2 });
  const code = ['...', '-', '.-', '-.--'];
  MORSE_AT.forEach((t0, i) => { let t = t0; [...code[i]].forEach(c => { add(t, 'beep', { dur: c === '.' ? .09 : .27 }); t += (c === '.' ? .09 : .27) + .09; }); });
  [72.0, 74.6, 76.3, 77.6].forEach((t, i) => add(t, 'bell', { m: ch('E5 A5 B5 C6')[i], vel: .075 }));
  add(78.4, 'strings', { notes: ch('C3 G3 C4 E4 G4 D5'), dur: 2.6, vel: .22, att: 1 });
  organ(78.4, 2.6, ch('C2 C3 G3'), .12, 'pedal', { att: .8 });
  // END — the last hit and a chord that hangs in the air
  add(80.6, 'revcym', { dur: 1.0, vel: .45 });
  add(81.6, 'taiko', { vel: 1 }); add(81.6, 'subdrop', { vel: .85, dur: 3.8 }); add(81.6, 'braam', { vel: .75, dur: 4.4, notes: ch('A0 E1 A1 E2'), bright: 1800 });
  organ(81.7, 5.6, ch('A1 A2 E3 A3 C4 E4 B4 E5'), .11, 'principal', { att: .8, rel: 2.4 });
  add(81.7, 'strings', { notes: ch('A2 E3 A3 C4 E4 B4'), dur: 5.2, vel: .22, att: 1.4, rel: 2.4 });
  E.sort((a, b) => a.t - b.t);
  return E;
}
