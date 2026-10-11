import * as THREE from 'three';
import { NOISE, RAY, QUAD_VERT } from '../glsl/common.js';
import { bindRay, ease, lerp } from '../util.js';

// The tesseract: an endless lattice made of one bookshelf, seen from behind, repeated across time.
const FRAG = /* glsl */`
${NOISE}
${RAY}
uniform float uPulse; uniform float uWarm;
const vec3 C = vec3(3.2, 2.6, 3.2);
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float strandAcc; float gS; float gW; float gD;
float map(vec3 p, out float mat){
  vec3 id = floor(p / C);
  vec3 q = p - (id + .5)*C;
  vec3 a = abs(q);
  float h = hash13(id);
  // frame beams along all three axes
  float bz = max(C.x*.5 - a.x, C.y*.5 - a.y) - .1;
  float bx = max(C.y*.5 - a.y, C.z*.5 - a.z) - .08;
  float by = max(C.x*.5 - a.x, C.z*.5 - a.z) - .1;
  float d = min(bz, min(bx, by));
  mat = 0.;
  // a bookshelf back-panel in most cells (sits on the cell's -z face)
  if (h > .32){
    vec3 s = vec3(q.z, q.y, q.x) - vec3(0., 0., -C.x*.5 + .22);
    if (h > .66) s.z = -q.x - (-C.x*.5 + .22);
    float shelfH = C.y / 4.;
    float sy = mod(s.y + C.y*.5, shelfH) - shelfH*.5;
    float board = sdBox(vec3(s.x, sy + shelfH*.5 - .03, s.z), vec3(C.x*.5 - .1, .025, .2));
    // books: hashed widths, heights and depths
    float bw = .13;
    float shelfI = floor((s.y + C.y*.5) / shelfH);
    float bi0 = floor((s.x + C.x*.5) / bw);
    // books have hashed sizes, so test the neighbours too — otherwise rays slip into the next book
    float book = 1e3, hbBest = 0.;
    for (int k = -1; k <= 1; k++){
      float bi = bi0 + float(k);
      float hb = hash13(vec3(bi, shelfI, h*91.));
      if (hb < .12) continue;
      float bxp = s.x + C.x*.5 - (bi + .5)*bw;
      float bookH = shelfH*(.55 + .35*hb);
      float bookD = .1 + .12*hash11(hb*13.);
      float bk = sdBox(vec3(bxp, sy + shelfH*.5 - .055 - bookH*.5, s.z - .05), vec3(bw*.42, bookH*.5, bookD));
      if (bk < book){ book = bk; hbBest = hb; }
    }
    book = max(book, abs(s.x) - (C.x*.5 - .12));
    float hb = hbBest;
    float shelf = min(board, book);
    if (shelf < d){ d = shelf; mat = 1. + hb; }
  }
  // time strands: taut threads running along z, and some along y
  vec2 g = mod(p.xy + vec2(.31, .17), vec2(.8, .65)) - vec2(.4, .325);
  vec2 gid = floor((p.xy + vec2(.31, .17)) / vec2(.8, .65));
  float on = step(.72, hash12(gid));
  float st = on > .5 ? length(g) - .006 : 1e3;
  vec2 g2 = mod(p.xz + vec2(.53, .11), vec2(1.1, .9)) - vec2(.55, .45);
  vec2 gid2 = floor((p.xz + vec2(.53, .11)) / vec2(1.1, .9));
  float st2 = step(.86, hash12(gid2 + 7.)) > .5 ? length(g2) - .005 : 1e3;
  float sm = min(st, st2);
  float pulse = .5 + .5*sin(p.z*.9 + uTime*4. + hash12(gid)*40.);
  float pulse2 = .5 + .5*sin(p.y*1.3 - uTime*3. + hash12(gid2)*40.);
  gS = sm; gW = st < st2 ? (.25 + 1.6*pow(pulse, 8.)) : (.2 + 1.2*pow(pulse2, 8.));
  gD = d;
  return min(d, sm + .03);
}
vec3 normalAt(vec3 p){
  float m; const vec2 e = vec2(.0015, -.0015);
  return normalize(e.xyy*map(p + e.xyy, m) + e.yyx*map(p + e.yyx, m) + e.yxy*map(p + e.yxy, m) + e.xxx*map(p + e.xxx, m));
}
void main(){
  vec3 rd = viewRay();
  vec3 ro = uCamPos;
  float t = .05; float mat = 0.; bool hit = false;
  strandAcc = 0.;
  int i;
  for (i = 0; i < 110; i++){
    vec3 p = ro + rd*t;
    float d = map(p, mat);
    float stp = min(d*.6, .55);
    strandAcc += gW * stp * .00035 / (gS*gS + .00035) * exp(-t*.03);
    if (gD < .001*t){ hit = true; break; }
    t += stp;
    if (t > 70.) break;
  }
  vec3 amber = vec3(1., .6, .26), deepC = vec3(.012, .007, .004);
  vec3 col;
  float fogK = 1. - exp(-t*.07);
  // light from the far end of every corridor — the bedroom
  vec3 fogC = deepC + amber*.5*pow(max(dot(rd, normalize(vec3(.05, -.35, -1.))), 0.), 14.) + amber*.025;
  if (hit){
    vec3 p = ro + rd*t;
    vec3 n = normalAt(p);
    float ao = clamp(1. - float(i)/110., 0., 1.);
    vec3 L = normalize(vec3(.3, .6, .6));
    float dif = max(dot(n, L), 0.)*.6 + .4*max(dot(n, -rd), 0.);
    vec3 alb = mat > 1. ? mix(vec3(.55,.32,.16), vec3(.85,.62,.36), fract(mat*7.3)) : vec3(.42,.27,.15);
    if (mat < 0.) alb = vec3(2.5);
    // edge light: warm rim grazing the shelves
    float rim = pow(1. - max(dot(n, -rd), 0.), 3.);
    float fall = 1.2 / (1. + t*t*.05);
    col = alb * (dif * ao * fall + rim * .18) * amber;
    col += amber * .02 * ao;
  } else col = fogC;
  col = mix(col, fogC, fogK);
  col += amber * strandAcc * (.5 + uPulse*.8);
  col *= mix(1., 1.25, uWarm);
  gl_FragColor = vec4(col, 1.);
}
`;

export function createTesseract() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, .1, 100);
  const U = { uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uPixAng: { value: .001 }, uTime: { value: 0 }, uPulse: { value: 0 }, uWarm: { value: 0 } };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: FRAG, uniforms: U, depthWrite: false, depthTest: false }));
  quad.frustumCulled = false; scene.add(quad);
  const tmp = new THREE.Vector3();
  // start inside a corridor (between beams)
  const base = new THREE.Vector3(1.6 + .4, 1.3 + .25, 0);
  const shots = {
    fall(u, t) {
      const z = -u * 26;
      camera.position.set(base.x + Math.sin(u * 3.1) * .5, base.y - u * 6 + Math.sin(u * 5.) * .2, z);
      camera.up.set(Math.sin(u * 1.2) * .5, 1, 0).normalize();
      camera.lookAt(tmp.set(base.x + Math.sin(u * 3.1 + .3) * .6, base.y - u * 6 - 1.2, z - 6));
      camera.fov = 66;
    },
    drift(u, t) {
      const z = -30 - u * 10;
      camera.position.set(base.x, base.y + .2, z);
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp.set(base.x + Math.sin(u * 2) * .4, base.y + .1, z - 8));
      camera.rotateZ(u * .3);
      camera.fov = 58;
    },
  };
  return {
    id: 'tess', scene, camera, shots, uniforms: U,
    bloom: { strength: .7, radius: .55, threshold: .9 }, exposure: .95, maxScale: .9,
    explore: { target: new THREE.Vector3(base.x, base.y, -8), pos: new THREE.Vector3(base.x, base.y, 0), min: .5, max: 30, fov: 62 },
    markers(cam) {
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const base0 = cam.position.clone().addScaledVector(f, 6);
      const cell = v => Math.floor(v / 3.2) * 3.2;
      return [
        { p: new THREE.Vector3(cell(base0.x) + .35, cam.position.y + .4, cell(base0.z) - 1), t: "MURPH'S ROOM · 墨菲的房间", s: '书架背面 · 2019' },
        { p: base0.clone().add(new THREE.Vector3(.6, -.6, -4)), t: 'TIME · 时间之线', s: '可以触碰的过去' },
      ];
    },
    update(t, dt) { U.uTime.value = t; bindRay(U, camera); },
  };
}
