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

// ===== Флакон — сплошная вязкая среда (гель/мёд) =====
// Никаких частиц: фуллскрин-шейдер деформирует фото полем смещений D(uv),
// которое живёт на CPU-сетке ~80×70 как вязкая жидкость (инерция + диффузия
// соседей + пружина к покою). Зазоры невозможны по построению: сэмплинг
// uv - D(uv) непрерывен при любом гладком D. Курсор вмешивает скорость в поле
// (тягучий след, как ложкой по мёду); листание вперёд — стаггер-импульс вправо:
// изображение утекает на текст описания и вязко возвращается уже с новой
// текстурой; назад — мягкое колыхание с кроссфейдом.
const FB_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * .5 + .5; vUv.y = 1. - vUv.y; gl_Position = vec4(aPos, 0., 1.); }`;
const FB_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uTexA, uTexB, uField;
uniform vec2 uSimRes, uGrid; uniform float uMix, uTime, uOffX, uTexW;
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
// шум не превращается в пиксельную «шахматку»
vec4 smpl(vec2 tuv, float stag){
  vec2 b = smoothstep(vec2(0.), vec2(.012, .025), tuv) * smoothstep(vec2(1.), vec2(.988, .975), tuv);
  vec4 A = texture(uTexA, tuv), B = texture(uTexB, tuv);
  float m = clamp((uMix - stag * .5) / .5, 0., 1.);
  return mix(A, B, m * m * (3. - 2. * m)) * b.x * b.y;
}
void main(){
  vec4 F = fld(vUv);
  vec2 px = vUv * uSimRes;
  // едва заметное волнение покоя (~2px), аналитическое — всегда гладкое
  vec2 idle = vec2(
    sin(px.y * .006 - uTime * .8 + px.x * .003) + .5 * sin(px.y * .013 + uTime * .5),
    cos(px.x * .005 - uTime * .55 + px.y * .004)) * vec2(1.25, .8);
  vec2 D = F.xy + idle;
  // капиллярная рябь в движении (~|D|): прямые смазанные кромки текстуры гнутся
  // органическими язычками; в покое строго ноль
  float act = min(1., length(F.xy) * .012);
  D.y += (sin(px.x * .018 + uTime * 2.6) * 9. + sin(px.x * .047 - uTime * 3.7) * 4.) * act;
  D.x += sin(px.y * .03 + uTime * 3.1) * 5. * act;
  vec2 src = px - D;
  vec2 tuv = vec2((src.x - uOffX) / uTexW, src.y / uSimRes.y);
  vec4 col = smpl(tuv, uc_noise(vUv * vec2(6., 5.)));
  // градиенты поля: «толщина» среды и глянец складок
  vec2 e = 1. / uGrid;
  float dDx = (fld(vUv + vec2(e.x, 0.)).x - fld(vUv - vec2(e.x, 0.)).x) / (2. * e.x * uSimRes.x);
  float dDy = (fld(vUv + vec2(0., e.y)).y - fld(vUv - vec2(0., e.y)).y) / (2. * e.y * uSimRes.y);
  float area = abs((1. - dDx) * (1. - dDy));   // якобиан обратного отображения
  // растяжение (area<1) — плёнка тоньше и прозрачнее, сильно растянутая почти
  // исчезает (резкие края текстуры не дают «глитч-штрихов»); сжатие — чуть темнее
  float thin = clamp(pow(min(area, 1.), .7), .04, 1.);
  col *= thin;
  col.rgb *= 1. - .10 * clamp(area - 1., 0., 1.5) / 1.5;
  // тёплый глянец на движущихся складках геля — едва заметный
  float fold = clamp(abs(dDx) * 1.2 - .12, 0., 1.);
  float speed = length(F.zw);
  col.rgb += col.a * fold * min(speed * .0012, .22) * vec3(1.0, .975, .94) * .35;
  outC = col;
}`;

class FluidBottle {
  constructor(canvas, cfg){
    this.cv = canvas;
    this.cfg = Object.assign({ texW: 442, texH: 1083, offX: 83, simW: 1250, simH: 1083, gw: 104, gh: 90 }, cfg);
    const gl = this.gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
    this.ready = false; this.failed = !gl;
    if (this.failed) return;
    this.mix = 1; this.transT = 9e9; this.dir = 1;
    this.cur = { x: -9e3, y: -9e3, vx: 0, vy: 0, t: 0 };
    this.visible = false;
    this.tex = [];
    const n = this.cfg.gw * this.cfg.gh;
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);   // скорость среды, px/s
    this.dx = new Float32Array(n); this.dy = new Float32Array(n);   // накопленное смещение, px
    this.tmp = new Float32Array(n);
    this.fieldBuf = new Float32Array(n * 4);
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
    // поле смещений/скоростей: RGBA16F (xy=D px, zw=v px/s), LINEAR — бикубика в шейдере
    this.fieldTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.fieldTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, c.gw, c.gh);
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
    this.uMixU = U('uMix'); this.uTimeU = U('uTime');
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
  destroy(){
    removeEventListener('pointermove', this._mv);
    this._io.disconnect();
    this.ready = false; this.failed = true;
    const gl = this.gl;
    if (gl) { this.tex.forEach(t => t && gl.deleteTexture(t)); const e = gl.getExtension('WEBGL_lose_context'); if (e) e.loseContext(); }
  }
  init(urls, cb){
    let left = urls.length, bad = false;
    urls.forEach((url, ai) => this._loadTex(url, t => {
      if (!t) bad = true; else this.tex[ai] = t;
      if (--left > 0) return;
      if (bad || this.failed) { this.failed = true; cb && cb(false); return; }
      try { this._initGL(); } catch (e) { this.failed = true; }
      if (this.failed) { cb && cb(false); return; }
      this.curIdx = 0; this.nextIdx = 0;
      this.ready = true;
      this._last = performance.now();
      const tick = now => { this._frame(now); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      cb && cb(true);
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
  // листание: запускает таймлайн форсинга в _step (вперёд — унос вправо, назад — колыхание)
  transition(dir, nextIdx){
    if (!this.tex[nextIdx] || !this.ready) return;
    if (this.mix >= 1) this.curIdx = this.nextIdx;     // прошлый переход дорисован
    this.nextIdx = nextIdx;
    this.dir = dir;
    this.mix = 0; this.transT = 0;
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
  // диффузия по соседям: вязкая связность среды (и гарантия гладкости поля)
  _blur(a, t){
    if (t <= 0) return;
    const { gw, gh } = this.cfg, tmp = this.tmp;
    for (let j = 0; j < gh; j++) {
      const r = j * gw, ru = j > 0 ? r - gw : r, rd = j < gh - 1 ? r + gw : r;
      for (let i = 0; i < gw; i++) {
        const il = i > 0 ? i - 1 : i, ir = i < gw - 1 ? i + 1 : i;
        const avg = (a[r + il] + a[r + ir] + a[ru + i] + a[rd + i]) * .25;
        tmp[r + i] = a[r + i] + (avg - a[r + i]) * t;
      }
    }
    a.set(tmp);
  }
  _step(dt, now){
    this.transT += dt;
    const fwd = this.dir > 0, T = this.transT;
    // кроссфейд текстур — в максимуме смаза (вперёд) или коротко под колыхание (назад)
    this.mix = Math.min(1, Math.max(0, fwd ? (T - .55) / .5 : (T - .3) / .42));
    if (this.mix >= 1 && this.curIdx !== this.nextIdx) this.curIdx = this.nextIdx;
    // затухание скорости курсора, когда он не движется
    if (now - this.cur.t > 90) { this.cur.vx *= Math.pow(.8, dt * 60); this.cur.vy *= Math.pow(.8, dt * 60); }
    const { gw, gh, simW, simH } = this.cfg;
    const cw = simW / gw, ch = simH / gh;
    const vx = this.vx, vy = this.vy, dx = this.dx, dy = this.dy;
    // фазовая жёсткость: в полёте среда мягкая (течёт), на возврате собирается
    const active = T < 3;
    const rt = Math.min(1, Math.max(0, (T - .85) / .85));
    const ramp = rt * rt * (3 - 2 * rt);
    const ks = active ? 2.2 + 15 * ramp : 11;
    const damp = Math.exp(-(active ? 2.0 + 3.6 * ramp : 4.8) * dt);
    // форсинг листания: когерентная волна импульсов (стаггер по x)
    if (T < 1.1) {
      for (let j = 0; j < gh; j++) {
        const sy = (j + .5) * ch, r = j * gw;
        for (let i = 0; i < gw; i++) {
          const sx = (i + .5) * cw, k = r + i;
          if (fwd) {
            // вперёд: правому краю — больший разгон (среда тянется, как мёд с ложки);
            // стаггер по строкам мал — строки идут связно, без «нарезки» горловины
            const p = T - sx / simW * .26 - Math.sin(sy * .012 + 1.7) * .015 - .05;
            if (p > -.3 && p < .45) {
              const g = Math.exp(-p * p / .024) * dt / .27;
              vx[k] += (500 + 2300 * Math.pow(sx / simW, 1.1)) * g;
              // изгибающая волна по x: прямые кромки текстуры гнутся, а не тянутся линейкой
              vy[k] += (Math.max(-90, Math.min(90, (840 - sy) * .18)) + Math.sin(sx * .0045 + T * 2.5) * 55) * g;
            }
          } else {
            // назад: мягкий толчок влево без уноса
            const p = T - (1 - sx / simW) * .13 - .04;
            if (p > -.25 && p < .35) {
              const g = Math.exp(-p * p / .016) * dt / .226;
              vx[k] -= (320 + Math.sin(sy * .01 + sx * .005) * 80) * g;
              vy[k] += Math.sin(sy * .013 + 2.2) * 60 * g;
            }
          }
        }
      }
    }
    // курсор: вязкое вмешивание скорости в поле (медленный тягучий след);
    // сила ~ скорости курсора — неподвижная «ложка» поле не держит
    if (this.cur.x > -8e3) {
      const cx = this.cur.x, cy = this.cur.y;
      const cvx = Math.max(-2200, Math.min(2200, this.cur.vx)), cvy = Math.max(-2200, Math.min(2200, this.cur.vy));
      const spd = Math.hypot(cvx, cvy);
      const R = 170, drag = Math.min(1, 7 * dt) * Math.min(1, spd / 500);
      const i0 = Math.max(0, Math.floor((cx - R) / cw)), i1 = Math.min(gw - 1, Math.ceil((cx + R) / cw));
      const j0 = Math.max(0, Math.floor((cy - R) / ch)), j1 = Math.min(gh - 1, Math.ceil((cy + R) / ch));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const ddx = (i + .5) * cw - cx, ddy = (j + .5) * ch - cy;
        const g = Math.exp(-3 * (ddx * ddx + ddy * ddy) / (R * R)) * drag;
        const k = j * gw + i;
        vx[k] += (cvx * .85 - vx[k]) * g;
        vy[k] += (cvy * .85 - vy[k]) * g;
      }
    }
    // вязкая диффузия скорости: соседи увлекаются — среда сплошная
    const vt = Math.min(1, 12 * dt);
    this._blur(vx, vt); this._blur(vy, vt);
    // пружина к покою + затухание + интеграция смещения
    const n = gw * gh;
    for (let k = 0; k < n; k++) {
      vx[k] = (vx[k] - ks * dx[k] * dt) * damp;
      vy[k] = (vy[k] - ks * dy[k] * dt) * damp;
      dx[k] = Math.max(-1500, Math.min(1500, dx[k] + vx[k] * dt));
      dy[k] = Math.max(-400, Math.min(400, dy[k] + vy[k] * dt));
    }
    // диффузия смещения — поле всегда гладкое; в полёте сильнее:
    // строки склеены, силуэт не режется на полосы и ступени
    const dtf = Math.min(1, (active ? 6 : 2.5) * dt);
    this._blur(dx, dtf); this._blur(dy, dtf);
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
      f[k * 4 + 2] = this.vx[k]; f[k * 4 + 3] = this.vy[k];
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

window.GLEngine = GLEngine; window.BAND_FRAG = BAND_FRAG; window.MORPH_FRAG = MORPH_FRAG; window.GRAIN_FRAG = GRAIN_FRAG; window.FLOW_FRAG = FLOW_FRAG; window.FluidBottle = FluidBottle;
