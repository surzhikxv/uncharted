'use strict';
const GL_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * .5 + .5; vUv.y = 1. - vUv.y; gl_Position = vec4(aPos, 0., 1.); }`;

const GL_NOISE = `
float uc_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float uc_noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(uc_hash(i), uc_hash(i+vec2(1,0)), f.x), mix(uc_hash(i+vec2(0,1)), uc_hash(i+vec2(1,1)), f.x), f.y); }`;

const BAND_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uTex; uniform float uTime, uScroll; uniform vec2 uRes, uTexRes;
${GL_NOISE}
void main(){
  float ra = uRes.x / uRes.y, rt = uTexRes.x / uTexRes.y;
  vec2 uv = vUv;
  if (rt > ra) { float s = ra / rt; uv.x = uv.x * s + (1. - s) * .5; }
  else { float s = rt / ra; uv.y = uv.y * s + (1. - s) * .5; }
  uv.y = uv.y * .62 + .19 + (uScroll - .5) * .10;
  uv += (vec2(uc_noise(vUv * vec2(13., 5.) + uTime * .07), uc_noise(vUv * vec2(9., 7.) - uTime * .05)) - .5) * .004;
  vec3 c = texture(uTex, uv).rgb;
  float m = smoothstep(0., .17, vUv.y) * smoothstep(1., .83, vUv.y);
  m *= 1. - .18 * uc_noise(vUv * vec2(7., 2.5) + 3.7);
  outC = vec4(mix(vec3(.980, .961, .945), c, clamp(m, 0., 1.)), 1.);
}`;

class GLEngine {
  constructor(){ this.scenes = []; this.running = false; this._t0 = performance.now(); }
  addScene(canvas, frag, texUrls, getUniforms){
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return null;
    const prog = this._program(gl, GL_VERT, frag);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const scene = { canvas, gl, prog, vao, textures: {}, texSizes: {}, getUniforms, visible: false, ready: false, failed: false, uloc: new Map() };
    const names = Object.keys(texUrls);
    let left = names.length;
    let anyFailed = false;
    if (!left) scene.ready = true;
    names.forEach((name, i) => this._loadTex(gl, texUrls[name], (tex, w, h) => {
      if (tex === null) { anyFailed = true; }
      else { scene.textures[name] = { tex, unit: i }; scene.texSizes[name] = [w, h]; }
      if (--left === 0) {
        if (!anyFailed) { scene.ready = true; }
        else if (!scene.failed) { scene.failed = true; scene.onFail && scene.onFail(); }
      }
    }));
    new IntersectionObserver(es => es.forEach(e => { scene.visible = e.isIntersecting; }), { rootMargin: '60px' }).observe(canvas);
    this.scenes.push(scene);
    this._start();
    return scene;
  }
  swapTexture(scene, name, url, cb){ this._loadTex(scene.gl, url, (tex, w, h) => {
    if (!tex) { cb && cb(false); return; }
    const old = scene.textures[name].tex;
    scene.textures[name].tex = tex; scene.texSizes[name] = [w, h];
    if (old) scene.gl.deleteTexture(old);
    cb && cb(true); }); }
  // текстуры премультиплицированы: корректный морф прозрачных PNG (реальные флаконы из Figma)
  _loadTex(gl, url, cb){
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      cb(t, img.naturalWidth, img.naturalHeight); };
    img.onerror = () => cb(null, 0, 0);
    img.src = url;
  }
  _program(gl, vs, fs){
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  _start(){ if (this.running) return; this.running = true;
    const tick = () => { if (!document.hidden) this.scenes.forEach(s => this._draw(s)); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  _draw(s){
    if (!s.ready || !s.visible) return;
    const gl = s.gl, rect = s.canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (s.canvas.width !== w || s.canvas.height !== h) { s.canvas.width = w; s.canvas.height = h; }
    gl.viewport(0, 0, w, h); gl.useProgram(s.prog); gl.bindVertexArray(s.vao);
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const locOf = n => { let l = s.uloc.get(n); if (l === undefined) { l = gl.getUniformLocation(s.prog, n); s.uloc.set(n, l); } return l; };
    const set = (n, v) => { const l = locOf(n); if (l === null) return;
      if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2f(l, v[0], v[1]); else gl.uniform3f(l, v[0], v[1], v[2]); };
    Object.entries(s.textures).forEach(([n, t]) => { gl.activeTexture(gl.TEXTURE0 + t.unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(locOf(n), t.unit);
      set(n + 'Res', s.texSizes[n]); });
    set('uTime', (performance.now() - this._t0) / 1000); set('uRes', [w, h]);
    const u = s.getUniforms ? s.getUniforms(rect) : {}; Object.entries(u).forEach(([n, v]) => set(n, v));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
// жидкий морф «мениск»: через флакон в сторону листания идёт волнистый фронт геля —
// перед ним старый кадр утягивается к фронту (поверхностное натяжение), у фронта
// линзовая рефракция и блик-каустика, позади новый кадр успокаивается с затухающим
// колыханием; низ фронта отстаёт (тяжесть). Никакого шумового распада.
const MORPH_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uFrom, uTo; uniform float uTime, uProgress, uDir;
${GL_NOISE}
#define PI 3.14159265
vec4 smp(sampler2D t, vec2 uv){
  vec4 c = texture(t, uv);
  vec2 b = smoothstep(0., .012, uv) * smoothstep(1., .988, uv);
  return c * b.x * b.y;
}
void main(){
  float p = clamp(uProgress, 0., 1.);
  float env = sin(p * PI);                       // всё движение гаснет к краям
  float y = vUv.y;
  // позиция фронта: ход ровно по габариту флакона — без мёртвых фаз на краях
  float pp = smoothstep(.02, .93, p);
  float x0 = .5 + (pp - .5) * 1.04 * uDir;
  // форма фронта: крупная волна + лёгкое дыхание + отставание снизу
  float wave = (uc_noise(vec2(y * 2.2 + 7.3, uTime * .22)) - .5) * 2.;
  float wave2 = sin(y * 7. + uTime * .9);
  float lag = (y - .35) * .16;
  float xf = x0 + (wave * .085 + wave2 * .03 - lag) * uDir * env;
  float d = (vUv.x - xf) * uDir;                 // >0 — старая сторона
  float w = .17;
  float q = d / w;
  // линза у фронта: непрерывное поле преломления для обоих слоёв
  float refr = q * exp(.5 - .5 * q * q) * .045 * env * uDir;
  // старый кадр: дальнодействующее вязкое утягивание к фронту (антиципация)
  float pull = exp(-max(d, 0.) / (w * 2.0));
  vec2 uvA = vUv;
  uvA.x -= uDir * pull * .075 * env;
  uvA.x += refr;
  uvA.y += (uc_noise(vec2(y * 3., uTime * .3)) - .5) * pull * .02 * env;
  // новый кадр: подтянут к фронту, позади расслабляется с затухающим колыханием
  float behind = exp(-max(-d, 0.) / (w * 1.8));
  vec2 uvB = vUv;
  uvB.x += uDir * behind * .07 * env + refr;
  uvB.x += sin(max(-d, 0.) * 26. - uTime * 5.) * behind * .008 * env;
  vec4 A = smp(uFrom, uvA);
  vec4 B = smp(uTo, uvB);
  float mB = smoothstep(.012, -.012, d);
  vec4 col = A * (1. - mB) + B * mB;
  // толща геля: лёгкое поглощение в полосе фронта
  col.rgb *= 1. - .09 * exp(-q * q) * env;
  // мениск: тёплый блик по фронту + мягкий вторичный позади
  float spec  = exp(-q * q * 9.) * env;
  float spec2 = exp(-(q + .9) * (q + .9) * 16.) * env;
  col.rgb += (spec * .26 + spec2 * .10) * col.a * vec3(1.0, .975, .94);
  outC = col;
}`;

// течение струи геля: рефракция + бегущие блики внутри маски струи
const FLOW_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uTex; uniform float uTime;
${GL_NOISE}
void main(){
  float v = vUv.y;
  // осевая линия струи (по геометрии pump-697: 310px@505 → 300px@1290 при 473×1553)
  float xc = .6554 - .042 * (v - .325);
  float dxn = vUv.x - xc;
  float core = smoothstep(.0125, .0035, abs(dxn));
  float env = smoothstep(.318, .345, v) * (1. - smoothstep(.76, .835, v));
  float m = core * env;
  // рефракция: медленная вертикальная волна, бегущая вниз
  float wob = (uc_noise(vec2(2.0, v * 46. - uTime * 1.15)) - .5)
            + (uc_noise(vec2(5.7, v * 90. - uTime * 2.1)) - .5) * .45;
  vec2 uv = vUv;
  uv.x += wob * .0058 * m;
  vec3 c = texture(uTex, uv).rgb;
  // бегущие блики: два слоя на разных скоростях + медленное дыхание;
  // поток ускоряется книзу (физика падающей струи)
  float g1 = uc_noise(vec2(7.3, v * 26. - uTime * (1.3 + v * 1.4)));
  float g2 = uc_noise(vec2(3.1, v * 8. - uTime * .55));
  float g3 = uc_noise(vec2(11.7, v * 55. - uTime * (2.6 + v * 2.)));
  float spec = pow(smoothstep(.48, .9, g1), 2.) * .56
             + pow(smoothstep(.58, .94, g3), 3.) * .36
             + (g2 - .5) * .17;
  // блик чуть уже самой струи — стеклянная сердцевина
  float corehl = smoothstep(.0072, .0015, abs(dxn + wob * .0035));
  c += spec * corehl * env;
  outC = vec4(c, 1.);
}`;

// ===== Флакон — вода =====
// Два слоя физики на одной CPU-сетке 104×120:
// 1) булк-поток D (смещение + пружина к покою) — ТОЛЬКО для большого слива
//   листания: композиция «прорыв дамбы» (напор по Торричелли, оседание столба);
// 2) рябь h — честное волновое уравнение (∂²h/∂t² = c²∇²h, сила от соседей,
//   а не пружина к месту!): возмущения бегут кольцами, курсор — движущийся
//   источник волн с кильватером. Сэмплинг фото: uv − D − ∇h·k (рефракция,
//   вода = линза), сверху блики по гребням, каустика ∝ −∇²h, лёгкий Френель —
//   свет, а не варп, делает воду водой.
const FB_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * .5 + .5; vUv.y = 1. - vUv.y; gl_Position = vec4(aPos, 0., 1.); }`;
const FB_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uTexA, uTexB, uField, uMask;
uniform vec2 uSimRes, uGrid; uniform float uMix, uTime, uOffX, uTexW, uWash, uLevel, uBreach, uFlow, uReach;
uniform vec4 uVessel;
// огибающая верхней кромки листа (16 узлов по 50px от стенки), прогресс налива
// и огибающая «стеклянного» вида пустого сосуда на время перехода
uniform float uTopE[16]; uniform float uFill, uGlass;
${GL_NOISE}
// поле на сетке: бикубический B-сплайн через 4 аппаратных билинейных тапа —
// C1-гладкий, без «накачки» градиента с частотой сетки (она давала муар-плетёнку)
vec4 fld(vec2 uv){
  vec2 p = clamp(uv, 0., 1.) * uGrid - .5;
  vec2 i = floor(p), f = p - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (-f3 + 3. * f2 - 3. * f + 1.) / 6.;
  vec2 w1 = (3. * f3 - 6. * f2 + 4.) / 6.;
  vec2 w2 = (-3. * f3 + 3. * f2 + 3. * f + 1.) / 6.;
  vec2 w3 = f3 / 6.;
  vec2 g0 = w0 + w1, g1 = w2 + w3;
  vec2 t0 = (i + w1 / g0 - .5) / uGrid;
  vec2 t1 = (i + w3 / g1 + 1.5) / uGrid;
  return texture(uField, vec2(t0.x, t0.y)) * g0.x * g0.y
       + texture(uField, vec2(t1.x, t0.y)) * g1.x * g0.y
       + texture(uField, vec2(t0.x, t1.y)) * g0.x * g1.y
       + texture(uField, vec2(t1.x, t1.y)) * g1.x * g1.y;
}
// стаггер кроссфейда — в ЭКРАННЫХ координатах: в зонах сжатия текстуры
// шум не превращается в пиксельную «шахматку»; lod — мип-блюр взволнованной воды
vec4 smpl(vec2 tuv, float stag, float lod){
  vec2 b = smoothstep(vec2(0.), vec2(.012, .025), tuv) * smoothstep(vec2(1.), vec2(.988, .975), tuv);
  vec4 A = textureLod(uTexA, tuv, lod), B = textureLod(uTexB, tuv, lod);
  float m = clamp((uMix - stag * .5) / .5, 0., 1.);
  return mix(A, B, m * m * (3. - 2. * m)) * b.x * b.y;
}
void main(){
  vec2 e = 1. / uGrid;
  // пять бикубических тапов: центр + крест — дают и градиенты смещения,
  // и наклон/кривизну высотного поля ряби (F.z = h, F.w = |v| среды)
  vec4 F  = fld(vUv);
  vec4 FL = fld(vUv - vec2(e.x, 0.)), FR = fld(vUv + vec2(e.x, 0.));
  vec4 FU = fld(vUv - vec2(0., e.y)), FD = fld(vUv + vec2(0., e.y));
  vec2 px = vUv * uSimRes;
  // сосуд: альфа-маска силуэта в координатах ПОКОЯ — стеклянные стенки
  // неподвижны, движется только вода внутри (жёсткий контур + подвижное
  // содержимое = главный признак жидкости; гнущийся силуэт = желе)
  float m = texture(uMask, vec2((px.x - uOffX) / uTexW, px.y / uSimRes.y)).r;
  float ins = smoothstep(.46, .54, m);
  // волнение покоя: едва заметное изотропное дыхание (вода слоями не дышит)
  vec2 idle = vec2(
    (sin(px.y * .006 - uTime * .8 + px.x * .003) + .6 * sin(px.y * .021 + uTime * .45)) * .9,
    cos(px.x * .005 - uTime * .55 + px.y * .004) * .45);
  vec2 cell = uSimRes * e;
  // наклон и кривизна водной поверхности (h — волновое уравнение на CPU)
  vec2 gh = vec2(FR.z - FL.z, FD.z - FU.z) / (2. * cell);
  float lap = FR.z + FL.z + FU.z + FD.z - 4. * F.z;
  // рефракция: вода — линза, фон смещается по наклону поверхности (n≈1.33);
  // картинка локально сжимается/растягивается, оставаясь РЕЗКОЙ; в большой
  // волне листания рябь читается сквозь поток сильнее
  vec2 D = F.xy + idle * ins + gh * (90. + 70. * uWash);
  vec2 src = px - D;
  vec2 tuv = vec2((src.x - uOffX) / uTexW, src.y / uSimRes.y);
  // ватерлиния: уровень дышит полем ряби и капиллярно прилипает к стенкам
  // (у кромки силуэта m→0.5 — линия подползает вверх); при наливе по линии
  // бежит мягкая рябь, оседающая к концу подъёма — поверхность успокаивается
  float capil = 1. - smoothstep(.55, .9, m);
  float rise = (sin(px.x * .034 + uTime * 8.6) + .55 * sin(px.x * .013 - uTime * 6.1)) * 2.6
             * smoothstep(.02, .14, uFill) * (1. - smoothstep(.6, .94, uFill));
  float lvl = uLevel + F.z * 2.2 - capil * 5.5 + rise;
  float below = smoothstep(lvl - 2.5, lvl + 2.5, px.y);
  // ===== струя из бреши: у листа СВОЁ тело (за силуэтом текстуры нет) =====
  // тёплая янтарная полупрозрачная вода. Верхняя кромка — НЕ текущий уровень:
  // вода на удалении ξ вылетела раньше (уровень был выше) и успела упасть —
  // CPU ведёт 16 узлов огибающей по истории уровня (uTopE), поэтому язык
  // каскада держится у текста, пока фронт его пересекает, а не тонет с уровнем
  vec4 jet = vec4(0.);
  float xi = px.x - uVessel.z;
  if (uFlow > .004 && xi > -14.) {
    float kn = clamp(xi / 50., 0., 14.99);
    int k0 = int(kn); float kf = kn - float(k0);
    float yT = mix(uTopE[k0], uTopE[k0 + 1], kf)
             + (uc_noise(vec2(px.x * .012, uTime * 1.7)) - .5) * 14.;
    // низ: вода растекается по базе флакона вправо, к подписи
    float yB = uVessel.y + 8. + (uc_noise(vec2(px.x * .009 + 7., uTime * 1.2)) - .5) * 12.;
    float front = 1. - smoothstep(uReach - 60., uReach + 26., xi);
    float on = clamp(uFlow * 1.8, 0., 1.) * smoothstep(-14., 22., xi);
    float band = smoothstep(yT - 6., yT + 10., px.y) * (1. - smoothstep(yB - 14., yB + 6., px.y));
    float sheet = band * front * on;
    // нити-струйки: два масштаба шума, унесённого по потоку
    float s1 = uc_noise(vec2((px.x - uTime * 640.) * .02, px.y * .05));
    float s2 = uc_noise(vec2((px.x - uTime * 980.) * .041, px.y * .1 + 4.2));
    float str = .62 + .42 * s1 + .3 * (s2 - .5);
    // тело плотнее у верхней кромки (лист виден с ребра) и в накате по базе
    float topw = exp(-pow((px.y - yT) / 30., 2.));
    float botw = exp(-pow((px.y - yB) / 36., 2.)) * .5;
    float a = sheet * (.34 + .34 * topw + .2 * botw) * str;
    vec3 amber = vec3(.80, .47, .17) * (.92 + .42 * topw);
    // мениски: яркое ребро верхней кромки + ведущий фронт листа
    float menT = exp(-pow((px.y - yT) / 3.4, 2.)) * front * on;
    float menF = exp(-pow((xi - uReach) / 14., 2.)) * band * on;
    vec3 jrgb = amber * a + vec3(1., .95, .84) * (menT * .55 + menF * .6);
    float ja = a + menT * .42 + menF * .5;
    // капли: срываются с ведущей кромки и летят по параболам перед фронтом
    for (int di = 0; di < 3; di++) {
      float fi = float(di);
      float ph = fract(uTime * (.85 + fi * .27) + fi * .37);
      float dxp = uReach + 20. + ph * 130. + fi * 23.;
      float kdn = clamp(dxp / 50., 0., 14.99);
      int kd = int(kdn);
      float yTd = mix(uTopE[kd], uTopE[kd + 1], kdn - float(kd));
      vec2 dp = vec2(uVessel.z + dxp, yTd + 26. + ph * ph * 210. - fi * 18.);
      float dd = length(px - dp);
      float dr = 7. - ph * 3.2;
      float da = exp(-dd * dd / (dr * dr)) * (1. - ph) * clamp(uFlow * 1.6, 0., 1.);
      jrgb += (vec3(.92, .62, .3) + vec3(.55) * exp(-pow((dd - dr * .45) / 1.7, 2.))) * da;
      ja += da * .8;
    }
    jet = vec4(jrgb, min(ja, .9));
  }
  // помпа — твёрдое тело: выше плеча сосуда ничего не течёт и не осушается
  float pumpM = ins * (1. - smoothstep(uVessel.x - 6., uVessel.x + 6., px.y));
  // последние ~200px воды выцветают в плёнку (дно текстуры — тёмные «дрожжи»)
  float dry = clamp((lvl - (uVessel.y - 200.)) / 200., 0., 1.);
  // вода в сосуде: единое тело ниже ватерлинии
  float liq = ins * below * (1. - dry * .85);
  float dDx = (FR.x - FL.x) / (2. * cell.x);
  float dDy = (FD.y - FU.y) / (2. * cell.y);
  float area = abs((1. - dDx) * (1. - dDy));   // якобиан обратного отображения
  float agit = clamp(F.w * .0045 + (abs(dDx) + abs(dDy)) * 1.4, 0., 1.);
  // блюр — только честный анти-алиасинг по footprint и чуть аэрации в большой
  // волне: вода в сантиметровом слое кристально прозрачна, муть = гель
  vec2 ts = vec2(uTexW, uSimRes.y);
  vec2 fx = dFdx(tuv) * ts, fy = dFdy(tuv) * ts;
  float lod = .5 * log2(max(max(dot(fx, fx), dot(fy, fy)), 1.)) + agit * .55 * uWash;
  vec4 col = smpl(tuv, uc_noise(vUv * vec2(6., 5.)), lod);
  // утончение растянутой плёнки — ТОЛЬКО в большой волне листания (uWash)
  float thin = clamp(pow(min(area, 1.), .7), .04, 1.);
  col *= mix(1., thin, uWash);
  col.rgb *= 1. - .09 * clamp(area - 1., 0., 1.5) / 1.5;
  col.rgb *= 1. + .10 * clamp(1. - area, 0., 1.) * uWash;   // сжатый поток слегка светится
  col *= liq;
  // ===== свет — главный признак воды =====
  // на глади (наклон и кривизна ~0) световые члены пропускаются целиком:
  // в покое pow не считается — дёшево даже на софтверном GL
  float ripple = abs(gh.x) + abs(gh.y) + abs(lap) * .1;
  if (ripple > .0012) {
    vec3 N = normalize(vec3(-gh * 7., 1.));
    vec3 Hh = normalize(normalize(vec3(-.42, -.55, .72)) + vec3(0., 0., 1.));
    // тонкие нити бликов бегут по гребням; константа глади вычтена — покой не светится
    float gl = max(pow(max(dot(N, Hh), 0.), 110.) - pow(Hh.z, 110.), 0.);
    // каустика: схождение лучей ∝ −∇²h — за гребнем светлеет, во впадине темнеет;
    // света больше, чем тени (вода сверкает, а не пачкает)
    float ca = clamp(-lap * .55, -.45, .95);
    // Френель: наклонённая вода ловит тёплое отражение страницы
    float fr = pow(min(1., length(gh) * 6.3), 3.);
    col.rgb *= 1. + .24 * ca;
    col.rgb += (gl * 1.18 * vec3(1.0, .975, .94) + fr * .10 * vec3(.98, .955, .93)) * col.a;
  }
  // помпа: недеформированный кадр поверх (твёрдый колпачок, кроссфейд тот же)
  if (pumpM > .003) {
    vec4 solid = smpl(vec2((px.x - uOffX) / uTexW, px.y / uSimRes.y), uc_noise(vUv * vec2(6., 5.)), 0.);
    col = mix(col, solid, pumpM);
  }
  // струя поверх (вне силуэта col там пуст, над текстом — полупрозрачный янтарь)
  jet *= (1. - ins) * (1. - pumpM);
  col = col * (1. - jet.a) + jet;
  // ватерлиния: чёткий яркий мениск на стыке вода/воздух + тёмная полоска
  // преломления толщи сразу под линией (линия читается объёмной); в покое
  // спрятана за плечом, под помпой; считается только в узкой полосе — дёшево
  float dl = px.y - lvl;
  if (abs(dl) < 13.) {
    float g8 = ins * (1. - pumpM);
    float wl = exp(-pow(dl / 2.1, 2.)) * g8;
    float us = exp(-pow((dl - 5.) / 3.6, 2.)) * g8 * below;
    col.rgb += wl * .5 * vec3(1., .96, .89) + vec3(.32, .22, .15) * us * .16;
    col.a   += wl * .3 + us * .16;
  }
  // стеклянные стенки: тончайший тёплый контур (пик альфы маски на склоне 0↔1),
  // отзывается свечением на удары волн; правая стенка ТАЕТ в брешь на время
  // слива — вода уходит именно из-за её пропажи
  float wb = m * (1. - m);
  if (wb > .02) {
    float wall = pow(wb * 4., 1.7);
    // на время перехода контур шире и плотнее: одна непрерывная линия обнимает
    // ВЕСЬ предмет (помпа + горло + плечи + тело) и держит опустевшее стекло;
    // к покою спадает до прежнего тончайшего штриха — статика не меняется
    wall = mix(wall, pow(min(wb * 4.4, 1.), 1.15), uGlass);
    float gap = uBreach * smoothstep(uVessel.z - 30., uVessel.z + 4., px.x)
              * smoothstep(uVessel.x + 26., uVessel.x + 70., px.y);
    wall *= (1. - gap) * (.6 + 1.5 * min(1., abs(F.z) * .3));
    col.rgb += vec3(.86, .42, .27) * wall * (.33 + .4 * uGlass);
    col.a   += wall * (.3 + .42 * uGlass);
  }
  // опустевшая часть — СТЕКЛО, не белая дыра: тело чуть плотнее страницы,
  // тёмные кромки толщины у стенок, два вертикальных блика, свет от плеча
  // и свежесмоченная плёнка над уходящей линией; всё гаснет с uGlass к покою
  float air = ins * (1. - below) * (1. - pumpM);
  if (air > .003) {
    float edge = 1. - smoothstep(.5, .93, m);
    float xb = clamp((px.x - uVessel.w) / max(uVessel.z - uVessel.w, 1.), 0., 1.);
    float hlL = exp(-pow((xb - .16) / .05, 2.));
    float hlR = exp(-pow((xb - .88) / .07, 2.)) * .6;
    float topg = 1. - smoothstep(uVessel.x, uVessel.x + 300., px.y);
    float wet = clamp(uFlow * 2., 0., 1.) * exp(-max(0., lvl - px.y) / 120.);
    float ge = uGlass * .9 + .1;
    col.rgb += (vec3(.45, .37, .31) * (edge * .2)
             +  vec3(1., .97, .92) * (hlL * .2 + hlR * .1 + topg * .05)
             +  vec3(.78, .71, .64) * .12) * air * ge
             +  vec3(.46, .30, .18) * wet * .12 * air;
    col.a   += ((edge * .24 + hlL * .14 + hlR * .07 + topg * .05 + .12) * ge
             + wet * .14) * air;
  }
  outC = col;
}`;

class FluidBottle {
  constructor(canvas, cfg){
    this.cv = canvas;
    this.cfg = Object.assign({ texW: 442, texH: 1083, offX: 83, simW: 1250, simH: 1083, gw: 104, gh: 120 }, cfg);
    const gl = this.gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
    this.ready = false; this.failed = !gl;
    if (this.failed) return;
    this.mix = 1; this.transT = 9e9; this.dir = 1; this.wash = 0;
    this.cur = { x: -9e3, y: -9e3, vx: 0, vy: 0, t: 0 };
    this.visible = false;
    this.tex = [];
    const n = this.cfg.gw * this.cfg.gh;
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);   // скорость среды, px/s
    this.dx = new Float32Array(n); this.dy = new Float32Array(n);   // накопленное смещение, px
    this.h = new Float32Array(n); this.hv = new Float32Array(n);    // рябь: высота поверхности и её скорость (волновое уравнение)
    this._dropAt = 0;
    // сосуд: уровень воды (px, в покое выше контура = полон), брешь правой
    // стенки, напор истечения и дальность фронта струи; налив и стекло —
    // огибающие фаз перехода; история уровня кормит верхнюю кромку листа
    this.level = -100; this.breach = 0; this.flow = 0; this.reach = 0;
    this.fill = 0; this.glass = 0;
    this.topE = new Float32Array(16);
    this.lvlHist = new Float32Array(96); this._histI = 0;
    this.ins = null; this.nb = null; this.ves = null;
    this.tmp = new Float32Array(n);
    this.fieldBuf = new Float32Array(n * 4);
    // у каждого горизонтального слоя — свой характер: байес фазы и темперамента,
    // плавный между соседями (сглаженный шум) — слои текут вразнобой, но без рывков
    const rb = new Float32Array(this.cfg.gh);
    for (let j = 0; j < rb.length; j++) rb[j] = Math.random();
    for (let p = 0; p < 3; p++) for (let j = 1; j < rb.length - 1; j++) rb[j] = (rb[j - 1] + rb[j] * 2 + rb[j + 1]) * .25;
    this.rowBias = rb;
    this._io = new IntersectionObserver(es => es.forEach(e => { this.visible = e.isIntersecting; }), { rootMargin: '60px' });
    this._io.observe(canvas);
    this._mv = e => this._onMove(e);
    addEventListener('pointermove', this._mv, { passive: true });
  }
  _initGL(){
    const gl = this.gl, c = this.cfg;
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = this.prog = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, FB_VERT)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, FB_FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { this.failed = true; return; }
    gl.useProgram(p);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, 'aPos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    // поле среды: RGBA16F (xy=D px, z=h ряби, w=|v| px/s), LINEAR — бикубика в шейдере
    this.fieldTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, c.gw, c.gh);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // маска сосуда: R8-альфа силуэта, LINEAR — клип воды и контур стенок
    this.maskTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);                  // ширина 221 не кратна 4
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R8, this.maskData.w, this.maskData.h);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.maskData.w, this.maskData.h, gl.RED, gl.UNSIGNED_BYTE, this.maskData.a);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const U = n => gl.getUniformLocation(p, n);
    gl.uniform2f(U('uSimRes'), c.simW, c.simH);
    gl.uniform2f(U('uGrid'), c.gw, c.gh);
    gl.uniform1f(U('uOffX'), c.offX);
    gl.uniform1f(U('uTexW'), c.texW);
    gl.uniform1i(U('uTexA'), 0); gl.uniform1i(U('uTexB'), 1); gl.uniform1i(U('uField'), 2);
    gl.uniform1i(U('uMask'), 3);
    gl.uniform4f(U('uVessel'), this.ves.top, this.ves.bot, this.ves.wall, this.ves.left);
    this.uMixU = U('uMix'); this.uTimeU = U('uTime'); this.uWashU = U('uWash');
    this.uLevelU = U('uLevel'); this.uBreachU = U('uBreach');
    this.uFlowU = U('uFlow'); this.uReachU = U('uReach');
    this.uFillU = U('uFill'); this.uGlassU = U('uGlass');
    this.uTopEU = U('uTopE[0]') || U('uTopE');
  }
  _loadTex(url, cb){
    const gl = this.gl;
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // мипмапы: при сильном сжатии картинки в потоке нет муара-алиасинга
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      cb(t);
    };
    img.onerror = () => cb(null);
    img.src = url;
  }
  // маска сосуда: альфа-силуэт флакона (канон — текстура NAMIBIA: у всех
  // ароматов кроме MANGO силуэты идентичны, у MANGO фон запечён и непрозрачен —
  // его лишнее срежет этот же клип)
  _buildMask(url, cb){
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const MW = 221, MH = 541;
        const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(img, 0, 0, MW, MH);
        const a = cx.getImageData(0, 0, MW, MH).data;
        const mk = new Uint8Array(MW * MH);
        for (let k = 0; k < MW * MH; k++) mk[k] = a[k * 4 + 3];
        // рамка нулей: CLAMP_TO_EDGE за пределами текстурной полосы обязан
        // давать «снаружи», даже если силуэт касается края кадра
        for (let i = 0; i < MW; i++) { mk[i] = 0; mk[(MH - 1) * MW + i] = 0; }
        for (let j = 0; j < MH; j++) { mk[j * MW] = 0; mk[j * MW + MW - 1] = 0; }
        this.maskData = { w: MW, h: MH, a: mk };
        this._vesselFromMask();
        cb(true);
      } catch (e) { cb(false); }
    };
    img.onerror = () => cb(false);
    img.src = url;
  }
  _vesselFromMask(){
    const { gw, gh, simW, simH, offX, texW } = this.cfg;
    const md = this.maskData, n = gw * gh;
    const ins = this.ins = new Uint8Array(n);
    const cw = simW / gw, ch = simH / gh;
    const at = (x, y) => {
      const tx = (x - offX) / texW, ty = y / simH;
      if (tx <= 0 || tx >= 1 || ty <= 0 || ty >= 1) return 0;
      return md.a[((ty * md.h) | 0) * md.w + ((tx * md.w) | 0)];
    };
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++)
      ins[j * gw + i] = at((i + .5) * cw, (j + .5) * ch) > 127 ? 1 : 0;
    // геометрия: плечо тела (первая почти-максимальная ширина), дно, обе стенки
    const rowW = new Array(gh).fill(0), rowR = new Array(gh).fill(0), rowL = new Array(gh).fill(0);
    let maxW = 0;
    for (let j = 0; j < gh; j++) { let w = 0, r = 0, l = -1;
      for (let i = 0; i < gw; i++) if (ins[j * gw + i]) { w++; r = i; if (l < 0) l = i; }
      rowW[j] = w; rowR[j] = r; rowL[j] = l < 0 ? 0 : l; if (w > maxW) maxW = w; }
    let topJ = 0, botJ = gh - 1;
    for (let j = 0; j < gh; j++) if (rowW[j] >= maxW * .8) { topJ = j; break; }
    for (let j = gh - 1; j >= 0; j--) if (rowW[j] > 0) { botJ = j; break; }
    let ws = 0, wc = 0, ls = 0;
    for (let j = topJ + 2; j <= botJ - 2; j++) { ws += (rowR[j] + .5) * cw; ls += (rowL[j] + .5) * cw; wc++; }
    this.ves = { top: (topJ + .5) * ch, bot: (botJ + .5) * ch,
      wall: wc ? ws / wc : offX + texW, left: wc ? ls / wc : offX };
    // соседи волнового шага: стенка сосуда отражает (Нейман) в обе стороны,
    // внутри и снаружи волны живут свободно, через стенку — нет
    const il = new Int32Array(n), ir = new Int32Array(n), ru = new Int32Array(n), rd = new Int32Array(n);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i;
      const L = i > 0 ? k - 1 : k, R = i < gw - 1 ? k + 1 : k;
      const U = j > 0 ? k - gw : k, Dn = j < gh - 1 ? k + gw : k;
      il[k] = ins[L] === ins[k] ? L : k;
      ir[k] = ins[R] === ins[k] ? R : k;
      ru[k] = ins[U] === ins[k] ? U : k;
      rd[k] = ins[Dn] === ins[k] ? Dn : k;
    }
    this.nb = { il, ir, ru, rd };
    // клетки бреши: правая стенка тела — при открытой бреши поглощают волну
    const br = [];
    for (let j = topJ + 1; j <= botJ; j++) if (ins[j * gw + rowR[j]]) br.push(j * gw + rowR[j]);
    this.breachIdx = br;
  }
  destroy(){
    removeEventListener('pointermove', this._mv);
    this._io.disconnect();
    this.ready = false; this.failed = true;
    const gl = this.gl;
    if (gl) { this.tex.forEach(t => t && gl.deleteTexture(t)); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
  }
  init(urls, cb){
    let left = urls.length + 1, bad = false;
    const done = () => {
      if (--left > 0) return;
      if (bad || this.failed) { this.failed = true; cb && cb(false); return; }
      try { this._initGL(); } catch (e) { this.failed = true; }
      if (this.failed) { cb && cb(false); return; }
      this.curIdx = 0; this.nextIdx = 0;
      this.level = this.ves.top - 16;          // покой: тело полно, линия спрятана под помпой
      this.lvlHist.fill(this.level);
      this.ready = true;
      this._last = performance.now();
      const tick = now => { this._frame(now); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      cb && cb(true);
    };
    this._buildMask(urls[1], ok => { if (!ok) bad = true; done(); });
    urls.forEach((url, ai) => this._loadTex(url, t => {
      if (!t) bad = true; else this.tex[ai] = t;
      done();
    }));
  }
  _onMove(e){
    const r = this.cv.getBoundingClientRect();
    if (!r.width) return;
    const x = (e.clientX - r.left) / r.width * this.cfg.simW;
    const y = (e.clientY - r.top) / r.height * this.cfg.simH;
    const now = performance.now();
    const gap = now - (this.cur.t || 0);
    // телепорт (первое событие или долгая пауза) — позиция без скорости, иначе сплат-взрыв
    if (gap > 250 || this.cur.x < -8e3) {
      this.cur.x = x; this.cur.y = y; this.cur.vx = 0; this.cur.vy = 0; this.cur.t = now;
      return;
    }
    const dt = Math.min(.1, gap / 1000) || .016;
    const k = .45;                                   // сглаживание скорости курсора
    this.cur.vx += ((x - this.cur.x) / dt - this.cur.vx) * k;
    this.cur.vy += ((y - this.cur.y) / dt - this.cur.vy) * k;
    this.cur.x = x; this.cur.y = y; this.cur.t = now;
  }
  // листание: запускает таймлайн форсинга в _step (вперёд — слив в брешь, назад — колыхание)
  transition(dir, nextIdx){
    if (!this.tex[nextIdx] || !this.ready) return;
    if (this.mix >= 1) this.curIdx = this.nextIdx;     // прошлый переход дорисован
    this.nextIdx = nextIdx;
    this.dir = dir;
    this.mix = 0; this.transT = 0; this._snapped = false; this.reach = 0;
    this.lvlHist.fill(this.level); this._histI = 0;    // история уровня — с чистого листа
  }
  // история уровня (ячейка = подшаг 16.7мс ≈ 1.6с глубины): верхняя кромка
  // листа — вода, вылетевшая РАНЬШЕ, когда уровень был выше, и успевшая упасть
  _pushLvl(v){ this._histI = (this._histI + 1) % 96; this.lvlHist[this._histI] = v; }
  _lvlAgo(sec){
    const back = Math.min(95, Math.round(sec / .0167));
    return this.lvlHist[(this._histI - back + 96) % 96];
  }
  _frame(now){
    if (!this.ready || this.failed) return;
    if (!this.visible || document.hidden) { this._last = now; return; }
    // сабстепы фиксированного шага: физика течёт в реальном времени даже при просадке fps
    let acc = Math.min(.1, Math.max(.001, (now - this._last) / 1000));
    this._last = now;
    while (acc > 1e-4) { const dt = Math.min(acc, .0167); this._step(dt, now); acc -= dt; }
    this._render(now);
  }
  // анизотропная диффузия: внутри слоя (по x) вязкость сильная — слой един,
  // между слоями (по y) слабая — слои скользят друг по другу, но без разрывов
  _blur(a, tx, ty){
    if (tx <= 0 && ty <= 0) return;
    const { gw, gh } = this.cfg, tmp = this.tmp;
    for (let j = 0; j < gh; j++) {
      const r = j * gw, ru = j > 0 ? r - gw : r, rd = j < gh - 1 ? r + gw : r;
      for (let i = 0; i < gw; i++) {
        const il = i > 0 ? i - 1 : i, ir = i < gw - 1 ? i + 1 : i;
        const c = a[r + i];
        tmp[r + i] = c + ((a[r + il] + a[r + ir]) * .5 - c) * tx + ((a[ru + i] + a[rd + i]) * .5 - c) * ty;
      }
    }
    a.set(tmp);
  }
  _step(dt, now){
    this.transT += dt;
    const fwd = this.dir > 0, T = this.transT;
    // кроссфейд текстур: вперёд — в «мёртвой точке» опустошения (сосуд пуст,
    // подмена невидима, налив поднимает уже новую воду); назад — под колыхание
    this.mix = Math.min(1, Math.max(0, fwd ? (T - .78) / .2 : (T - .3) / .42));
    // огибающая большой волны: утончение плёнки разрешено только здесь;
    // вперёд она живёт ТОЛЬКО на сливе — налив зеркально спокоен (без мути)
    this.wash = Math.min(1, Math.sin(Math.min(T / (fwd ? 1.05 : 1.1), 1) * Math.PI) * 1.5) * (fwd ? 1 : .45);
    // сосуд: брешь правой стенки открывается → напор Торричелли гонит воду в
    // струю, уровень падает (быстро → медленно, h ∝ (1−t)²), у дна — подмена,
    // налив поднимает новую воду, стенка восстанавливается
    if (this.ves) {
      if (fwd && T < 3) {
        const open = Math.min(1, Math.max(0, (T - .04) / .14));
        this.breach = open * (T < 1.02 ? 1 : Math.max(0, 1 - (T - 1.02) / .33));
        const tt = T - .12, full = this.ves.top - 16;
        let lf;
        if (tt <= 0) lf = 1;
        else if (tt < .86) { const q = 1 - tt / .86; lf = q * q; }
        else { const s = Math.min(1, (tt - .86) / .64); lf = s * s * (3 - 2 * s); }
        this.level = this.ves.bot - (this.ves.bot - full) * lf;
        // сосуд пуст — мгновенно и невидимо гасим ВСЁ поле (смещения И рябь):
        // налив поднимет НОВУЮ воду ровным горизонтальным уровнем, без
        // остаточного перекоса столба и без звона от слива
        if (tt >= .86 && !this._snapped) {
          this._snapped = true;
          this.dx.fill(0); this.dy.fill(0); this.vx.fill(0); this.vy.fill(0);
          this.h.fill(0); this.hv.fill(0);
        }
        const drain = tt > 0 && tt < .86;
        this.flow = drain ? this.breach * Math.sqrt(Math.max(0, (this.ves.bot - this.level) / (this.ves.bot - this.ves.top))) : 0;
        if (T < .05) this.reach = 0;
        // фронт листа: ~480мс на пересечение блока описания (ξ 66…670)
        if (drain) this.reach = Math.min(1300, this.reach + (620 + 1260 * this.flow) * dt);
        this.fill = tt >= .86 ? Math.min(1, (tt - .86) / .64) : 0;
        // налив: редкие МЯГКИЕ всплески у ватерлинии — жизнь, не кипение
        if (tt >= .86 && lf < .99 && Math.random() < .07)
          this._splash(this.ves.left + 30 + Math.random() * Math.max(40, this.ves.wall - this.ves.left - 60),
            this.level + 6, .3, 2.0, true);
        // стекло и усиленный контур держат флакон, пока он пуст
        this.glass = Math.min(1, Math.max(0, (T - .08) / .2)) * (1 - Math.min(1, Math.max(0, (T - 1.5) / .3)));
        this._pushLvl(this.level);
      } else {
        this.breach = 0; this.flow = 0; this.level = this.ves.top - 16;
        this.fill = 0; this.glass = 0;
      }
    }
    if (this.mix >= 1 && this.curIdx !== this.nextIdx) {
      this.curIdx = this.nextIdx;
      // назад вода «дозванивает» парой затухающих колец; вперёд налив спокоен —
      // его рябь у линии уже достаточно живая, кольца ломали бы ровный уровень
      if (!fwd) {
        this._splash(180 + Math.random() * 240, 320 + Math.random() * 420, 3.2, 3.0, true);
        this._splash(220 + Math.random() * 200, 480 + Math.random() * 300, 2.2, 2.2, true);
      }
    }
    // затухание скорости курсора, когда он не движется
    if (now - this.cur.t > 90) { this.cur.vx *= Math.pow(.8, dt * 60); this.cur.vy *= Math.pow(.8, dt * 60); }
    const { gw, gh, simW, simH } = this.cfg;
    const cw = simW / gw, ch = simH / gh;
    const vx = this.vx, vy = this.vy, dx = this.dx, dy = this.dy;
    // фазовая жёсткость: в полёте среда мягкая (течёт), на возврате собирается
    const active = T < 3;
    const rt = Math.min(1, Math.max(0, (T - .85) / .85));
    const ramp = rt * rt * (3 - 2 * rt);
    // в покое пружина и трение мягче — след курсора живёт дольше (тягучая вода)
    const ks = active ? 2.2 + 15 * ramp : 7.5;
    const damp = Math.exp(-(active ? 2.0 + 3.6 * ramp : 3.4) * dt);
    // форсинг листания: слои утекают вразнобой — стаггер по x плюс
    // пер-слойное запаздывание и темперамент (rowBias)
    if (T < 1.25) {
      const rb = this.rowBias;
      for (let j = 0; j < gh; j++) {
        const sy = (j + .5) * ch, r = j * gw, b = rb[j];
        for (let i = 0; i < gw; i++) {
          const sx = (i + .5) * cw, k = r + i;
          if (fwd) {
            // прорыв стенки: напор по Торричелли — нижним слоям выброс вправо,
            // верх ОСЕДАЕТ вниз вслед за уровнем; столб остаётся сплошным
            // (неразрывность). СНАРУЖИ среду не гоняем вовсе: у вытекшего листа
            // собственное янтарное тело в шейдере, а фото из силуэта не
            // выносится — пейзаж не размазывается пятном по странице
            if (this.ins && this.ins[k]) {
              const depth = sy / simH;
              const p = T - Math.max(0, 525 - sx) / 525 * .16 - b * .06 - .03;
              if (p > -.3 && p < .6) {
                const g = Math.exp(-p * p / .02) * dt / .25;
                vx[k] += (300 + 2600 * Math.pow(depth, .8)) * (.85 + b * .3) * g * .35;
                vy[k] += (1500 * (1 - depth) + 200) * g * .35;
              }
            }
          } else {
            // назад: мягкий толчок влево, слои колышутся вразнобой
            const p = T - (1 - sx / simW) * .12 - b * .1 - .04;
            if (p > -.25 && p < .35) {
              const g = Math.exp(-p * p / .016) * dt / .226;
              vx[k] -= (300 + (b - .5) * 160) * g;
              vy[k] += Math.sin(sy * .013 + 2.2) * 40 * g;
            }
          }
        }
      }
      // рябь потока: редкие КОГЕРЕНТНЫЕ всплески-пакеты (не белый шум по
      // ячейкам — он шинкует фото в конфетти) по воде сосуда, только на сливе
      const env = Math.sin(Math.min(T / 1.3, 1) * Math.PI);
      if (fwd) {
        if (T < .95 && Math.random() < .8) this._splash(80 + Math.random() * 440, 150 + Math.random() * 850, (3.5 + 3.5 * Math.random()) * env, 1.4 + Math.random() * .9, true);
      } else if (Math.random() < .6) {
        this._splash(60 + Math.random() * 460, 150 + Math.random() * 850, (1.1 + 1.1 * Math.random()) * env, 1.5 + Math.random() * .8, true);
      }
    }
    // курсор: вода — не мёд. Лёгкое (втрое слабее прежнего, изотропное)
    // увлечение толщи даёт тягучесть, но главное — курсор работает движущимся
    // ИСТОЧНИКОМ ВОЛН: позади остаётся кильватерный след, при остановке —
    // расходящиеся кольца (конус Маха возникает сам из движущегося штампа)
    if (this.cur.x > -8e3) {
      const cx = this.cur.x, cy = this.cur.y;
      const cvx = Math.max(-2200, Math.min(2200, this.cur.vx)), cvy = Math.max(-2200, Math.min(2200, this.cur.vy));
      const spd = Math.hypot(cvx, cvy);
      const R = 160, drag = Math.min(1, 8 * dt) * Math.min(1, spd / 260) * .25;
      const i0 = Math.max(0, Math.floor((cx - R) / cw)), i1 = Math.min(gw - 1, Math.ceil((cx + R) / cw));
      const j0 = Math.max(0, Math.floor((cy - R) / ch)), j1 = Math.min(gh - 1, Math.ceil((cy + R) / ch));
      const insA = this.ins;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const ddx = (i + .5) * cw - cx, ddy = (j + .5) * ch - cy;
        const k = j * gw + i;
        // увлекается только вода в сосуде — страница вокруг суха
        const g = Math.exp(-3 * (ddx * ddx + ddy * ddy) / (R * R)) * drag * (insA ? insA[k] : 1);
        vx[k] += (cvx * .28 - vx[k]) * g;
        vy[k] += (cvy * .1 - vy[k]) * g;
      }
      if (spd > 50) this._splash(cx, cy, Math.min(1, spd / 950) * 230 * dt, 2.1, true);
    }
    // покой: редкая капля — едва заметное расходящееся кольцо оживляет гладь
    if (T > 3.5 && now > this._dropAt) {
      this._dropAt = now + 2400 + Math.random() * 2800;
      this._splash(140 + Math.random() * 360, 240 + Math.random() * 640, 1.7, 2.6, true);
    }
    // вязкость: слоистая (ламинарный сдвиг) ТОЛЬКО в большой волне листания —
    // масса уходит единым потоком; в покое и под курсором вода изотропна
    this._blur(vx, Math.min(1, (active ? 14 : 8) * dt), Math.min(1, (active ? 9 : 8) * dt));
    this._blur(vy, Math.min(1, (active ? 10 : 8) * dt), Math.min(1, (active ? 5 : 8) * dt));
    // пружина к покою + затухание + интеграция смещения
    const n = gw * gh;
    const insA = this.ins;
    for (let k = 0; k < n; k++) {
      vx[k] = (vx[k] - ks * dx[k] * dt) * damp;
      vy[k] = (vy[k] - ks * dy[k] * dt) * damp;
      // неразрывность: внутри сосуда пейзаж — ЕДИНОЕ тело (лёгкий снос к бреши,
      // не эвакуация; видимый уход массы — это падение уровня); снаружи фото
      // не живёт вовсе — за стенкой рисуется только собственное тело струи
      const lx = insA && insA[k] ? 70 : 90, ly = insA && insA[k] ? 50 : 60;
      dx[k] = Math.max(-lx, Math.min(lx, dx[k] + vx[k] * dt));
      dy[k] = Math.max(-ly, Math.min(ly, dy[k] + vy[k] * dt));
    }
    // диффузия смещения: в полёте чуть анизотропна (слой един, силуэт не
    // режется на полосы), в покое — изотропна
    this._blur(dx, Math.min(1, (active ? 5 : 4) * dt), Math.min(1, (active ? 5 : 4) * dt));
    this._blur(dy, Math.min(1, 4 * dt), Math.min(1, (active ? 5 : 4) * dt));
    // рябь: два прохода волнового уравнения за подшаг — капиллярные кольца
    // быстрые и мелкие (одного прохода мало: c упирается в CFL ячейки)
    this._waveStep(); this._waveStep();
  }
  // волновое уравнение на поле высоты h: восстанавливающая сила приходит от
  // РАЗНОСТИ С СОСЕДЯМИ (давление), не от пружины к месту покоя — поэтому
  // возмущения бегут расходящимися кольцами, перехлёстываются и отражаются,
  // а не колышутся на месте (желе). kx/ky выровнены под неквадратную ячейку
  // (~12.0×9.0 px), их сумма — чуть ниже предела устойчивости CFL (.84 < 1)
  _waveStep(){
    const { gw, gh, simW, simH } = this.cfg;
    const cw = simW / gw, ch = simH / gh;
    const s = .84 / (1 / (cw * cw) + 1 / (ch * ch));
    const kx = s / (cw * cw), ky = s / (ch * ch);
    const h = this.h, hv = this.hv, n = gw * gh;
    // соседи предвычислены: стенка сосуда отражает волну (Нейман), внутри и
    // снаружи — свободное распространение, сквозь стенку волна не проходит
    const { il, ir, ru, rd } = this.nb;
    for (let k = 0; k < n; k++) {
      const c = h[k];
      hv[k] = (hv[k] + kx * (h[il[k]] + h[ir[k]] - 2 * c) + ky * (h[ru[k]] + h[rd[k]] - 2 * c)) * .984;
    }
    // открытая брешь: волны уходят в пролом, не отражаясь
    if (this.breach > .01) {
      const d = 1 - .3 * this.breach, bi = this.breachIdx;
      for (let q = 0; q < bi.length; q++) hv[bi[q]] *= d;
    }
    // поглощающая кромка: волны не отражаются от невидимых стен канваса
    const rl = (gh - 1) * gw;
    for (let i = 0; i < gw; i++) { hv[i] *= .82; hv[i + gw] *= .91; hv[rl + i] *= .82; hv[rl - gw + i] *= .91; }
    for (let j = 0; j < gh; j++) { const r = j * gw; hv[r] *= .82; hv[r + 1] *= .91; hv[r + gw - 1] *= .82; hv[r + gw - 2] *= .91; }
    // ε-утечка уровня: впрыски не накапливают дрейф среднего
    for (let k = 0, n = gw * gh; k < n; k++) h[k] = (h[k] + hv[k]) * .9985;
  }
  // капля/источник: штамп скорости с нулевой суммой по окну (гауссиана минус
  // её среднее) — вокруг вмятины поднимается валик, уровень не дрейфует;
  // gate=true — только в воде сосуда (страница вокруг суха)
  _splash(x, y, amp, R, gate){
    const { gw, gh, simW, simH } = this.cfg;
    const cw = simW / gw, ch = simH / gh;
    if (gate && this.ins) {
      const gi = Math.min(gw - 1, Math.max(0, Math.round(x / cw - .5)));
      const gj = Math.min(gh - 1, Math.max(0, Math.round(y / ch - .5)));
      if (!this.ins[gj * gw + gi]) return;
    }
    const ci = x / cw - .5, cj = y / ch - .5;
    const W = Math.ceil(R) + 1;
    const i0 = Math.max(0, Math.round(ci - W)), i1 = Math.min(gw - 1, Math.round(ci + W));
    const j0 = Math.max(0, Math.round(cj - W)), j1 = Math.min(gh - 1, Math.round(cj + W));
    if (i1 <= i0 || j1 <= j0) return;
    let s = 0, cnt = 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const ddx = i - ci, ddy = j - cj;
      s += Math.exp(-(ddx * ddx + ddy * ddy) / (R * R)); cnt++;
    }
    const m = s / cnt, hv = this.hv;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const ddx = i - ci, ddy = j - cj;
      hv[j * gw + i] -= amp * (Math.exp(-(ddx * ddx + ddy * ddy) / (R * R)) - m);
    }
  }
  _render(now){
    const gl = this.gl, rect = this.cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (!w || !h) return;
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    const { gw, gh } = this.cfg, n = gw * gh, f = this.fieldBuf;
    for (let k = 0; k < n; k++) {
      f[k * 4] = this.dx[k]; f[k * 4 + 1] = this.dy[k];
      f[k * 4 + 2] = this.h[k];
      f[k * 4 + 3] = Math.sqrt(this.vx[k] * this.vx[k] + this.vy[k] * this.vy[k]);
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog); gl.bindVertexArray(this.vao);
    // _loadTex ставит PREMULTIPLY на контексте — для сырого поля обязателен сброс,
    // иначе rgb (dx,dy,vx) умножается на «альфу» (vy)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gw, gh, gl.RGBA, gl.FLOAT, f);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[this.curIdx]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[this.nextIdx]);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(this.uMixU, this.mix);
    gl.uniform1f(this.uTimeU, now / 1000);
    gl.uniform1f(this.uWashU, this.wash);
    gl.uniform1f(this.uLevelU, this.level);
    gl.uniform1f(this.uBreachU, this.breach);
    gl.uniform1f(this.uFlowU, this.flow);
    gl.uniform1f(this.uReachU, this.reach);
    gl.uniform1f(this.uFillU, this.fill);
    gl.uniform1f(this.uGlassU, this.glass);
    // огибающая верхней кромки листа: узел k на ξ=50k px от стенки — уровень
    // в момент вылета этой воды (тем же законом скорости, что и фронт) + падение
    const vf = Math.max(240, 620 + 1260 * this.flow);
    for (let k = 0; k < 16; k++) {
      const dtk = k * 50 / vf;
      this.topE[k] = this._lvlAgo(dtk) + 950 * dtk * dtk;
    }
    gl.uniform1fv(this.uTopEU, this.topE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

const GRAIN_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform float uTime; uniform vec2 uRes;
${GL_NOISE}
void main(){
  float g = uc_hash(vUv * uRes + mod(uTime * 60., 1000.)) - .5;
  float warm = (uc_noise(vUv * 3. + uTime * .03) - .5) * .06;
  outC = vec4(vec3(.5 + g * .12 + warm), 1.);
}`;

// восходящий пар на hero: поднимается от линии-источника у низа кадра (y≈0.95,
// x∈[0.56,0.97], перед моделью справа). Турбулентный domain-warp FBM лепит мягкие
// клубящиеся пуфы; конус-огибающая держит пар плотным у линии, расширяет и
// распускает его кверху до прозрачности; поле сносится вверх по uTime + боковое
// колыхание. Выход премультиплицирован (движок: ONE,1-SRC_ALPHA).
// Тюнинг: множитель/потолок `a` — общая плотность; turb — рваность клубов;
// HW0 и rs*… — ширина и высота струи; скорости t*… — темп подъёма и дрейфа.
const MIST_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform float uTime; uniform vec2 uRes;
${GL_NOISE}
// fbm с поворотом между октавами — мягкие клубы без сеточных артефактов нойза
float uc_fbm(vec2 p){
  float v = 0., a = .5;
  mat2 r = mat2(.80, .60, -.60, .80);
  for (int i = 0; i < 4; i++){ v += a * uc_noise(p); p = r * p * 2.0; a *= .5; }
  return v;
}
void main(){
  // === восходящий пар от линии-источника у низа кадра ===
  // vUv.y: 0 — верх кадра, 1 — низ. Источник: y≈0.95, x∈[0.56,0.97] (перед моделью справа).
  // Пар поднимается к меньшим y, расширяется мягкими клубами и тает в прозрачность.
  float t  = uTime;
  float ar = uRes.x / uRes.y;

  // геометрия источника: центр и полуширина струи у линии
  const float SRC_Y = 0.95;
  const float CX0   = 0.765;   // (0.56 + 0.97) / 2
  const float HW0   = 0.205;   // (0.97 - 0.56) / 2

  // линия-источник «дышит» по x — нет прямого горизонтального ребра снизу
  float baseWave = (uc_noise(vec2(vUv.x * 6.0, t * .35)) - .5) * .025;
  float rs = (SRC_Y + baseWave) - vUv.y;       // высота над источником: >0 — выше по экрану

  // всплывая, струя колышется вбок и расширяется конусом (клубы расходятся кверху)
  float sway = sin(t * .35 + rs * 3.0) * .05 * rs
             + (uc_fbm(vec2(rs * 2.5, t * .20)) - .5) * .12 * rs;
  float cx = CX0 + sway;
  float hw = HW0 + rs * .55;                    // полуширина растёт с высотой

  // турбулентный domain-warp по FBM: мягкие пуфы; поле сносится вверх по времени
  // (рост y в сэмпле ⇒ узор бежит вниз по координате ⇒ на экране пар поднимается)
  vec2  np = vec2(vUv.x * ar * 2.6, vUv.y * 2.6 + t * .42);
  vec2  w1 = vec2(uc_fbm(np + vec2(0.0, t * .18)),
                  uc_fbm(np + vec2(5.2, 1.3) - vec2(0.0, t * .12)));
  float turb = .55 + rs * 2.2;                  // у линии собранно, кверху рвётся на клочья
  vec2  w2 = vec2(uc_fbm(np * 1.9 + w1 * turb + vec2(1.7, 9.2)),
                  uc_fbm(np * 1.9 + w1 * turb + vec2(8.3, 2.8)));
  float f  = uc_fbm(np + w1 * turb + w2 * (turb * .4));
  f = smoothstep(.30, .85, f);                  // низкий контраст — облачные пуфы, не струйки

  // огибающие: эмиссия от линии, мягкие бока конуса, затухание кверху
  float gate  = smoothstep(-0.02, 0.05, rs);                 // пар рождается у линии и выше
  float fade  = smoothstep(0.62, 0.0, rs);                   // плотно у низа, тает кверху
  float horiz = smoothstep(1.0, 0.15, abs(vUv.x - cx) / hw); // мягкие боковые границы

  float dens = f * gate * fade * horiz;
  dens *= 1.0 - rs * .35;                       // доп. рассеивание плотности с высотой
  dens = clamp(dens, 0.0, 1.0);

  float a   = clamp(dens * 1.25, 0.0, 0.62);    // умеренно: фон читается сквозь пар
  vec3  col = mix(vec3(.85, .88, .94), vec3(.96, .98, 1.0), f); // прохладный near-white
  outC = vec4(col * a, a);                       // premultiplied alpha
}`;

window.GLEngine = GLEngine; window.BAND_FRAG = BAND_FRAG; window.MORPH_FRAG = MORPH_FRAG; window.GRAIN_FRAG = GRAIN_FRAG; window.FLOW_FRAG = FLOW_FRAG; window.MIST_FRAG = MIST_FRAG; window.FluidBottle = FluidBottle;
