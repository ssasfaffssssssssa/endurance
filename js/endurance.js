// Procedural Endurance: twelve-module rotating ring, hub, spokes, a docked Ranger.
import * as THREE from 'three';

function panelTexture(seed = 1, base = 214, gold = false) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  if (gold) {
    const grd = g.createLinearGradient(0, 0, S, S);
    grd.addColorStop(0, '#c99a3c'); grd.addColorStop(.5, '#e8c46a'); grd.addColorStop(1, '#a87a2a');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) { // crinkled MLI foil
      g.strokeStyle = `rgba(${rnd() > .5 ? '255,236,170' : '90,60,20'},${.08 + rnd() * .18})`;
      g.lineWidth = 1 + rnd() * 3; g.beginPath();
      const x = rnd() * S, y = rnd() * S; g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 60, y + (rnd() - .5) * 60); g.stroke();
    }
  } else {
    g.fillStyle = `rgb(${base},${base},${base + 2})`; g.fillRect(0, 0, S, S);
    // panels
    const cols = 4 + Math.floor(rnd() * 3), rows = 3 + Math.floor(rnd() * 3);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = base - 18 + rnd() * 30;
      g.fillStyle = `rgb(${v},${v},${v + 3})`;
      g.fillRect(x * S / cols + 3, y * S / rows + 3, S / cols - 6, S / rows - 6);
      if (rnd() > .7) { g.fillStyle = 'rgba(30,32,36,.65)'; g.fillRect(x * S / cols + 14, y * S / rows + 14, S / cols * .3, S / rows * .2); }
    }
    g.strokeStyle = 'rgba(40,42,48,.55)'; g.lineWidth = 2;
    for (let x = 0; x <= cols; x++) { g.beginPath(); g.moveTo(x * S / cols, 0); g.lineTo(x * S / cols, S); g.stroke(); }
    for (let y = 0; y <= rows; y++) { g.beginPath(); g.moveTo(0, y * S / rows); g.lineTo(S, y * S / rows); g.stroke(); }
    // rivets & grime
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .07})`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 10, 1 + rnd() * 3); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(20,20,24,.8)'; g.fillRect(rnd() * S, rnd() * S, 6 + rnd() * 30, 3 + rnd() * 6); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function createMaterials() {
  return {
    hull: new THREE.MeshStandardMaterial({ map: panelTexture(3, 205), roughness: .55, metalness: .35 }),
    hull2: new THREE.MeshStandardMaterial({ map: panelTexture(7, 178), roughness: .6, metalness: .4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: .45, metalness: .7 }),
    gold: new THREE.MeshStandardMaterial({ map: panelTexture(11, 0, true), roughness: .32, metalness: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: .08, metalness: .9 }),
    lightW: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 3) }),
    lightR: new THREE.MeshBasicMaterial({ color: new THREE.Color(8, .4, .3) }),
    lightG: new THREE.MeshBasicMaterial({ color: new THREE.Color(.3, 7, .8) }),
    engine: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.6, 6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
}

export function createRanger(M) {
  const g = new THREE.Group();
  // side profile of a lifting body (z forward, y up), extruded across x, then tapered toward the nose
  const prof = new THREE.Shape();
  prof.moveTo(-2.3, -.32); prof.lineTo(1.6, -.3); prof.quadraticCurveTo(2.5, -.25, 2.75, -.05);
  prof.quadraticCurveTo(2.2, .18, 1.25, .42); prof.lineTo(.35, .62); prof.lineTo(-1.4, .55); prof.lineTo(-2.3, .32); prof.closePath();
  const body = new THREE.ExtrudeGeometry(prof, { depth: 1.7, bevelEnabled: true, bevelThickness: .22, bevelSize: .14, bevelSegments: 3, curveSegments: 10 });
  body.translate(0, 0, -.85);
  const pa = body.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const zf = pa.getX(i);              // shape x = forward
    const w = pa.getZ(i);               // extrude axis = width
    const k = THREE.MathUtils.smoothstep(zf, .2, 2.75);
    pa.setXYZ(i, w * (1 - .62 * k), pa.getY(i), zf);
  }
  body.computeVertexNormals();
  g.add(new THREE.Mesh(body, M.hull));
  // black heat-shield belly
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.9, .06, 3.6), M.dark); belly.position.set(0, -.36, -.2); g.add(belly);
  // cockpit glazing, flush with the hump
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(.42, .1, .34), M.glass);
    w.position.set(s * .26, .5, 1.12); w.rotation.x = -.42; w.rotation.y = s * .18; g.add(w);
  }
  // swept wings
  const ws = new THREE.Shape(); ws.moveTo(0, 0); ws.lineTo(1.9, -.9); ws.lineTo(1.9, -1.45); ws.lineTo(0, -1.9); ws.closePath();
  const wg = new THREE.ExtrudeGeometry(ws, { depth: .07, bevelEnabled: false });
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wg, M.hull2);
    wing.rotation.x = -Math.PI / 2; wing.position.set(s * .85, -.18, -.1);
    if (s < 0) { wing.scale.x = -1; }
    g.add(wing);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, .8), M.hull2);
    fin.position.set(s * 2.72, .12, -1.72); fin.rotation.z = s * -.35; g.add(fin);
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .5, 16), M.dark); eng.rotation.x = Math.PI / 2; eng.position.set(s * .45, .05, -2.5); g.add(eng);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.18, 16), M.engine); glow.position.set(s * .45, .05, -2.76); glow.rotation.y = Math.PI; g.add(glow);
  }
  const navR = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), M.lightR); navR.position.set(-2.72, .5, -1.8); g.add(navR);
  const navG = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), M.lightG); navG.position.set(2.72, .5, -1.8); g.add(navG);
  g.userData.engines = g.children.filter(c => c.material === M.engine);
  return g;
}

export function createEndurance() {
  const M = createMaterials();
  const root = new THREE.Group();
  const ring = new THREE.Group(); root.add(ring);
  const R = 10;
  const N = 12;
  const lights = [];
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    const mod = new THREE.Group();
    const big = i % 3 === 0;
    const w = big ? 4.3 : 3.6, h = big ? 2.8 : 2.2, d = big ? 3.4 : 2.7;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 1, 1, 1), i % 2 ? M.hull : M.hull2);
    mod.add(box);
    // chamfer caps
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w * .82, h * 1.12, d * .82), M.hull2); mod.add(cap);
    // outer face details
    const rad = new THREE.Mesh(new THREE.BoxGeometry(w * .7, h * .5, .12), M.dark); rad.position.set(0, 0, d / 2 + .06); mod.add(rad);
    if (big) {
      const foil = new THREE.Mesh(new THREE.BoxGeometry(w * .5, .25, d * .6), M.gold); foil.position.set(0, h * .62, 0); mod.add(foil);
      const win = new THREE.Mesh(new THREE.BoxGeometry(w * .6, .18, .05), M.lightW); win.position.set(0, .35, -d / 2 - .03); mod.add(win);
      lights.push(win);
    } else {
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(.5, .1, .25, 20), M.hull); dish.position.set(w * .25, h * .6, 0); mod.add(dish);
    }
    // thrusters on alternate modules
    if (i % 4 === 1) for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(.22, .5, 12), M.dark); t.position.set(s * w * .35, -h * .62, 0); t.rotation.x = Math.PI; mod.add(t); }
    mod.position.set(Math.cos(a) * R, 0, Math.sin(a) * R);
    mod.lookAt(0, 0, 0); mod.rotateY(Math.PI);
    ring.add(mod);
    // connecting tunnel to next module
    const a2 = a + Math.PI / N;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 2 * R * Math.sin(Math.PI / N) - 2.6, 18), M.hull2);
    tube.position.set(Math.cos(a2) * R * Math.cos(Math.PI / N), 0, Math.sin(a2) * R * Math.cos(Math.PI / N));
    tube.rotation.set(0, -a2, Math.PI / 2); ring.add(tube);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(.62, .1, 8, 24), M.dark);
    collar.position.copy(tube.position); collar.rotation.y = -a2; ring.add(collar);
  }
  // spokes
  for (let k = 0; k < 4; k++) {
    const a = k / 4 * Math.PI * 2 + Math.PI / N;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, R - 3, 10), M.hull);
    sp.position.set(Math.cos(a) * (R / 2 + .6), 0, Math.sin(a) * (R / 2 + .6)); sp.rotation.set(0, -a, Math.PI / 2); ring.add(sp);
    for (let j = 1; j < 4; j++) {
      const brace = new THREE.Mesh(new THREE.TorusGeometry(.36, .06, 6, 12), M.dark);
      brace.position.set(Math.cos(a) * (2.4 + j * 1.6), 0, Math.sin(a) * (2.4 + j * 1.6)); brace.rotation.y = -a + Math.PI / 2; ring.add(brace);
    }
  }
  // hub
  const hub = new THREE.Group(); root.add(hub);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 3.2, 32), M.hull); hub.add(core);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, .9, 32), M.gold); hub.add(band);
  const topc = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.6, 1.0, 32), M.hull2); topc.position.y = 2.1; hub.add(topc);
  const botc = topc.clone(); botc.rotation.x = Math.PI; botc.position.y = -2.1; hub.add(botc);
  const portT = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .7, 24), M.dark); portT.position.y = 2.9; hub.add(portT);
  const portB = portT.clone(); portB.position.y = -2.9; hub.add(portB);
  const ringRot = new THREE.Mesh(new THREE.TorusGeometry(2.6, .22, 10, 48), M.hull2); ringRot.rotation.x = Math.PI / 2; ring.add(ringRot);
  for (let k = 0; k < 4; k++) { // antenna masts
    const m = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 3.4, 6), M.dark);
    const a = k * Math.PI / 2; m.position.set(Math.cos(a) * 1.2, -3.5, Math.sin(a) * 1.2); hub.add(m);
  }
  const beaconT = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 8), M.lightR); beaconT.position.set(0, 3.3, 0); hub.add(beaconT);
  // docked Ranger on top
  const ranger = createRanger(M);
  ranger.rotation.x = -Math.PI / 2; ranger.position.y = 5.6; ranger.scale.setScalar(.9);
  hub.add(ranger);
  // second craft (lander) underneath
  const lander = new THREE.Group();
  const lb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.4), M.hull2); lander.add(lb);
  const lt = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.2, .8, 6), M.gold); lt.position.y = -1.5; lander.add(lt);
  for (let k = 0; k < 4; k++) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.15, 1.4, .15), M.dark); leg.position.set((k & 1 ? 1 : -1) * 1.2, -1.6, (k & 2 ? 1 : -1) * 1.2); leg.rotation.z = (k & 1 ? -1 : 1) * .3; lander.add(leg); }
  lander.position.y = -4.7; hub.add(lander);

  root.userData = { ring, hub, ranger, lights, M, beaconT, spin: .22 };
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return root;
}
