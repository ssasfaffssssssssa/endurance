import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPost } from './post.js';
import { Score } from './audio.js';
import { DURATION, SHOTS, CHAPTERS, SUBS, EARTH_CLOCK, SHIP_CLOCK, JUMPS, WORLD_INFO } from './film.js';
import { clamp, smooth, lerp } from './util.js';
import { createDust } from './worlds/dust.js';
import { createEarth } from './worlds/earth.js';
import { createSaturn } from './worlds/saturn.js';
import { createMiller } from './worlds/miller.js';
import { createGargantua, RS } from './worlds/gargantua.js';
import { createTesseract } from './worlds/tesseract.js';
import { createHUD } from './hud.js';
const DEV = new URLSearchParams(location.search);
const RECORD = DEV.has('promo') || DEV.has('cover');
if (RECORD) { window.__record = true; document.body.classList.add('promo'); }

const $ = id => document.getElementById(id);
const body = document.body;
const setState = s => { body.className = body.className.replace(/state-\w+/, '') + ' state-' + s; state = s; };
let state = 'loading';

/* ————— renderer ————— */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
if (!renderer.capabilities.isWebGL2) { $('ld-status').textContent = '需要 WebGL2 · WEBGL2 REQUIRED'; throw new Error('WebGL2 required'); }
renderer.setClearColor(0x000000, 1);
const post = createPost(renderer);
const TOUCH = matchMedia('(pointer: coarse)').matches;
const DPR = Math.min(devicePixelRatio || 1, 2);
let quality = TOUCH ? .7 : 1;          // adaptive multiplier
let curPR = 0;

/* ————— loading ————— */
const ldFill = $('ld-fill'), ldStatus = $('ld-status');
const step = (p, msg) => { ldFill.style.width = (p * 100) + '%'; ldStatus.textContent = msg; return new Promise(r => setTimeout(r, 30)); };
const W = {};
const order = ['dust', 'earth', 'saturn', 'miller', 'garg', 'tess'];
async function load() {
  await step(.05, '积分零测地线 · INTEGRATING NULL GEODESICS');
  W.garg = createGargantua();
  await step(.2, '撒下尘埃 · SETTLING THE DUST');
  W.dust = createDust();
  await step(.32, '载入地球 · LOADING A DUSTY EARTH');
  W.earth = await createEarth(renderer);
  await step(.5, '打开虫洞 · OPENING THE WORMHOLE');
  W.saturn = createSaturn();
  await step(.62, '掀起潮汐 · RAISING TIDAL WAVES');
  W.miller = createMiller();
  await step(.72, '折叠五维空间 · FOLDING FIVE DIMENSIONS');
  W.tess = createTesseract();
  resize();
  let i = 0;
  for (const k of order) {
    await step(.75 + i++ * .04, '编译着色器 · COMPILING ' + k.toUpperCase());
    const w = W[k]; w.update(0, 0, 'film');
    try { renderer.compile(w.scene, w.camera); post.render(w.scene, w.camera); } catch (e) { console.warn(e); }
  }
  await step(1, '就绪 · READY');
  if (RECORD) {
    const m = await import('./promo.js');
    if (DEV.has('cover')) { await m.cover({ W, post, setState }, DEV.get('cover')); return; }
    await m.setup({ W, post, renderer, resize, setState, selectWorld, telemetry, hud, updateBars: v => { barsOn = v; updateBars(); }, get barsOn() { return barsOn; } });
    return;
  }
  setTimeout(() => {
    setState('intro'); current = W.garg; introT = 0;
    if (DEV.has('film')) startFilm(+DEV.get('film'));
    if (DEV.has('explore')) enterExplore(DEV.get('explore') || 'garg');
  }, 400);
}

/* ————— sizing & adaptive resolution ————— */
function resize() {
  const w = innerWidth, h = innerHeight;
  const maxS = current ? current.maxScale : 1;
  const pr = clamp(DPR * quality, .5, Math.min(DPR, maxS));
  curPR = pr;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  post.setSize(w, h, pr);
  window.__renderH = h * pr;
  window.__app = { W, post, score, get filmT() { return filmT; }, seek, togglePlay, get state() { return state; } };
  for (const k in W) { W[k].camera.aspect = w / h; W[k].camera.updateProjectionMatrix(); }
  updateBars();
}
addEventListener('resize', resize);
let ftAvg = 16, ftT = 0;
function adapt(dt) {
  if (RECORD) return;
  ftAvg = lerp(ftAvg, dt * 1000, .05); ftT += dt;
  if (ftT < 1.2) return;
  if (ftAvg > 24 && quality > .45) { quality *= .86; ftT = 0; resize(); }
  else if (ftAvg < 15 && quality < 1) { quality = Math.min(1, quality * 1.06); ftT = 0; resize(); }
}

/* ————— letterbox ————— */
let barsOn = false;
function updateBars() {
  const h = innerHeight, w = innerWidth;
  const target = w / 2.39;
  const bar = barsOn && w > h ? Math.max(0, (h - target) / 2) : (barsOn ? h * .08 : 0);
  document.documentElement.style.setProperty('--bar', bar + 'px');
}

/* ————— audio ————— */
const score = new Score();
let muted = false;
function setMuted(m) { muted = m; score.setMuted(m); const t = m ? 'SOUND OFF' : 'SOUND ON'; $('tb-sound').textContent = t; $('ex-sound').innerHTML = '<kbd>M</kbd>' + t; }

/* ————— film ————— */
let current = null, filmT = 0, playing = false, localClock = 0, introT = 0;
function shotAt(t) { for (const s of SHOTS) if (t >= s[0] && t < s[1]) return s; return SHOTS[SHOTS.length - 1]; }
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = (t - a) / Math.max(1e-6, b - a); return va + (vb - va) * (u * u * (3 - 2 * u)); }
  return keys[keys.length - 1][1];
}
function transition(t) {
  let fade = 0, white = false;
  const idx = SHOTS.findIndex(s => t >= s[0] && t < s[1]);
  const s = SHOTS[Math.max(0, idx)], next = SHOTS[idx + 1];
  const into = t - s[0], left = s[1] - t;
  if (s[4] === 'black') fade = Math.max(fade, 1 - into / 1.1);
  if (s[4] === 'white') { fade = Math.max(fade, 1 - into / 1.3); white = into < 1.3; }
  if (s[4] === 'hold') fade = into < 1.2 ? 1 : Math.max(0, 1 - (into - 1.2) / 1.6);
  if (next && next[4] === 'black') fade = Math.max(fade, 1 - left / .8);
  if (next && next[4] === 'white') { const k = 1 - left / .45; if (k > 0) { fade = Math.max(fade, k); white = true; } }
  if (t > 105.6) fade = Math.max(fade, smooth(105.6, 107.6, t) * .74);
  if (t > DURATION - 1.8) fade = Math.max(fade, smooth(DURATION - 1.8, DURATION - .1, t));
  return { fade: clamp(fade, 0, 1), white };
}
function fx(t, s, u) {
  let warp = 0, shake = 0;
  if (s[2] === 'saturn' && s[3] === 'enter') warp = Math.pow(u, 2.2);
  if (s[2] === 'garg' && s[3] === 'dive') { warp = smooth(.78, 1, u) * .9; shake = smooth(.6, 1, u) * .6; }
  if (s[2] === 'tess' && s[3] === 'fall') warp = Math.max(0, 1 - (t - 84) / 1.8);
  if (s[2] === 'miller' && s[3] === 'rise') shake = smooth(.35, 1, u) * .7;
  if (s[2] === 'miller' && s[3] === 'calm') warp = Math.max(0, 1 - (t - 44) / 1.2) * .8;
  return { warp, shake };
}

// —— film overlay elements ——
const cp = $('chapter'), sub = $('sub'), jump = $('jump'), dec = $('decode'), tcard = $('title-card'), clockEl = $('clock');
let lastCh = -1, lastSub = -1, lastTickN = -1;
const fmtDate = y => { const yr = Math.floor(y); const f = y - yr; const doy = Math.floor(f * 365); const mdays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let m = 0, d = doy; while (m < 11 && d >= mdays[m]) { d -= mdays[m]; m++; } return `${yr}.${String(m + 1).padStart(2, '0')}.${String(d + 1).padStart(2, '0')}`; };
const fmtShip = y => { const yr = Math.floor(y), mo = Math.floor((y - yr) * 12), d = Math.floor(((y - yr) * 12 - mo) * 30.4); return `+${yr}Y ${mo}M ${d}D`; };
const MORSE_T = (() => { const out = []; let mt = 104.2; ['...', '-', '.-', '-.--'].forEach((l, i) => { [...l].forEach(c => mt += (c === '.' ? .09 : .27) + .09); out.push([mt, 'STAY'[i]]); mt += .2; }); return out; })();
function filmUI(t) {
  // chapter cards
  let ci = -1; CHAPTERS.forEach((c, i) => { if (t >= c.t + .9 && t < c.t + 4.6) ci = i; });
  if (ci !== lastCh) { lastCh = ci; if (ci >= 0) { const c = CHAPTERS[ci]; $('cp-num').textContent = c.num; $('cp-zh').textContent = c.zh; $('cp-en').textContent = c.en; cp.classList.add('on'); } else cp.classList.remove('on'); }
  // subtitles
  let si = SUBS.findIndex(s => t >= s[0] && t < s[1]);
  if (si !== lastSub) { lastSub = si; if (si >= 0) { $('sb-zh').textContent = SUBS[si][2]; $('sb-en').textContent = SUBS[si][3]; sub.classList.add('on'); } else sub.classList.remove('on'); }
  // clocks
  const inTess = t >= 84 && t < 100;
  clockEl.classList.toggle('glitch', inTess);
  $('ck-earth').textContent = inTess ? (Math.random() > .5 ? '∞' : fmtDate(2067 + Math.random() * 90)) : fmtDate(interp(EARTH_CLOCK, t));
  $('ck-ship').textContent = inTess ? '— — —' : fmtShip(interp(SHIP_CLOCK, t));
  clockEl.style.opacity = t < 1.5 || t > 104 ? 0 : 1;
  if (t >= 44.6 && t < 60) { const n = Math.floor((t - 44.6) / 1.25); if (n !== lastTickN) { lastTickN = n; const el = $('ck-tick'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); } }
  // time jumps
  const j = JUMPS.find(j => t >= j.t && t < j.t + 3.6);
  if (j) { $('jp-zh').textContent = j.zh; $('jp-en').textContent = j.en; }
  jump.classList.toggle('on', !!j);
  // decoding: binary in the prologue, STAY in the epilogue
  if (t >= 11.1 && t < 13.9) { const k = Math.min(12, Math.floor((t - 11.1) / .2) + 1); dec.innerHTML = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0].slice(0, k).join(' ') + '<small>BINARY · 坐标</small>'; dec.classList.add('on'); }
  else if (t >= 104.2 && t < 106.6) { const s = MORSE_T.filter(m => t >= m[0]).map(m => m[1]).join(' '); dec.innerHTML = (s || '&nbsp;') + '<small>· · · &nbsp;— &nbsp;· — &nbsp;— · — —</small>'; dec.classList.add('on'); }
  else dec.classList.remove('on');
  tcard.classList.toggle('on', t >= 106.8 && t < 111.4);
  // transport
  $('track-fill').style.width = (t / DURATION * 100) + '%';
  const f = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  $('tb-time').textContent = `${f(t)} / ${f(DURATION)}`;
}
(function buildTicks() {
  const el = $('track-ticks');
  CHAPTERS.forEach(c => { const s = document.createElement('span'); s.style.left = (c.t / DURATION * 100) + '%'; s.innerHTML = `<b>${c.num} ${c.zh}</b>`; el.appendChild(s); });
})();

function startFilm(from = 0) {
  score.init(); score.resume(); setMuted(muted);
  score.ambience(null);
  disposeControls();
  setState('film'); barsOn = true; updateBars();
  filmT = from; playing = true; lastCh = lastSub = -2;
  score.play(from);
  setPlayIcon();
  canvas.focus();
}
function setPlayIcon() { $('tb-play-path').setAttribute('d', playing ? 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' : 'M8 5.5v13l10.5-6.5z'); }
function togglePlay() {
  if (state !== 'film') return;
  playing = !playing;
  if (playing) { if (filmT >= DURATION - .05) filmT = 0; score.play(filmT); } else score.pause();
  setPlayIcon();
}
function seek(t) {
  filmT = clamp(t, 0, DURATION - .01);
  if (playing) score.play(filmT); else score.seek(filmT);
  lastCh = lastSub = -2;
}
function endFilm() { playing = false; score.pause(); setState('end'); barsOn = false; updateBars(); current = W.garg; introT = 0; }

/* ————— explore ————— */
let controls = null, exploreWorld = 'garg';
function disposeControls() { if (controls) { controls.dispose(); controls = null; } }
function enterExplore(id = exploreWorld) {
  score.init(); score.resume(); setMuted(muted);
  if (playing) { playing = false; score.pause(); }
  setState('explore'); barsOn = false; updateBars();
  selectWorld(id);
}
const AMB = { dust: 'A1 E3 A3 B3 E4', earth: 'F1 C3 F3 A3 E4', saturn: 'G1 D3 G3 B3 D4', miller: 'D2 A3 D4 E4 F4', garg: 'A0 E2 A2 C4 E4', tess: 'C2 G3 C4 E4 B4' };
function selectWorld(id) {
  exploreWorld = id;
  const w = W[id]; current = w;
  disposeControls();
  const cam = w.camera;
  cam.up.set(0, 1, 0);
  cam.position.copy(w.explore.pos); cam.fov = w.explore.fov || 40; cam.updateProjectionMatrix();
  controls = new OrbitControls(cam, canvas);
  controls.target.copy(w.explore.target);
  controls.enableDamping = true; controls.dampingFactor = .06;
  controls.minDistance = w.explore.min; controls.maxDistance = w.explore.max;
  controls.rotateSpeed = .5; controls.zoomSpeed = .7;
  controls.autoRotate = true; controls.autoRotateSpeed = id === 'garg' ? .12 : .2;
  if (id === 'miller') { controls.maxPolarAngle = Math.PI * .495; }
  if (id === 'dust') { controls.maxPolarAngle = Math.PI * .47; }
  controls.update();
  w.explore._init = true;
  resize();
  // overlay
  document.querySelectorAll('.rl').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  const I = WORLD_INFO[id];
  $('if-kicker').textContent = I.kicker; $('if-num').textContent = I.num; $('if-zh').textContent = I.zh; $('if-en').textContent = I.en;
  $('if-text').textContent = I.text; $('if-text-en').textContent = I.textEn;
  buildCtrl(id);
  hud.select(id, w);
  setMode('orbit');
  controls.addEventListener('start', () => setMode('free'));
  score.ambience(AMB[id]);
  exploreStart = performance.now();
}
(function buildRail() {
  const rail = $('rail');
  order.forEach(id => { const I = WORLD_INFO[id]; const b = document.createElement('button'); b.className = 'rl'; b.type = 'button'; b.dataset.id = id; b.innerHTML = `<span class="n">${I.num}</span><span class="z">${I.zh}</span><span class="e">${I.en}</span>`; b.onclick = () => selectWorld(id); rail.appendChild(b); });
})();
function buildCtrl(id) {
  const c = $('tl-ctrl'); c.innerHTML = '';
  const tog = (label, on, fn) => { const b = document.createElement('button'); b.className = 'tg' + (on ? ' on' : ''); b.type = 'button'; b.textContent = label; b.onclick = () => fn(b); c.appendChild(b); return b; };
  if (id === 'garg') {
    const a = tog('电影 CINEMATIC', W.garg.doppler < .5, () => { W.garg.setDoppler(0); a.classList.add('on'); b.classList.remove('on'); });
    const b = tog('物理 PHYSICAL', W.garg.doppler >= .5, () => { W.garg.setDoppler(1); b.classList.add('on'); a.classList.remove('on'); });
    tog('永恒号 SHIP', W.garg.showShipExplore, el => { W.garg.showShipExplore = !W.garg.showShipExplore; el.classList.toggle('on', W.garg.showShipExplore); });
  }
  if (id === 'dust') {
    tog('二进制 BINARY', true, el => { W.dust.setExplorePattern(0); el.classList.add('on'); el.nextSibling.classList.remove('on'); });
    tog('摩尔斯 STAY', false, el => { W.dust.setExplorePattern(1); el.classList.add('on'); el.previousSibling.classList.remove('on'); });
  }
}
let exploreStart = 0;
const hud = createHUD();
function hudStats(id, w) {
  const cam = w.camera;
  const st = { fps: 1000 / Math.max(1, ftAvg), pr: curPR, range: '—' };
  if (id === 'garg') { Object.assign(st, w.stats()); st.range = (cam.position.length() / RS).toFixed(1) + ' rₛ'; }
  else if (id === 'saturn') { st.wh = w.whDist(); st.range = (cam.position.distanceTo(w.explore.target) * .011).toFixed(2) + ' km'; }
  else if (id === 'miller') { st.front = w.front; st.range = Math.round(cam.position.distanceTo(controls ? controls.target : w.explore.target)) + ' m'; }
  else if (id === 'earth') { st.alt = (cam.position.length() - 100) * 63.71; st.range = Math.round(st.alt).toLocaleString() + ' km'; }
  else if (id === 'tess') st.range = '∞';
  else if (id === 'dust') { st.pattern = w.morse ? w.patternB : w.pattern; st.morse = w.morse; st.range = cam.position.distanceTo(w.explore.target).toFixed(2) + ' m'; }
  return st;
}
function telemetry(dt, secsOverride, force) {
  const secs = secsOverride ?? (performance.now() - exploreStart) / 1000;
  const w = W[exploreWorld];
  const st = hudStats(exploreWorld, w);
  if (RECORD) st.fps = 60;
  hud.update(dt, secs, w.camera, st, force);
}
function setMode(m) {
  if (m === 'film') { const ch = { dust: 0, earth: 14, saturn: 28, miller: 44, garg: 60, tess: 84 }[exploreWorld]; startFilm(ch); return; }
  if (controls) controls.autoRotate = m === 'orbit';
  document.querySelectorAll('.md').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('o-mode').textContent = m === 'orbit' ? 'ORBIT' : 'FREE';
}
document.querySelectorAll('.md').forEach(b => b.onclick = () => setMode(b.dataset.m));
let fxHigh = true;
function setFx(v) { fxHigh = v; quality = v ? 1 : .6; post.u.uGrain.value = v ? 1 : .5; post.u.uStreak.value = v ? 1 : 0; $('ex-fx').textContent = ''; $('ex-fx').innerHTML = `<kbd>G</kbd>FX ${v ? 'HIGH' : 'LOW'}`; resize(); }
$('ex-fx').onclick = () => setFx(!fxHigh);
$('ex-hud').onclick = () => body.classList.toggle('ui-hidden');

/* ————— UI wiring ————— */
$('btn-film').onclick = () => startFilm(0);
$('btn-again').onclick = () => startFilm(0);
$('btn-explore').onclick = () => enterExplore('garg');
$('btn-explore2').onclick = () => enterExplore('garg');
$('ex-film').onclick = () => startFilm(0);
$('brand').onclick = () => { disposeControls(); score.ambience(null); setState('intro'); current = W.garg; introT = 0; };
$('tb-play').onclick = togglePlay;
$('tb-exit').onclick = () => enterExplore(shotAt(filmT)[2]);
$('tb-sound').onclick = $('ex-sound').onclick = () => { score.init(); score.resume(); setMuted(!muted); };
const track = $('track');
const trackT = e => { const r = track.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1) * DURATION; };
let scrub = false;
track.addEventListener('pointerdown', e => { scrub = true; track.setPointerCapture(e.pointerId); seek(trackT(e)); });
track.addEventListener('pointermove', e => { const t = trackT(e); const hv = $('track-hover'); hv.style.left = (t / DURATION * 100) + '%'; hv.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; if (scrub) seek(t); });
track.addEventListener('pointerup', () => scrub = false);
let uiTimer = 0;
const poke = () => { body.classList.add('ui-active'); body.classList.remove('hide-cursor'); clearTimeout(uiTimer); uiTimer = setTimeout(() => { body.classList.remove('ui-active'); if (state === 'film') body.classList.add('hide-cursor'); }, 2400); };
addEventListener('pointermove', poke); addEventListener('pointerdown', poke);
const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1600); };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key;
  if (k === ' ' && state === 'film') { e.preventDefault(); togglePlay(); poke(); }
  else if (k === 'ArrowRight' && state === 'film') { const n = CHAPTERS.find(c => c.t > filmT + .5); seek(n ? n.t : DURATION - .1); poke(); }
  else if (k === 'ArrowLeft' && state === 'film') { const p = [...CHAPTERS].reverse().find(c => c.t < filmT - 1.5); seek(p ? p.t : 0); poke(); }
  else if (k === 'm' || k === 'M') { score.init(); setMuted(!muted); toast(muted ? 'SOUND OFF' : 'SOUND ON'); }
  else if (k === 'h' || k === 'H') { body.classList.toggle('ui-hidden'); }
  else if ((k === 'g' || k === 'G') && state === 'explore') setFx(!fxHigh);
  else if ((k === 'o' || k === 'O') && state === 'explore') setMode('orbit');
  else if ((k === 'e' || k === 'E') && state === 'explore') setMode('free');
  else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
  else if (k === 'Escape' && state === 'film') enterExplore(shotAt(filmT)[2]);
  else if (state === 'explore' && /^[1-6]$/.test(k)) selectWorld(order[+k - 1]);
});
document.addEventListener('visibilitychange', () => { if (!DEV.has('dev') && document.hidden && state === 'film' && playing) togglePlay(); });

/* ————— main loop ————— */
const clock = new THREE.Clock();
let gT = 0;
const fadeEl = $('fade');
function frame() {
  if (RECORD) return;
  const dt = Math.min(clock.getDelta(), .1);
  gT += dt;
  adapt(dt);
  let fade = 0, white = false, warp = 0, shake = 0;
  if (state === 'film') {
    if (playing) {
      const at = score.time();
      if (at != null) filmT = at; else { filmT += dt; score.resync(filmT); }
      score.pump();
      if (filmT >= DURATION) { endFilm(); }
    }
    const t = Math.min(filmT, DURATION - .001);
    const s = shotAt(t);
    const w = W[s[2]];
    if (w !== current) { current = w; resize(); }
    const u = clamp((t - s[0]) / (s[1] - s[0]), 0, 1);
    w.shots[s[3]](u, t);
    w.update(t, playing ? dt : 0, 'film');
    ({ fade, white } = transition(t));
    ({ warp, shake } = fx(t, s, u));
    filmUI(t);
  } else if (state === 'explore') {
    controls && controls.update();
    current.update(gT, dt, 'explore');
    telemetry(dt);
  } else if (state === 'intro' || state === 'end' || state === 'loading') {
    if (current) {
      // the title sits on a slow, living shot of Gargantua
      introT += dt;
      const w = W.garg; current = w;
      const a = -1.62 + introT * .006, r = 70 * RS, el = .06 + Math.sin(introT * .05) * .01;
      w.camera.position.set(r * Math.cos(el) * Math.cos(a), r * Math.sin(el), r * Math.cos(el) * Math.sin(a));
      w.camera.up.set(0, 1, 0); w.camera.lookAt(0, -2 * RS, 0); w.camera.fov = 17;
      w.update(gT, dt, 'film');
      w.scene.children.forEach(o => { if (o.userData && o.userData.ring) o.visible = false; });
      fade = Math.max(0, 1 - introT / 2.5);
    }
  }
  if (current) {
    const b = current.bloom;
    post.bloom.strength = b.strength; post.bloom.radius = b.radius; post.bloom.threshold = b.threshold;
    const u = post.u;
    u.uExposure.value = current.exposure; u.uTime.value = gT;
    u.uFade.value = fade; u.uFadeColor.value.setScalar(white ? 1 : 0);
    u.uWarp.value = warp; u.uShake.value = shake;
    post.render(current.scene, current.camera);
  }
  if (document.hidden && DEV.has('dev')) setTimeout(frame, 16); else requestAnimationFrame(frame);
}
frame();
load().catch(e => { console.error(e); ldStatus.textContent = '加载失败 · ' + e.message; });
