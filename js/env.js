// Image-based lighting per world: a tiny procedural sky, prefiltered with PMREM, so metal and the
// shadowed side of Endurance pick up the light that is really around them (disk, Saturn, overcast sky).
import * as THREE from 'three';

const VERT = `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const FRAG = `
uniform vec3 uZen, uHor, uNadir; uniform vec3 uBandC; uniform float uBandW;
uniform vec3 uSunD, uSunC; uniform float uSunK;
uniform vec3 uBodyD, uBodyC; uniform float uBodyR;
varying vec3 vD;
void main(){
  vec3 d = normalize(vD);
  vec3 c = d.y > 0. ? mix(uHor, uZen, pow(d.y, .6)) : mix(uHor, uNadir, pow(-d.y, .6));
  c += uBandC * exp(-d.y*d.y/(uBandW*uBandW));                    // accretion-disk light all round the horizon
  c += uSunC * pow(max(dot(d, uSunD), 0.), uSunK);                 // a sun
  c += uBodyC * smoothstep(uBodyR, uBodyR + .04, dot(d, uBodyD));  // a planet filling part of the sky
  gl_FragColor = vec4(c, 1.);
}`;

function envFrom(renderer, o) {
  const u = {
    uZen: { value: new THREE.Color(...(o.zen || [0, 0, 0])) }, uHor: { value: new THREE.Color(...(o.hor || [0, 0, 0])) }, uNadir: { value: new THREE.Color(...(o.nadir || [0, 0, 0])) },
    uBandC: { value: new THREE.Color(...(o.band || [0, 0, 0])) }, uBandW: { value: o.bandW || .1 },
    uSunD: { value: (o.sunD || new THREE.Vector3(0, 1, 0)).clone().normalize() }, uSunC: { value: new THREE.Color(...(o.sun || [0, 0, 0])) }, uSunK: { value: o.sunK || 200 },
    uBodyD: { value: (o.bodyD || new THREE.Vector3(1, 0, 0)).clone().normalize() }, uBodyC: { value: new THREE.Color(...(o.body || [0, 0, 0])) }, uBodyR: { value: o.bodyR ?? 2 },
  };
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, side: THREE.BackSide })));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, .02);
  pm.dispose();
  return rt.texture;
}

export function applyEnvironments(renderer, W) {
  // Gargantua: the disk is a warm ring of light around the ship's horizon
  W.garg.scene.environment = envFrom(renderer, { hor: [.03, .025, .02], zen: [.01, .012, .02], nadir: [.02, .015, .01], band: [1.6, 1.05, .6], bandW: .16 });
  // Saturn: a small hard sun and the planet's beige glow
  W.saturn.scene.environment = envFrom(renderer, { hor: [.015, .015, .02], zen: [.01, .01, .015], nadir: [.01, .01, .012], sun: [9, 8.4, 7.6], sunK: 400, sunD: new THREE.Vector3(.95, .3, .12),
    body: [.32, .26, .17], bodyD: new THREE.Vector3(.62, -.12, -.77), bodyR: .82 });
  // Earth orbit: sunlight plus blue-ochre earthshine from below
  W.earth.scene.environment = envFrom(renderer, { hor: [.06, .07, .09], zen: [.01, .01, .02], nadir: [.22, .2, .16], sun: [9, 8.6, 8], sunK: 400, sunD: new THREE.Vector3(-.82, .12, -.56) });
  // Miller: bright overcast dome over a dark sea
  W.miller.scene.environment = envFrom(renderer, { zen: [.75, .82, .9], hor: [1.0, 1.05, 1.08], nadir: [.12, .16, .17] });
}
