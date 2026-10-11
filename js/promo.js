// Douyin promo v2: a frame-exact 16:9 cut, data-driven so every cut can be snapped to the music.
// render(t) is a pure function of t → frames render in parallel.
// Cuts: edit SEGMENTS durations, or drop a js/promo-cuts.json ({"cuts":[t1,t2,...]}) to retime every boundary.
import * as THREE from 'three';
import { RS } from './worlds/gargantua.js';
import { EARTH_CLOCK } from './film.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const $ = id => document.getElementById(id);

// kind: 'film' (full-bleed shot), 'black', 'reveal' (full-bleed hole shrinks into the browser window),
//       'explore' (windowed HUD; click = target clicked at the segment start), 'expand' handled by the first film shot after explore
// fx: whiteOut (flash at end), whiteIn, warp ('in'|'out'|'ramp'), shake, fadeIn
const SEGMENTS = [
  // ——— cold open: the climax of the music, the biggest images, no words (beat = 1 s, bar = 4 s) ———
  { kind: 'film', w: 'garg', shot: 'flyby', u0: .30, u1: .80, d: 2 },
  { kind: 'film', w: 'miller', shot: 'rise', u0: .62, u1: 1, d: 1, fx: { shake: 1 } },
  { kind: 'film', w: 'saturn', shot: 'enter', u0: .45, u1: 1, d: 1, fx: { warp: 'ramp', whiteOut: .25 } },
  { kind: 'film', w: 'dock', shot: 'dock', u0: .55, u1: .97, d: 2, fx: { whiteIn: .2 } },
  { kind: 'film', w: 'garg', shot: 'dive', u0: .55, u1: 1, d: 1.5, fx: { warp: 'end', shake: 1 } },
  { kind: 'black', d: .5 },
  // ——— it's a web page ———
  { kind: 'reveal', w: 'garg', d: 2 },
  { kind: 'explore', w: 'garg', d: 4, sub: 'phys' },              // click PHYSICAL, then dive toward the hole
  { kind: 'explore', w: 'saturn', d: 2, click: 'saturn' },
  { kind: 'explore', w: 'miller', d: 2, click: 'miller' },
  { kind: 'explore', w: 'tess', d: 2, click: 'tess' },
  { kind: 'explore', w: 'dock', d: 4, click: 'dock', tail: 'film' }, // the docking game, then 观看影片
  // ——— the film ———
  { kind: 'film', w: 'earth', shot: 'dawn', u0: .30, u1: .95, d: 2, fx: { expand: 1 } },
  { kind: 'film', w: 'saturn', shot: 'vista', u0: .25, u1: .70, d: 2, sub: ['土星旁边，有人为我们留下了一扇门。', 'Beside Saturn, someone had left us a door.'] },
  { kind: 'film', w: 'saturn', shot: 'enter', u0: .15, u1: 1, d: 2, fx: { warp: 'ramp', whiteOut: .3 } },
  { kind: 'film', w: 'miller', shot: 'calm', u0: .35, u1: .75, d: 1, fx: { whiteIn: .6 } },
  { kind: 'film', w: 'miller', shot: 'rise', u0: .15, u1: 1, d: 3, fx: { shake: 1 }, sub2: [['那不是山……', 'Those aren’t mountains…'], ['……是浪。', '…they’re waves.']], jump: ['地球时间 +23 年 4 个月 8 天', 'EARTH TIME +23 YEARS 4 MONTHS 8 DAYS'] },
  { kind: 'film', w: 'dock', shot: 'wide', u0: 0, u1: 1, d: 2, sub: ['永恒号失控了，每分钟二十多转。', 'Endurance is tumbling — over twenty turns a minute.'] },
  { kind: 'film', w: 'dock', shot: 'dock', u0: .2, u1: 1, d: 4, sub: ['匹配它的转速，然后，靠上去。', 'Match its spin. Then close in.'] },
  { kind: 'film', w: 'garg', shot: 'reveal', u0: .35, u1: 1, d: 3, sub: ['卡冈图雅。一亿个太阳的质量，连光都无法逃离。', 'Gargantua. A hundred million suns. Not even light escapes.'] },
  { kind: 'film', w: 'garg', shot: 'flyby', u0: .1, u1: .9, d: 2, sub: ['在它身边，时间不再是一个常数。', 'Near it, time is no longer a constant.'] },
  { kind: 'film', w: 'garg', shot: 'dive', u0: .4, u1: 1, d: 3, fx: { warp: 'end', shake: 1, whiteOut: .3 }, jump: ['地球时间 +51 年', 'EARTH TIME +51 YEARS'] },
  { kind: 'film', w: 'tess', shot: 'fall', u0: .03, u1: .4, d: 2, fx: { whiteIn: .7, warp: 'out' }, sub: ['引力能穿越时间——也许，爱也能。', 'Gravity crosses time — perhaps love does too.'] },
  { kind: 'film', w: 'dust', shot: 'stay', u0: .42, u1: .80, d: 2, fx: { fadeIn: .3 }, morse: 1 },
  { kind: 'film', w: 'dust', shot: 'stay', u0: .80, u1: 1, d: 4, end: 1 },
];
let TL = [], PROMO_END = 0;
function buildTimeline(cuts) {
  if (cuts && cuts.length >= SEGMENTS.length - 1) {
    // cuts[i] = end time of segment i
    let t = 0; SEGMENTS.forEach((s, i) => { const e = i < cuts.length ? cuts[i] : t + s.d; s.d = Math.max(.2, e - t); t = e; });
  }
  let t = 0; TL = SEGMENTS.map(s => { const o = { ...s, t0: t, t1: t + s.d }; t += s.d; return o; });
  PROMO_END = t;
}
export { PROMO_END };

let A, curExplore = null, CLICKS = [];
const fmtDate = y => { const yr = Math.floor(y); const doy = Math.floor((y - yr) * 365); const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let m = 0, d = doy; while (m < 11 && d >= md[m]) { d -= md[m]; m++; } return `${yr}.${String(m + 1).padStart(2, '0')}.${String(d + 1).padStart(2, '0')}`; };
function interp(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = (t - a) / Math.max(1e-6, b - a); return va + (vb - va) * (u * u * (3 - 2 * u)); } return keys[keys.length - 1][1]; }
const FILM_RANGE = { wide: [60, 63.2], dock: [63.2, 70], dawn: [14, 21.5], vista: [28, 35.5], enter: [41, 44], calm: [44, 49], rise: [52.5, 60], reveal: [70, 79.5], flyby: [79.5, 86], dive: [86, 94], fall: [94, 102.5], drift: [102.5, 110], stay: [110, 122] };

export async function setup(api) {
  A = api;
  let cuts = null;
  try { const r = await fetch('js/promo-cuts.json', { cache: 'no-store' }); if (r.ok) cuts = (await r.json()).cuts; } catch (e) { }
  buildTimeline(cuts);
  const css = document.createElement('style');
  css.textContent = `
    body.promo { background: radial-gradient(ellipse at 50% 40%, #2a1f14 0%, #0d0a07 45%, #000 100%); }
    #win { position: fixed; left: 0; top: 0; width: 1920px; height: 1116px; transform-origin: 50% 0; overflow: hidden;
      box-shadow: 0 40px 120px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.08), 0 0 160px rgba(232,180,106,.1); background: #000; }
    #winbar { position: absolute; left: 0; right: 0; top: 0; height: 36px; background: linear-gradient(#232120, #1a1918); border-bottom: 1px solid #0b0b0b; display: flex; align-items: center; gap: 14px; padding: 0 16px; }
    #winbar .tl { display: flex; gap: 8px; } #winbar .tl i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; } #winbar .tl i:nth-child(2) { background: #febc2e; } #winbar .tl i:nth-child(3) { background: #28c840; }
    #winbar .tab { height: 26px; margin-top: 10px; padding: 0 16px; display: flex; align-items: center; gap: 8px; background: #2c2a28; border-radius: 8px 8px 0 0; font: 400 12px var(--sans); color: #ddd; letter-spacing: .04em; }
    #winbar .url { flex: 1; max-width: 640px; margin-left: 40px; height: 24px; border-radius: 12px; background: #121110; display: flex; align-items: center; padding: 0 14px; font: 400 12px var(--mono); color: #bbb; letter-spacing: .04em; }
    #winbar .url b { color: #888; font-weight: 400; margin-right: 8px; }
    #stage { position: absolute; left: 0; top: 36px; width: 1920px; height: 1080px; overflow: hidden; transform: translateZ(0); }
    #cursor { position: absolute; left: 0; top: 0; width: 40px; height: 40px; z-index: 60; pointer-events: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,.8)); }
    #ripple { position: absolute; left: 0; top: 0; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; border: 2px solid var(--amber); z-index: 59; pointer-events: none; opacity: 0; }
    #decode { font-size: 54px !important; top: 40% !important; } #decode small { font-size: 15px !important; }
    #title-card .tc-t { font-size: 120px; } #title-card .tc-s { font-size: 24px; letter-spacing: .32em; margin-top: 34px; } #title-card .tc-e { font-size: 13px; letter-spacing: .36em; margin-top: 16px; }
    #sub .sb-zh { font-size: 30px; } #sub .sb-en { font-size: 14px; }
    #jump .jp-zh { font-size: 26px; }
  `;
  document.head.appendChild(css);
  const win = document.createElement('div'); win.id = 'win';
  win.innerHTML = `<div id="winbar"><div class="tl"><i></i><i></i><i></i></div><div class="tab">✦ ENDURANCE · 穿越卡冈图雅</div><div class="url"><b>ⓘ</b>localhost:8090</div></div><div id="stage"></div>`;
  document.body.appendChild(win);
  const stage = win.querySelector('#stage');
  ['gl', 'bars', 'fade', 'loader', 'intro', 'film', 'explore', 'end', 'toast'].forEach(id => { const e = $(id); if (e) stage.appendChild(e); });
  const cur = document.createElement('div'); cur.id = 'cursor';
  cur.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M4 2l15 11.5-6.6.9 3.9 7.3-2.8 1.5-3.9-7.4L4 20.5z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const rip = document.createElement('div'); rip.id = 'ripple';
  stage.appendChild(rip); stage.appendChild(cur);
  $('title-card').innerHTML = `<div class="tc-t">ENDURANCE</div><div class="tc-s">每一行代码都由 AI 写成</div><div class="tc-e">实时三维渲染 · 打开网页就能玩</div>`;
  // click schedule from the timeline
  win.style.transform = 'none';
  A.setState('explore'); A.selectWorld('garg');
  await document.fonts.ready; await new Promise(r => setTimeout(r, 300));
  const sr = stage.getBoundingClientRect();
  const pos = el => { const r = el.getBoundingClientRect(); return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 }; };
  TL.forEach(s => {
    if (s.kind !== 'explore') return;
    if (s.sub === 'phys') CLICKS.push({ t: s.t0 + s.d * .2, ...pos(document.querySelectorAll('#tl-ctrl .tg')[1]) });
    if (s.click) CLICKS.push({ t: s.t0, ...pos(document.querySelector(`.rl[data-id=${s.click}]`)) });
    if (s.tail === 'film') CLICKS.push({ t: s.t1 - .05, ...pos($('ex-film')) });
  });
  CLICKS.sort((a, b) => a.t - b.t);
  curExplore = 'garg';
  window.render = render; window.PROMO_END = PROMO_END; window.PROMO_TL = TL.map(s => [s.t0, s.t1, s.kind, s.w, s.shot]);
  window.__ready = true;
}

function cursorAt(p, t0) {
  const pts = [{ t: t0, x: 1560, y: 1000 }];
  CLICKS.forEach((c, i) => { const prev = i ? CLICKS[i - 1].t : t0; pts.push({ t: Math.max(prev + .2, c.t - .6), x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }); pts.push({ t: c.t - .06, x: c.x + 4, y: c.y + 6 }); });
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (p <= b.t) { const u = ease(clamp((p - a.t) / Math.max(.01, b.t - a.t), 0, 1)); return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }; } }
  const l = pts[pts.length - 1]; return { x: l.x, y: l.y };
}

const tmp = new THREE.Vector3();
function exploreCamera(id, u, w, s) {
  const c = w.camera; c.up.set(0, 1, 0);
  if (id === 'garg') {
    // u<0 → reveal phase (slow), 0..1 → physical toggle then dive toward the hole
    const z = sm(.38, 1, u);
    const r = lerp(46 - Math.max(0, u + 1) * 2.5, 7.5, ease(z)) * RS;
    const az = -1.68 + (u + 1) * .05 + z * .25, el = .07 - z * .035;
    c.position.set(r * Math.cos(el) * Math.cos(az), r * Math.sin(el), r * Math.cos(el) * Math.sin(az));
    c.lookAt(0, -.4 * RS * (1 - z), 0); c.fov = lerp(24, 34, z);
  } else if (id === 'saturn') {
    const WH = w.explore.target, a = lerp(-.38, -.12, ease(u)), d = lerp(1250, 900, ease(u));
    c.position.set(WH.x + Math.sin(a) * d, WH.y + lerp(160, 90, u), WH.z + Math.cos(a) * d);
    c.lookAt(tmp.copy(WH).add(new THREE.Vector3(lerp(260, 120, u), -30, 0))); c.fov = 40;
  } else if (id === 'miller') {
    c.position.set(lerp(-6, 8, u), lerp(16, 24, u), lerp(120, 96, u));
    c.lookAt(tmp.set(lerp(-20, 10, u), lerp(52, 70, u), -400)); c.fov = 52;
    w.front = lerp(2300, 1100, u);
  } else if (id === 'tess') {
    c.position.set(2.0 + Math.sin(u * 2) * .2, 1.55 + u * .3, -1 - u * 4.5);
    c.up.set(Math.sin(u) * .25, 1, 0).normalize();
    c.lookAt(tmp.set(2.2, 1.3, c.position.z - 6)); c.fov = 62;
  } else if (id === 'dock') {
    const st = w.autoAt(lerp(.25, .97, u)), prev = w.autoAt(lerp(.25, .97, Math.max(0, u - .02)));
    Object.assign(w.G, st, { auto: true, state: st.docked ? 'docked' : 'approach', msg: st.docked ? 'docked' : '', msgT: 0, vz: (st.z - prev.z) / (.02 * s.d), shake: 0 });
    w.setAuto(true);
  } else if (id === 'dust') {
    const a = lerp(.35, .05, ease(u)), d = lerp(3.2, 2.7, u);
    c.position.set(Math.sin(a) * d, lerp(2.6, 2.8, u), -.3 + Math.cos(a) * d);
    c.lookAt(tmp.set(0, 0, -.25)); c.fov = 40;
    w.setManual(clamp(u / .55, 0, 1), sm(.3, .7, u), 1);
  }
  c.updateProjectionMatrix();
}

export function render(p) {
  const W = A.W, post = A.post, U = post.u;
  const si = Math.max(0, TL.findIndex(s => p >= s.t0 && p < s.t1)), s = TL[si] || TL[TL.length - 1];
  const lu = clamp((p - s.t0) / s.d, 0, 1), into = p - s.t0, left = s.t1 - p;
  let fade = 0, white = false, warp = 0, shake = 0, world, T = p;
  const firstExplore = TL.find(x => x.kind === 'reveal');
  const afterExplore = p >= (TL.find(x => x.fx && x.fx.expand) || { t0: 1e9 }).t0;
  // window scale: 0 = full-bleed, 1 = windowed
  let winK = 0;
  if (s.kind === 'reveal') winK = ease(sm(.15, .85, lu));
  else if (s.kind === 'explore') winK = 1;
  else if (s.fx && s.fx.expand) winK = 1 - ease(clamp(into / 1.0, 0, 1));
  const win = $('win');
  win.style.transform = `translateY(${lerp(-36, 66, winK).toFixed(2)}px) scale(${lerp(1, .84, winK).toFixed(4)})`;
  win.style.borderRadius = winK > .02 ? '14px' : '0';
  const cur = $('cursor'), rip = $('ripple');
  if (s.kind === 'reveal' || s.kind === 'explore') {
    const id = s.w;
    if (document.body.className.indexOf('state-explore') < 0) A.setState('explore');
    if (curExplore !== id) { A.selectWorld(id); curExplore = id; }
    world = W[id];
    $('explore').style.opacity = s.kind === 'reveal' ? sm(.45, .95, lu) : 1;
    if (id === 'garg') {
      world.showShipExplore = false;
      const physT = (CLICKS.find(c => c.t > (firstExplore ? firstExplore.t0 : 0)) || { t: 1e9 }).t;
      world.setDoppler(sm(physT, physT + .6, p));
      const tg = document.querySelectorAll('#tl-ctrl .tg');
      if (tg.length) { tg[0].classList.toggle('on', p < physT); tg[1].classList.toggle('on', p >= physT); tg[2].classList.remove('on'); }
    }
    exploreCamera(id, s.kind === 'reveal' ? lu - 1 : lu, world, s);
    T = 100 + p;
    world.update(T, 0, 'explore');
    A.telemetry(1 / 60, into, true);
    if (s.kind === 'reveal') fade = 1 - sm(0, .35, into);
    document.documentElement.style.setProperty('--bar', '0px');
    $('sub').classList.remove('on'); $('jump').classList.remove('on'); $('decode').classList.remove('on'); $('title-card').classList.remove('on');
  } else {
    if (document.body.className.indexOf('state-film') < 0) A.setState('film');
    const barMax = Math.max(0, (1080 - 1920 / 2.39) / 2);
    const barK = afterExplore ? (s.fx && s.fx.expand ? sm(0, 1, into) : 1) : 0;
    document.documentElement.style.setProperty('--bar', (barK * barMax).toFixed(1) + 'px');
    if (s.kind === 'black') { world = W.garg; fade = 1; }
    else {
      world = W[s.w];
      const uu = lerp(s.u0, s.u1, lu);
      const R = FILM_RANGE[s.shot]; T = lerp(R[0], R[1], uu);
      if (s.w === 'garg') world.setDoppler(0);
      world.shots[s.shot](uu, T);
      world.update(T, 0, 'film');
      const fx = s.fx || {};
      if (fx.warp === 'ramp') warp = Math.pow(lu, 2.2);
      if (fx.warp === 'end') warp = sm(.6, 1, lu) * .9;
      if (fx.warp === 'out') warp = 1 - sm(0, 1.2, into);
      if (fx.shake) shake = (s.shot === 'rise' ? sm(.35, 1, uu) * .7 : sm(.5, 1, lu) * .6);
      if (fx.whiteOut) { const k = 1 - clamp(left / fx.whiteOut, 0, 1); if (k > 0) { fade = k; white = true; } }
      if (fx.whiteIn) { const k = 1 - clamp(into / fx.whiteIn, 0, 1); if (k > 0) { fade = Math.max(fade, k); white = true; } }
      if (fx.fadeIn) fade = Math.max(fade, 1 - clamp(into / fx.fadeIn, 0, 1));
      if (s.end) fade = Math.max(.74 * sm(0, .6, into), sm(s.d - .7, s.d, into));
    }
    // overlays (only in the film section, never in the cold open)
    const subEl = $('sub');
    let sub = afterExplore ? s.sub : null;
    if (s.sub2 && afterExplore) sub = lu < .5 ? s.sub2[0] : s.sub2[1];
    if (sub && typeof sub !== 'string') {
      const a = s.sub2 ? (lu < .5 ? s.t0 : s.t0 + s.d / 2) : s.t0, b = s.sub2 ? (lu < .5 ? s.t0 + s.d / 2 : s.t1) : s.t1;
      $('sb-zh').textContent = sub[0]; $('sb-en').textContent = sub[1]; subEl.classList.add('on');
      subEl.style.opacity = Math.min(sm(a + .1, a + .35, p), 1 - sm(b - .3, b - .05, p));
    } else subEl.classList.remove('on');
    const jOn = afterExplore && s.jump && lu > .3;
    if (jOn) { $('jp-zh').textContent = s.jump[0]; $('jp-en').textContent = s.jump[1]; }
    $('jump').classList.toggle('on', !!jOn);
    const dec = $('decode');
    if (s.morse) { const k = Math.floor(clamp((lu - .15) / .7, 0, .999) * 4) + (lu > .15 ? 1 : 0); dec.innerHTML = ('S T A Y'.slice(0, Math.max(1, k * 2 - 1)) || '&nbsp;') + '<small>· · · &nbsp;— &nbsp;· — &nbsp;— · — —</small>'; dec.classList.toggle('on', lu > .1); } else dec.classList.remove('on');
    const tc = $('title-card'); tc.classList.toggle('on', !!s.end); tc.style.opacity = s.end ? sm(.3, 1.2, into) * (1 - sm(s.d - .7, s.d, into)) : 0;
    $('chapter').classList.remove('on');
    const clockEl = $('clock');
    clockEl.style.opacity = afterExplore && !s.end && !s.morse && s.kind !== 'black' ? 1 : 0;
    const inTess = s.w === 'tess';
    $('ck-earth').textContent = inTess ? ['∞', '2019.04.12', '2144.06.02', '∞'][Math.floor(p * 8) % 4] : fmtDate(interp(EARTH_CLOCK, T));
    $('ck-ship').textContent = inTess ? '— — —' : '+2Y 0M 16D';
  }
  // cursor & click ripple (explore only)
  const ex0 = firstExplore ? firstExplore.t0 + firstExplore.d * .6 : 1e9;
  const exEnd = (TL.find(x => x.fx && x.fx.expand) || { t0: 0 }).t0 + .3;
  const showCur = p > ex0 && p < exEnd;
  cur.style.display = showCur ? 'block' : 'none';
  if (showCur) { const c = cursorAt(p, ex0); cur.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`; }
  const ck = CLICKS.find(c => p >= c.t && p < c.t + .4);
  if (ck && showCur) { const k = (p - ck.t) / .4; rip.style.opacity = (1 - k).toFixed(3); rip.style.transform = `translate(${ck.x}px, ${ck.y}px) scale(${(.3 + k * 1.2).toFixed(3)})`; } else rip.style.opacity = 0;
  // post
  const b = world.bloom;
  post.bloom.strength = b.strength; post.bloom.radius = b.radius; post.bloom.threshold = b.threshold;
  U.uExposure.value = world.exposure; U.uTime.value = p;
  U.uFade.value = fade; U.uFadeColor.value.setScalar(white ? 1 : 0);
  U.uWarp.value = warp; U.uShake.value = shake;
  if (world.camera.aspect !== 1920 / 1080) { world.camera.aspect = 1920 / 1080; world.camera.updateProjectionMatrix(); }
  post.render(world.scene, world.camera);
  return true;
}

export async function cover(api, kind) {
  const { W, post, setState } = api;
  setState('film');
  ['film', 'loader'].forEach(id => $(id) && ($(id).style.display = 'none'));
  const tall = kind === '34';
  const css = document.createElement('style');
  css.textContent = `
    #cv { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; align-items: center; text-align: center; pointer-events: none;
      justify-content: ${tall ? 'flex-start' : 'flex-start'}; padding-top: ${tall ? 120 : 70}px; }
    #cv .k { font: 500 ${tall ? 26 : 22}px var(--mono); letter-spacing: .4em; color: var(--amber); text-shadow: 0 0 20px #000; padding-left: .4em; }
    #cv .a { margin-top: ${tall ? 30 : 22}px; font: 500 ${tall ? 64 : 58}px/1.2 var(--serif); color: #fff; letter-spacing: .1em; text-shadow: 0 0 30px #000, 0 0 60px #000; }
    #cv .b { font: 700 ${tall ? 150 : 132}px/1.1 var(--serif); color: #fff; letter-spacing: .08em; text-shadow: 0 0 40px rgba(0,0,0,.9), 0 0 120px rgba(255,190,110,.35); }
    #cv .b em { font-style: normal; color: #f3c98a; }
    #cv .s { position: fixed; left: 0; right: 0; bottom: ${tall ? 120 : 64}px; font: 400 ${tall ? 24 : 20}px var(--mono); letter-spacing: .26em; color: rgba(236,231,222,.85); text-shadow: 0 0 14px #000; }
    #cv .s b { color: var(--amber); font-weight: 400; }
  `;
  document.head.appendChild(css);
  const cv = document.createElement('div'); cv.id = 'cv';
  cv.innerHTML = `<div class="k">ENDURANCE · REAL-TIME WEBGL</div><div class="a">我用 AI 写了一个网页</div><div class="b">实时<em>算出</em>黑洞</div>
    <div class="s">旋转黑洞 · 克尔时空光线追踪 · <b>每一帧都在浏览器里实时计算</b> · three.js</div>`;
  document.body.appendChild(cv);
  await document.fonts.ready;
  const w = W.garg, c = w.camera;
  w.setDoppler(1); w.showShipExplore = false;
  const r = (tall ? 44 : 38) * RS, az = -1.62, el = .06;
  c.position.set(r * Math.cos(el) * Math.cos(az), r * Math.sin(el), r * Math.cos(el) * Math.sin(az));
  c.up.set(0, 1, 0); c.lookAt(0, (tall ? 7.5 : 4.2) * RS, 0); c.fov = tall ? 38 : 30;
  c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix();
  w.update(30, 0, 'film');
  w.scene.children.forEach(o => { if (o.userData && o.userData.ring) o.visible = false; });
  const b = w.bloom; post.bloom.strength = b.strength * 1.15; post.bloom.radius = b.radius; post.bloom.threshold = b.threshold;
  post.u.uExposure.value = 1.05; post.u.uFade.value = 0; post.u.uWarp.value = 0; post.u.uTime.value = 3;
  post.render(w.scene, c);
  window.__ready = true;
}
