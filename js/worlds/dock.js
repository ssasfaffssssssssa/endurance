// The spinning dock, as a playable scene.
// Endurance tumbles out of control; you fly the Ranger, match its spin, align with the port and close in.
import * as THREE from 'three';
import { NOISE, RAY, SKY, QUAD_VERT, BLACKHOLE, iscoRs } from '../glsl/common.js';
import { createEndurance, animateEndurance, rigShadow, updateShadow } from '../endurance.js';
import { bindRay, clamp, smooth, lerp, ease } from '../util.js';

const SUN = new THREE.Vector3(.55, .35, .75).normalize();
const BHDIR = new THREE.Vector3(-.62, .32, -.72).normalize();
const PLANET_C = new THREE.Vector3(0, -2600, -1400), PLANET_R = 2200;

const SKY_FRAG = /* glsl */`
${NOISE}
${RAY}
${SKY}
${BLACKHOLE}
uniform vec3 uBHDir, uSun;
void main(){
  vec3 rd = viewRay();
  vec3 c = deepSky(rd);
  float ca = dot(rd, uBHDir);
  if (ca > .93){
    // a distant Gargantua — the same Kerr tracer, seen from far away
    vec3 f = uBHDir, r = normalize(cross(f, vec3(0,1,0))), u = cross(r, f);
    mat3 tilt = mat3(1.,0.,0., 0.,cos(.09),sin(.09), 0.,-sin(.09),cos(.09));
    vec3 ro = tilt * vec3(0., 0., 120.);
    vec3 d = tilt * vec3(dot(rd, r), dot(rd, u), -dot(rd, f));
    vec3 od; float cap, mr;
    vec3 bh = traceBH(ro, d, od, cap, mr, 110);
    float k = smoothstep(.93, .96, ca);
    c = mix(c, c*(1. - cap) + bh, k);
  }
  c += vec3(1.,.95,.88)*pow(max(dot(rd, uSun), 0.), 3000.)*30.;
  gl_FragColor = vec4(c, 1.);
}`;

// an ice world below: pale, cracked, with a thin bluish atmosphere
const PLANET_VERT = `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const PLANET_FRAG = /* glsl */`
${NOISE}
uniform vec3 uSun, uCamPos; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN), v = normalize(uCamPos - vW);
  float cr = fbm(n*24.), cr2 = fbm(n*90. + 3.);
  vec3 ice = mix(vec3(.62,.7,.78), vec3(.93,.95,.97), smoothstep(.35,.7,cr));
  ice = mix(ice, vec3(.32,.4,.5), smoothstep(.47,.5,cr2)*(1.-smoothstep(.5,.53,cr2))*.8);   // crevasses
  float ndl = dot(n, uSun);
  vec3 col = ice * max(ndl, 0.) * 1.4 + ice*.02;
  float rim = pow(1. - max(dot(n, v), 0.), 3.);
  col += vec3(.4,.6,1.) * rim * smoothstep(-.2, .4, ndl) * .9;
  gl_FragColor = vec4(col, 1.);
}`;

export function createDock() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 20000);
  const U = {
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uPixAng: { value: .001 }, uTime: { value: 0 }, uStarGain: { value: .9 },
    uDoppler: { value: 0 }, uDiskGain: { value: 1.1 }, uDiskTime: { value: 0 }, uDiskTilt: { value: 0 }, uDiskOuter: { value: 13 }, uDiskTemp: { value: 5200 },
    uSpin: { value: .8 }, uRin: { value: iscoRs(.8) }, uBHDir: { value: BHDIR }, uSun: { value: SUN },
  };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SKY_FRAG, uniforms: U, depthWrite: false, depthTest: false }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 128, 96), new THREE.ShaderMaterial({ vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG, uniforms: { uSun: U.uSun, uCamPos: U.uCamPos } }));
  planet.position.copy(PLANET_C); scene.add(planet);

  // Endurance, ring axis toward the approaching Ranger (+z), two modules blown away
  const holder = new THREE.Group(); scene.add(holder);
  const ship = createEndurance(); holder.add(ship);
  ship.rotation.x = Math.PI / 2;               // local +y (hub top port) -> world +z
  const ring = ship.userData.ring;
  ship.userData.ranger.visible = false;      // we are the Ranger
  const mods = ring.children.filter(c => c.isGroup);
  [mods[4], mods[5]].forEach(m => { if (m) m.visible = false; });
  // debris: chunks tumbling away from the breach, venting gas
  const debris = new THREE.Group(); scene.add(debris);
  const dmat = ship.userData.M.hull2, dmat2 = ship.userData.M.gold;
  const chunks = [];
  for (let i = 0; i < 26; i++) {
    const g = i % 3 ? new THREE.BoxGeometry(.3 + Math.random() * .9, .2 + Math.random() * .5, .3 + Math.random() * .8) : new THREE.TetrahedronGeometry(.4 + Math.random() * .5);
    const m = new THREE.Mesh(g, i % 4 ? dmat : dmat2); m.castShadow = true;
    chunks.push({ m, dir: new THREE.Vector3(Math.random() - .5, Math.random() - .5, (Math.random() - .3) * .6).normalize(), sp: 1.5 + Math.random() * 4, rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(3), ph: Math.random() * 30 });
    debris.add(m);
  }
  // venting gas from the breach: soft additive particles riding the spin
  const NV = 1400, vpos = new Float32Array(NV * 3), vseed = new Float32Array(NV);
  for (let i = 0; i < NV; i++) vseed[i] = Math.random();
  const vg = new THREE.BufferGeometry(); vg.setAttribute('position', new THREE.BufferAttribute(vpos, 3)); vg.setAttribute('aSeed', new THREE.BufferAttribute(vseed, 1));
  const ventU = { uTime: { value: 0 }, uAng: { value: 0 }, uPix: { value: 800 } };
  const vent = new THREE.Points(vg, new THREE.ShaderMaterial({
    uniforms: ventU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime, uAng, uPix; attribute float aSeed; varying float vA;
      void main(){
        float life = fract(uTime*.35 + aSeed);
        float a0 = uAng + 4.5*6.2831853/12. - life*.9;      // leaves the breach and lags the spin
        float r = 10. + life*18. + aSeed*2.;
        vec3 p = vec3(cos(a0)*r, sin(a0)*r, (aSeed - .5)*3. + life*4.*(aSeed - .3));
        vA = (1. - life)*(.4 + .6*fract(aSeed*7.3));
        vec4 mv = modelViewMatrix*vec4(p, 1.);
        gl_PointSize = clamp(uPix*(.35 + life*1.8)/-mv.z, 1., 48.);
        gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float a = exp(-dot(c,c)*9.); gl_FragColor = vec4(vec3(.85,.9,1.)*a*vA*.045, 1.); }`,
  }));
  vent.frustumCulled = false; scene.add(vent);

  const sun = new THREE.DirectionalLight(0xfff4e6, 2.3); sun.position.copy(SUN).multiplyScalar(80); scene.add(sun); scene.add(sun.target);
  rigShadow(sun, ship, 15);
  scene.add(new THREE.HemisphereLight(0xb8c8e0, 0x2a2e36, .12));
  const portLight = new THREE.PointLight(0xffe2b0, 12, 30, 2); portLight.position.set(0, 0, 6); scene.add(portLight);

  // ——— the game ———
  const G = {
    omegaS: 2.2,          // station spin, rad/s (≈ 21 rpm)
    theta: 0, thetaS: 0, omegaR: 0,
    z: 120, vz: -4, x: 6, y: -4, vx: 0, vy: 0, tx: 0, ty: 0,
    state: 'approach', msg: '', msgT: 0, shake: 0, docked: 0,
    keys: {}, auto: false, t: 0,
  };
  const CONTACT = 6.8;
  function reset() { Object.assign(G, { theta: 0, thetaS: 0, omegaR: 0, z: 90, vz: -4, x: 6, y: -4, vx: 0, vy: 0, state: 'approach', docked: 0, msg: '', shake: 0 }); }
  function stepGame(dt) {
    G.t += dt;
    const k = G.keys;
    if (G.state === 'docked') { G.docked += dt; G.omegaR = G.omegaS; G.theta += G.omegaR * dt; G.thetaS += G.omegaS * dt; G.z = lerp(G.z, CONTACT - .05, dt * 4); return; }
    let roll = (k.e || k.arrowright || k.R ? 1 : 0) - (k.q || k.arrowleft || k.L ? 1 : 0);
    let thr = (k.s || k.arrowdown || k.B ? 1 : 0) - (k.w || k.arrowup || k.F ? 1 : 0);   // W / ▲ closes in (z decreases)
    if (G.auto) {
      const err = G.omegaS - G.omegaR; roll = clamp(err * 2.5, -1, 1);
      const want = Math.abs(err) < .15 ? -clamp((G.z - CONTACT) * .22, 1.4, 10) : -clamp((G.z - 26) * .16, 0, 9);
      thr = clamp((want - G.vz) * .8, -1, 1);
      G.tx = 0; G.ty = 0;
    }
    G.omegaR += roll * 1.25 * dt;                      // roll thrusters
    if (world.score) world.score.gameSet(Math.abs(roll) + Math.abs(thr) * .7, 1 - Math.min(1, Math.abs(G.omegaS - G.omegaR) / G.omegaS));
    G.vz += thr * 4.0 * dt;                            // main engine (+) / retro (−) along z
    G.vz = clamp(G.vz, -12, 4);
    // lateral: steer toward pointer target, slow drift away
    const ax = (G.tx - G.x) * 1.6 - G.vx * 1.8 + Math.sin(G.t * .7) * .25, ay = (G.ty - G.y) * 1.6 - G.vy * 1.8 + Math.cos(G.t * .53) * .25;
    G.vx += ax * dt; G.vy += ay * dt; G.x += G.vx * dt; G.y += G.vy * dt;
    G.theta += G.omegaR * dt; G.thetaS += G.omegaS * dt;
    G.z += G.vz * dt;
    G.z = Math.min(G.z, 160);
    if (G.z <= CONTACT) {
      const dOm = Math.abs(G.omegaS - G.omegaR), off = Math.hypot(G.x, G.y), sp = -G.vz;
      if (dOm < .14 && off < .5 && sp < 2.2) { G.state = 'docked'; G.docked = 0; G.msg = 'docked'; G.msgT = 0; world.score && world.score.gameDocked(); }
      else { G.state = 'approach'; G.z = CONTACT + 10; G.vz = 3; G.shake = 1; G.msg = dOm >= .14 ? 'spin' : off >= .5 ? 'align' : 'speed'; G.msgT = 0; world.score && world.score.gameImpact(); }
    }
    G.shake = Math.max(0, G.shake - dt * 1.5); G.msgT += dt;
  }
  // deterministic autopilot for film / promo: u in 0..1 — approach, spin up, match, close in, latch
  function autoAt(u) {
    const om = G.omegaS;
    const match = smooth(.05, .55, u);
    const omR = om * match;
    // integrated angle of a smoothstep ramp, approximated by numeric sum (cheap, 40 taps)
    let th = 0; const T = u * 9, n = 40;
    for (let i = 0; i < n; i++) { const uu = (i + .5) / n * u; th += om * smooth(.05, .55, uu) * (T / n); }
    return { theta: th, thetaS: om * T, z: lerp(70, CONTACT - .05, ease(smooth(.1, .92, u))), x: lerp(3, 0, smooth(.0, .8, u)) + Math.sin(u * 9) * .3 * (1 - u), y: lerp(-2, 0, smooth(.0, .8, u)), omegaR: omR, docked: u > .92 };
  }

  // ——— HUD (explore only) ———
  let ui = null;
  function buildUI() {
    ui = document.createElement('div'); ui.id = 'dock-ui';
    ui.innerHTML = `
      <svg class="canopy" viewBox="0 0 1600 900" preserveAspectRatio="none"><path d="M0 0 L0 900 L70 900 L230 650 L330 70 L0 0Z M1600 0 L1600 900 L1530 900 L1370 650 L1270 70 L1600 0Z M0 0 L1600 0 L1600 22 L1270 70 L330 70 L0 22Z" fill="rgba(8,8,9,.9)"/><path d="M230 650 L330 70 L1270 70 L1370 650" fill="none" stroke="rgba(236,231,222,.16)" stroke-width="2"/><path d="M800 70 L800 98" stroke="rgba(232,180,106,.6)" stroke-width="2"/></svg>
      <div class="ret"><i class="c"></i><i class="h"></i><i class="v"></i><div class="spinring" id="dk-ring"></div><div class="port" id="dk-port"></div></div>
      <div class="dk-l"><div class="ph"><span>SPIN MATCH · 转速匹配</span><b id="dk-state">APPROACH</b></div>
        <div class="dk-big"><span id="dk-rel">0.0</span><small>rpm 相对转速</small></div>
        <div class="dk-bar"><i id="dk-bar"></i><b></b></div>
        <div class="rows" id="dk-rows"></div></div>
      <div class="dk-r"><div class="ph"><span>RANGE · 距离</span><i class="dot live"></i></div><div class="rows" id="dk-rows2"></div></div>
      <div class="dk-msg" id="dk-msg"></div>
      <div class="dk-help">Q / E 滚转匹配转速 · W / S 推进 · 拖动鼠标对准 · <b>A</b> 自动驾驶 · <b>R</b> 重来</div>
      <div class="dk-touch"><button data-k="L">⟲</button><button data-k="F">▲</button><button data-k="B">▼</button><button data-k="R">⟳</button><button class="auto" data-a="1">AUTO</button></div>`;
    document.getElementById('explore').appendChild(ui);
    ui.querySelectorAll('.dk-touch button').forEach(b => {
      const k = b.dataset.k;
      if (b.dataset.a) { b.onclick = () => { G.auto = !G.auto; b.classList.toggle('on', G.auto); }; return; }
      b.addEventListener('pointerdown', e => { G.keys[k] = 1; e.preventDefault(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => G.keys[k] = 0));
    });
  }
  const onKey = (e, v) => { const k = e.key.toLowerCase(); if (['q', 'e', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) { G.keys[k] = v; e.preventDefault(); } if (v && k === 'a') { G.auto = !G.auto; ui && ui.querySelector('.auto').classList.toggle('on', G.auto); } if (v && k === 'r') reset(); };
  const kd = e => onKey(e, 1), ku = e => onKey(e, 0);
  const pm = e => { if (G.auto) return; const nx = e.clientX / innerWidth * 2 - 1, ny = e.clientY / innerHeight * 2 - 1; G.tx = nx * 2.5; G.ty = -ny * 2.5; };

  const v3 = new THREE.Vector3();
  function apply(st, t) {
    // station spins about its axis (world z); the camera rolls with the Ranger
    holder.rotation.z = st.thetaS;
    camera.position.set(st.x, st.y, st.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(st.x * .3, st.y * .3, 0);
    camera.rotateZ(st.theta);
    ventU.uAng.value = 0; ventU.uTime.value = t;
    chunks.forEach((c, i) => {
      const life = ((t * .12 + c.ph / 30) % 1);
      const ang = 4.5 / 12 * Math.PI * 2;
      c.m.position.set(Math.cos(ang) * 12, Math.sin(ang) * 12, 0).addScaledVector(c.dir, life * 60 * c.sp * .2);
      c.m.position.applyAxisAngle(new THREE.Vector3(0, 0, 1), st.thetaS - life * 2);
      c.m.rotation.set(c.rot.x * t, c.rot.y * t, c.rot.z * t);
    });
  }
  const shots = {
    dock(u, t) { const a = autoAt(u); apply(a, t); camera.fov = lerp(48, 62, smooth(.6, 1, u)); },
    // outside view: the tumbling wheel and the Ranger chasing it
    wide(u, t) {
      const a = autoAt(.3 + u * .3);
      holder.rotation.z = a.thetaS;
      camera.position.set(lerp(-60, -45, u), lerp(18, 12, u), lerp(70, 55, u));
      camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.fov = 45;
      apply({ ...a, x: camera.position.x, y: camera.position.y, z: camera.position.z, theta: 0 }, t);
      camera.position.set(lerp(-60, -45, u), lerp(18, 12, u), lerp(70, 55, u)); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
    },
  };
  const world = {
    id: 'dock', scene, camera, shots, game: true,
    bloom: { strength: .5, radius: .5, threshold: 1.1 }, exposure: 1.0, maxScale: 1.25,
    explore: { target: new THREE.Vector3(0, 0, 0), pos: new THREE.Vector3(0, 0, 120), min: 5, max: 200, fov: 55 },
    G, autoAt, reset,
    setAuto(v) { G.auto = v; ui && ui.querySelector('.auto').classList.toggle('on', v); },
    enter() {
      if (!ui) buildUI();
      ui.style.display = 'block'; document.body.classList.add('game');
      reset(); world.score && world.score.gameStart(); addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('pointermove', pm);
    },
    exit() { world.score && world.score.gameStop(); if (ui) ui.style.display = 'none'; document.body.classList.remove('game'); removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('pointermove', pm); G.keys = {}; },
    markers() { return []; },
    hud() {
      if (!ui) return;
      const rpm = w => w * 60 / (2 * Math.PI);
      const rel = rpm(G.omegaS - G.omegaR);
      ui.querySelector('#dk-rel').textContent = (rel >= 0 ? '+' : '') + rel.toFixed(1);
      ui.querySelector('#dk-bar').style.left = (50 + clamp(rel / rpm(G.omegaS), -1, 1) * 50) + '%';
      const ok = Math.abs(G.omegaS - G.omegaR) < .14;
      ui.querySelector('#dk-state').textContent = G.state === 'docked' ? 'DOCKED' : ok ? 'MATCHED' : G.auto ? 'AUTOPILOT' : 'APPROACH';
      ui.querySelector('#dk-state').className = ok || G.state === 'docked' ? 'ok' : '';
      ui.querySelector('#dk-rows').innerHTML = `<div class="tr"><span>永恒号转速</span><b>${rpm(G.omegaS).toFixed(1)} rpm</b></div><div class="tr"><span>徘徊者号滚转</span><b>${rpm(G.omegaR).toFixed(1)} rpm</b></div><div class="tr"><span>转速匹配</span><b class="${ok ? 'good' : 'warn'}">${ok ? '已匹配' : '未匹配'}</b></div>`;
      const off = Math.hypot(G.x, G.y), sp = -G.vz;
      ui.querySelector('#dk-rows2').innerHTML = `<div class="tr big"><span>距对接口</span><b>${Math.max(0, G.z - CONTACT).toFixed(1)} m</b></div><div class="tr"><span>接近速度</span><b class="${sp < 2.2 ? 'good' : 'warn'}">${sp.toFixed(1)} m/s</b></div><div class="tr"><span>横向偏差</span><b class="${off < .5 ? 'good' : 'warn'}">${off.toFixed(2)} m</b></div><div class="tr"><span>对接要求</span><b>&lt;1.3 rpm · &lt;0.5 m · &lt;2.2 m/s</b></div>`;
      // relative-rotation ring and the port marker
      const relAng = (G.thetaS - G.theta) % (Math.PI * 2);
      ui.querySelector('#dk-ring').style.transform = `translate(-50%,-50%) rotate(${relAng}rad)`;
      v3.set(0, 0, 3.3).project(camera);
      const pt = ui.querySelector('#dk-port');
      pt.style.left = ((v3.x * .5 + .5) * 100) + '%'; pt.style.top = ((-v3.y * .5 + .5) * 100) + '%';
      const m = ui.querySelector('#dk-msg');
      const msgs = { docked: ['对接成功', 'DOCKING CONFIRMED'], spin: ['转速没对上 · 被弹开', 'SPIN MISMATCH — PUSHED BACK'], align: ['没对准 · 被弹开', 'MISALIGNED — PUSHED BACK'], speed: ['太快了 · 被弹开', 'TOO FAST — PUSHED BACK'] };
      const show = G.msg && (G.msg === 'docked' || G.msgT < 2.5);
      m.style.opacity = show ? 1 : 0;
      if (show) { m.innerHTML = `<b>${msgs[G.msg][0]}</b><small>${msgs[G.msg][1]}</small>`; m.className = 'dk-msg ' + (G.msg === 'docked' ? 'good' : 'bad'); }
    },
    update(t, dt, mode) {
      U.uTime.value = t; U.uDiskTime.value = t;
      if (mode === 'explore' && !window.__record) { stepGame(Math.min(dt, .05)); apply(G, t); camera.fov = 55; world.hud(); }
      else if (mode === 'explore') { apply(G, t); world.hud(); }
      ventU.uPix.value = (window.__renderH || innerHeight) * 1.2;
      animateEndurance(ship, t);
      updateShadow(sun);
      const sh = G.shake; if (sh > 0 && mode === 'explore') camera.position.x += (Math.random() - .5) * sh * .3;
      bindRay(U, camera);
    },
  };
  return world;
}
