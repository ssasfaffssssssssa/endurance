import * as THREE from 'three';
import { QUAD_VERT, BH_FRAG, iscoRs } from '../glsl/common.js';
import { createEndurance, rigShadow, updateShadow, animateEndurance } from '../endurance.js';
import { bindRay } from '../util.js';

export const RS = 100;
let world_orient;            // world units per Schwarzschild radius

export function createGargantua() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 1e6);
  const uniforms = {
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCamPos: { value: new THREE.Vector3() },
    uPixAng: { value: .001 }, uTime: { value: 0 }, uStarGain: { value: 1 },
    uDoppler: { value: 0 }, uDiskGain: { value: 1 }, uDiskTime: { value: 0 }, uDiskTilt: { value: 0 },
    uDiskOuter: { value: 13 }, uDiskTemp: { value: 5200 }, uSpin: { value: .8 }, uRin: { value: iscoRs(.8) },
    uBHPos: { value: new THREE.Vector3() }, uBHScale: { value: RS }, uBHRot: { value: new THREE.Matrix3() },
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT, fragmentShader: BH_FRAG, uniforms, depthWrite: false, depthTest: false,
  }));
  quad.frustumCulled = false; quad.renderOrder = -10; scene.add(quad);

  const ship = createEndurance();
  ship.scale.setScalar(1);
  scene.add(ship);
  const key = new THREE.DirectionalLight(0xffc48a, 4.2); scene.add(key); scene.add(key.target);
  rigShadow(key, ship);
  const rim = new THREE.DirectionalLight(0x9fb8ff, .5); rim.position.set(1, 2, -1); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffd8b0, 0x0a0c14, .25));

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const sph = (r, az, el) => new THREE.Vector3(r * Math.cos(el) * Math.cos(az), r * Math.sin(el), r * Math.cos(el) * Math.sin(az)).multiplyScalar(RS);
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function placeShip(pos, look, spin = true) {
    ship.visible = true;
    ship.position.copy(pos);
    if (look) ship.lookAt(look);
  }
  function lightFromDisk() {
    // the disk is the light source: warm key from the hole, toward the ship
    tmp.copy(ship.position).normalize();
    key.position.copy(ship.position).addScaledVector(tmp, -50).add(new THREE.Vector3(0, -30, 0));
    key.target.position.copy(ship.position);
  }

  const fwdOf = () => new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const rightOf = () => new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const upOf = () => new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  // point the ring axis mostly at the camera so the twelve modules read as a wheel
  function orientRing(obj, fwd, right, up, tilt, roll) {
    const axis = fwd.clone().multiplyScalar(-Math.cos(tilt)).addScaledVector(up, Math.sin(tilt)).addScaledVector(right, roll).normalize();
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  }
  world_orient = orientRing;
  const shots = {
    // grand reveal: almost edge-on, slow push and drift
    reveal(u) {
      const e = ease(u);
      camera.position.copy(sph(85 - 28 * e, -1.75 + .14 * e, .035 + .025 * e));
      camera.up.set(0, 1, 0); camera.lookAt(tmp.set(0, 0, 0));
      camera.fov = 15; ship.visible = false;
    },
    // Endurance crosses in front of the disk, the ring spinning
    flyby(u) {
      camera.position.copy(sph(46, -1.5 + .06 * u, .075));
      camera.up.set(0, 1, 0); camera.lookAt(tmp.set(0, 0, 0)); camera.rotateZ(-.06);
      camera.fov = 24;
      const fwd = fwdOf(), right = rightOf(), up = upOf();
      const p = camera.position.clone().addScaledVector(fwd, 175).addScaledVector(right, THREE.MathUtils.lerp(-80, 52, u)).addScaledVector(up, -20 + 8 * u);
      ship.visible = true; ship.position.copy(p);
      orientRing(ship, fwd, right, up, .62, .2);
      lightFromDisk();
    },
    // dive: plunging toward the photon sphere
    dive(u) {
      const e = Math.pow(u, 1.8);
      camera.position.copy(sph(46 - 42.2 * e, -1.4 + .9 * e, .07 - .055 * e));
      camera.up.set(0, 1, 0); camera.lookAt(tmp.set(0, 0, 0));
      camera.rotateZ(.22 * e);
      camera.fov = 22 + 48 * e; ship.visible = false;
    },
    // Endurance roars past the lens and shrinks toward the disk
    passby(u) {
      camera.position.copy(sph(34, -1.5, .065));
      camera.up.set(0, 1, 0); camera.lookAt(tmp.set(0, 0, 0)); camera.rotateZ(.04);
      camera.fov = 30;
      const fwd = fwdOf(), right = rightOf(), up = upOf();
      const e = u * u * (3 - 2 * u);
      const p = camera.position.clone().addScaledVector(fwd, THREE.MathUtils.lerp(-6, 520, Math.pow(e, 1.35))).addScaledVector(right, THREE.MathUtils.lerp(16, -24, e)).addScaledVector(up, THREE.MathUtils.lerp(-7, -4, e));
      ship.visible = true; ship.position.copy(p);
      orientRing(ship, fwd, right, up, .9, .35);
      lightFromDisk();
    },
    // high above the disk: the lensed far side arches over the shadow
    orbit(u) {
      camera.position.copy(sph(38, -1.3 + u * .45, .42 - u * .08));
      camera.up.set(0, 1, 0); camera.lookAt(tmp.set(0, -.5 * RS, 0));
      camera.fov = 30; ship.visible = false;
    },
  };

  let doppler = 0, dopplerTarget = 0;
  const world = {
    id: 'garg', scene, camera, uniforms,
    bloom: { strength: .45, radius: .35, threshold: 1.0 },
    exposure: 1.0, maxScale: 1.0,
    shots,
    explore: { target: new THREE.Vector3(0, 0, 0), pos: sph(48, -1.6, .07), min: 2.2 * RS, max: 120 * RS, fov: 24 },
    setDoppler(v) { dopplerTarget = v; },
    setSpin(v) { uniforms.uSpin.value = v; uniforms.uRin.value = iscoRs(v); },
    get spin() { return uniforms.uSpin.value; },
    get doppler() { return dopplerTarget; },
    showShipExplore: true,
    update(t, dt, mode) {
      doppler = window.__record ? dopplerTarget : doppler + (dopplerTarget - doppler) * Math.min(1, dt * 3);
      uniforms.uDoppler.value = doppler;
      uniforms.uDiskTime.value = t;
      ship.userData.ring.rotation.y = t * ship.userData.spin;
      if (mode === 'explore') {
        ship.visible = world.showShipExplore;
        // park Endurance just ahead of the camera, offset to the right
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const p = camera.position.clone().addScaledVector(fwd, 150).addScaledVector(right, 22).addScaledVector(up, -12);
        ship.position.lerp(p, ship.userData._init && !window.__record ? Math.min(1, dt * 4) : 1); ship.userData._init = true;
        const q0 = ship.quaternion.clone(); world_orient(ship, fwd, right, up, .55, .25); const q1 = ship.quaternion.clone();
        ship.quaternion.copy(q0).slerp(q1, window.__record ? 1 : Math.min(1, dt * 3));
        lightFromDisk();
      }
      animateEndurance(ship, t);
      if (ship.visible) updateShadow(key);
      bindRay(uniforms, camera);
    },
    markers(cam) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion); right.y = 0; right.normalize();
      const out = [
        { p: new THREE.Vector3(0, 3.1 * RS, 0), t: 'GARGANTUA · 卡冈图雅', s: '超大质量黑洞 · 1.0×10⁸ M☉' },
        { p: right.clone().multiplyScalar(-10.5 * RS), t: 'ACCRETION DISK · 吸积盘', s: 'ISCO 3 rₛ · T≈4,500 K' },
      ];
      if (ship.visible) out.push({ p: ship.position.clone(), t: 'ENDURANCE · 永恒号', s: '环转速 5.3 rpm · 1.00 g' });
      return out;
    },
    stats() {
      const r = camera.position.length() / RS;
      const f = 1 / Math.sqrt(Math.max(1e-9, 1 - 1 / r));
      return { r, f };
    },
  };
  return world;
}
