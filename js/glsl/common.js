// Shared GLSL: noise, procedural deep sky, Schwarzschild geodesic tracer.
// Units inside the tracer: Schwarzschild radius r_s = 1.

export const NOISE = /* glsl */`
float hash11(float p){ p = fract(p*.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3 = fract(p3*.1031); p3 += dot(p3, p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
float vnoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x), mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x), mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm(vec3 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }
float fbm3o(vec3 p){ float s=0., a=.5; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.07+vec3(1.7,9.2,3.1); a*=.5; } return s; }
vec3 blackbody(float t){
  t = clamp(t, 1000., 40000.) / 100.;
  float r = t <= 66. ? 1. : clamp(1.29293618606*pow(t-60., -.1332047592), 0., 1.);
  float g = t <= 66. ? clamp(.39008157876*log(t)-.63184144378, 0., 1.) : clamp(1.12989086089*pow(t-60., -.0755148492), 0., 1.);
  float b = t >= 66. ? 1. : (t <= 19. ? 0. : clamp(.54320678911*log(t-10.)-1.19625408914, 0., 1.));
  return pow(vec3(r,g,b), vec3(2.2));
}
`;

// Ray reconstruction for a fullscreen quad drawn at the far plane.
export const QUAD_VERT = /* glsl */`
varying vec2 vNdc;
void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 1., 1.); }
`;
export const RAY = /* glsl */`
uniform mat4 uInvProj; uniform mat4 uCamWorld; uniform vec3 uCamPos; uniform float uPixAng; uniform float uTime;
varying vec2 vNdc;
vec3 viewRay(){ vec4 v = uInvProj * vec4(vNdc, 1., 1.); v.xyz /= v.w; return normalize((uCamWorld * vec4(v.xyz, 0.)).xyz); }
`;

// Procedural deep sky — stars (anti-aliased, flux-preserving), Milky Way with dust lanes, faint nebulae.
export const SKY = /* glsl */`
uniform float uStarGain;
vec3 starLayer(vec3 d, float sc, float dens, float sz){
  vec3 q = d*sc; vec3 id = floor(q); vec3 f = fract(q);
  vec3 col = vec3(0.);
  vec3 h = hash33(id);
  if (h.x < dens){
    vec3 c = .2 + .6*hash33(id+17.3);
    vec3 diff = f - c;
    diff -= d*dot(diff, d);                      // distance in the tangent plane
    float r2 = dot(diff, diff);
    float pix = uPixAng*sc*.75;
    float sig = max(sz, pix);
    float flux = (sz*sz)/(sig*sig);
    float temp = mix(3600., 13000., pow(h.y, .8));
    float mag = pow(h.z, 14.) * 40. + .05;
    vec3 bc = blackbody(temp); bc = mix(vec3(dot(bc, vec3(.33))), bc, .55);
    col = bc * flux * mag * exp(-r2/(2.*sig*sig));
  }
  return col;
}
vec3 galaxyBand(vec3 d){
  vec3 gn = normalize(vec3(.28, .92, -.27));      // galactic north
  vec3 gc = normalize(vec3(.85, -.15, .5));       // galactic centre direction
  gc = normalize(gc - gn*dot(gc,gn));
  float b = dot(d, gn);
  float l = dot(d, gc);
  float band = exp(-b*b*28.) ;
  float bulge = exp(-(b*b*14.) - pow(max(0., 1.-l), 2.)*3.5);
  float n = fbm(d*5.3);
  float lanes = smoothstep(.35, .75, fbm(d*9.1 + 3.)) * exp(-b*b*90.);
  float cloud = band * (0.35 + 0.9*n) + bulge*1.4;
  cloud *= 1. - .82*lanes;
  vec3 warm = vec3(1., .78, .55), cool = vec3(.62, .72, 1.);
  vec3 col = mix(cool, warm, clamp(bulge*1.4 + .2*l, 0., 1.)) * cloud * .085;
  // faint nebulae
  float neb = smoothstep(.58, .9, fbm(d*2.2 + 11.));
  col += (vec3(.55,.18,.22)*fbm(d*7.) + vec3(.12,.25,.5)*fbm(d*5.+4.)) * neb * band * .12;
  return col;
}
vec3 deepSky(vec3 d){
  vec3 c = galaxyBand(d);
  float g = 1. + 2.5*exp(-pow(dot(d, normalize(vec3(.28,.92,-.27))),2.)*30.);
  c += starLayer(d, 70., .22*g/3.5, .04);
  c += starLayer(d, 170., .35*g/3.5, .03) * .6;
  c += starLayer(d, 420., .5, .025) * .35;
  c += starLayer(d, 900., .6*g/3.5, .02) * .22;
  return c * uStarGain;
}
`;

// Schwarzschild null-geodesic tracer with a thin, turbulent, Keplerian accretion disk.
// Integrates  x'' = -1.5 h^2 x / r^5  (Binet form, r_s = 1).
export const BLACKHOLE = /* glsl */`
uniform float uDoppler;      // 0 = cinematic (symmetric), 1 = physical beaming + redshift
uniform float uDiskGain;
uniform float uDiskTime;
uniform float uDiskTilt;
uniform float uDiskOuter;
uniform float uDiskTemp;
const float RIN = 3.0;

float diskDensity(float r, float ang, float t){
  float om = sqrt(.5/(r*r*r));
  // two shear phases cross-faded so streaks never wind up infinitely
  float T = 40.;
  float ph = fract(t/T);
  float a1 = ang + om*(ph*T)*6.0;
  float a2 = ang + om*(fract(ph+.5)*T)*6.0;
  float w = abs(ph*2.-1.);
  float lr = log(r);
  vec3 q1 = vec3(cos(a1)*3.0, sin(a1)*3.0, lr*16.);
  vec3 q2 = vec3(cos(a2)*3.0, sin(a2)*3.0, lr*16.+7.3);
  float n1 = fbm(q1 + vec3(0.,0.,0.)), n2 = fbm(q2);
  float n = mix(n1, n2, w);
  float rings = .6 + .4*sin(lr*120. + n*11.);
  float fine = mix(vnoise(vec3(cos(a1)*10., sin(a1)*10., lr*70.)), vnoise(vec3(cos(a2)*10., sin(a2)*10., lr*70.+3.)), w);
  float clump = smoothstep(.25, .85, n);
  float d = (.3 + 1.45*clump) * (.8 + .2*rings) * (.8 + .4*fine);
  // radial envelope
  float inner = smoothstep(RIN, RIN*1.3, r);
  float outer = 1. - smoothstep(uDiskOuter*.45, uDiskOuter, r);
  return clamp(d, 0., 2.) * inner * outer;
}

vec4 diskShade(vec3 c, vec3 v){
  float r = length(c.xz);
  float ang = atan(c.z, c.x);
  float dens = diskDensity(r, ang, uDiskTime);
  if (dens < .002) return vec4(0.);
  // Novikov–Thorne-ish temperature profile
  float x = max(0., 1. - sqrt(RIN/r));
  float T = uDiskTemp * pow(RIN/r, .75) * pow(x + .015, .25) * 1.9;
  // Doppler & gravitational shift
  float beta = clamp(sqrt(.5/max(r-1., .5)), 0., .62);
  vec3 vel = normalize(vec3(-c.z, 0., c.x));
  float cth = dot(vel, -normalize(v));
  float gam = 1./sqrt(1.-beta*beta);
  float D = 1./(gam*(1. - beta*cth));
  float g = D * sqrt(max(1. - 1./r, .05));
  float gs = mix(1., g, uDoppler);
  float Tobs = T * mix(1., gs, .85);
  vec3 col = blackbody(Tobs);
  col /= max(max(col.r, col.g), col.b);
  float I = pow(T/uDiskTemp, 2.2) * pow(gs, mix(0., 3.5, uDoppler));
  // cinematic grade: keep it warm, white-hot near ISCO
  col = mix(col, vec3(1.,.82,.58), .35*(1.-uDoppler));
  float a = clamp(dens*.75, 0., .97);
  return vec4(col * I * dens * uDiskGain * 2.1, a);
}

// ro, rd in black-hole space (r_s units, disk in y=0 plane)
// returns rgb, plus outDir for sky lookup and a = 1 if captured by horizon
vec3 traceBH(vec3 ro, vec3 rd, out vec3 outDir, out float captured, out float minR, const int STEPS){
  captured = 0.; minR = 1e5;
  vec3 p = ro, v = rd;
  vec3 acc = vec3(0.); float alpha = 0.;
  float R0 = max(uDiskOuter*1.6, 28.);
  // fast-forward along the straight line to the interaction sphere
  float b0 = dot(p, v);
  float c0 = dot(p, p) - R0*R0;
  if (c0 > 0.){
    float disc = b0*b0 - c0;
    if (disc < 0. || b0 > 0.){
      // never enters: weak-field deflection only (2 r_s / b)
      float bimp = length(cross(p, v));
      vec3 toC = normalize(-p - v*dot(-p, v));
      outDir = normalize(v + toC*tan(min(2./max(bimp, 1.), 1.2)));
      minR = bimp;
      return vec3(0.);
    }
    p += v * (-b0 - sqrt(disc));
    // bending accumulated on the way in (weak field)
    float bi = length(cross(p, v));
    float cpsi = clamp(-dot(p, v)/length(p), 0., 1.);
    vec3 toC = normalize(-p - v*dot(-p, v));
    v = normalize(v + toC*(1. - cpsi)/max(bi, 1.));
  }
  vec3 h = cross(p, v); float h2 = dot(h, h);
  for (int i = 0; i < STEPS; i++){
    float r2 = dot(p, p); float r = sqrt(r2);
    minR = min(minR, r);
    if (r < 1.0){ captured = 1.; break; }
    if (r > R0*1.05 && dot(p, v) > 0.) break;
    float dt = clamp((r - 1.)*0.065, 0.01, 0.9);
    // shrink near the disk plane so thin structures are not skipped
    vec3 a = -1.5*h2*p/(r2*r2*r);
    vec3 pn = p + v*dt + .5*a*dt*dt;
    float rn2 = dot(pn, pn); float rn = sqrt(rn2);
    vec3 an = -1.5*h2*pn/(rn2*rn2*rn);
    vec3 vn = v + .5*(a + an)*dt;
    if (p.y*pn.y < 0.){
      float tc = p.y/(p.y - pn.y);
      vec3 c = mix(p, pn, tc);
      float rc = length(c.xz);
      if (rc > RIN && rc < uDiskOuter){
        vec4 ds = diskShade(c, mix(v, vn, tc));
        acc += (1. - alpha) * ds.rgb;
        alpha += (1. - alpha) * ds.a;
        if (alpha > .985) break;
      }
    }
    p = pn; v = vn;
  }
  v = normalize(v);
  if (captured < .5){
    // remaining bending on the way out
    float bo = length(cross(p, v));
    float cpsi = clamp(dot(p, v)/length(p), 0., 1.);
    vec3 toC = -p - v*dot(-p, v);
    if (dot(toC,toC) > 1e-8) v = normalize(v + normalize(toC)*(1. - cpsi)/max(bo, 1.));
  }
  outDir = v;
  if (captured > .5) alpha = 1.;
  captured = max(captured, alpha);
  return acc;
}
`;

export const BH_FRAG = /* glsl */`
${NOISE}
${RAY}
${SKY}
${BLACKHOLE}
uniform vec3 uBHPos; uniform float uBHScale; uniform mat3 uBHRot;
void main(){
  vec3 rd = viewRay();
  vec3 ro = uBHRot * ((uCamPos - uBHPos) / uBHScale);
  vec3 d = uBHRot * rd;
  vec3 od; float cap; float mr;
  vec3 col = traceBH(ro, d, od, cap, mr, 360);
  vec3 sky = deepSky(transpose(uBHRot) * od);
  col += sky * (1. - cap);
  // faint glow of scattered disk light hugging the photon sphere
  col += vec3(1., .7, .45) * .012 * uDiskGain * exp(-max(mr - 1.6, 0.)*1.1) * (1. - cap);
  gl_FragColor = vec4(col, 1.);
}
`;
