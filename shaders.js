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

// ===== Флакон из частиц (igloo-style, но «вода») =====
// Пейзаж флакона разбит на ~30к чанков-точек. Каждая — чуть вязкая капля:
// пружина к дому + сильное трение, реагирует на курсор (увлекается его скоростью),
// при листании вперёд волной слева направо улетает на текст описания и смывает его,
// затем стекает обратно домой уже с цветами нового аромата.
const PB_VERT = `#version 300 es
in vec2 aPos; in vec2 aUV; in float aSize; in vec2 aRnd;
uniform vec2 uSimRes, uTexSize; uniform float uPx, uMix;
out vec2 vUVc; out float vUVh, vMix, vSize;
void main(){
  vec2 ndc = aPos / uSimRes * 2. - 1.;
  gl_Position = vec4(ndc.x, -ndc.y, 0., 1.);
  float m = clamp((uMix - aRnd.y * .35) / .65, 0., 1.);
  vMix = m * m * (3. - 2. * m);
  vUVc = aUV;                                  // центр чанка в uv текстуры
  vUVh = (aSize * .5 + .45) / uTexSize.y;      // полуразмер с нахлёстом (текстура непрерывна — швов нет)
  vSize = aSize;
  gl_PointSize = (aSize + .9) * uPx;
}`;
const PB_FRAG = `#version 300 es
precision highp float;
in vec2 vUVc; in float vUVh, vMix, vSize;
uniform sampler2D uTexA, uTexB; uniform vec2 uTexSize;
out vec4 outC;
void main(){
  float aspect = uTexSize.y / uTexSize.x;
  vec2 uv = vUVc + (gl_PointCoord - .5) * 2. * vUVh * vec2(aspect, 1.);
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) discard;
  outC = mix(texture(uTexA, uv), texture(uTexB, uv), vMix);
}`;

class ParticleBottle {
  constructor(canvas, cfg){
    this.cv = canvas;
    this.cfg = Object.assign({ texW: 442, texH: 1083, offX: 83, simW: 1250, simH: 1083 }, cfg);
    const gl = this.gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
    this.ready = false; this.failed = !gl;
    if (this.failed) return;
    this.mix = 1; this.transT = 9e9;
    this.cur = { x: -9e3, y: -9e3, vx: 0, vy: 0, t: 0 };
    this.visible = false;
    this.tex = [];
    new IntersectionObserver(es => es.forEach(e => { this.visible = e.isIntersecting; }), { rootMargin: '60px' }).observe(canvas);
    addEventListener('pointermove', e => this._onMove(e), { passive: true });
  }
  // квадродерево «склеек»: чанки 16/8/4px, чанк живёт если под ним есть непрозрачные пиксели
  _buildChunks(alpha){
    const c = this.cfg, W = c.texW, H = c.texH;
    const has = (x0, y0, s) => {
      for (let y = y0; y < y0 + s && y < H; y += 2) {
        const row = y * W;
        for (let x = x0; x < x0 + s && x < W; x += 2) if (alpha[(row + x) * 4 + 3] > 24) return true;
      }
      return false;
    };
    const out = [];
    const put = (x0, y0, s) => out.push(x0 + s / 2, y0 + s / 2, s);
    for (let y0 = 0; y0 < H; y0 += 16) for (let x0 = 0; x0 < W; x0 += 16) {
      if (!has(x0, y0, 16)) continue;
      if (Math.random() < .30) { put(x0, y0, 16); continue; }
      for (let qy = 0; qy < 2; qy++) for (let qx = 0; qx < 2; qx++) {
        const x8 = x0 + qx * 8, y8 = y0 + qy * 8;
        if (!has(x8, y8, 8)) continue;
        if (Math.random() < .55) { put(x8, y8, 8); continue; }
        for (let ry = 0; ry < 2; ry++) for (let rx = 0; rx < 2; rx++) {
          const x4 = x8 + rx * 4, y4 = y8 + ry * 4;
          if (has(x4, y4, 4)) put(x4, y4, 4);
        }
      }
    }
    return out;
  }
  _initGL(chunks){
    const gl = this.gl, c = this.cfg;
    const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = this.prog = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, PB_VERT)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, PB_FRAG));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { this.failed = true; return; }
    gl.useProgram(p);
    const N = this.N = chunks.length / 3;
    this.pos = new Float32Array(N * 2); this.vel = new Float32Array(N * 2);
    this.home = new Float32Array(N * 2); this.rnd = new Float32Array(N * 2);
    this.im = new Float32Array(N);                      // «лёгкость»: мелкие чанки подвижнее
    this.idel = new Float32Array(N); this.ivx = new Float32Array(N); this.ivy = new Float32Array(N);
    const uv = new Float32Array(N * 2), size = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      const cx = chunks[k*3], cy = chunks[k*3+1], s = chunks[k*3+2];
      this.home[k*2] = this.pos[k*2] = c.offX + cx;
      this.home[k*2+1] = this.pos[k*2+1] = cy;
      uv[k*2] = cx / c.texW; uv[k*2+1] = cy / c.texH;
      size[k] = s;
      this.im[k] = Math.sqrt(4 / s);
      this.rnd[k*2] = Math.random(); this.rnd[k*2+1] = Math.random();
    }
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const attr = (name, buf, n, dynamic) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, buf, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(p, name);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
      return b;
    };
    this.bPos = attr('aPos', this.pos, 2, true);
    attr('aUV', uv, 2, false);
    attr('aSize', size, 1, false);
    attr('aRnd', this.rnd, 2, false);
    const U = n => gl.getUniformLocation(p, n);
    this.uSimRes = U('uSimRes'); this.uTexSize = U('uTexSize');
    this.uPx = U('uPx'); this.uMixU = U('uMix');
    this.uTexA = U('uTexA'); this.uTexB = U('uTexB');
    gl.uniform2f(this.uTexSize, c.texW, c.texH);
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      cb(t, img);
    };
    img.onerror = () => cb(null);
    img.src = url;
  }
  // загрузка ароматов: GL-текстуры + альфа-карта первого для раскладки чанков
  init(urls, cb){
    const c = this.cfg;
    let left = urls.length, bad = false, alphaDone = false;
    const tryFinish = () => {
      if (left > 0 || !alphaDone) return;
      if (bad || this.failed || !this._alpha) { this.failed = true; cb && cb(false); return; }
      try { this._initGL(this._buildChunks(this._alpha)); } catch (e) { this.failed = true; }
      if (this.failed) { cb && cb(false); return; }
      this.curIdx = 0; this.nextIdx = 0;
      this.ready = true;
      this._last = performance.now();
      const tick = now => { this._frame(now); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      cb && cb(true);
    };
    urls.forEach((url, ai) => this._loadTex(url, (t, img) => {
      if (!t) bad = true;
      else {
        this.tex[ai] = t;
        if (ai === 0) {
          const cnv = document.createElement('canvas'); cnv.width = c.texW; cnv.height = c.texH;
          const ctx = cnv.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, c.texW, c.texH);
          this._alpha = ctx.getImageData(0, 0, c.texW, c.texH).data;
          alphaDone = true;
        }
      }
      if (ai === 0 && !this._alpha) alphaDone = true;
      left--; tryFinish();
    }));
  }
  _onMove(e){
    const r = this.cv.getBoundingClientRect();
    if (!r.width) return;
    const x = (e.clientX - r.left) / r.width * this.cfg.simW;
    const y = (e.clientY - r.top) / r.height * this.cfg.simH;
    const now = performance.now();
    const dt = Math.min(.1, (now - (this.cur.t || now)) / 1000) || .016;
    const k = .45;                                   // сглаживание скорости курсора
    this.cur.vx += ((x - (this.cur.x > -8e3 ? this.cur.x : x)) / dt - this.cur.vx) * k;
    this.cur.vy += ((y - (this.cur.y > -8e3 ? this.cur.y : y)) / dt - this.cur.vy) * k;
    this.cur.x = x; this.cur.y = y; this.cur.t = now;
  }
  // листание: волна импульсов + кроссфейд текстур (uMix со стаггером в вершиннике)
  transition(dir, nextIdx){
    if (!this.tex[nextIdx] || !this.ready) return;
    if (this.mix >= 1) this.curIdx = this.nextIdx;     // прошлый переход дорисован
    this.nextIdx = nextIdx;
    this.mix = 0; this.transT = 0;
    const c = this.cfg, N = this.N;
    for (let k = 0; k < N; k++) {
      const hx = this.home[k*2] - c.offX, hy = this.home[k*2+1];
      const r0 = this.rnd[k*2], r1 = this.rnd[k*2+1], im = this.im[k];
      if (dir > 0) {                                  // вперёд: когерентная волна слева направо на текст
        this.idel[k] = (hx / c.texW) * .28 + r0 * .05;
        this.ivx[k] = (2100 + Math.sin(hy * .017 + r0 * 2.) * 130 + r1 * 180) * (.55 + .45 * im);
        // лёгкая воронка к строке описания (sim y ~840), без сжатия в полосы
        const fy = (840 - hy) * (.18 + r0 * .08);
        this.ivy[k] = (Math.max(-170, Math.min(170, fy)) + (r1 - .5) * 60) * (.55 + .45 * im);
      } else {                                        // назад: мягкое колыхание влево, без полёта
        this.idel[k] = ((c.texW - hx) / c.texW) * .14 + r0 * .05;
        this.ivx[k] = -(170 + r1 * 90) * im;
        this.ivy[k] = (r0 - .5) * 70 * im;
      }
    }
  }
  _frame(now){
    if (!this.ready || this.failed) return;
    if (!this.visible || document.hidden) { this._last = now; return; }
    // сабстепы фиксированного шага: физика течёт в реальном времени даже при просадке fps
    let acc = Math.min(.1, Math.max(.001, (now - this._last) / 1000));
    this._last = now;
    while (acc > 1e-4) { const dt = Math.min(acc, .0167); this._step(dt, now); acc -= dt; }
    this._render();
  }
  _step(dt, now){
    this.transT += dt;
    this.mix = Math.min(1, Math.max(0, (this.transT - .55) / .95));
    // затухание скорости курсора, когда он не движется
    if (now - this.cur.t > 90) { this.cur.vx *= Math.pow(.8, dt * 60); this.cur.vy *= Math.pow(.8, dt * 60); }

    if (this.mix >= 1 && this.curIdx !== this.nextIdx) this.curIdx = this.nextIdx;
    const N = this.N, pos = this.pos, vel = this.vel, home = this.home, im = this.im;
    const idel = this.idel, ivx = this.ivx, ivy = this.ivy;
    const cx = this.cur.x, cy = this.cur.y;
    const cvx = Math.max(-2600, Math.min(2600, this.cur.vx)), cvy = Math.max(-2600, Math.min(2600, this.cur.vy));
    // фазовая жёсткость: в полёте пружина слабая (частицы парят),
    // на возврате — жёстче, чтобы флакон собирался быстро и чётко
    const rt = Math.min(1, Math.max(0, (this.transT - .9) / 1.));
    const ramp = rt * rt * (3 - 2 * rt);
    const damp = Math.pow(.959 - .02 * ramp, dt * 60);
    const spring = (1.6 + 3.2 * ramp) * dt;
    const R = 95, R2 = R * R;
    const tw = now * .001;
    for (let k = 0; k < N; k++) {
      const i2 = k * 2;
      let x = pos[i2], y = pos[i2+1], vx = vel[i2], vy = vel[i2+1];
      // волна импульсов листания
      if (idel[k] > 0) {
        idel[k] -= dt;
        if (idel[k] <= 0) { vx += ivx[k]; vy += ivy[k]; }
      }
      const imk = im[k];
      // курсор: вязкое увлечение + расталкивание (мелкие склейки подвижнее)
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / R) * imk;
        vx += (cvx * 10 * dt + dx / d * 750 * dt) * f;
        vy += (cvy * 10 * dt + dy / d * 750 * dt) * f;
      }
      // едва заметный wave: медленная бегущая волна по изображению
      const hxk = home[i2], hyk = home[i2+1];
      vx += Math.sin(hyk * .006 - tw * 1.05 + hxk * .003) * 11 * dt * imk;
      vy += Math.cos(hxk * .005 - tw * .65 + hyk * .004) * 6 * dt * imk;
      // вязкая пружина к дому
      vx += (home[i2] - x) * spring;
      vy += (home[i2+1] - y) * spring;
      vx *= damp; vy *= damp;
      x += vx * dt; y += vy * dt;
      pos[i2] = x; pos[i2+1] = y; vel[i2] = vx; vel[i2+1] = vy;
    }
  }
  _render(){
    const pos = this.pos, N = this.N;
    const gl = this.gl, rect = this.cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.prog); gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[this.curIdx]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[this.nextIdx]);
    gl.uniform1i(this.uTexA, 0); gl.uniform1i(this.uTexB, 1);
    gl.uniform2f(this.uSimRes, this.cfg.simW, this.cfg.simH);
    gl.uniform1f(this.uPx, w / this.cfg.simW);
    gl.uniform1f(this.uMixU, this.mix);
    gl.drawArrays(gl.POINTS, 0, N);
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

window.GLEngine = GLEngine; window.BAND_FRAG = BAND_FRAG; window.MORPH_FRAG = MORPH_FRAG; window.GRAIN_FRAG = GRAIN_FRAG; window.FLOW_FRAG = FLOW_FRAG; window.ParticleBottle = ParticleBottle;
