import * as THREE from 'three';
import { NOISE } from '../glsl/common.js';
import { ease, lerp, mulberry32 } from '../util.js';

// A dark room. Light through a window. Dust that falls in lines — a message written in gravity.
const L = new THREE.Vector3(.42, -1, .3).normalize();     // direction the light travels
const SPOT = { x0: -1.5, x1: 1.5, z0: -1.25, z1: .85 };

function bars(kind) {
  const out = [];
  if (kind === 'binary') {
    const bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0];
    const step = .21; const x0 = -step * (bits.length - 1) / 2;
    bits.forEach((b, i) => out.push([x0 + i * step, b ? .055 : .022]));
  } else { // morse: S · · ·   T —   A · —   Y — · — —
    const seq = ['...', '-', '.-', '-.--'];
    let x = 0; const sym = [];
    seq.forEach((l, li) => { [...l].forEach((c, ci) => { const w = c === '.' ? .022 : .075; sym.push([x + w, w]); x += 2 * w + .1; }); x += .22; });
    const total = x - .32; sym.forEach(s => out.push([s[0] - total / 2, s[1]]));
  }
  return out;
}

const FLOOR_VERT = /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const FLOOR_FRAG = /* glsl */`
${NOISE}
uniform vec4 uBarsA[16]; uniform vec4 uBarsB[16]; uniform float uPattern; uniform float uReveal; uniform float uTime; uniform vec3 uL;
varying vec3 vW;
float spot(vec2 p){
  float a = smoothstep(${SPOT.x0.toFixed(2)}, ${(SPOT.x0 + .25).toFixed(2)}, p.x) * smoothstep(${SPOT.x1.toFixed(2)}, ${(SPOT.x1 - .25).toFixed(2)}, p.x);
  float b = smoothstep(${SPOT.z0.toFixed(2)}, ${(SPOT.z0 + .2).toFixed(2)}, p.y) * smoothstep(${SPOT.z1.toFixed(2)}, ${(SPOT.z1 - .2).toFixed(2)}, p.y);
  // window mullions
  float m = smoothstep(.015, .05, abs(p.x - .05)) * smoothstep(.015, .05, abs(p.y + .2));
  return a*b*mix(.2, 1., m);
}
float barField(vec4 B[16], vec2 p){
  float d = 0.;
  for (int i = 0; i < 16; i++){
    if (B[i].y <= 0.) continue;
    float e = abs(p.x - B[i].x) - B[i].y;
    d = max(d, (1. - smoothstep(-.006, .012, e)) * smoothstep(-1.05, -.9, p.y) * smoothstep(.72, .6, p.y));
  }
  return d;
}
void main(){
  vec2 p = vW.xz;
  // planks
  float plank = floor(p.x / .19 + .5);
  float off = hash11(plank) * 3.;
  float grain = fbm(vec3(p.x*30., (p.y + off)*2.2, plank));
  vec3 wood = mix(vec3(.16,.09,.05), vec3(.3,.18,.1), grain) * (.8 + .4*hash11(plank*7.1));
  float seam = smoothstep(.004, .0, abs(fract(p.x/.19 + .5) - .5)*.19 - .089);
  wood *= 1. - .5*seam;
  float s = spot(p);
  float dust = mix(barField(uBarsA, p), barField(uBarsB, p), uPattern) * uReveal;
  float dn = .55 + .45*fbm(vec3(p*140., 1.));
  vec3 dustC = vec3(.5,.48,.45) * dn;
  vec3 alb = mix(wood, dustC, dust*.72);
  vec3 lightC = vec3(1.,.82,.58) * 2.1;
  vec3 col = alb * (lightC * s + vec3(.05,.06,.08));
  col += vec3(1.,.8,.55) * s * .02;
  gl_FragColor = vec4(col, 1.);
}
`;

const DUST_VERT = /* glsl */`
uniform float uProg, uPattern, uTime, uPix; uniform vec3 uL;
attribute vec3 aStart; attribute vec4 aSeed; attribute vec2 aTA; attribute vec2 aTB;
varying float vB;
float spot(vec2 p){
  return smoothstep(${SPOT.x0.toFixed(2)}, ${(SPOT.x0 + .3).toFixed(2)}, p.x) * smoothstep(${SPOT.x1.toFixed(2)}, ${(SPOT.x1 - .3).toFixed(2)}, p.x) *
         smoothstep(${SPOT.z0.toFixed(2)}, ${(SPOT.z0 + .3).toFixed(2)}, p.y) * smoothstep(${SPOT.z1.toFixed(2)}, ${(SPOT.z1 - .3).toFixed(2)}, p.y);
}
void main(){
  vec2 tgt = mix(aTA, aTB, uPattern);
  float ph = clamp((uProg - aSeed.x*.7) / (.22 + .2*aSeed.y), 0., 1.);
  float fall = ph*ph;
  vec3 drift = vec3(sin(uTime*.31 + aSeed.z*40.), sin(uTime*.23 + aSeed.w*30.)*.6, cos(uTime*.27 + aSeed.y*50.)) * .07 * (1. - ph);
  vec3 p = aStart + drift;
  p.x = mix(p.x, tgt.x + (aSeed.z - .5)*.012, smoothstep(.0, .8, ph));
  p.z = mix(p.z, tgt.y, smoothstep(.0, .8, ph));
  p.y = mix(p.y, .003 + aSeed.w*.004, fall);
  // where does the light ray through this point hit the floor? lit if inside the window patch
  vec2 hit = p.xz - uL.xz * (p.y / -uL.y);
  float lit = spot(hit);
  vB = (.025 + 1.6*lit) * (.4 + .6*aSeed.y) * (1. - .7*smoothstep(.9, 1., ph));
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_PointSize = clamp(uPix * (.0035 + .004*aSeed.w) / -mv.z, 1., 9.);
  gl_Position = projectionMatrix * mv;
}
`;
const DUST_FRAG = /* glsl */`
varying float vB;
void main(){ vec2 c = gl_PointCoord - .5; float a = exp(-dot(c,c)*16.); gl_FragColor = vec4(vec3(1.,.86,.62)*vB*a*2., 1.); }
`;

const BEAM_VERT = /* glsl */`varying vec3 vW; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const BEAM_FRAG = /* glsl */`
${NOISE}
uniform float uTime; uniform float uI; varying vec3 vW; varying vec2 vUv;
void main(){
  float e = smoothstep(0., .25, vUv.x) * smoothstep(1., .75, vUv.x);
  float along = smoothstep(0., .5, vUv.y) * smoothstep(1., .85, vUv.y);
  float n = .65 + .35*fbm(vec3(vW*2.5 + vec3(0., uTime*.05, 0.)));
  gl_FragColor = vec4(vec3(1.,.8,.55) * e * along * n * .1 * uI, 1.);
}
`;

export function createDust() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010101);
  const camera = new THREE.PerspectiveCamera(40, 1, .01, 100);
  const A = bars('binary'), B = bars('morse');
  const pack = arr => Array.from({ length: 16 }, (_, i) => arr[i] ? new THREE.Vector4(arr[i][0], arr[i][1], 0, 0) : new THREE.Vector4(0, 0, 0, 0));
  const FU = { uBarsA: { value: pack(A) }, uBarsB: { value: pack(B) }, uPattern: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uL: { value: L } };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShaderMaterial({ vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, uniforms: FU }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  // dust motes
  const N = 9000, rnd = mulberry32(7);
  const start = new Float32Array(N * 3), seed = new Float32Array(N * 4), ta = new Float32Array(N * 2), tb = new Float32Array(N * 2);
  const pick = (arr) => { const b = arr[Math.floor(rnd() * arr.length)]; return [b[0] + (rnd() * 2 - 1) * b[1] * .9, -.95 + rnd() * 1.6]; };
  for (let i = 0; i < N; i++) {
    start[i * 3] = (rnd() * 2 - 1) * 1.9; start[i * 3 + 1] = .05 + rnd() * 2.4; start[i * 3 + 2] = -1.4 + rnd() * 2.6;
    seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = rnd();
    const a = pick(A), b = pick(B); ta[i * 2] = a[0]; ta[i * 2 + 1] = a[1]; tb[i * 2] = b[0]; tb[i * 2 + 1] = b[1];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('aTA', new THREE.BufferAttribute(ta, 2));
  g.setAttribute('aTB', new THREE.BufferAttribute(tb, 2));
  const DU = { uProg: { value: 0 }, uPattern: FU.uPattern, uTime: FU.uTime, uPix: { value: 1000 }, uL: { value: L } };
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: DU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);

  // light shafts: crossed soft planes along the light direction
  const BU = { uTime: FU.uTime, uI: { value: 1 } };
  const beamMat = new THREE.ShaderMaterial({ vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, uniforms: BU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beams = new THREE.Group(); scene.add(beams);
  for (let k = 0; k < 7; k++) {
    const w = 3.2 - k * .25;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, 7.5), beamMat);
    pl.position.set(0, 0, -.2 + (k - 3) * .3);
    beams.add(pl);
  }
  // orient: plane local +y along -L (toward the window), centred on the lit patch
  beams.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), L.clone().negate());
  beams.position.set(-.2, 0, -.2).addScaledVector(L, -3.75);

  // the bookshelf, dark against the wall
  const shelf = new THREE.Group(); scene.add(shelf);
  const wood = new THREE.MeshStandardMaterial({ color: 0x24160d, roughness: .8 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, .35), wood); frame.position.set(-.2, 1.3, -2.3); shelf.add(frame);
  const bookCols = [0x4a2f1d, 0x2f3a3f, 0x5a4630, 0x3a2420, 0x61503b, 0x272f2a];
  for (let row = 0; row < 4; row++) {
    let x = -1.8;
    while (x < 1.35) {
      const w = .04 + rnd() * .06, h = .38 + rnd() * .18;
      if (rnd() > .08) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w * .92, h, .24), new THREE.MeshStandardMaterial({ color: bookCols[Math.floor(rnd() * bookCols.length)], roughness: .7 }));
        b.position.set(x + w / 2, .15 + row * .62 + h / 2, -2.08); b.rotation.z = rnd() > .93 ? .2 : 0; shelf.add(b);
      }
      x += w;
    }
  }
  scene.add(new THREE.AmbientLight(0x6f86a8, .05));
  const bounce = new THREE.PointLight(0xffc690, 1.4, 6, 2); bounce.position.set(0, .4, -.3); scene.add(bounce);

  const tmp = new THREE.Vector3();
  const shots = {
    fall(u) {
      const e = ease(u);
      camera.position.set(lerp(.9, .3, e), lerp(2.6, 1.85, e), lerp(2.7, 1.9, e));
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp.set(lerp(.2, 0, e), lerp(.45, 0, e), lerp(-.9, -.25, e)));
      camera.fov = 40;
      FU.uPattern.value = 0;
      DU.uProg.value = Math.min(1, Math.max(0, (u - .12) / .62));
      FU.uReveal.value = Math.min(1, Math.max(0, (u - .45) / .4));
    },
    stay(u) {
      const e = ease(u);
      camera.position.set(lerp(-.5, 0, e), lerp(3.0, 3.4, e), lerp(2.6, 1.9, e));
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp.set(0, 0, lerp(-.35, -.2, e)));
      camera.fov = 40;
      FU.uPattern.value = 1;
      DU.uProg.value = Math.min(1, Math.max(0, (u - .02) / .5));
      FU.uReveal.value = Math.min(1, Math.max(0, (u - .3) / .35));
    },
  };
  return {
    id: 'dust', scene, camera, shots,
    bloom: { strength: .6, radius: .6, threshold: .8 }, exposure: 1.05, maxScale: 1.5,
    explore: { target: new THREE.Vector3(0, .1, -.3), pos: new THREE.Vector3(.6, 2.2, 2.3), min: .6, max: 6, fov: 40 },
    pattern: A, patternB: B,
    get morse() { return FU.uPattern.value > .5; },
    markers() {
      return [
        { p: new THREE.Vector3(.05, .02, -.2), t: 'GRAVITY ANOMALY · 引力异常', s: FU.uPattern.value > .5 ? '摩尔斯 · S T A Y' : '二进制 · 坐标' },
        { p: new THREE.Vector3(-.2, 1.7, -2.15), t: 'BOOKSHELF · 书架', s: '“幽灵”在书架后面' },
        { p: new THREE.Vector3(-1.3, 1.6, -.9), t: 'LIGHT · 窗光', s: '尘埃在光里显形' },
      ];
    },
    setExplorePattern(k) { FU.uPattern.value = k; },
    manual: false,
    setManual(prog, reveal, pattern) { this.manual = true; DU.uProg.value = prog; FU.uReveal.value = reveal; FU.uPattern.value = pattern; },
    update(t, dt, mode) {
      FU.uTime.value = t;
      DU.uPix.value = (window.__renderH || innerHeight) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * .5;
      if (mode === 'explore' && !this.manual) {
        const c = (t * .045) % 1;
        DU.uProg.value = Math.min(1, c / .6);
        FU.uReveal.value = Math.min(1, Math.max(0, (c - .35) / .3));
        if (c < .01) FU.uPattern.value = 1 - FU.uPattern.value;
      }
    },
  };
}
