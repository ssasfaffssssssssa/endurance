// Procedural Endurance v2: a ring of twelve rounded modules on truss spokes, ribbed tunnels, a tiered hub,
// RCS clusters, blinking navigation lights, shadow-ready. Original design built around the twelve-module ring idea.
import * as THREE from 'three';

/* ——— textures: albedo + normal + roughness generated on a canvas ——— */
function makeRng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
function panelSet(seed, base = 210, opts = {}) {
  const S = 512, rnd = makeRng(seed);
  const alb = document.createElement('canvas'), hgt = document.createElement('canvas'), rgh = document.createElement('canvas');
  [alb, hgt, rgh].forEach(c => { c.width = c.height = S; });
  const a = alb.getContext('2d'), h = hgt.getContext('2d'), r = rgh.getContext('2d');
  a.fillStyle = `rgb(${base},${base},${base + 3})`; a.fillRect(0, 0, S, S);
  h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  r.fillStyle = '#8a8a8a'; r.fillRect(0, 0, S, S);
  // panel grid with random subdivisions
  const cells = [];
  const split = (x, y, w, hh, d) => { if (d > 3 || (d > 1 && rnd() < .35)) { cells.push([x, y, w, hh]); return; } if (w > hh) { const k = .3 + rnd() * .4; split(x, y, w * k, hh, d + 1); split(x + w * k, y, w * (1 - k), hh, d + 1); } else { const k = .3 + rnd() * .4; split(x, y, w, hh * k, d + 1); split(x, y + hh * k, w, hh * (1 - k), d + 1); } };
  split(0, 0, S, S, 0);
  for (const [x, y, w, hh] of cells) {
    const v = base - 22 + rnd() * 34;
    a.fillStyle = `rgb(${v},${v},${v + 4})`; a.fillRect(x + 2, y + 2, w - 4, hh - 4);
    h.fillStyle = `rgb(${120 + rnd() * 30},${120 + rnd() * 30},${120 + rnd() * 30})`; h.fillRect(x + 3, y + 3, w - 6, hh - 6);
    const rv = 90 + rnd() * 80; r.fillStyle = `rgb(${rv},${rv},${rv})`; r.fillRect(x + 2, y + 2, w - 4, hh - 4);
    // seams
    h.strokeStyle = '#303030'; h.lineWidth = 3; h.strokeRect(x + 1.5, y + 1.5, w - 3, hh - 3);
    a.strokeStyle = 'rgba(30,32,38,.6)'; a.lineWidth = 2; a.strokeRect(x + 1, y + 1, w - 2, hh - 2);
    // rivets along edges
    if (w > 60 && hh > 60) for (let k = 8; k < w - 6; k += 14) { h.fillStyle = '#b8b8b8'; h.fillRect(x + k, y + 6, 2, 2); h.fillRect(x + k, y + hh - 8, 2, 2); }
    // hatches, vents, decals
    if (rnd() > .78) { a.fillStyle = 'rgba(22,24,28,.85)'; const vw = w * (.25 + rnd() * .3), vh = hh * (.15 + rnd() * .2); a.fillRect(x + w * .2, y + hh * .2, vw, vh); for (let k = 0; k < vh; k += 5) { h.fillStyle = k % 10 ? '#5a5a5a' : '#a0a0a0'; h.fillRect(x + w * .2, y + hh * .2 + k, vw, 2); } }
    if (opts.decal && rnd() > .9) { a.fillStyle = 'rgba(180,60,40,.8)'; a.fillRect(x + 8, y + 8, 18, 6); }
  }
  // grime
  for (let i = 0; i < 2500; i++) { a.fillStyle = `rgba(0,0,0,${rnd() * .05})`; a.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 18, 1 + rnd() * 3); }
  // height -> normal
  const hd = h.getImageData(0, 0, S, S).data;
  const nimg = a.createImageData(S, S);
  const H = (x, y) => hd[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3.2, dy = (H(x, y + 1) - H(x, y - 1)) * 3.2;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    nimg.data[i] = (-dx / l * .5 + .5) * 255; nimg.data[i + 1] = (dy / l * .5 + .5) * 255; nimg.data[i + 2] = (1 / l * .5 + .5) * 255; nimg.data[i + 3] = 255;
  }
  const nrm = document.createElement('canvas'); nrm.width = nrm.height = S; nrm.getContext('2d').putImageData(nimg, 0, 0);
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: tex(alb, true), normalMap: tex(nrm), roughnessMap: tex(rgh) };
}
function foilTexture(seed) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), rnd = makeRng(seed);
  const grd = g.createLinearGradient(0, 0, S, S); grd.addColorStop(0, '#b8873a'); grd.addColorStop(.5, '#e6c06a'); grd.addColorStop(1, '#a6782c');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) { g.strokeStyle = `rgba(${rnd() > .5 ? '255,238,175' : '80,52,18'},${.06 + rnd() * .16})`; g.lineWidth = 1 + rnd() * 3; g.beginPath(); const x = rnd() * S, y = rnd() * S; g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 70, y + (rnd() - .5) * 70); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

let _M = null;
export function createMaterials() {
  if (_M) return _M;
  const p1 = panelSet(3, 208, { decal: true }), p2 = panelSet(7, 176), p3 = panelSet(13, 228);
  _M = {
    hull: new THREE.MeshStandardMaterial({ ...p1, roughness: .62, metalness: .28, envMapIntensity: 1.1 }),
    hull2: new THREE.MeshStandardMaterial({ ...p2, roughness: .66, metalness: .32, envMapIntensity: 1.1 }),
    hull3: new THREE.MeshStandardMaterial({ ...p3, roughness: .55, metalness: .2, envMapIntensity: 1.1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1c1e23, roughness: .42, metalness: .75, envMapIntensity: 1.2 }),
    truss: new THREE.MeshStandardMaterial({ color: 0x8d9097, roughness: .45, metalness: .8, envMapIntensity: 1.2 }),
    gold: new THREE.MeshStandardMaterial({ map: foilTexture(11), roughness: .3, metalness: 1, envMapIntensity: 1.4 }),
    radiator: new THREE.MeshStandardMaterial({ color: 0xd9dbe0, roughness: .3, metalness: .1, envMapIntensity: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: .06, metalness: .95, envMapIntensity: 1.6 }),
    lightW: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 3.1, 2.4) }),
    lightR: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, .5, .3) }),
    lightG: new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 8, .9) }),
    strobe: new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 10, 10) }),
    engine: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.6, 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
  return _M;
}

function roundedBox(w, h, d, r, seg = 3) {
  // rounded-rectangle cross-section (w x h) extruded along z by d
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: r * .6, bevelSize: r * .5, bevelSegments: seg, curveSegments: 6 });
  g.translate(0, 0, -d / 2);
  // box-project uvs so panel textures sit nicely
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    if (az >= ax && az >= ay) uv.setXY(i, X / 3, Y / 3); else if (ax >= ay) uv.setXY(i, Z / 3, Y / 3); else uv.setXY(i, X / 3, Z / 3);
  }
  return g;
}

export function createRanger(M = createMaterials()) {
  const g = new THREE.Group();
  const prof = new THREE.Shape();
  prof.moveTo(-2.3, -.32); prof.lineTo(1.6, -.3); prof.quadraticCurveTo(2.5, -.25, 2.75, -.05);
  prof.quadraticCurveTo(2.2, .18, 1.25, .42); prof.lineTo(.35, .62); prof.lineTo(-1.4, .55); prof.lineTo(-2.3, .32); prof.closePath();
  const body = new THREE.ExtrudeGeometry(prof, { depth: 1.7, bevelEnabled: true, bevelThickness: .22, bevelSize: .14, bevelSegments: 3, curveSegments: 10 });
  body.translate(0, 0, -.85);
  const pa = body.attributes.position;
  for (let i = 0; i < pa.count; i++) { const zf = pa.getX(i), w = pa.getZ(i); const k = THREE.MathUtils.smoothstep(zf, .2, 2.75); pa.setXYZ(i, w * (1 - .62 * k), pa.getY(i), zf); }
  body.computeVertexNormals();
  g.add(new THREE.Mesh(body, M.hull3));
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.9, .06, 3.6), M.dark); belly.position.set(0, -.36, -.2); g.add(belly);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(.42, .1, .34), M.glass); w.position.set(s * .26, .5, 1.12); w.rotation.x = -.42; w.rotation.y = s * .18; g.add(w); }
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(1.9, -.9); ws.lineTo(1.9, -1.45); ws.lineTo(0, -1.9); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .07, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wg, M.hull2); wing.rotation.x = -Math.PI / 2; wing.position.set(s * .85, -.18, -.1); if (s < 0) wing.scale.x = -1; g.add(wing);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, .8), M.hull2); fin.position.set(s * 2.72, .12, -1.72); fin.rotation.z = s * -.35; g.add(fin);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .5, 16), M.dark); eng.rotation.x = Math.PI / 2; eng.position.set(s * .45, .05, -2.5); g.add(eng);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.18, 16), M.engine); glow.position.set(s * .45, .05, -2.76); glow.rotation.y = Math.PI; g.add(glow);
  }
  const navR = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), M.lightR); navR.position.set(-2.72, .5, -1.8); g.add(navR);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), M.lightG); navG.position.set(2.72, .5, -1.8); g.add(navG);
  g.traverse(o => { if (o.isMesh && o.material !== M.engine) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export function createEndurance() {
  const M = createMaterials();
  const root = new THREE.Group();
  const ring = new THREE.Group(); root.add(ring);
  const R = 10, N = 12;
  const lights = [], strobes = [];
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), tmpP = new THREE.Vector3();
  // instanced small parts
  const rcsGeo = new THREE.BoxGeometry(.32, .32, .32), nozGeo = new THREE.ConeGeometry(.07, .18, 8);
  const ribGeo = new THREE.TorusGeometry(.62, .07, 6, 20), railGeo = new THREE.CylinderGeometry(.025, .025, 1, 5), trussGeo = new THREE.CylinderGeometry(.045, .045, 1, 6);
  const rcs = new THREE.InstancedMesh(rcsGeo, M.hull2, 96), noz = new THREE.InstancedMesh(nozGeo, M.dark, 288), ribs = new THREE.InstancedMesh(ribGeo, M.truss, 12 * 6);
  const rails = new THREE.InstancedMesh(railGeo, M.truss, 12 * 4), truss = new THREE.InstancedMesh(trussGeo, M.truss, 4 * 60);
  let iR = 0, iN = 0, iRib = 0, iRail = 0, iT = 0;
  const place = (im, i, pos, quat, scl) => { tmpM.compose(pos, quat, scl || tmpS); im.setMatrixAt(i, tmpM); };
  const habGeo = roundedBox(4.4, 2.9, 3.5, .5), labGeo = roundedBox(3.7, 2.4, 2.9, .45), stoGeo = roundedBox(3.4, 2.1, 2.6, .35);
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const type = i % 3;          // 0 habitat, 1 lab, 2 storage/radiator
    const mod = new THREE.Group();
    const geo = type === 0 ? habGeo : type === 1 ? labGeo : stoGeo;
    // geometry: x = tangent, y = up, z = radial
    const body = new THREE.Mesh(geo, type === 1 ? M.hull3 : i % 2 ? M.hull : M.hull2); body.rotation.y = Math.PI / 2; mod.add(body);
    const W = type === 0 ? 3.5 : type === 1 ? 2.9 : 2.6, H = type === 0 ? 2.9 : type === 1 ? 2.4 : 2.1, D = type === 0 ? 4.4 : type === 1 ? 3.7 : 3.4;
    // end collars where the tunnels meet
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, .3, 24), M.dark); c.rotation.z = Math.PI / 2; c.position.x = s * (W / 2 + .35); mod.add(c); }
    if (type === 0) {
      // window band facing the hub, gold blanket on the roof
      const win = new THREE.Mesh(new THREE.BoxGeometry(W * .7, .16, .04), M.lightW); win.position.set(0, .35, -D / 2 - .32); mod.add(win); lights.push(win);
      const win2 = win.clone(); win2.position.y = -.1; mod.add(win2);
      const foil = new THREE.Mesh(roundedBox(W * .55, .24, D * .62, .1, 2), M.gold); foil.position.y = H / 2 + .25; mod.add(foil);
    } else if (type === 1) {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(.55, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), M.radiator); dish.rotation.x = Math.PI; dish.position.set(W * .2, H / 2 + .55, 0); mod.add(dish);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 6), M.truss); mast.position.set(W * .2, H / 2 + .3, 0); mod.add(mast);
      const box = new THREE.Mesh(new THREE.BoxGeometry(.8, .5, 1), M.gold); box.position.set(-W * .25, H / 2 + .25, .2); mod.add(box);
    } else {
      // radiator fins on the outer face
      for (let k = 0; k < 5; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(W * .8, .05, .7), M.radiator); fin.position.set(0, -H * .35 + k * H * .17, D / 2 + .55); mod.add(fin); }
      const strut = new THREE.Mesh(new THREE.BoxGeometry(.08, H * .8, .6), M.truss); strut.position.set(0, 0, D / 2 + .3); mod.add(strut);
    }
    mod.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
    mod.lookAt(0, 0, 0); mod.rotateY(Math.PI);
    ring.add(mod);
    mod.updateMatrix();
    // RCS clusters on four corners (instanced)
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      if (iR >= 96) break;
      tmpP.set(sx * W * .42, sy * (H / 2 + .1), D * .2).applyMatrix4(mod.matrix);
      tmpQ.copy(mod.quaternion);
      place(rcs, iR++, tmpP, tmpQ);
      for (const [nx, ny, nz] of [[1, 0, 0], [0, sy, 0], [0, 0, 1]]) {
        if (iN >= 288) break;
        const local = new THREE.Vector3(sx * W * .42 + nx * .22 * sx, sy * (H / 2 + .1) + ny * .22, D * .2 + nz * .22).applyMatrix4(mod.matrix);
        const dir = new THREE.Vector3(nx * sx, ny, nz).applyQuaternion(mod.quaternion).normalize();
        place(noz, iN++, local, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir));
      }
    }
    // handrails along the roof
    for (let k = 0; k < 4 && iRail < 48; k++) {
      tmpP.set(-W * .35 + k * W * .23, H / 2 + .12, -D * .3).applyMatrix4(mod.matrix);
      place(rails, iRail++, tmpP, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1).applyQuaternion(mod.quaternion)), new THREE.Vector3(1, D * .5, 1));
    }
    // tunnel to the next module, with ribs
    const a2 = a + Math.PI / N, chord = 2 * R * Math.sin(Math.PI / N), rr = R * Math.cos(Math.PI / N);
    const tlen = chord - (type === 0 ? 3.6 : 3.0) - .3;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.56, .56, Math.max(.4, chord - 2.6), 20, 1, true), M.hull2);
    tube.position.set(Math.cos(a2) * rr, 0, Math.sin(a2) * rr); tube.rotation.set(0, -a2, Math.PI / 2); ring.add(tube);
    const tdir = new THREE.Vector3(-Math.sin(a2), 0, Math.cos(a2));
    for (let k = 0; k < 6 && iRib < 72; k++) {
      const off = (k / 5 - .5) * Math.max(.4, chord - 3.2);
      tmpP.set(Math.cos(a2) * rr, 0, Math.sin(a2) * rr).addScaledVector(tdir, off);
      place(ribs, iRib++, tmpP, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tdir));
    }
    // navigation lights on habitats: red/green alternating, white strobes
    if (type === 0) {
      const nav = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 8), i % 2 ? M.lightR : M.lightG);
      nav.position.set(Math.cos(a) * (R + 2.3), 1.6, Math.sin(a) * (R + 2.3)); ring.add(nav);
      const st = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), M.strobe.clone());
      st.position.set(Math.cos(a) * (R + 2.2), -1.5, Math.sin(a) * (R + 2.2)); ring.add(st); strobes.push(st);
    }
  }
  // truss spokes: three longerons with diagonal braces
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / N;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const r0 = 2.8, r1 = R - 1.4, L = r1 - r0, tri = [[0, .42], [.36, -.21], [-.36, -.21]];
    const P = (rad, t) => new THREE.Vector3().addScaledVector(dir, rad).addScaledVector(side, t[0]).add(new THREE.Vector3(0, t[1], 0));
    const seg = (A, B) => { if (iT >= 240) return; const mid = A.clone().add(B).multiplyScalar(.5), len = A.distanceTo(B); place(truss, iT++, mid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()), new THREE.Vector3(1, len, 1)); };
    tri.forEach(t => seg(P(r0, t), P(r1, t)));
    const bays = 7;
    for (let b = 0; b <= bays; b++) {
      const rad = r0 + L * b / bays;
      for (let j = 0; j < 3; j++) { seg(P(rad, tri[j]), P(rad, tri[(j + 1) % 3])); if (b < bays) seg(P(rad, tri[j]), P(r0 + L * (b + 1) / bays, tri[(j + 1) % 3])); }
    }
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, L, 8), M.gold); pipe.position.copy(dir.clone().multiplyScalar(r0 + L / 2)); pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); ring.add(pipe);
  }
  [rcs, noz, ribs, rails, truss].forEach(im => { im.instanceMatrix.needsUpdate = true; ring.add(im); });
  rcs.count = iR; noz.count = iN; ribs.count = iRib; rails.count = iRail; truss.count = iT;
  // inner rotating collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(2.7, .26, 12, 64), M.hull2); collar.rotation.x = Math.PI / 2; ring.add(collar);
  // hub: drum, cones, docking ports, antenna farm, tank ring
  const hub = new THREE.Group(); root.add(hub);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 3.0, 40), M.hull); hub.add(drum);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, .9, 40), M.gold); hub.add(band);
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.7, 1.0, 40), M.hull2); cone.position.y = s * 2.0; if (s < 0) cone.rotation.x = Math.PI; hub.add(cone);
    const port = new THREE.Mesh(new THREE.CylinderGeometry(.68, .68, .7, 32), M.dark); port.position.y = s * 2.85; hub.add(port);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(.7, .08, 10, 40), M.truss); lip.rotation.x = Math.PI / 2; lip.position.y = s * 3.2; hub.add(lip);
    for (let k = 0; k < 8; k++) { // docking target lights
      const l = new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 6), k % 2 ? M.lightW : M.lightR);
      const aa = k / 8 * Math.PI * 2; l.position.set(Math.cos(aa) * .82, s * 3.22, Math.sin(aa) * .82); hub.add(l);
    }
  }
  for (let k = 0; k < 6; k++) { // tank ring
    const aa = k / 6 * Math.PI * 2;
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(.32, .9, 6, 12), k % 2 ? M.radiator : M.gold);
    tank.position.set(Math.cos(aa) * 2.15, -.9, Math.sin(aa) * 2.15); hub.add(tank);
  }
  for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 3.2, 6), M.truss); const aa = k * Math.PI / 2 + .4; m.position.set(Math.cos(aa) * 1.1, -4.2, Math.sin(aa) * 1.1); hub.add(m); }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3), M.radiator); dish.position.set(0, -5.6, 0); hub.add(dish);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 8), M.strobe.clone()); beacon.position.set(0, 3.4, 0); hub.add(beacon); strobes.push(beacon);
  // a Ranger docked on top, a lander below
  const ranger = createRanger(M); ranger.rotation.x = -Math.PI / 2; ranger.position.y = 5.7; ranger.scale.setScalar(.9); hub.add(ranger);
  const lander = new THREE.Group();
  lander.add(new THREE.Mesh(roundedBox(2.4, 2.0, 2.4, .3), M.hull2));
  const lt = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.2, .8, 8), M.gold); lt.position.y = -1.4; lander.add(lt);
  for (let k = 0; k < 4; k++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.14, 1.4, .14), M.dark); leg.position.set((k & 1 ? 1 : -1) * 1.2, -1.6, (k & 2 ? 1 : -1) * 1.2); leg.rotation.z = (k & 1 ? -1 : 1) * .3; lander.add(leg); }
  lander.position.y = -8.2; lander.rotation.x = Math.PI; hub.add(lander);

  root.traverse(o => { if (o.isMesh || o.isInstancedMesh) { const m = o.material; if (m && !m.isMeshBasicMaterial) { o.castShadow = true; o.receiveShadow = true; } } });
  root.userData = { ring, hub, ranger, lights, strobes, M, spin: .22 };
  return root;
}

// time-based effects (blinking strobes); pure function of t so frame rendering stays deterministic
export function animateEndurance(ship, t) {
  const st = ship.userData.strobes || [];
  st.forEach((s, i) => { const ph = (t * .9 + i * .13) % 1; const on = ph < .06 || (ph > .14 && ph < .18); s.material.color.setScalar(on ? 12 : .05); });
}

// a shadow-casting key light that follows a (possibly scaled) ship
export function rigShadow(light, ship, radius = 14) {
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -.0004; light.shadow.normalBias = .02;
  light.userData.follow = { ship, radius };
}
export function updateShadow(light) {
  const f = light.userData.follow; if (!f) return;
  const s = f.ship.getWorldScale(new THREE.Vector3()).x, r = f.radius * s;
  const p = f.ship.getWorldPosition(new THREE.Vector3());
  const dir = light.position.clone().sub(light.target.position).normalize();
  light.target.position.copy(p); light.position.copy(p).addScaledVector(dir, r * 3);
  const c = light.shadow.camera; c.left = c.bottom = -r; c.right = c.top = r; c.near = r * .5; c.far = r * 6; c.updateProjectionMatrix();
  light.target.updateMatrixWorld();
}
