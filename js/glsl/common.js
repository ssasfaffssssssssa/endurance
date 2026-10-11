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
uniform float uSpin;         // a/M, 0 = Schwarzschild, ->1 = extremal Kerr
uniform float uRin;          // prograde ISCO in r_s units (computed on the CPU)
#define RIN uRin
const float BHM = .5;        // M in r_s units (r_s = 2M = 1)

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
  float n = mix(fbm(q1), fbm(q2), w);
  float rings = .6 + .4*sin(lr*120. + n*11.);
  float fine = mix(vnoise(vec3(cos(a1)*10., sin(a1)*10., lr*70.)), vnoise(vec3(cos(a2)*10., sin(a2)*10., lr*70.+3.)), w);
  float clump = smoothstep(.25, .85, n);
  float d = (.3 + 1.45*clump) * (.8 + .2*rings) * (.8 + .4*fine);
  float inner = smoothstep(RIN, RIN*1.3 + .2, r);
  float outer = 1. - smoothstep(uDiskOuter*.45, uDiskOuter, r);
  return clamp(d, 0., 2.) * inner * outer;
}

// lam = photon's angular momentum about the spin axis (per unit energy), as seen by the real, incoming photon
vec4 diskShade(vec3 c, vec3 v, float r, float lam){
  float ang = atan(c.z, c.x);
  float dens = diskDensity(r, ang, uDiskTime);
  if (dens < .002) return vec4(0.);
  float x = max(0., 1. - sqrt(RIN/r));
  float T = uDiskTemp * pow(RIN/r, .75) * pow(x + .015, .25) * 1.9;
  // exact redshift of a prograde circular equatorial orbit in Kerr, seen from infinity
  float a = uSpin*BHM, sM = sqrt(BHM), r15 = r*sqrt(r);
  float Om = sM/(r15 + a*sM);
  float ut = (r15 + a*sM) / (pow(r, .75) * sqrt(max(r15 - 3.*BHM*sqrt(r) + 2.*a*sM, 1e-3)));
  float g = 1./(ut*max(1. - Om*lam, .05));
  float gs = mix(1., clamp(g, .1, 3.), uDoppler);
  float Tobs = T * mix(1., gs, .85);
  vec3 col = blackbody(Tobs);
  col /= max(max(col.r, col.g), col.b);
  float I = pow(T/uDiskTemp, 2.2) * pow(gs, mix(0., 3.5, uDoppler));
  col = mix(col, vec3(1.,.82,.58), .35*(1.-uDoppler));
  // optically thin slab: grazing rays cross more glowing gas
  float graze = clamp(1./max(abs(normalize(v).y), .08), 1., 9.);
  float a0 = clamp(dens*.75, 0., .97);
  return vec4(col * I * dens * uDiskGain * 2.1 * (.9 + .045*graze), clamp(a0 * (.9 + .03*graze), 0., .97));
}

// ——— Kerr in Kerr–Schild coordinates (spin axis = +y) ———
// g^{uv} = eta^{uv} - f l^u l^v ;  H = 1/2 (|p|^2 - 1 - f L^2),  L = 1 + l.p   (p_t = -1)
float ksR(vec3 x, float a){ float b = dot(x, x) - a*a; return sqrt(.5*(b + sqrt(b*b + 4.*a*a*x.y*x.y))); }
void ksFL(vec3 x, float a, out float f, out vec3 l, out float r){
  r = max(ksR(x, a), 1e-4);
  float r2 = r*r;
  f = 2.*BHM*r2*r/(r2*r2 + a*a*x.y*x.y);
  float d = 1./(r2 + a*a);
  l = vec3((r*x.x + a*x.z)*d, x.y/r, (r*x.z - a*x.x)*d);
}
float ksF(vec3 x, vec3 p, float a){ float f, r; vec3 l; ksFL(x, a, f, l, r); float L = 1. + dot(l, p); return f*L*L; }
void ksDerivFD(vec3 x, vec3 p, float a, out vec3 dx, out vec3 dp, out float r){
  float f; vec3 l; ksFL(x, a, f, l, r);
  float L = 1. + dot(l, p);
  dx = p - f*L*l;
  float e = 1e-3*max(r, .4);
  dp = vec3(ksF(x + vec3(e,0,0), p, a) - ksF(x - vec3(e,0,0), p, a),
            ksF(x + vec3(0,e,0), p, a) - ksF(x - vec3(0,e,0), p, a),
            ksF(x + vec3(0,0,e), p, a) - ksF(x - vec3(0,0,e), p, a)) * (.25/e);
}
// analytic gradient of F = f L^2 (one metric evaluation per call instead of seven)
void ksDeriv(vec3 x, vec3 p, float a, out vec3 dx, out vec3 dp, out float r){
  float a2 = a*a, y = x.y;
  float R2 = dot(x, x), b = R2 - a2;
  r = max(sqrt(.5*(b + sqrt(b*b + 4.*a2*y*y))), 1e-4);
  float r2 = r*r, r3 = r2*r;
  // dr/dx_i = (x_i r^2 + a^2 y delta_iy) / (2 r^3 - (R^2 - a^2) r)
  float den = 2.*r3 - b*r;
  vec3 dr = (x*r2 + vec3(0., a2*y, 0.)) / den;
  float S = r2*r2 + a2*y*y;
  float f = 2.*BHM*r3/S;
  vec3 dS = 4.*r3*dr + vec3(0., 2.*a2*y, 0.);
  vec3 df = 2.*BHM*(3.*r2*dr*S - r3*dS)/(S*S);
  float D = r2 + a2, iD = 1./D, iD2 = iD*iD;
  float nx = r*x.x + a*x.z, nz = r*x.z - a*x.x;
  vec3 l = vec3(nx*iD, y/r, nz*iD);
  // gradients of each component of l
  vec3 gnx = dr*x.x + vec3(r, 0., a);
  vec3 gnz = dr*x.z + vec3(-a, 0., r);
  vec3 glx = (gnx*D - nx*2.*r*dr)*iD2;
  vec3 gly = (vec3(0., r, 0.) - y*dr)/r2;
  vec3 glz = (gnz*D - nz*2.*r*dr)*iD2;
  float L = 1. + dot(l, p);
  vec3 dL = glx*p.x + gly*p.y + glz*p.z;
  dx = p - f*L*l;
  dp = .5*(L*L*df + 2.*f*L*dL);
}

// ro, rd in black-hole space (r_s units, disk in the y=0 plane)
vec3 traceBH(vec3 ro, vec3 rd, out vec3 outDir, out float captured, out float minR, const int STEPS){
  captured = 0.; minR = 1e5;
  vec3 x = ro, v = rd;
  vec3 acc = vec3(0.); float alpha = 0.;
  float R0 = max(uDiskOuter*1.18, 12.);
  float b0 = dot(x, v), c0 = dot(x, x) - R0*R0;
  if (c0 > 0.){
    float disc = b0*b0 - c0;
    if (disc < 0. || b0 > 0.){
      float bimp = length(cross(x, v));
      vec3 toC = normalize(-x - v*dot(-x, v));
      outDir = normalize(v + toC*tan(min(2./max(bimp, 1.), 1.2)));
      minR = bimp;
      return vec3(0.);
    }
    x += v*(-b0 - sqrt(disc));
    float bi = length(cross(x, v));
    float cpsi = clamp(-dot(x, v)/length(x), 0., 1.);
    vec3 toC = normalize(-x - v*dot(-x, v));
    v = normalize(v + toC*(1. - cpsi)/max(bi, 1.));
  }
  // backward tracing in Kerr = forward tracing with the spin reversed
  float a = -uSpin*BHM;
  float rh = BHM + sqrt(max(BHM*BHM - a*a, 0.));
  // momentum normalised so the ray is null: (1 - f q^2) s^2 - 2 f q s - (1 + f) = 0
  float f0, r0; vec3 l0; ksFL(x, a, f0, l0, r0);
  float q = dot(v, l0);
  float A = 1. - f0*q*q;
  float s = (f0*q + sqrt(f0*f0*q*q + A*(1. + f0))) / A;
  vec3 p = v*s;
  vec3 dx = v; float r = r0; bool escaped = false;
  for (int i = 0; i < STEPS; i++){
    vec3 dx1, dp1; float r1;
    ksDeriv(x, p, a, dx1, dp1, r1);
    r = r1; minR = min(minR, r);
    if (r < rh*1.03){ captured = 1.; break; }
    if (r > R0*1.05 && dot(x, dx1) > 0.){ dx = dx1; escaped = true; break; }
    float h = clamp((r - rh)*mix(.075, .13, smoothstep(4., 12., r)), .006, 1.4);
    vec3 dx2, dp2; float r2;
    ksDeriv(x + .5*h*dx1, p + .5*h*dp1, a, dx2, dp2, r2);
    vec3 xn = x + h*dx2;
    vec3 pn = p + h*dp2;
    if (x.y*xn.y < 0.){
      float tc = x.y/(x.y - xn.y);
      vec3 c = mix(x, xn, tc);
      float rc = ksR(c, a);
      if (rc > RIN && rc < uDiskOuter){
        vec3 pc = mix(p, pn, tc);
        // the real photon carries the opposite angular momentum of the traced one
        float lam = -(-c.z*pc.x + c.x*pc.z);
        vec4 ds = diskShade(c, dx2, rc, lam);
        acc += (1. - alpha)*ds.rgb;
        alpha += (1. - alpha)*ds.a;
        if (alpha > .985) break;
      }
    }
    x = xn; p = pn; dx = dx2;
  }
  // a ray still bound after all steps has been wound up by the photon sphere: treat as captured
  if (!escaped && alpha < .985) captured = 1.;
  // leave along the momentum (the flat-space direction), not the Kerr–Schild coordinate velocity
  v = normalize(p);
  if (captured < .5){
    float bo = length(cross(x, v));
    float cpsi = clamp(dot(x, v)/length(x), 0., 1.);
    vec3 toC = -x - v*dot(-x, v);
    if (dot(toC, toC) > 1e-8) v = normalize(v + normalize(toC)*(1. - cpsi)/max(bo, 1.));
  }
  outDir = v;
  if (captured > .5) alpha = 1.;
  captured = max(captured, alpha);
  return acc;
}
`;

// prograde ISCO (Bardeen–Press–Teukolsky), returned in r_s units
export function iscoRs(chi) {
  chi = Math.min(.998, Math.max(0, chi));
  const z1 = 1 + Math.cbrt(1 - chi * chi) * (Math.cbrt(1 + chi) + Math.cbrt(1 - chi));
  const z2 = Math.sqrt(3 * chi * chi + z1 * z1);
  return (3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2))) * .5;
}

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
