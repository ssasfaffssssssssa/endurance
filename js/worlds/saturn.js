import * as THREE from 'three';
import { NOISE, RAY, SKY, QUAD_VERT } from '../glsl/common.js';
import { createEndurance, rigShadow, updateShadow, animateEndurance } from '../endurance.js';
import { bindRay, ease, lerp } from '../util.js';

const SR = 1000;                         // Saturn radius
const SUN = new THREE.Vector3(.95, .3, .12).normalize();

const SKY_FRAG = /* glsl */`
${NOISE}
${RAY}
${SKY}
void main(){ vec3 rd = viewRay(); gl_FragColor = vec4(deepSky(rd) + vec3(1.,.95,.85)*pow(max(dot(rd, vec3(${SUN.x},${SUN.y},${SUN.z})),0.), 9000.)*30. + vec3(1.,.9,.75)*pow(max(dot(rd, vec3(${SUN.x},${SUN.y},${SUN.z})),0.), 60.)*.04, 1.); }
`;

// Wormhole: a spherical lens. Inside the sphere — another galaxy; around it — the local sky bent into an Einstein ring.
const WH_VERT = /* glsl */`
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }
`;
const WH_FRAG = /* glsl */`
${NOISE}
uniform vec3 uCamPos; uniform float uPixAng; uniform float uTime;
${SKY}
uniform vec3 uWH; uniform float uR; uniform float uOpen;
varying vec3 vW;
vec3 rotateToward(vec3 v, vec3 to, float a){ vec3 n = normalize(to - v*dot(to, v)); return normalize(v*cos(a) + n*sin(a)); }
vec3 otherSky(vec3 d){
  // the far side: denser, warmer, with a distant spiral galaxy and a pinprick of Gargantua's light
  vec3 c = deepSky(d.zxy) * 1.6;
  vec3 g = normalize(vec3(.35, .25, -.9));
  float k = dot(d, g);
  vec3 t1 = normalize(cross(g, vec3(0,1,0))), t2 = cross(g, t1);
  vec2 q = vec2(dot(d,t1), dot(d,t2)) / max(k, .01);
  q = mat2(.8,.6,-.6,.8) * q * vec2(1., 2.1);
  float r = length(q), a = atan(q.y, q.x);
  float arms = pow(.5 + .5*cos(2.*a - log(r+1e-3)*5. ), 3.);
  float gal = exp(-r*9.) * 3. + exp(-r*3.2) * arms * (.6 + .6*fbm(vec3(q*12., 1.))) ;
  c += step(0., k) * gal * mix(vec3(1.,.8,.55), vec3(.55,.7,1.), smoothstep(0., .4, r)) * 1.4;
  vec3 gg = normalize(vec3(-.6, .1, -.8));
  c += vec3(1.,.75,.45) * pow(max(dot(d, gg), 0.), 9000.) * 60.;
  return c;
}
void main(){
  vec3 rd = normalize(vW - uCamPos);
  vec3 oc = uWH - uCamPos;
  float t = dot(oc, rd);
  vec3 cp = uCamPos + rd*t;
  vec3 toC = uWH - cp;
  float b = length(toC);
  float x = b / uR;
  vec3 col; float alpha;
  if (t < 0.) discard;
  if (x < 1.){
    // inside the throat: the whole far sky compressed into the disc
    float th = 3.14159 * pow(x, 1.6);
    vec3 od = rotateToward(rd, -toC/b, th);
    col = otherSky(od);
    // compressed light piles up at the rim
    col += vec3(.75,.85,1.) * pow(x, 26.) * 1.8;
    col *= mix(.0, 1., uOpen);
    alpha = 1.;
  } else {
    float defl = .42 / (x*x);
    vec3 od = rotateToward(rd, toC/b, -defl);
    col = deepSky(od);
    // Einstein ring of the local sky right at the edge
    col += vec3(.6,.7,1.) * exp(-(x-1.)*40.) * .25;
    alpha = smoothstep(3., 1.6, x);
  }
  gl_FragColor = vec4(col, alpha);
}
`;

const SATURN_VERT = /* glsl */`
varying vec3 vN; varying vec3 vP; varying vec3 vL;
void main(){ vN = normalize(normalMatrix*normal); vP = position; vec4 w = modelMatrix*vec4(position,1.); vL = (modelMatrix*vec4(position,1.)).xyz; gl_Position = projectionMatrix*viewMatrix*w; }
`;
const SATURN_FRAG = /* glsl */`
${NOISE}
uniform vec3 uSunL; uniform vec3 uCamPos; uniform mat3 uInvRot; uniform vec3 uCenter; uniform float uR;
varying vec3 vN; varying vec3 vP; varying vec3 vL;
float ringDensity(float r){
  float x = r / uR;
  if (x < 1.24 || x > 2.27) return 0.;
  float d = .5 + .32*(fbm(vec3(x*38., 0., 0.)) - .5)*2. + .18*(vnoise(vec3(x*310., 0., 0.)) - .5)*2.;
  d *= smoothstep(1.24, 1.53, x) * .55 + .45*step(1.53, x);     // faint C ring
  d *= 1. - .92*smoothstep(1.94, 1.955, x)*(1. - smoothstep(2.015, 2.03, x)); // Cassini division
  d *= 1. - .8*smoothstep(2.21, 2.214, x)*(1. - smoothstep(2.222, 2.226, x));  // Encke gap
  d *= 1. - smoothstep(2.25, 2.27, x);
  return clamp(d, 0., 1.);
}
void main(){
  vec3 n = normalize(vL - uCenter);
  vec3 lp = uInvRot * n;                         // planet-local direction
  float lat = lp.y;
  float bands = fbm(vec3(lat*18., lat*3. + .3*fbm(lp*vec3(4.,30.,4.)), 1.));
  float fine = vnoise(vec3(lat*120., atan(lp.z, lp.x)*2., 0.));
  vec3 c1 = vec3(.86,.76,.56), c2 = vec3(.72,.58,.38), c3 = vec3(.93,.88,.74);
  vec3 alb = mix(c2, c1, smoothstep(.3,.7,bands));
  alb = mix(alb, c3, smoothstep(.55,.9,fine)*.35);
  alb = mix(alb, vec3(.55,.62,.68), smoothstep(.82,.98,abs(lat))*.6);   // bluish poles
  float ndl = dot(n, uSunL);
  float diff = smoothstep(-.06, .5, ndl) * (.35 + .65*max(ndl,0.));
  // ring shadow on the planet
  vec3 lpos = uInvRot * (vL - uCenter);
  vec3 ls = uInvRot * uSunL;
  float sh = 1.;
  if (abs(ls.y) > 1e-3){
    float tt = -lpos.y / ls.y;
    if (tt > 0.){ vec3 hp = lpos + ls*tt; sh = 1. - .85*ringDensity(length(hp.xz)); }
  }
  vec3 v = normalize(uCamPos - vL);
  float rim = pow(1. - max(dot(n, v), 0.), 3.);
  float mu = max(dot(n, v), 0.);
  vec3 col = alb * diff * sh * .78 * (.55 + .45*pow(mu, .35));
  col += vec3(.95,.85,.65) * rim * max(ndl + .2, 0.) * .5;
  gl_FragColor = vec4(col, 1.);
}
`;
const RING_FRAG = /* glsl */`
${NOISE}
uniform vec3 uSunL; uniform vec3 uCamPos; uniform vec3 uCenter; uniform float uR; uniform mat3 uInvRot;
varying vec3 vN; varying vec3 vP; varying vec3 vL;
float ringDensity(float r){
  float x = r / uR;
  if (x < 1.24 || x > 2.27) return 0.;
  float d = .5 + .32*(fbm(vec3(x*38., 0., 0.)) - .5)*2. + .18*(vnoise(vec3(x*310., 0., 0.)) - .5)*2.;
  d *= smoothstep(1.24, 1.53, x) * .55 + .45*step(1.53, x);
  d *= 1. - .92*smoothstep(1.94, 1.955, x)*(1. - smoothstep(2.015, 2.03, x));
  d *= 1. - .8*smoothstep(2.21, 2.214, x)*(1. - smoothstep(2.222, 2.226, x));
  d *= 1. - smoothstep(2.25, 2.27, x);
  return clamp(d, 0., 1.);
}
void main(){
  vec3 lp = uInvRot * (vL - uCenter);
  float r = length(lp.xz);
  float d = ringDensity(r);
  if (d < .01) discard;
  float x = r/uR;
  float fw = fwidth(x);
  float hf = smoothstep(.003, .0006, fw);
  d = clamp(d + hf*.12*(vnoise(vec3(x*1400., 0., 0.)) - .5), 0., 1.);
  vec3 col = mix(vec3(.62,.56,.48), vec3(.92,.86,.74), smoothstep(1.5, 2.1, x)) * (.85 + .3*hf*vnoise(vec3(x*700.,0.,0.)));
  // planet shadow
  vec3 p = vL - uCenter;
  float bb = dot(p, uSunL); float cc = dot(p,p) - uR*uR*1.0;
  float shadow = (bb < 0. && bb*bb - cc > 0.) ? .06 : 1.;
  vec3 v = normalize(uCamPos - vL);
  float sunSide = sign(dot(uInvRot*uSunL, vec3(0,1,0))) * sign(dot(uInvRot*v, vec3(0,1,0)));
  float lit = sunSide > 0. ? 1. : .35 + .9*pow(max(dot(-v, uSunL), 0.), 6.)*(1.-d);
  gl_FragColor = vec4(col * lit * shadow * .62, d*.92);
}
`;

export function createSaturn() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 2e6);
  const skyU = { uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uPixAng: { value: .001 }, uTime: { value: 0 }, uStarGain: { value: .8 } };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, depthWrite: false, depthTest: false }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

  const sat = new THREE.Group(); scene.add(sat);
  sat.rotation.set(.12, 0, .42);
  sat.updateMatrixWorld();
  const invRot = new THREE.Matrix3().setFromMatrix4(sat.matrixWorld).invert();
  const common = { uSunL: { value: SUN }, uCamPos: skyU.uCamPos, uInvRot: { value: invRot }, uCenter: { value: new THREE.Vector3() }, uR: { value: SR } };
  const planet = new THREE.Mesh(new THREE.SphereGeometry(SR, 128, 96), new THREE.ShaderMaterial({ vertexShader: SATURN_VERT, fragmentShader: SATURN_FRAG, uniforms: common }));
  planet.scale.y = .9; sat.add(planet);
  const ringGeo = new THREE.RingGeometry(SR * 1.22, SR * 2.3, 256, 1); ringGeo.rotateX(-Math.PI / 2);
  const rings = new THREE.Mesh(ringGeo, new THREE.ShaderMaterial({ vertexShader: SATURN_VERT, fragmentShader: RING_FRAG, uniforms: common, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  sat.add(rings);

  // wormhole placement
  const WH = new THREE.Vector3(-2600, 520, 3300);
  const WR = 90;
  const whU = { uCamPos: skyU.uCamPos, uPixAng: skyU.uPixAng, uTime: skyU.uTime, uStarGain: skyU.uStarGain, uWH: { value: WH }, uR: { value: WR }, uOpen: { value: 1 } };
  const wh = new THREE.Mesh(new THREE.SphereGeometry(WR * 3.05, 64, 48), new THREE.ShaderMaterial({ vertexShader: WH_VERT, fragmentShader: WH_FRAG, uniforms: whU, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  wh.position.copy(WH); wh.renderOrder = 2; scene.add(wh);

  const ship = createEndurance(); scene.add(ship);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2); sun.position.copy(SUN).multiplyScalar(100); scene.add(sun); scene.add(sun.target);
  rigShadow(sun, ship);
  scene.add(new THREE.HemisphereLight(0xd9c7a0, 0x05070c, .18)); // Saturn-shine

  const tmp = new THREE.Vector3();
  const ringAxis = (fwd, up, tilt) => fwd.clone().multiplyScalar(-Math.cos(tilt)).addScaledVector(up, Math.sin(tilt)).normalize();
  const orient = (axis) => ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  const camBasis = () => ({
    fwd: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion),
    right: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion),
    up: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion),
  });
  const shots = {
    // tiny Endurance against Saturn
    vista(u) {
      const e = ease(u);
      camera.position.set(lerp(-2950, -2750, e), lerp(470, 430, e), lerp(4300, 4150, e));
      camera.up.set(0, 1, 0);
      camera.lookAt(tmp.set(lerp(-600, -900, e), 40, 0));
      camera.fov = 42;
      const { fwd, right, up } = camBasis();
      ship.position.copy(camera.position).addScaledVector(fwd, 420).addScaledVector(right, lerp(30, 190, u)).addScaledVector(up, -60);
      orient(ringAxis(fwd, up, .5));
    },
    // closing in on the sphere
    approach(u) {
      const e = ease(u);
      const from = new THREE.Vector3(-2900, 470, 4500), to = WH.clone().add(new THREE.Vector3(-140, 18, 900));
      camera.position.lerpVectors(from, to, e);
      camera.up.set(0, 1, 0);
      camera.lookAt(WH.clone().add(new THREE.Vector3(lerp(380, 0, e), 0, 0)));
      camera.fov = 38;
      const { fwd, right, up } = camBasis();
      ship.position.copy(camera.position).addScaledVector(fwd, lerp(70, 160, e)).addScaledVector(right, lerp(14, 6, e)).addScaledVector(up, lerp(-14, -6, e));
      orient(ringAxis(fwd, up, .35));
    },
    // into the throat
    enter(u) {
      const e = Math.pow(u, 2.2);
      const from = WH.clone().add(new THREE.Vector3(-140, 18, 900)), to = WH.clone().add(new THREE.Vector3(0, 0, WR * 1.05));
      camera.position.lerpVectors(from, to, e);
      camera.up.set(0, 1, 0);
      camera.lookAt(WH); camera.rotateZ(e * .6);
      camera.fov = 38 + 30 * e;
      const { fwd, right, up } = camBasis();
      ship.position.copy(camera.position).addScaledVector(fwd, 160 - 60 * e).addScaledVector(right, 6).addScaledVector(up, -6);
      orient(ringAxis(fwd, up, .35));
    },
  };

  const world = {
    id: 'saturn', scene, camera, shots,
    bloom: { strength: .45, radius: .45, threshold: 1.2 }, exposure: 1.0, maxScale: 1.5,
    explore: { target: WH.clone(), pos: new THREE.Vector3(-2950, 600, 4300), min: WR * 3.4, max: 12000, fov: 40 },
    whDist: () => camera.position.distanceTo(WH) / WR,
    markers() {
      const d = camera.position.distanceTo(WH) * .011;
      return [
        { p: WH.clone().add(new THREE.Vector3(0, WR * 1.15, 0)), t: 'WORMHOLE · 虫洞', s: `${d.toFixed(2)} km · 通往卡冈图雅` },
        { p: new THREE.Vector3(0, SR * .98, 0).applyEuler(sat.rotation), t: 'SATURN · 土星', s: 'R = 58,232 km' },
        { p: ship.position.clone(), t: 'ENDURANCE · 永恒号', s: '虫洞接近航线' },
      ];
    },
    update(t, dt, mode) {
      ship.userData.ring.rotation.y = t * ship.userData.spin;
      sat.rotation.y = t * .004;
      sat.updateMatrixWorld(); invRot.setFromMatrix4(sat.matrixWorld).invert();
      skyU.uTime.value = t;
      if (mode === 'explore') {
        const { fwd, right, up } = camBasis();
        const p = camera.position.clone().addScaledVector(fwd, 150).addScaledVector(right, 40).addScaledVector(up, -26);
        ship.position.lerp(p, ship.userData._init && !window.__record ? Math.min(1, dt * 4) : 1); ship.userData._init = true;
        orient(ringAxis(fwd, up, .5));
      }
      animateEndurance(ship, t); updateShadow(sun);
      bindRay(skyU, camera);
    },
  };
  return world;
}
