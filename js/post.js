// Post chain: HDR scene → bloom → filmic finish (ACES, anamorphic streak, aberration, grain, vignette, fades, warp).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const FinishShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uExposure: { value: 1 }, uFade: { value: 0 }, uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uWarp: { value: 0 }, uAberr: { value: 1 }, uGrain: { value: 1 }, uStreak: { value: 1 }, uVignette: { value: 1 },
    uSat: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uShake: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uExposure, uFade, uWarp, uAberr, uGrain, uStreak, uVignette, uSat, uShake;
    uniform vec3 uFadeColor, uTint; uniform vec2 uRes; varying vec2 vUv;
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
    vec3 aces(vec3 x){ const float a=2.51,b=.03,c=2.43,d=.59,e=.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.); }
    vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-.055, step(.0031308, c)); }
    void main(){
      vec2 uv = vUv;
      uv += uShake * (vec2(h12(vec2(floor(uTime*40.), 1.)), h12(vec2(floor(uTime*40.), 7.))) - .5) * .012;
      vec2 c = uv - .5;
      // warp: radial zoom blur used for the wormhole / horizon crossings
      vec3 col = vec3(0.);
      if (uWarp > .001){
        float tot = 0.;
        for (int i = 0; i < 16; i++){
          float k = float(i)/15.;
          vec2 q = .5 + c*(1. - uWarp*.35*k);
          float w = 1. - k*.6;
          col += texture2D(tDiffuse, q).rgb * w; tot += w;
        }
        col /= tot;
        col += vec3(.7,.85,1.) * uWarp*uWarp * .6 * (1. - length(c));
      } else {
        float ab = uAberr * .0016 * dot(c, c) * 4.;
        col.r = texture2D(tDiffuse, uv + c*ab).r;
        col.g = texture2D(tDiffuse, uv).g;
        col.b = texture2D(tDiffuse, uv - c*ab).b;
      }
      // anamorphic streak: wide horizontal smear of the brightest parts
      if (uStreak > .001){
        vec3 s = vec3(0.);
        float jit = h12(uv*uRes + uTime);
        for (int i = 1; i <= 12; i++){
          float o = pow((float(i) - jit)/12., 1.6) * .22;
          vec3 a = texture2D(tDiffuse, uv + vec2(o, 0.)).rgb, b = texture2D(tDiffuse, uv - vec2(o, 0.)).rgb;
          s += (max(a - 1.6, 0.) + max(b - 1.6, 0.)) * (1. - float(i)/13.);
        }
        col += s * vec3(.35, .55, 1.) * .038 * uStreak;
      }
      col *= uExposure * uTint;
      col = aces(col);
      float l = dot(col, vec3(.2126,.7152,.0722));
      col = mix(vec3(l), col, uSat);
      // vignette
      float v = smoothstep(1.15, .25, length(c*vec2(uRes.x/uRes.y, 1.)*.82));
      col *= mix(1., v, .55*uVignette);
      col = toSRGB(col);
      // grain (in display space so it reads as film)
      float g = h12(uv*uRes + fract(uTime*13.7)*517.) - .5;
      col += g * .045 * uGrain * (1. - l*.6);
      col = mix(col, uFadeColor, clamp(uFade, 0., 1.));
      gl_FragColor = vec4(col, 1.);
    }`,
};

export function createPost(renderer) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .8, .5, .85);
  composer.addPass(bloom);
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);
  return {
    composer, renderPass, bloom, finish, u: finish.uniforms,
    setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); finish.uniforms.uRes.value.set(w * pr, h * pr); },
    render(scene, camera) { renderPass.scene = scene; renderPass.camera = camera; composer.render(); },
  };
}
