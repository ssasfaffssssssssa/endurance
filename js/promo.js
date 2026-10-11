// Douyin promo: a frame-exact 16:9 cut. render(t) is a pure function of t, so frames can be rendered in parallel.
import * as THREE from 'three';
import { RS } from './worlds/gargantua.js';
import { EARTH_CLOCK } from './film.js';

export const PROMO_END = 49;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const $ = id => document.getElementById(id);

// explore segments (windowed, with cursor) and film segments (full-bleed)
const CLICKS = [
  { t: 4.9, el: () => document.querySelectorAll('#tl-ctrl .tg')[1] },   // PHYSICAL
  { t: 8.2, el: () => document.querySelector('.rl[data-id=saturn]') },
  { t: 11.2, el: () => document.querySelector('.rl[data-id=miller]') },
  { t: 14.2, el: () => document.querySelector('.rl[data-id=tess]') },
  { t: 16.8, el: () => document.querySelector('.rl[data-id=dust]') },
  { t: 20.3, el: () => $('ex-film') },
];
const EXPLORE = [
  [0, 8.2, 'garg'], [8.2, 11.2, 'saturn'], [11.2, 14.2, 'miller'], [14.2, 16.8, 'tess'], [16.8, 20.3, 'dust'],
];
// [p0, p1, world, shot, u0, u1, filmShotStart, filmShotEnd]
const FILM = [
  [20.3, 24.0, 'earth', 'dawn', .30, .95, 14, 21.5],
  [24.0, 26.6, 'saturn', 'vista', .25, .70, 28, 35.5],
  [26.6, 28.6, 'saturn', 'enter', .15, 1, 41, 44],
  [28.6, 30.2, 'miller', 'calm', .35, .75, 44, 49],
  [30.2, 33.4, 'miller', 'rise', .15, 1, 52.5, 60],
  [33.4, 33.8, null],
  [33.8, 36.8, 'garg', 'reveal', .35, 1, 60, 69.5],
  [36.8, 39.3, 'garg', 'flyby', .1, .9, 69.5, 76],
  [39.3, 41.3, 'garg', 'dive', .45, 1, 76, 84],
  [41.3, 43.5, 'tess', 'fall', .03, .45, 84, 92.5],
  [43.5, PROMO_END, 'dust', 'stay', .40, 1, 100, 112],
];
const SUBS = [
  [21.0, 23.8, '收成一年比一年少，沙尘一年比一年厚。', 'Each harvest thinner. Each storm darker.'],
  [24.3, 26.4, '土星旁边，有人为我们留下了一扇门。', 'Beside Saturn, someone had left us a door.'],
  [28.9, 30.15, '这里的一小时，是地球上的七年。', 'One hour here is seven years on Earth.'],
  [30.4, 31.8, '那不是山……', 'Those aren’t mountains…'],
  [32.0, 33.35, '……是浪。', '…they’re waves.'],
  [34.2, 36.6, '卡冈图雅。一亿个太阳的质量，连光都无法逃离。', 'Gargantua. A hundred million suns. Not even light escapes.'],
  [37.0, 39.2, '在它身边，时间不再是一个常数。', 'Near it, time is no longer a constant.'],
  [41.8, 43.4, '引力能穿越时间——也许，爱也能。', 'Gravity crosses time — perhaps love does too.'],
];
const JUMPS = [[31.0, 33.35, '地球时间 +23 年 4 个月 8 天', 'EARTH TIME +23 YEARS 4 MONTHS 8 DAYS'], [39.6, 41.2, '地球时间 +51 年', 'EARTH TIME +51 YEARS']];
const MORSE = [[44.0, 'S'], [44.45, 'S T'], [44.85, 'S T A'], [45.3, 'S T A Y']];

let A, curExplore = null, rects = {};
const fmtDate = y => { const yr = Math.floor(y); const doy = Math.floor((y - yr) * 365); const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let m = 0, d = doy; while (m < 11 && d >= md[m]) { d -= md[m]; m++; } return `${yr}.${String(m + 1).padStart(2, '0')}.${String(d + 1).padStart(2, '0')}`; };
function interp(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = (t - a) / Math.max(1e-6, b - a); return va + (vb - va) * (u * u * (3 - 2 * u)); } return keys[keys.length - 1][1]; }

export async function setup(api) {
  A = api;
  const css = document.createElement('style');
  css.textContent = `
    body.promo { background: radial-gradient(ellipse at 50% 40%, #2a1f14 0%, #0d0a07 45%, #000 100%); }
    #win { position: fixed; left: 0; top: 0; width: 1920px; height: 1116px; transform-origin: 50% 0; border-radius: 14px; overflow: hidden;
      box-shadow: 0 40px 120px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.08), 0 0 160px rgba(232,180,106,.08); background: #000; }
    #winbar { position: absolute; left: 0; right: 0; top: 0; height: 36px; background: linear-gradient(#232120, #1a1918); border-bottom: 1px solid #0b0b0b; display: flex; align-items: center; gap: 14px; padding: 0 16px; }
    #winbar .tl { display: flex; gap: 8px; } #winbar .tl i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; } #winbar .tl i:nth-child(2) { background: #febc2e; } #winbar .tl i:nth-child(3) { background: #28c840; }
    #winbar .tab { height: 26px; margin-top: 10px; padding: 0 16px; display: flex; align-items: center; gap: 8px; background: #2c2a28; border-radius: 8px 8px 0 0; font: 400 12px var(--sans); color: #ddd; letter-spacing: .04em; }
    #winbar .url { flex: 1; max-width: 640px; margin-left: 40px; height: 24px; border-radius: 12px; background: #121110; display: flex; align-items: center; padding: 0 14px; font: 400 12px var(--mono); color: #bbb; letter-spacing: .04em; }
    #winbar .url b { color: #888; font-weight: 400; margin-right: 8px; }
    #stage { position: absolute; left: 0; top: 36px; width: 1920px; height: 1080px; overflow: hidden; transform: translateZ(0); }
    #hook { position: fixed; left: 0; right: 0; top: 92px; text-align: center; z-index: 50; pointer-events: none; }
    #hook .k { font: 400 15px var(--mono); letter-spacing: .5em; color: var(--amber); padding-left: .5em; text-shadow: 0 0 20px #000; }
    #hook .a, #hook .b { font: 500 74px/1.25 var(--serif); letter-spacing: .12em; color: #fff; text-shadow: 0 0 30px rgba(0,0,0,.9), 0 0 80px rgba(0,0,0,.8); }
    #hook .a { margin-top: 26px; font-size: 52px; font-weight: 400; color: rgba(255,255,255,.86); }
    #hook .b em { font-style: normal; color: #f3c98a; }
    #hook .s { margin-top: 22px; font: 400 16px var(--mono); letter-spacing: .3em; color: rgba(236,231,222,.75); text-shadow: 0 0 12px #000; }
    #cursor { position: absolute; left: 0; top: 0; width: 30px; height: 30px; z-index: 60; pointer-events: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,.8)); }
    #ripple { position: absolute; left: 0; top: 0; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; border: 2px solid var(--amber); z-index: 59; pointer-events: none; opacity: 0; }
    #decode { font-size: 54px !important; top: 40% !important; } #decode small { font-size: 15px !important; }
    #title-card .tc-s { font-size: 22px; letter-spacing: .3em; } #title-card .tc-e { font-size: 13px; letter-spacing: .36em; margin-top: 16px; }
    #title-card .tc-f { margin-top: 44px; font: 400 13px var(--mono); letter-spacing: .3em; color: var(--amber); }
  `;
  document.head.appendChild(css);
  // wrap the page into a browser window
  const win = document.createElement('div'); win.id = 'win';
  win.innerHTML = `<div id="winbar"><div class="tl"><i></i><i></i><i></i></div><div class="tab">✦ ENDURANCE · 穿越卡冈图雅</div><div class="url"><b>ⓘ</b>localhost:8090</div></div><div id="stage"></div>`;
  document.body.appendChild(win);
  const stage = win.querySelector('#stage');
  ['gl', 'bars', 'fade', 'loader', 'intro', 'film', 'explore', 'end', 'toast'].forEach(id => { const e = $(id); if (e) stage.appendChild(e); });
  const cur = document.createElement('div'); cur.id = 'cursor';
  cur.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40"><path d="M4 2l15 11.5-6.6.9 3.9 7.3-2.8 1.5-3.9-7.4L4 20.5z" fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  const rip = document.createElement('div'); rip.id = 'ripple';
  stage.appendChild(rip); stage.appendChild(cur);
  const hook = document.createElement('div'); hook.id = 'hook';
  hook.innerHTML = `<div class="k">INTERSTELLAR · 星际穿越致敬</div><div class="a">这不是视频素材</div><div class="b">是浏览器里<em>实时算出来</em>的黑洞</div><div class="s">史瓦西时空 · 逐像素光线追踪 · 纯前端网页</div>`;
  document.body.appendChild(hook);
  $('title-card').innerHTML = `<div class="tc-t">ENDURANCE</div><div class="tc-s">每一行代码都由 AI 写成</div><div class="tc-e">实时三维渲染 · 程序化管风琴配乐 · 打开网页就能玩</div><div class="tc-f">致敬《星际穿越》</div>`;
  // measure click targets in stage coordinates (window un-scaled)
  win.style.transform = 'none';
  A.setState('explore');
  A.selectWorld('garg');
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 300));
  const sr = stage.getBoundingClientRect();
  for (const c of CLICKS) { const e = c.el(); if (!e) continue; const r = e.getBoundingClientRect(); c.x = r.left - sr.left + r.width / 2; c.y = r.top - sr.top + r.height / 2; }
  curExplore = 'garg';
  window.render = render;
  window.PROMO_END = PROMO_END;
  window.__ready = true;
}

function cursorAt(p) {
  // path: enters at 3.6 from lower right, then glides between click targets
  const pts = [{ t: 3.4, x: 1500, y: 980 }];
  CLICKS.forEach((c, i) => { const prev = i ? CLICKS[i - 1].t : 3.4; pts.push({ t: Math.max(prev + .35, c.t - .75), x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, hold: true }); pts.push({ t: c.t - .08, x: c.x + 4, y: c.y + 6 }); });
  let x = pts[0].x, y = pts[0].y;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (p <= b.t) { const u = ease(clamp((p - a.t) / (b.t - a.t), 0, 1)); x = lerp(a.x, b.x, u); y = lerp(a.y, b.y, u); return { x, y }; } x = b.x; y = b.y; }
  return { x, y };
}

const tmp = new THREE.Vector3();
function exploreCamera(id, p, w) {
  const c = w.camera; c.up.set(0, 1, 0);
  if (id === 'garg') {
    const z = sm(5.8, 8.1, p);
    const r = lerp(lerp(48, 42, sm(0, 5.8, p)), 7.5, ease(z)) * RS;
    const az = -1.70 + p * .022 + z * .25, el = .07 - z * .035;
    c.position.set(r * Math.cos(el) * Math.cos(az), r * Math.sin(el), r * Math.cos(el) * Math.sin(az));
    c.lookAt(0, -.4 * RS * (1 - z), 0); c.fov = lerp(24, 34, z);
  } else if (id === 'saturn') {
    const u = (p - 8.2) / 3, WH = w.explore.target;
    const a = lerp(-.38, -.12, ease(u)), d = lerp(1250, 900, ease(u));
    c.position.set(WH.x + Math.sin(a) * d, WH.y + lerp(160, 90, u), WH.z + Math.cos(a) * d);
    c.lookAt(tmp.copy(WH).add(new THREE.Vector3(lerp(260, 120, u), -30, 0))); c.fov = 40;
  } else if (id === 'miller') {
    const u = (p - 11.2) / 3;
    c.position.set(lerp(-6, 8, u), lerp(16, 24, u), lerp(120, 96, u));
    c.lookAt(tmp.set(lerp(-20, 10, u), lerp(52, 70, u), -400)); c.fov = 52;
    w.front = lerp(2600, 1150, u);
  } else if (id === 'tess') {
    const u = (p - 14.2) / 2.6;
    c.position.set(2.0 + Math.sin(u * 2) * .2, 1.55 + u * .3, -1 - u * 4.5);
    c.up.set(Math.sin(u) * .25, 1, 0).normalize();
    c.lookAt(tmp.set(2.2, 1.3, c.position.z - 6)); c.fov = 62;
  } else if (id === 'dust') {
    const u = (p - 16.8) / 3.5;
    const a = lerp(.35, .05, ease(u)), d = lerp(3.2, 2.7, u);
    c.position.set(Math.sin(a) * d, lerp(2.6, 2.8, u), -.3 + Math.cos(a) * d);
    c.lookAt(tmp.set(0, 0, -.25)); c.fov = 40;
    w.setManual(clamp(u / .55, 0, 1), sm(.3, .7, u), 1);
  }
  c.updateProjectionMatrix();
}

export function render(p) {
  const W = A.W, post = A.post;
  const u = post.u;
  let fade = 0, white = false, warp = 0, shake = 0, world, T = p;
  const winK = p < 20.3 ? sm(3.2, 4.2, p) : 1 - sm(20.3, 21.3, p);
  const win = $('win');
  win.style.transform = `translateY(${lerp(-36, 66, winK).toFixed(2)}px) scale(${lerp(1, .84, winK).toFixed(4)})`;
  win.style.borderRadius = winK > .02 ? '14px' : '0';
  // hook text
  const hk = sm(.15, .6, p) * (1 - sm(2.75, 3.25, p));
  $('hook').style.opacity = hk; $('hook').style.transform = `translateY(${(1 - sm(.15, .9, p)) * 18}px)`;
  const cur = $('cursor'), rip = $('ripple');
  if (p < 20.3) {
    // ——— explore ———
    const seg = EXPLORE.find(s => p >= s[0] && p < s[1]) || EXPLORE[0];
    const id = seg[2];
    if (document.body.className.indexOf('state-explore') < 0) A.setState('explore');
    if (curExplore !== id) { A.selectWorld(id); curExplore = id; }
    world = W[id];
    $('explore').style.opacity = sm(3.3, 4.1, p);
    if (id === 'garg') {
      world.showShipExplore = false;
      const phys = p >= 4.9;
      world.setDoppler(sm(4.9, 5.6, p));
      const tg = document.querySelectorAll('#tl-ctrl .tg');
      if (tg.length) { tg[0].classList.toggle('on', !phys); tg[1].classList.toggle('on', phys); tg[2].classList.remove('on'); }
    }
    exploreCamera(id, p, world);
    T = 100 + p;
    world.update(T, 0, id === 'dust' || id === 'miller' ? 'explore' : 'explore');
    A.telemetry(1 / 60, p - seg[0], true);
    if (A.barsOn) A.updateBars(false);
    if (id === 'saturn') { warp = 0; }
  } else {
    // ——— film ———
    if (document.body.className.indexOf('state-film') < 0) A.setState('film');
    const seg = FILM.find(s => p >= s[0] && p < s[1]) || FILM[FILM.length - 1];
    A.updateBars(true);
    const barK = sm(20.3, 21.3, p);
    document.documentElement.style.setProperty('--bar', (barK * Math.max(0, (1080 - 1920 / 2.39) / 2)).toFixed(1) + 'px');
    if (!seg[2]) { world = W.garg; fade = 1; }
    else {
      world = W[seg[2]];
      const uu = lerp(seg[4], seg[5], (p - seg[0]) / (seg[1] - seg[0]));
      T = lerp(seg[6], seg[7], uu);
      world.shots[seg[3]](uu, T);
      if (seg[2] === 'dust') world.manual = false;
      if (seg[2] === 'garg') world.setDoppler(0);
      world.update(T, 0, 'film');
      if (seg[3] === 'enter') { warp = Math.pow(uu, 2.2); const k = sm(28.25, 28.6, p); if (k > 0) { fade = k; white = true; } }
      if (seg[3] === 'calm') { const k = 1 - sm(28.6, 29.6, p); if (k > 0) { fade = k; white = true; } warp = k * .7; }
      if (seg[3] === 'rise') shake = sm(.35, 1, uu) * .7;
      if (seg[3] === 'reveal' && seg[2] === 'garg') fade = 1 - sm(33.8, 34.4, p);
      if (seg[3] === 'dive') { warp = sm(.78, 1, uu) * .9; shake = sm(.6, 1, uu) * .6; const k = sm(40.95, 41.3, p); if (k > 0) { fade = k; white = true; } }
      if (seg[3] === 'fall') { warp = 1 - sm(41.3, 42.6, p); const k = 1 - sm(41.3, 42.2, p); if (k > 0) { fade = k; white = true; } }
      if (seg[3] === 'stay') { fade = Math.max(1 - sm(43.5, 44.0, p) * 1, sm(45.4, 46.6, p) * .74, sm(48.3, 49, p)); }
      if (seg[3] === 'dawn') fade = 0;
    }
    // overlays
    const s = SUBS.find(s => p >= s[0] && p < s[1]);
    const subEl = $('sub');
    if (s) { $('sb-zh').textContent = s[2]; $('sb-en').textContent = s[3]; subEl.classList.add('on'); subEl.style.opacity = Math.min(sm(s[0], s[0] + .25, p), 1 - sm(s[1] - .25, s[1], p)); } else subEl.classList.remove('on');
    const j = JUMPS.find(j => p >= j[0] && p < j[1]);
    if (j) { $('jp-zh').textContent = j[2]; $('jp-en').textContent = j[3]; }
    $('jump').classList.toggle('on', !!j);
    const m = MORSE.filter(m => p >= m[0]);
    const dec = $('decode');
    if (p >= 43.8 && p < 45.6) { dec.innerHTML = (m.length ? m[m.length - 1][1] : '&nbsp;') + '<small>· · · &nbsp;— &nbsp;· — &nbsp;— · — —</small>'; dec.classList.add('on'); } else dec.classList.remove('on');
    $('title-card').classList.toggle('on', p >= 45.9);
    $('title-card').style.opacity = sm(45.9, 46.9, p) * (1 - sm(48.3, 49, p));
    $('chapter').classList.remove('on');
    const ft = seg[2] ? T : 60;
    const clockEl = $('clock');
    clockEl.style.opacity = p > 21 && p < 43.5 ? 1 : 0;
    const inTess = seg[2] === 'tess';
    clockEl.classList.toggle('glitch', false);
    $('ck-earth').textContent = inTess ? ['∞', '2019.04.12', '2144.06.02', '∞'][Math.floor(p * 8) % 4] : fmtDate(interp(EARTH_CLOCK, ft));
    $('ck-ship').textContent = inTess ? '— — —' : '+2Y 0M 16D';
  }
  // cursor
  const showCur = p > 3.4 && p < 20.6;
  cur.style.display = showCur ? 'block' : 'none';
  if (showCur) { const c = cursorAt(p); cur.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px)`; }
  const ck = CLICKS.find(c => p >= c.t && p < c.t + .45);
  if (ck && showCur) { const k = (p - ck.t) / .45; rip.style.opacity = (1 - k).toFixed(3); rip.style.transform = `translate(${ck.x}px, ${ck.y}px) scale(${(.3 + k * 1.2).toFixed(3)})`; } else rip.style.opacity = 0;
  // post
  const b = world.bloom;
  post.bloom.strength = b.strength; post.bloom.radius = b.radius; post.bloom.threshold = b.threshold;
  u.uExposure.value = world.exposure; u.uTime.value = p;
  u.uFade.value = fade; u.uFadeColor.value.setScalar(white ? 1 : 0);
  u.uWarp.value = warp; u.uShake.value = shake;
  if (world.camera.aspect !== 1920 / 1080) { world.camera.aspect = 1920 / 1080; world.camera.updateProjectionMatrix(); }
  post.render(world.scene, world.camera);
  return true;
}

// Douyin cover: the physical-mode hole, full-bleed, with a bold title.
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
  cv.innerHTML = `<div class="k">INTERSTELLAR · 致敬星际穿越</div><div class="a">我用 AI 写了一个网页</div><div class="b">实时<em>算出</em>黑洞</div>
    <div class="s">史瓦西时空光线追踪 · <b>ENDURANCE</b> · 纯前端 three.js</div>`;
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
