import * as THREE from 'three';
import { NOISE, RAY, SKY, QUAD_VERT } from '../glsl/common.js';
import { createEndurance } from '../endurance.js';
import { bindRay, ease, lerp } from '../util.js';

const R = 100;
const SUN = new THREE.Vector3(-.82, .12, -.56).normalize();

const SKY_FRAG = /* glsl */`
${NOISE}
${RAY}
${SKY}
uniform vec3 uSun;
void main(){
  vec3 rd = viewRay();
  float s = max(dot(rd, uSun), 0.);
  vec3 c = deepSky(rd) + vec3(1.,.93,.82)*(pow(s, 6000.)*22. + pow(s, 400.)*.5 + pow(s, 20.)*.025);
  gl_FragColor = vec4(c, 1.);
}
`;

const EARTH_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }
`;
const EARTH_FRAG = /* glsl */`
${NOISE}
uniform sampler2D uDay, uNight, uBRC; uniform vec3 uSun, uCamPos; uniform float uTime, uDust;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(uCamPos - vW);
  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 night = texture2D(uNight, vUv).rgb;
  vec3 brc = texture2D(uBRC, vUv).rgb;
  float ocean = 1. - smoothstep(.2, .5, brc.g);
  // the blight: farmland bleached to ochre, continents veiled in dust
  float lum = dot(day, vec3(.3,.59,.11));
  vec3 dusty = mix(day, vec3(lum)*vec3(1.25,.95,.62), (1. - ocean)*.6*uDust);
  float storm = smoothstep(.45, .8, fbm(vec3(vUv*vec2(14., 7.), uTime*.02) + vec3(uTime*.01, 0., 0.)));
  dusty = mix(dusty, vec3(.55,.4,.25), storm*.5*uDust*(1. - ocean*.5));
  float ndl = dot(n, uSun);
  float dayK = smoothstep(-.12, .25, ndl);
  // clouds, tinted by the dust they carry
  float cl = smoothstep(.2, 1., brc.b);
  vec3 cloudC = mix(vec3(1.), vec3(1.,.86,.66), .55*uDust);
  vec3 col = mix(dusty*vec3(1.,1.,mix(1.,.8,ocean)), cloudC, cl*.9) * max(ndl, 0.) * 1.05;
  // ocean glint
  vec3 h = normalize(uSun + v);
  col += vec3(1.,.85,.65) * pow(max(dot(n, h), 0.), 90.) * ocean * (1. - cl) * 1.6 * step(0., ndl);
  // city lights — fewer than there used to be
  float lights = dot(night, vec3(.33)) * (1. - dayK) * (1. - cl*.8);
  col += vec3(1.,.72,.38) * lights * .55 * (.35 + .65*step(.5, hash12(floor(vUv*600.))));
  // dusty atmosphere: rim and terminator glow
  float mu = max(dot(n, v), 0.);
  float rim = pow(1. - mu, 4.);
  vec3 atm = mix(vec3(.45,.62,.95), vec3(.95,.62,.32), uDust*.7);
  col += atm * rim * smoothstep(-.1, .5, ndl) * .8;
  col += vec3(1.,.45,.15) * rim * exp(-ndl*ndl*60.) * .25 * uDust * step(0., ndl + .05);
  gl_FragColor = vec4(col, 1.);
}
`;
const ATM_FRAG = /* glsl */`
uniform vec3 uSun, uCamPos; uniform float uDust;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(uCamPos - vW);
  float mu = dot(n, v);
  float rim = pow(clamp(1. + mu, 0., 1.), 5.);    // backside shell: brightest at the limb
  float ndl = dot(-n, uSun);
  float lit = smoothstep(-.35, .4, ndl);
  float fwd = pow(max(dot(-v, uSun), 0.), 8.);      // forward scattering at sunrise
  vec3 c = mix(vec3(.35,.55,1.), vec3(1.,.6,.3), uDust*.75) * rim * lit * 1.1;
  c += vec3(1.,.55,.25) * rim * fwd * 2.2;
  gl_FragColor = vec4(c, 1.);
}
`;

export async function createEarth(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .05, 1e6);
  const L = new THREE.TextureLoader();
  const load = (f, srgb = true) => new Promise(res => L.load('assets/earth/' + f, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t); }, undefined, () => res(new THREE.Texture())));
  const base = location.pathname.includes('/tools/') ? '../' : '';
  const loadB = (f, srgb) => new Promise(res => L.load(base + 'assets/earth/' + f, t => { if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); res(t); }, undefined, () => res(new THREE.Texture())));
  const [day, night, brc] = await Promise.all([loadB('earth_day_4096.jpg', true), loadB('earth_night_4096.jpg', true), loadB('earth_bump_roughness_clouds_4096.jpg', false)]);

  const skyU = { uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() }, uPixAng: { value: .001 }, uTime: { value: 0 }, uStarGain: { value: .55 }, uSun: { value: SUN } };
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, depthWrite: false, depthTest: false }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.add(sky);

  const eu = { uDay: { value: day }, uNight: { value: night }, uBRC: { value: brc }, uSun: { value: SUN }, uCamPos: skyU.uCamPos, uTime: skyU.uTime, uDust: { value: 1 } };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 192, 128), new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: eu }));
  earth.rotation.y = 2.2; scene.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.022, 128, 96), new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: ATM_FRAG, uniforms: eu, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(atm);

  const ship = createEndurance(); ship.scale.setScalar(.012); scene.add(ship);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.4); sun.position.copy(SUN).multiplyScalar(50); scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x6b8fd0, 0x2a1a10, .22));

  const tmp = new THREE.Vector3();
  const orbitPos = (alt, lon, lat) => new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(R + alt);
  const camBasis = () => ({ fwd: new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion), right: new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up: new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion) });
  const orient = (axis) => ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  const Q = new THREE.Vector3().crossVectors(SUN, new THREE.Vector3(0, 1, 0)).normalize();
  const shots = {
    // sunrise over a dusty limb, Endurance a silhouette against it
    dawn(u) {
      const e = ease(u);
      const a = THREE.MathUtils.degToRad(lerp(111, 107.2, e));
      const P = SUN.clone().multiplyScalar(Math.cos(a)).addScaledVector(Q, Math.sin(a)).multiplyScalar(R + 6);
      const n = P.clone().normalize();
      camera.position.copy(P);
      camera.up.copy(n);
      const hz = SUN.clone().addScaledVector(n, -SUN.dot(n)).normalize();
      camera.lookAt(P.clone().addScaledVector(hz, 100).addScaledVector(n, -100 * Math.tan(THREE.MathUtils.degToRad(13))));
      camera.fov = 34;
      const { fwd, right, up } = camBasis();
      ship.position.copy(camera.position).addScaledVector(fwd, 2.2).addScaledVector(right, lerp(-.42, .22, u)).addScaledVector(up, .1);
      orient(fwd.clone().multiplyScalar(-.55).addScaledVector(up, .8));
    },
    // over the shoulder of Endurance, the blighted planet below
    depart(u) {
      const e = ease(u);
      const sp = orbitPos(26, 3.3 + .02 * e, .42);
      const n = sp.clone().normalize();
      const tg = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
      ship.position.copy(sp);
      camera.position.copy(sp).addScaledVector(tg, lerp(.8, 1.1, e)).addScaledVector(n, lerp(.1, .16, e));
      camera.up.copy(n);
      camera.lookAt(sp.clone().addScaledVector(n, -.25));
      camera.fov = 50;
      const { fwd, up } = camBasis();
      orient(fwd.clone().multiplyScalar(-.6).addScaledVector(up, .7));
    },
  };
  return {
    id: 'earth', scene, camera, shots,
    bloom: { strength: .55, radius: .5, threshold: 1.0 }, exposure: 1, maxScale: 1.5,
    explore: { target: new THREE.Vector3(0, 0, 0), pos: orbitPos(260, 3.6, .3), min: R * 1.12, max: R * 9, fov: 36 },
    markers(cam) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      return [
        { p: right.clone().multiplyScalar(-R * .55).addScaledVector(up, R * .55), t: 'EARTH · 地球', s: '2067 · 沙尘指数 87%' },
        { p: ship.position.clone(), t: 'ENDURANCE · 永恒号', s: '近地轨道 · 出发' },
        { p: cam.position.clone().addScaledVector(SUN, 900), t: 'SOL · 太阳', s: '1.00 AU' },
      ];
    },
    update(t, dt, mode) {
      skyU.uTime.value = t;
      earth.rotation.y = 2.2 + t * .006;
      ship.userData.ring.rotation.y = t * ship.userData.spin;
      if (mode === 'explore') {
        const { fwd, right, up } = camBasis();
        ship.position.copy(camera.position).addScaledVector(fwd, 2.6).addScaledVector(right, .9).addScaledVector(up, -.45);
        orient(fwd.clone().multiplyScalar(-.75).addScaledVector(up, .6));
      }
      bindRay(skyU, camera);
    },
  };
}
