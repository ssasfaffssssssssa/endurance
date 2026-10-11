import * as THREE from 'three';
import { NOISE, RAY, QUAD_VERT, BLACKHOLE } from '../glsl/common.js';
import { createRanger, createMaterials } from '../endurance.js';
import { bindRay, ease, lerp, smooth } from '../util.js';

// Gargantua hangs in Miller's sky
const BHDIR = new THREE.Vector3(.3, .3, -.9).normalize();

const SKY_COMMON = /* glsl */`
uniform vec3 uBHDir; uniform float uHaze;
vec3 skyBase(vec3 d){
  float y = max(d.y, 0.);
  vec3 hor = vec3(.6,.66,.7), zen = vec3(.26,.34,.43);
  vec3 c = mix(hor, zen, pow(y, .55));
  // high cloud deck
  float cl = fbm3o(vec3(d.xz/(d.y+.08)*1.4, uTime*.01));
  c = mix(c, vec3(.72,.75,.78), smoothstep(.45,.85,cl)*.4*smoothstep(0.,.25,y));
  if (d.y < 0.) c = mix(hor*1.05, vec3(.5,.6,.66), clamp(-d.y*3., 0., 1.));
  return c;
}
`;

const SKY_FRAG = /* glsl */`
${NOISE}
${RAY}
uniform float uStarGain;
${BLACKHOLE}
${SKY_COMMON}
void main(){
  vec3 rd = viewRay();
  vec3 c = skyBase(rd);
  float ca = dot(rd, uBHDir);
  if (ca > .7){
    // look at Gargantua through the atmosphere from ~70 r_s away
    vec3 f = uBHDir, r = normalize(cross(f, vec3(0,1,0))), u = cross(r, f);
    mat3 tilt = mat3(1.,0.,0., 0.,cos(.12),sin(.12), 0.,-sin(.12),cos(.12));
    vec3 ro = tilt * vec3(0., 0., 36.);
    vec3 ld = vec3(dot(rd, r), dot(rd, u), -dot(rd, f));
    vec3 d = tilt * ld;
    vec3 od; float cap, mr;
    vec3 bh = traceBH(ro, d, od, cap, mr, 140);
    float k = smoothstep(.7, .8, ca);
    c = mix(c, c*(1. - .5*cap) + bh*.6, k*uHaze);
  }
  gl_FragColor = vec4(c, 1.);
}
`;

const OCEAN_VERT = /* glsl */`
${NOISE}
uniform float uTime; uniform vec2 uOffset; uniform float uFront; uniform float uWaveH; uniform vec2 uWaveDir;
varying vec3 vW; varying float vH; varying float vDist;
float bigWave(vec2 p){
  float s = dot(p, uWaveDir) - uFront;
  vec2 perp = vec2(-uWaveDir.y, uWaveDir.x);
  float along = dot(p, perp);
  float H = uWaveH * (.8 + .2*sin(along*.0011 + 1.3) + .1*sin(along*.0031));
  float w = s < 0. ? H*.55 : H*2.4;
  return H * exp(-s*s/(w*w));
}
float chop(vec2 p){
  float h = 0.;
  h += .22*sin(dot(p, vec2(.13, .07)) + uTime*1.1);
  h += .14*sin(dot(p, vec2(-.05, .19)) + uTime*1.4);
  h += .08*sin(dot(p, vec2(.31, -.21)) + uTime*2.1);
  return h;
}
float height(vec2 p){ return bigWave(p) + chop(p); }
void main(){
  vec2 p = position.xz + uOffset;
  float h = height(p);
  vW = vec3(p.x, h, p.y); vH = h; vDist = length(position.xz);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.);
}
`;
const OCEAN_FRAG = /* glsl */`
${NOISE}
uniform float uTime; uniform vec3 uCamPos; uniform float uFront; uniform float uWaveH; uniform vec2 uWaveDir;
uniform float uStarGain;
${SKY_COMMON}
varying vec3 vW; varying float vH; varying float vDist;
float bigWave(vec2 p){
  float s = dot(p, uWaveDir) - uFront;
  vec2 perp = vec2(-uWaveDir.y, uWaveDir.x);
  float along = dot(p, perp);
  float H = uWaveH * (.8 + .2*sin(along*.0011 + 1.3) + .1*sin(along*.0031));
  float w = s < 0. ? H*.55 : H*2.4;
  return H * exp(-s*s/(w*w));
}
float chop(vec2 p){
  float h = 0.;
  h += .22*sin(dot(p, vec2(.13, .07)) + uTime*1.1);
  h += .14*sin(dot(p, vec2(-.05, .19)) + uTime*1.4);
  h += .08*sin(dot(p, vec2(.31, -.21)) + uTime*2.1);
  return h;
}
float detail(vec2 p){
  float th = clamp(bigWave(p)/max(uWaveH,1.), 0., 1.);
  float d = (vnoise(vec3(p*.9, uTime*.6)) + .5*vnoise(vec3(p*2.3, uTime*.9)))*.06;
  d += th * (fbm3o(vec3(p.x*.02, p.y*.05 - uTime*.25, uTime*.1)) - .5) * 7.;
  return d;
}
float height(vec2 p){ return bigWave(p) + chop(p) + detail(p); }
void main(){
  vec2 p = vW.xz;
  float dist = length(uCamPos - vW);
  float e = clamp(dist*.004, .05, 25.);
  float h0 = height(p);
  vec3 n = normalize(vec3(h0 - height(p + vec2(e,0.)), e, h0 - height(p + vec2(0.,e))));
  vec3 v = normalize(uCamPos - vW);
  float fres = .02 + .98*pow(1. - max(dot(n, v), 0.), 5.);
  vec3 R = reflect(-v, n); R.y = abs(R.y);
  vec3 refl = skyBase(R);
  // Gargantua's reflection: a soft dark smudge with a warm rim
  float rb = dot(R, uBHDir);
  refl = mix(refl, refl*.6 + vec3(1.,.82,.6)*.25*smoothstep(.955,.965,rb)*(1.-smoothstep(.97,.985,rb)), smoothstep(.93,.97,rb)*.6*uHaze);
  // shallow sea over pale silt near; deep body far/up the wave
  float wave = bigWave(p);
  float thick = clamp(wave / max(uWaveH, 1.), 0., 1.);
  vec3 shallow = vec3(.2,.23,.2), deep = vec3(.03,.075,.09);
  vec3 body = mix(shallow, deep, clamp(dist*.002 + thick*1.5, 0., 1.));
  // light through the wave face
  float sss = pow(clamp(1. - abs(dot(n, v)), 0., 1.), 2.) * thick;
  body += vec3(.05,.22,.22) * sss;
  vec3 col = mix(body, refl, fres);
  // foam: crest and churned base of the face
  float s = dot(p, uWaveDir) - uFront;
  float crest = smoothstep(.82, .98, thick) * smoothstep(.0, .5, -n.y*0. + 1.);
  float base = smoothstep(uWaveH*.9, 0., -s) * smoothstep(-uWaveH*1.6, -uWaveH*.2, s) * step(s, 0.) * .0;
  float fn = fbm3o(vec3(p*.02, uTime*.3));
  float streak = fbm3o(vec3(p.x*.012, s*.006 - uTime*.12, 2.));
  body *= .75 + .5*streak;
  float face = step(s, 0.) * smoothstep(.15, .6, thick);
  float lines = smoothstep(.7, .8, fbm3o(vec3(p.x*.05, s*.012 + uTime*.4, 5.))) * face;
  float foam = clamp(crest*smoothstep(.3,.65,fn)*1.6 + smoothstep(.8,.97,thick)*.35 + lines*.25, 0., 1.);
  col = mix(col, vec3(.8,.84,.86), foam);
  // spray veil above the crest is done by fog thickening near it
  float fog = 1. - exp(-dist*.00017);
  fog = clamp(fog + smoothstep(.85, 1., thick)*.25, 0., 1.);
  col = mix(col, skyBase(normalize(vec3(-v.x, .02, -v.z))), fog*.92);
  gl_FragColor = vec4(col, 1.);
}
`;

function radialGrid(rings, segs, rmax) {
  const a = .4, b = Math.log(rmax / a + 1) / rings;
  const pos = [], idx = [];
  pos.push(0, 0, 0);
  for (let i = 1; i <= rings; i++) {
    const r = a * (Math.exp(b * i) - 1);
    for (let j = 0; j < segs; j++) { const t = j / segs * Math.PI * 2; pos.push(Math.cos(t) * r, 0, Math.sin(t) * r); }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 0; i < rings - 1; i++) for (let j = 0; j < segs; j++) {
    const A = 1 + i * segs + j, B = 1 + i * segs + (j + 1) % segs, C = 1 + (i + 1) * segs + j, D = 1 + (i + 1) * segs + (j + 1) % segs;
    idx.push(A, B, C, B, D, C);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function createMiller() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 60000);
  const U = {
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uPixAng: { value: .001 }, uTime: { value: 0 }, uStarGain: { value: .25 },
    uDoppler: { value: 0 }, uDiskGain: { value: 1.3 }, uDiskTime: { value: 0 }, uDiskTilt: { value: 0 }, uDiskOuter: { value: 13 }, uDiskTemp: { value: 5200 },
    uBHDir: { value: BHDIR }, uHaze: { value: 1 },
  };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SKY_FRAG, uniforms: U, depthWrite: false, depthTest: false }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

  const OU = {
    uTime: U.uTime, uCamPos: U.uCamPos, uBHDir: U.uBHDir, uHaze: U.uHaze, uStarGain: U.uStarGain,
    uOffset: { value: new THREE.Vector2() }, uFront: { value: 9000 }, uWaveH: { value: 380 }, uWaveDir: { value: new THREE.Vector2(0, -1) },
  };
  const ocean = new THREE.Mesh(radialGrid(520, 512, 22000), new THREE.ShaderMaterial({ vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG, uniforms: OU }));
  ocean.frustumCulled = false; scene.add(ocean);

  // the Ranger, sitting in knee-deep water
  const M = createMaterials();
  const ranger = createRanger(M); ranger.scale.setScalar(2.2); scene.add(ranger);
  scene.add(new THREE.HemisphereLight(0xdfe8ee, 0x3a4a48, 1.6));
  const sunL = new THREE.DirectionalLight(0xfff4e0, .9); sunL.position.set(.3, 1, .4); scene.add(sunL);

  // wave dir: comes from -z (far ahead) toward +z
  const waveDir = new THREE.Vector2(0, -1); // s = dot(p, dir) - front ; crest at z = -front
  const H = (x, z, t, front, Hh) => {
    const s = -z - front; const w = s < 0 ? Hh * .55 : Hh * 2.4;
    const along = x;
    const HH = Hh * (.8 + .2 * Math.sin(along * .0011 + 1.3) + .1 * Math.sin(along * .0031));
    const chop = .22 * Math.sin(.13 * x + .07 * z + t * 1.1) + .14 * Math.sin(-.05 * x + .19 * z + t * 1.4);
    return HH * Math.exp(-s * s / ((s < 0 ? HH * .55 : HH * 2.4) ** 2)) + chop;
  };
  let front = 9000, waveH = 380, t0 = 0;
  const tmp = new THREE.Vector3();
  const shots = {
    calm(u, t) {
      front = 9000 - 1200 * u;
      const e = ease(u);
      camera.position.set(lerp(-4, 2, e), 1.8, lerp(14, 8, e));
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp.set(lerp(-60, 30, e), lerp(4, 9, e), -200));
      camera.fov = 48;
    },
    reveal(u) {
      front = lerp(6200, 3200, u);
      camera.position.set(2, 1.8, 6);
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp.set(10, lerp(9, 60, ease(u)), -200));
      camera.fov = lerp(48, 40, ease(u));
    },
    rise(u, t) {
      front = lerp(3400, 360, Math.pow(u, .8));
      const surf = H(2, 6, t, front, waveH);
      camera.position.set(2, surf + 2.2 + u * 6, 6);
      camera.up.set(0, 1, 0);
      const crestH = waveH * .95;
      camera.lookAt(tmp.set(4, camera.position.y + (crestH * 1.05 - camera.position.y) * smooth(0, 1, u) * .9 + 12, camera.position.z - Math.max(front, 250)));
      camera.rotateZ(Math.sin(t * 2.3) * .015 * u);
      camera.fov = lerp(42, 58, u);
    },
  };
  const world = {
    id: 'miller', scene, camera, shots, uniforms: U,
    bloom: { strength: .3, radius: .4, threshold: 1.1 }, exposure: 1.0, maxScale: 1.25,
    explore: { target: new THREE.Vector3(0, 40, -400), pos: new THREE.Vector3(0, 30, 120), min: 20, max: 4000, fov: 50 },
    markers(cam) {
      const out = [{ p: ranger.position.clone().add(new THREE.Vector3(0, 2, 0)), t: 'RANGER · 徘徊者号', s: '水深 0.4 m' }];
      if (front < 12000) out.push({ p: new THREE.Vector3(cam.position.x + 300, waveH * .9, -front), t: 'TIDAL WAVE · 潮汐巨浪', s: `${(front / 1000).toFixed(2)} km · 380 m` });
      out.push({ p: cam.position.clone().addScaledVector(BHDIR, 4000).add(new THREE.Vector3(0, 900, 0)), t: 'GARGANTUA · 卡冈图雅', s: '潮汐锁定的天空' });
      return out;
    },
    get front() { return front; },
    set front(v) { front = v; },
    update(t, dt, mode) {
      U.uTime.value = t; U.uDiskTime.value = t;
      if (mode === 'explore') { front -= dt * 260; if (front < -800) front = 6500; }
      OU.uFront.value = front; OU.uWaveH.value = waveH;
      OU.uOffset.value.set(Math.round(camera.position.x / 20) * 20, Math.round(camera.position.z / 20) * 20);
      // Ranger rides the water
      const rx = -22, rz = -58;
      const y = H(rx, rz, t, front, waveH);
      ranger.position.set(rx, y + .85, rz);
      const dy = H(rx, rz - 2, t, front, waveH) - H(rx, rz + 2, t, front, waveH);
      ranger.rotation.set(Math.atan2(dy, 4) * .9 - .04, 2.4, Math.sin(t * .8) * .02 + .05);
      bindRay(U, camera);
    },
  };
  return world;
}
