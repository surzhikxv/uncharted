# UNCHARTED: интерактив, фотоокно, карусель, скала, анимации — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать лендинг UNCHARTED интерактивным (ссылки, модалка КУПИТЬ), заменить каменную плиту WebGL-фотоокном, добавить WebGL-карусель ароматов, перебейкать скалу без впечённых букв и добавить насыщенные, но спокойные анимации — не сломав pixel-perfect десктоп и не тронув мобильное дерево `.m`.

**Architecture:** Без зависимостей. `app.js` — конфиг ссылок, модалка, скролл, карусель-логика, reveals, параллакс. `shaders.js` — мини-движок WebGL2 (один rAF, пауза вне вьюпорта, DPR cap 1.5) + 3 фрагментных шейдера (фотоокно, liquid-морф, зерно хиро). `anim.css` — модалка, hover, reveal-стили. Спека: `docs/superpowers/specs/2026-06-11-uncharted-interactivity-design.md`.

**Tech Stack:** Vanilla JS (ES2020), WebGL2 (фолбэк WebGL1 не нужен — фолбэк статика), CSS, Playwright для проверок, figma MCP для ассетов.

---

## Важные инварианты (для каждой задачи)

1. **Десктоп pixel-perfect.** После каждой задачи: скрин 1920px при `prefers-reduced-motion: reduce` → `node /tmp/pngtools/finediff.js <shot> reference/frame-full.png`. Отличия допустимы ТОЛЬКО в зонах: плита y1392–1770 (задачи 2+); блок n623 (1242,5758,556×130) и зона стрелок карусели (~(640..710, 6150..6300) и (~1190..1260, 6150..6300)) (задачи 3+); левый край скалы у слова x0–557 y5177–5500 — только УЛУЧШЕНИЕ: исчезновение тёмных «UN» (задачи 3+). Reference имеет offset +6px по x (см. `/tmp/pngtools/sample.js` — сравнивает `[x+6,y]`).
2. **Мобильное дерево `.m` и `mobile.css` НЕ менять.** После каждой задачи: `cd /tmp/pwtool && node mscroll.js http://localhost:8123/index.html /tmp/checks/m 390 844` — скрины поэкранно, глазами убедиться что ничего не уехало.
3. **WebGL-текстуры не грузятся с `file://`** — работаем через dev-сервер: `python3 -m http.server 8123` в корне репо (фоном). Скрины для finediff тоже через http.
4. **reduced-motion = полный фолбэк:** никаких скрытых элементов, канвасы не инициализируются, fallback-картинки видимы. Это и есть состояние для пиксель-диффа.
5. Каждая задача = отдельный коммит (сообщения на русском, как в истории репо).

## Структура файлов

- `index.html` — точечные правки: теги ссылок, канвасы, модалка, стрелки, подключение `anim.css`, `app.js`, `shaders.js`.
- `styles.css` — удалить `.n691`; добавить `.photoband`, стили стрелок не сюда (в anim.css). Минимум правок.
- `anim.css` (новый) — модалка, ссылки/hover, reveal-классы, стрелки карусели, каскад хиро.
- `app.js` (новый) — `LINKS`, `AROMAS`, модалка, скролл-навигация, карусель, reveals, параллакс, letter-split.
- `shaders.js` (новый) — `GLEngine` + шейдеры `BAND_FRAG`, `MORPH_FRAG`, `GRAIN_FRAG`.
- `public/images/render/aromas/*.png` (новые) — флаконы 4 ароматов из Figma.
- `public/images/render/rock-690.png` — заменяется чистым экспортом.

## Данные из Figma (уже добыты разведкой, file `0oOzxMla9AEFWsIQ8FgOCv`)

Ароматы (порядок карусели). Флакон-маски — GROUP-ноды, экспорт PNG:

| slug | caption | bottle node | файл |
|---|---|---|---|
| mango-bliss | `/ MANGO BLISS` | (уже есть) | `public/images/render/bottle-625.png` |
| namibia-dunes | `/ NAMIBIA DUNES` | `521:925` | `public/images/render/aromas/namibia-dunes.png` |
| islay-smoke | `/ ISLAY SMOKE` | `521:936` | `public/images/render/aromas/islay-smoke.png` |
| citrus-vetiver | `/ CITRUS VETIVER` | `521:948` | `public/images/render/aromas/citrus-vetiver.png` |
| kamchatka-veil | `/ KAMCHATKA VEIL` | `521:960` | `public/images/render/aromas/kamchatka-veil.png` |

Описания (innerHTML для `.n624`, разметка как у текущего манго — спаны `ts4/ts6/ts7`):

- mango-bliss (текущий, не менять):
  `<span class="ts4">аромат MANGO BLISS</span><br><span class="ts6">— </span><span class="ts7">билет в неизведнанные<br>уголки тропиков мьянмы,<br>где сладкий аромат манго<br>переплетается с ежевикой,<br>иланг-илангом и ноткой<br>пачули</span>`
- namibia-dunes (Figma 521:924):
  `<span class="ts4">аромат NAMIBIA DUNES</span><br><span class="ts6">— </span><span class="ts7">билет в пустыню НАМИБ<br>с бескрайними дюнами,<br>где сладкий апельсин тает в розовом перце, пряных специях и древесном кедре</span>`
- islay-smoke (521:935):
  `<span class="ts4">аромат ISLAY SMOKE</span><br><span class="ts6">— </span><span class="ts7">прогулка по ветренным шотландским холмам,<br>где в воздухе ощущается запах выдержанного виски и табачного дыма. Теплые ноты какао и амбры окутывают словно вечерний туман</span>`
- citrus-vetiver (521:947):
  `<span class="ts4">аромат CITRUS VETIVER</span><br><span class="ts6">— </span><span class="ts7">поход в густые леса мабу, где свежесть ветивера<br>и тепло ореховой коры сливаются со сладким ароматом лимонной карамели и бобов тонка</span>`
- kamchatka-veil (521:959):
  `<span class="ts4">аромат KAMCHATKA VEIL</span><br><span class="ts6">— </span><span class="ts7">путешествие на вершины вулканов камчатки, где каждый вздох наполнен пикантным черным перцем<br>и бодрящим бергамотом<br>с нежностью ванили<br>и белого чая</span>`

Обновлённый текст n623 (Figma 521:923, в актуальном макете без терракотового акцента):
`высокое качество отдушек прямиком из европейских парфюмерных домов` (класс `.up` оставляет капс). Перед правкой свериться одним запросом `get_figma_data nodeId=521:623` — если там всё же есть цветной спан, повторить его.

Скала: нода `521:690`, экспорт PNG scale 1 → 557×1102, на замену `public/images/render/rock-690.png`.

URL-конфиг (вставить в `app.js` как есть):

```js
const LINKS = {
  wildberries: 'https://www.wildberries.ru/brands/uncharted',
  goldapple:   'https://goldapple.ru/brands/uncharted',
  ozon:        'https://www.ozon.ru/seller/uncharted-1545281/products/?miniapp=seller_1545281',
  letu:        'https://www.letu.ru/brand/uncharted',
  vk:          'https://vk.com/unchartedcosmetics',
  instagram:   'https://www.instagram.com/uncharted_cosmetics/',
  email:       'mailto:info.uncharted@list.ru',
};
```

---

### Task 0: Инфраструктура проверок

**Files:** нет изменений в репо (всё в /tmp).

- [ ] **Step 0.1: Dev-сервер фоном**

```bash
cd /Users/seva/Desktop/uncharted-dev && (python3 -m http.server 8123 >/tmp/devserver.log 2>&1 &) && sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8123/index.html
```
Expected: `200`.

- [ ] **Step 0.2: Скрипт скрина с reduced-motion** — записать в `/tmp/pwtool/rmshot.js`:

```js
// node rmshot.js <url> <out.png>  — full-page 1920 screenshot, prefers-reduced-motion
const { chromium } = require('playwright');
(async () => {
  const [url, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 }, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
})();
```

- [ ] **Step 0.3: Базовый дифф ДО правок** (контроль, что harness честный):

```bash
mkdir -p /tmp/checks && cd /tmp/pwtool && node rmshot.js http://localhost:8123/index.html /tmp/checks/base.png && node /tmp/pngtools/finediff.js /tmp/checks/base.png /Users/seva/Desktop/uncharted-dev/reference/frame-full.png
```
Expected: вывод вида `tiles MAD>8: N  MAD>15: M` с малыми N, M (зафиксировать значения как базовую линию: новые задачи не должны добавлять тайлы вне разрешённых зон).

---

### Task 1: Ссылки, навигация, модалка КУПИТЬ

**Files:**
- Modify: `index.html` (строки 14–58, 93–118, 343–355)
- Create: `anim.css`, `app.js`
- Modify: `styles.css` (одна добавка для `a.t`)

- [ ] **Step 1.1: Подключить новые файлы в `index.html`**

В `<head>` после `mobile.css`: `<link rel="stylesheet" href="anim.css">`.
Перед `</body>` (после существующего inline-скрипта): `<script src="shaders.js" defer></script><script src="app.js" defer></script>`. Файл `shaders.js` создать пустым с комментарием `// WebGL engine — заполняется в Task 2`.

- [ ] **Step 1.2: Превратить тексты в ссылки (геометрия не меняется)**

В `index.html` заменить:
```html
<p class="t up nav-link n614">о бренде</p>
<p class="t up nav-link n615">каталог</p>
<p class="t up nav-link n616">контакты</p>
```
на
```html
<a class="t up nav-link n614" href="#" data-scroll="7069">о бренде</a>
<a class="t up nav-link n615" href="#" data-scroll="1789">каталог</a>
<a class="t up nav-link n616" href="#" data-scroll="8428">контакты</a>
```
Аналогично: `n640` → `<a class="t n640" href="mailto:info.uncharted@list.ru">info.uncharted@list.ru</a>`; `n645` → `<a ... data-link="vk">ВКонтакте</a>`; `n646` → `<a ... data-link="instagram">Instagram</a>`; магазины `n667`→`data-link="goldapple"`, `n668`→`data-link="ozon"`, `n669`→`data-link="letu"`, `n670`→`data-link="wildberries"` (тоже `<a class="t shop nXXX" href="#">`). Юр. ссылки n641–n644 НЕ трогать. Кнопке-герою: `<div class="btn n610" data-scroll="1789"><span>каталог</span></div>`. Кнопкам КУПИТЬ n583/585/587/589 добавить `data-buy`. Лого `n594` добавить `data-scroll="0"`.

В `styles.css` после блока `.up`: `a.t, a.btn { color: #313131; text-decoration: none; }` и `.nav-link, .btn, [data-scroll], [data-buy], [data-link] { cursor: pointer; }`.

- [ ] **Step 1.3: Модалка — разметка**

В `index.html` после `</div>` дерева `.m`, перед скриптами:
```html
<div class="buy-modal" id="buyModal" hidden>
  <div class="buy-overlay" data-close></div>
  <div class="buy-card" role="dialog" aria-modal="true" aria-label="Где купить">
    <button class="buy-close" data-close aria-label="Закрыть">&#10005;</button>
    <p class="buy-title">ГДЕ КУПИТЬ</p>
    <a class="buy-row" data-link="wildberries" href="#" target="_blank" rel="noopener"><img src="public/images/icon-671.svg" alt="">Wildberries</a>
    <a class="buy-row" data-link="goldapple" href="#" target="_blank" rel="noopener"><img src="public/images/icon-660.svg" alt="">Золотое яблоко</a>
    <a class="buy-row" data-link="ozon" href="#" target="_blank" rel="noopener"><img src="public/images/icon-680.svg" alt="">Ozon</a>
    <a class="buy-row" data-link="letu" href="#" target="_blank" rel="noopener"><img src="public/images/icon-684.svg" alt="">ЛЭТУАЛЬ</a>
  </div>
</div>
```

- [ ] **Step 1.4: `anim.css` — стили модалки и hover**

```css
/* ===== Модалка КУПИТЬ ===== */
.buy-modal { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; }
.buy-modal[hidden] { display: none; }
.buy-overlay { position: absolute; inset: 0; background: rgba(49, 33, 24, .45); backdrop-filter: blur(3px); }
.buy-card { position: relative; width: min(440px, 86vw); background: #FAF5F1; border-radius: 12px; padding: 44px 40px 36px; font-family: 'Tenor Sans', sans-serif; box-shadow: 0 24px 80px rgba(60, 25, 8, .35); animation: buyIn .35s cubic-bezier(.22,1,.36,1); }
@keyframes buyIn { from { opacity: 0; transform: translateY(14px) scale(.98); } }
.buy-title { font-size: 26px; letter-spacing: .08em; color: #C35B3F; margin-bottom: 26px; }
.buy-row { display: flex; align-items: center; gap: 16px; padding: 14px 10px; font-size: 21px; color: #313131; text-decoration: none; border-radius: 8px; transition: background .25s, transform .25s; }
.buy-row img { width: 36px; height: 36px; }
.buy-row:hover { background: #F1E5DC; transform: translateX(4px); }
.buy-close { position: absolute; top: 14px; right: 16px; border: 0; background: none; font-size: 20px; color: #8a7a6e; cursor: pointer; padding: 8px; transition: color .2s; }
.buy-close:hover { color: #C35B3F; }
body.modal-open { overflow: hidden; }
/* ===== Hover статики ===== */
.btn { transition: background .3s, letter-spacing .3s; }
.btn:hover { background: #A94A30; }
.btn:hover span { letter-spacing: .02em; }
.nav-link { transition: color .25s; }
.nav-link:hover { color: #C35B3F; }
a.t.shop:hover, a.t.n645:hover, a.t.n646:hover, a.t.n640:hover { color: #C35B3F; transition: color .25s; }
```

- [ ] **Step 1.5: `app.js` — конфиг, скролл, модалка**

```js
(function () {
  'use strict';
  const LINKS = { /* блок из раздела «Данные» — вставить целиком */ };
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zoom = () => Math.max(document.documentElement.clientWidth, 769) / 1920;

  // --- ссылки из конфига ---
  document.querySelectorAll('[data-link]').forEach(el => {
    const url = LINKS[el.dataset.link];
    if (!url) return;
    if (el.tagName === 'A') { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
  });

  // --- плавный скролл ---
  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const y = parseFloat(el.dataset.scroll) * (document.documentElement.clientWidth > 768 ? zoom() : 1);
      window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  // --- иконки футера кликабельны как соседние ссылки ---
  [['n647','vk'],['n651','instagram'],['n660','goldapple'],['n671','wildberries'],['n680','ozon'],['n684','letu'],['n687','letu']].forEach(([cls, key]) => {
    const el = document.querySelector('.' + cls);
    if (el) { el.style.cursor = 'pointer'; el.addEventListener('click', () => window.open(LINKS[key], '_blank', 'noopener')); }
  });

  // --- модалка КУПИТЬ ---
  const modal = document.getElementById('buyModal');
  const openModal = () => { modal.hidden = false; document.body.classList.add('modal-open'); modal.querySelector('.buy-row').focus(); };
  const closeModal = () => { modal.hidden = true; document.body.classList.remove('modal-open'); };
  document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', openModal));
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
})();
```
(Файл будет дополняться в задачах 2/4/5 — секции добавлять внутрь того же IIFE.)

- [ ] **Step 1.6: Probe-скрипт** — записать `/tmp/pwtool/probe.js`:

```js
// node probe.js <url> — проверка интерактива; падает с кодом 1 при провале
const { chromium } = require('playwright');
const assert = (c, m) => { if (!c) { console.error('FAIL: ' + m); process.exitCode = 1; } else console.log('ok: ' + m); };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  await page.goto(process.argv[2], { waitUntil: 'networkidle' });
  assert(await page.getAttribute('.n640', 'href') === 'mailto:info.uncharted@list.ru', 'mailto');
  assert((await page.getAttribute('.n645', 'href')).includes('vk.com/unchartedcosmetics'), 'vk');
  assert((await page.getAttribute('.n670', 'href')).includes('wildberries.ru/brands'), 'wb shop');
  await page.click('.n583'); await page.waitForTimeout(400);
  assert(await page.isVisible('.buy-card'), 'модалка открылась');
  assert((await page.getAttribute('.buy-row[data-link="ozon"]', 'href')).includes('ozon.ru/seller'), 'ozon в модалке');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  assert(!(await page.isVisible('.buy-card')), 'модалка закрылась по Esc');
  await page.click('.n615'); await page.waitForTimeout(1200);
  assert((await page.evaluate(() => scrollY)) > 1000, 'скролл к каталогу');
  await browser.close();
})();
```

- [ ] **Step 1.7: Прогнать probe + дифф + мобилка**

```bash
cd /tmp/pwtool && node probe.js http://localhost:8123/index.html \
 && node rmshot.js http://localhost:8123/index.html /tmp/checks/t1.png \
 && node /tmp/pngtools/finediff.js /tmp/checks/t1.png /Users/seva/Desktop/uncharted-dev/reference/frame-full.png \
 && node mscroll.js http://localhost:8123/index.html /tmp/checks/m1 390 844
```
Expected: все `ok:`; дифф не хуже базовой линии Task 0; мобильные скрины глазами — без изменений.

- [ ] **Step 1.8: Commit**

```bash
git add index.html styles.css anim.css app.js shaders.js && git commit -m "Интерактив: навигация, ссылки футера, модалка КУПИТЬ с маркетплейсами"
```

---

### Task 2: WebGL-движок + фотоокно вместо плиты

**Files:**
- Modify: `index.html` (строки 124–125), `styles.css` (`.n691` → `.photoband`)
- Create/fill: `shaders.js`
- Modify: `app.js` (инициализация сцены)

- [ ] **Step 2.1: Заменить плиту в разметке**

`index.html`: вместо
```html
<img class="abs n691" src="public/images/render/slab-691.png" alt="">
```
поставить
```html
<div class="abs photoband-wrap">
  <img class="abs photoband-fallback" src="public/images/adj/521-607-adj.png" alt="">
  <canvas class="photoband" data-shader="band"></canvas>
</div>
```
`styles.css`: удалить правило `.n691 { ... }`, добавить:
```css
.photoband-wrap { left: 0; top: 1392px; width: 1920px; height: 378px; }
.photoband { position: absolute; inset: 0; width: 100%; height: 100%; }
.photoband-fallback { left: 0; top: 0; width: 1920px; height: 378px; object-fit: cover; object-position: 50% 38%;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 18%, #000 82%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 18%, #000 82%, transparent 100%); }
.webgl-on .photoband-fallback { visibility: hidden; }
```
(Канвас поверх фолбэка; когда WebGL поднялся, `app.js` вешает класс `webgl-on` на `body`.)

- [ ] **Step 2.2: `shaders.js` — движок целиком**

```js
'use strict';
const GL_VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * .5 + .5; vUv.y = 1. - vUv.y; gl_Position = vec4(aPos, 0., 1.); }`;

const GL_NOISE = `
float gl_hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gl_noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(gl_hash(i), gl_hash(i+vec2(1,0)), f.x), mix(gl_hash(i+vec2(0,1)), gl_hash(i+vec2(1,1)), f.x), f.y); }`;

const BAND_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uTex; uniform float uTime, uScroll; uniform vec2 uRes, uTexRes;
${'${GL_NOISE}'}
void main(){
  float ra = uRes.x / uRes.y, rt = uTexRes.x / uTexRes.y;
  vec2 uv = vUv;
  if (rt > ra) { float s = ra / rt; uv.x = uv.x * s + (1. - s) * .5; }
  else { float s = rt / ra; uv.y = uv.y * s + (1. - s) * .5; }
  uv.y = uv.y * .62 + .19 + (uScroll - .5) * .10;            // вертикальный кроп + параллакс
  uv += (vec2(gl_noise(vUv * vec2(13., 5.) + uTime * .07), gl_noise(vUv * vec2(9., 7.) - uTime * .05)) - .5) * .004; // марево
  vec3 c = texture(uTex, uv).rgb;
  float m = smoothstep(0., .17, vUv.y) * smoothstep(1., .83, vUv.y);
  m *= 1. - .18 * gl_noise(vUv * vec2(7., 2.5) + 3.7);        // неровный «дышащий» край
  outC = vec4(mix(vec3(.980, .961, .945), c, clamp(m, 0., 1.)), 1.);
}`;

class GLEngine {
  constructor(){ this.scenes = []; this.running = false; this._t0 = performance.now(); }
  addScene(canvas, frag, texUrls, getUniforms){
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return null;
    const prog = this._program(gl, GL_VERT, frag.replace('${GL_NOISE}', GL_NOISE));
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const scene = { canvas, gl, prog, vao, textures: {}, texSizes: {}, getUniforms, visible: false, ready: false };
    const names = Object.keys(texUrls);
    let left = names.length;
    names.forEach((name, i) => this._loadTex(gl, texUrls[name], (tex, w, h) => {
      scene.textures[name] = { tex, unit: i }; scene.texSizes[name] = [w, h];
      if (--left === 0) scene.ready = true;
    }));
    new IntersectionObserver(es => es.forEach(e => { scene.visible = e.isIntersecting; }), { rootMargin: '60px' }).observe(canvas);
    this.scenes.push(scene);
    this._start();
    return scene;
  }
  swapTexture(scene, name, url, cb){ this._loadTex(scene.gl, url, (tex, w, h) => {
    scene.textures[name].tex = tex; scene.texSizes[name] = [w, h]; cb && cb(); }); }
  _loadTex(gl, url, cb){
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      cb(t, img.naturalWidth, img.naturalHeight); };
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
    const set = (n, v) => { const l = gl.getUniformLocation(s.prog, n); if (l === null) return;
      if (typeof v === 'number') gl.uniform1f(l, v); else if (v.length === 2) gl.uniform2f(l, v[0], v[1]); else gl.uniform3f(l, v[0], v[1], v[2]); };
    Object.entries(s.textures).forEach(([n, t]) => { gl.activeTexture(gl.TEXTURE0 + t.unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(gl.getUniformLocation(s.prog, n), t.unit);
      set(n + 'Res', s.texSizes[n]); });
    set('uTime', (performance.now() - this._t0) / 1000); set('uRes', [w, h]);
    const u = s.getUniforms ? s.getUniforms(rect) : {}; Object.entries(u).forEach(([n, v]) => set(n, v));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
window.GLEngine = GLEngine; window.BAND_FRAG = BAND_FRAG;
```
ВНИМАНИЕ: строку `${'${GL_NOISE}'}` в BAND_FRAG записать в файле буквально как `${GL_NOISE}` внутри обычной строки — подстановка делается `.replace` в `addScene` (см. код движка). Проще: объявить BAND_FRAG обычной template-строкой с `${GL_NOISE}` — тогда `.replace` в addScene станет no-op (тоже корректно). Выбрать второй вариант: прямая интерполяция, `.replace` оставить как безопасный no-op.

- [ ] **Step 2.3: Инициализация в `app.js`** (добавить в конец IIFE):

```js
  // --- WebGL band ---
  if (!REDUCED && window.GLEngine) {
    try {
      window.ENGINE = new GLEngine();
      const band = document.querySelector('canvas[data-shader="band"]');
      if (band) {
        const sc = ENGINE.addScene(band, BAND_FRAG, { uTex: 'public/images/adj/521-607-adj.png' }, rect => ({
          uScroll: Math.min(1, Math.max(0, 1 - (rect.top + rect.height / 2) / innerHeight)),
        }));
        if (sc) { document.body.classList.add('webgl-on');
          const sizes = sc.texSizes; sc.getUniforms0 = sc.getUniforms;
          sc.getUniforms = r => Object.assign(sc.getUniforms0(r), { uTexRes: sizes.uTex || [1924, 1374] });
        }
      }
    } catch (e) { console.warn('WebGL off:', e); }
  }
```

- [ ] **Step 2.4: Глазная проверка кропа**

```bash
cd /tmp/pwtool && node mshot.js "http://localhost:8123/index.html" /tmp/checks/band.png 1920 1000 0 && node -e "
const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:800}});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});await p.evaluate(()=>scrollTo(0,1250));await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/checks/band-live.png'});await b.close();})();"
```
Открыть `/tmp/checks/band-live.png` (Read). Expected: панорама каньона с мягкими краями в кремовый, без полос/мыла. Если кроп неудачен — подкрутить константы `.62/.19` в BAND_FRAG (вертикальное окно текстуры) и повторить. Если совсем мыло — экспортировать из Figma панорамный кадр и показать заказчику ДВА скрина на выбор.

- [ ] **Step 2.5: Дифф (исключая зону плиты) + мобилка**

```bash
cd /tmp/pwtool && node rmshot.js http://localhost:8123/index.html /tmp/checks/t2.png \
 && node /tmp/pngtools/finediff.js /tmp/checks/t2.png /Users/seva/Desktop/uncharted-dev/reference/frame-full.png \
 && node mscroll.js http://localhost:8123/index.html /tmp/checks/m2 390 844
```
Expected: новые тайлы диффа ТОЛЬКО в y∈[1392,1770] (при reduced-motion канвас не стартует, виден fallback — это и есть ожидаемое отличие от камня). Мобилка не изменилась (m-slab на месте — `.m` не трогали).

- [ ] **Step 2.6: Commit**

```bash
git add index.html styles.css app.js shaders.js && git commit -m "Фотоокно с WebGL-шейдером (марево, параллакс, растворение краёв) вместо каменной плиты"
```

---

### Task 3: Перебейк скалы + актуализация текста n623

**Files:**
- Replace: `public/images/render/rock-690.png`
- Modify: `index.html` (строка 69), `styles.css` (`.n623`, если уйдёт accent)

- [ ] **Step 3.1: Свериться с нодой n623 в Figma** — MCP-вызов `get_figma_data` `{fileKey:'0oOzxMla9AEFWsIQ8FgOCv', nodeId:'521:623'}`. Expected: текст «высокое качество отдушек прямиком из европейских парфюмерных домов»; зафиксировать, есть ли цветной спан. При rate-limit (429) — подождать 60с и повторить, максимум 3 раза.

- [ ] **Step 3.2: Скачать чистую скалу** — MCP-вызов `download_figma_images`:
`{fileKey:'0oOzxMla9AEFWsIQ8FgOCv', localPath:'public/images/render', pngScale:1, nodes:[{nodeId:'521:690', fileName:'rock-690-new.png'}]}`
Затем: `sips -g pixelWidth -g pixelHeight public/images/render/rock-690-new.png` — Expected ≈557×1102 (допуск ±2px; если иначе — пересчитать pngScale = 557/фактическая_ширина и перekачать).

- [ ] **Step 3.3: Проверить, что в новом PNG нет букв** — `Read` файла rock-690-new.png (визуально: скала без тёмных «UN» сверху). Если буквы есть — нода 521:690 содержит текст как ребёнка; тогда найти подноду скалы: `get_figma_data nodeId=521:690` и скачать листовую ноду-картинку.

- [ ] **Step 3.4: Замена**

```bash
cd /Users/seva/Desktop/uncharted-dev && mv public/images/render/rock-690-new.png public/images/render/rock-690.png
```

- [ ] **Step 3.5: Обновить n623 в `index.html`**: заменить
`<p class="t up n623"><span class="accent">высокое качество</span> парфюмерии от проверенных европейских производителей</p>`
на текст из Step 3.1 (по умолчанию без спана):
`<p class="t up n623">высокое качество отдушек прямиком из европейских парфюмерных домов</p>`

- [ ] **Step 3.6: Скрин зоны слова + дифф + мобилка**

```bash
cd /tmp/pwtool && node -e "
const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1000}});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});await p.waitForTimeout(700);
await p.screenshot({path:'/tmp/checks/word.png',clip:{x:0,y:5100,width:1920,height:600},fullPage:true});await b.close();})();" \
 && node rmshot.js http://localhost:8123/index.html /tmp/checks/t3.png \
 && node /tmp/pngtools/finediff.js /tmp/checks/t3.png /Users/seva/Desktop/uncharted-dev/reference/frame-full.png \
 && node mscroll.js http://localhost:8123/index.html /tmp/checks/m3 390 844
```
Открыть `/tmp/checks/word.png`: слово UNCHARTED целиком живое, тёмных впечённых «UN» нет, скала не наезжает на буквы. Diff: новые тайлы только в зоне n623 и x0–557/y5177+ (улучшение). Мобилка: `.m-rock` использует `public/images/521-690.png` (другой файл) — не должна измениться; если использует тот же rock-690 — глазами проверить, что стало только чище.

- [ ] **Step 3.7: Commit**

```bash
git add public/images/render/rock-690.png index.html styles.css && git commit -m "Перебейк скалы без впечённых букв; актуализация текста об отдушках по макету"
```

---

### Task 4: Карусель ароматов (liquid-морф WebGL + стрелки)

**Files:**
- Create: `public/images/render/aromas/*.png` (4 файла из Figma)
- Modify: `index.html` (строки 72–73), `anim.css`, `app.js`, `shaders.js`

- [ ] **Step 4.1: Скачать флаконы (с паузами из-за rate-limit)** — MCP-вызовы `download_figma_images` ПО ОДНОМУ (между вызовами пауза 15–30с; при 429 — 60с и ретрай):
`{fileKey:'0oOzxMla9AEFWsIQ8FgOCv', localPath:'public/images/render/aromas', pngScale:2, nodes:[{nodeId:'521:925', fileName:'namibia-dunes.png'}]}` — затем то же для `521:936`→`islay-smoke.png`, `521:948`→`citrus-vetiver.png`, `521:960`→`kamchatka-veil.png`.
Проверка каждого: `sips -g pixelWidth -g pixelHeight ...` Expected ≈884×2166 (2×). `Read` каждый — флакон-силуэт с пейзажем, прозрачный фон.

- [ ] **Step 4.2: Разметка карусели** — в `index.html` заменить
```html
<img class="abs n625" src="public/images/render/bottle-625.png" alt="">
```
на
```html
<div class="abs n625 bottle-stage">
  <img class="bottle-fallback" src="public/images/render/bottle-625.png" alt="">
  <canvas class="bottle-canvas" data-shader="morph"></canvas>
  <button class="car-arrow car-prev" aria-label="Предыдущий аромат"></button>
  <button class="car-arrow car-next" aria-label="Следующий аромат"></button>
</div>
```
`styles.css`: `.n625` уже задаёт left/top/width/height — добавить `.bottle-stage { }` ничего не нужно; в `anim.css`:
```css
.bottle-stage .bottle-fallback, .bottle-stage .bottle-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.webgl-on .bottle-stage .bottle-fallback { visibility: hidden; }
.car-arrow { position: absolute; top: 50%; width: 56px; height: 56px; margin-top: -28px; border: 0; background: none; cursor: pointer; padding: 0; }
.car-prev { left: -84px; } .car-next { right: -84px; }
.car-arrow::before { content: ''; position: absolute; left: 50%; top: 50%; width: 22px; height: 22px;
  border-top: 2px solid #C35B3F; border-right: 2px solid #C35B3F; transform: translate(-50%, -50%) rotate(45deg); transition: transform .3s, border-color .3s; }
.car-prev::before { transform: translate(-50%, -50%) rotate(-135deg); }
.car-next:hover::before { transform: translate(-30%, -50%) rotate(45deg); }
.car-prev:hover::before { transform: translate(-70%, -50%) rotate(-135deg); }
.car-arrow:focus-visible::before { border-color: #7c2d12; }
.car-arrow[disabled] { opacity: .4; pointer-events: none; }
.fade-swap { transition: opacity .45s ease, transform .45s ease; }
.fade-swap.out { opacity: 0; transform: translateY(10px); }
```

- [ ] **Step 4.3: MORPH_FRAG в `shaders.js`** (добавить рядом с BAND_FRAG, экспортировать `window.MORPH_FRAG`):

```glsl
#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform sampler2D uFrom, uTo; uniform float uTime, uProgress;
/* + GL_NOISE */
void main(){
  float n = gl_noise(vUv * vec2(4.5, 8.) + uTime * .04);
  float wave = sin(uProgress * 3.14159);
  vec2 d = vec2(n - .5, (gl_noise(vUv * vec2(7., 3.) + 11.3) - .5) * 1.6) * .14 * wave;
  vec4 a = texture(uFrom, vUv + d * uProgress);
  vec4 b = texture(uTo,  vUv - d * (1. - uProgress));
  float m = smoothstep(.2, .8, uProgress + (n - .5) * .35);
  outC = mix(a, b, m);
}
```
Канвас морфа рисует прозрачный фон: в `_draw` уже `alpha:true`; добавить в начало `_draw` для сцен морфа `gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);` (безусловно для всех сцен — band непрозрачен, ему не повредит).

- [ ] **Step 4.4: Данные и логика карусели в `app.js`** (внутри IIFE):

```js
  // --- карусель ароматов ---
  const AROMAS = [
    { caption: '/ MANGO BLISS', img: 'public/images/render/bottle-625.png',
      desc: '<span class="ts4">аромат MANGO BLISS</span><br><span class="ts6">— </span><span class="ts7">билет в неизведнанные<br>уголки тропиков мьянмы,<br>где сладкий аромат манго<br>переплетается с ежевикой,<br>иланг-илангом и ноткой<br>пачули</span>' },
    { caption: '/ NAMIBIA DUNES', img: 'public/images/render/aromas/namibia-dunes.png',
      desc: '<span class="ts4">аромат NAMIBIA DUNES</span><br><span class="ts6">— </span><span class="ts7">билет в пустыню НАМИБ<br>с бескрайними дюнами,<br>где сладкий апельсин тает в розовом перце, пряных специях и древесном кедре</span>' },
    { caption: '/ ISLAY SMOKE', img: 'public/images/render/aromas/islay-smoke.png',
      desc: '<span class="ts4">аромат ISLAY SMOKE</span><br><span class="ts6">— </span><span class="ts7">прогулка по ветренным шотландским холмам,<br>где в воздухе ощущается запах выдержанного виски и табачного дыма. Теплые ноты какао и амбры окутывают словно вечерний туман</span>' },
    { caption: '/ CITRUS VETIVER', img: 'public/images/render/aromas/citrus-vetiver.png',
      desc: '<span class="ts4">аромат CITRUS VETIVER</span><br><span class="ts6">— </span><span class="ts7">поход в густые леса мабу, где свежесть ветивера<br>и тепло ореховой коры сливаются со сладким ароматом лимонной карамели и бобов тонка</span>' },
    { caption: '/ KAMCHATKA VEIL', img: 'public/images/render/aromas/kamchatka-veil.png',
      desc: '<span class="ts4">аромат KAMCHATKA VEIL</span><br><span class="ts6">— </span><span class="ts7">путешествие на вершины вулканов камчатки, где каждый вздох наполнен пикантным черным перцем<br>и бодрящим бергамотом<br>с нежностью ванили<br>и белого чая</span>' },
  ];
  AROMAS.forEach(a => { const i = new Image(); i.src = a.img; });   // прогрев кеша
  const capEl = document.querySelector('.n622'), descEl = document.querySelector('.n624');
  const stage = document.querySelector('.bottle-stage');
  if (stage && capEl && descEl) {
    capEl.classList.add('fade-swap'); descEl.classList.add('fade-swap');
    let idx = 0, busy = false, morphScene = null, morphProgress = 0;
    const fallbackImg = stage.querySelector('.bottle-fallback');
    const mcanvas = stage.querySelector('.bottle-canvas');
    if (window.ENGINE && !REDUCED && document.body.classList.contains('webgl-on')) {
      morphScene = ENGINE.addScene(mcanvas, MORPH_FRAG,
        { uFrom: AROMAS[0].img, uTo: AROMAS[0].img }, () => ({ uProgress: morphProgress }));
    }
    const swapTexts = next => {
      capEl.classList.add('out'); descEl.classList.add('out');
      setTimeout(() => { capEl.textContent = AROMAS[next].caption; descEl.innerHTML = AROMAS[next].desc;
        capEl.classList.remove('out'); descEl.classList.remove('out'); }, REDUCED ? 0 : 450);
    };
    const go = dir => {
      if (busy) return; busy = true;
      const next = (idx + dir + AROMAS.length) % AROMAS.length;
      swapTexts(next);
      if (morphScene && morphScene.ready) {
        ENGINE.swapTexture(morphScene, 'uTo', AROMAS[next].img, () => {
          const t0 = performance.now(), DUR = 1400;
          const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
          const step = now => { const t = Math.min(1, (now - t0) / DUR); morphProgress = ease(t);
            if (t < 1) requestAnimationFrame(step);
            else { ENGINE.swapTexture(morphScene, 'uFrom', AROMAS[next].img, () => { morphProgress = 0; idx = next; busy = false; }); } };
          requestAnimationFrame(step);
        });
      } else {
        fallbackImg.style.opacity = 0;
        setTimeout(() => { fallbackImg.src = AROMAS[next].img; fallbackImg.style.transition = 'opacity .5s';
          fallbackImg.style.opacity = 1; idx = next; busy = false; }, 480);
      }
    };
    stage.querySelector('.car-next').addEventListener('click', () => go(1));
    stage.querySelector('.car-prev').addEventListener('click', () => go(-1));
  }
```
Примечание: при reduced-motion канвас не создаётся, работает fallback `<img>` с мгновенно-мягкой сменой — карусель остаётся функциональной.

- [ ] **Step 4.5: Probe карусели** — дописать в `/tmp/pwtool/probe.js` перед `browser.close()`:

```js
  await page.evaluate(() => scrollTo(0, 5600)); await page.waitForTimeout(800);
  const cap0 = await page.textContent('.n622');
  await page.click('.car-next'); await page.waitForTimeout(2200);
  const cap1 = await page.textContent('.n622');
  assert(cap0.includes('MANGO') && cap1.includes('NAMIBIA'), 'карусель листает вперёд: ' + cap1);
  await page.click('.car-prev'); await page.waitForTimeout(2200);
  assert((await page.textContent('.n622')).includes('MANGO'), 'карусель листает назад');
```

- [ ] **Step 4.6: Прогон + живой скрин середины морфа**

```bash
cd /tmp/pwtool && node probe.js http://localhost:8123/index.html && node -e "
const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1100}});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});await p.evaluate(()=>scrollTo(0,5600));await p.waitForTimeout(900);
await p.click('.car-next');await p.waitForTimeout(700);
await p.screenshot({path:'/tmp/checks/morph-mid.png',clip:{x:550,y:5650,width:900,height:1200},fullPage:true});await b.close();})();"
```
Открыть `/tmp/checks/morph-mid.png`: видно жидкое искажение между двумя пейзажами внутри силуэта (не простой кроссфейд). Если морф грубый — уменьшить амплитуду `.14`→`.10` или частоты нойза.

- [ ] **Step 4.7: Дифф + мобилка** — как в Task 2 Step 2.5 (файлы t4/m4). Expected: новые тайлы только в зонах стрелок (узкие колонки x≈640–710 и x≈1190–1260 при y≈6150–6300). При reduced-motion канвас скрыт, fallback = старый bottle-625 → зона флакона идентична.

- [ ] **Step 4.8: Commit**

```bash
git add index.html anim.css app.js shaders.js public/images/render/aromas && git commit -m "Карусель ароматов: 5 ароматов из Figma, WebGL liquid-морф, стрелки"
```

---

### Task 5: Анимации — хиро, reveals, параллакс, побуквенный UNCHARTED, зерно

**Files:**
- Modify: `anim.css`, `app.js`, `shaders.js`, `index.html` (канвас зерна в хиро)

- [ ] **Step 5.1: Канвас зерна в хиро** — в `index.html` после `<img class="abs hero-streak" ...>`:
`<canvas class="abs hero-grain" data-shader="grain"></canvas>`
В `anim.css`:
```css
.hero-grain { left: 0; top: 0; width: 1920px; height: 1043px; mix-blend-mode: soft-light; pointer-events: none; }
body:not(.webgl-on) .hero-grain { display: none; }
```

- [ ] **Step 5.2: GRAIN_FRAG в `shaders.js`** (`window.GRAIN_FRAG`):
```glsl
#version 300 es
precision highp float; in vec2 vUv; out vec4 outC;
uniform float uTime; uniform vec2 uRes;
/* + GL_NOISE */
void main(){
  float g = gl_hash(vUv * uRes + mod(uTime * 60., 1000.)) - .5;            // зерно
  float warm = (gl_noise(vUv * 3. + uTime * .03) - .5) * .06;              // медленное тёплое дыхание
  outC = vec4(vec3(.5 + g * .12 + warm), 1.);
}
```
Инициализация в `app.js` рядом с band: `ENGINE.addScene(document.querySelector('canvas[data-shader="grain"]'), GRAIN_FRAG, {}, () => ({}))` — сцена без текстур: в `addScene` при `names.length === 0` сразу `scene.ready = true` (поправить движок: `let left = names.length; if (!left) scene.ready = true;`).

- [ ] **Step 5.3: Reveal + каскад хиро + параллакс + letter-split в `app.js`**:

```js
  // --- анимации ---
  if (!REDUCED) {
    document.body.classList.add('anim');
    // каскад хиро
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('hero-in')));
    // scroll reveals
    const revealSel = ['.n617','.n618','.n619','.n692','.card','.n697','.geldiag','.creamdiag',
      '.lbl','.n725','.n726','.n729','.n620','.n621','.n622','.n623','.n624','.n629',
      '.n631','.n632','.n633','.n634','.n635','.n636','.n637','.n638','.n639','.n657','.n658'];
    const els = document.querySelectorAll('.page ' + revealSel.join(', .page '));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
    let cardN = 0;
    els.forEach(el => { el.classList.add('rv');
      if (el.classList.contains('card')) el.style.transitionDelay = (cardN++ * 120) + 'ms';
      io.observe(el); });
    // letter-split гигантского UNCHARTED
    const giant = document.querySelector('.n630');
    if (giant) { const word = giant.textContent; giant.setAttribute('aria-label', word); giant.textContent = '';
      [...word].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch;
        s.setAttribute('aria-hidden', 'true'); s.style.transitionDelay = (i * 60) + 'ms'; giant.appendChild(s); });
      io.observe(giant); giant.classList.add('rv-letters');
      new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { giant.classList.add('in'); o.disconnect(); } }), { threshold: .3 }).observe(giant);
    }
    // параллакс
    const PARA = [['.n731', 26], ['.n690', 14], ['.n697', 12], ['.hero-right', 9], ['.hero-streak', 6]];
    const items = PARA.map(([sel, amp]) => ({ el: document.querySelector(sel), amp, cur: 0 })).filter(i => i.el);
    const paraTick = () => {
      const vh = innerHeight;
      items.forEach(it => {
        const r = it.el.getBoundingClientRect();
        const t = ((r.top + r.height / 2) - vh / 2) / vh;          // -0.5..0.5 в зоне видимости
        const target = Math.max(-1, Math.min(1, t)) * it.amp;
        it.cur += (target - it.cur) * .08;
        it.el.style.transform = 'translate3d(0,' + it.cur.toFixed(2) + 'px,0)';
      });
      requestAnimationFrame(paraTick);
    };
    requestAnimationFrame(paraTick);
  }
```

- [ ] **Step 5.4: Стили reveal в `anim.css`**:

```css
/* reveal-анимации включаются только при body.anim (JS, не reduced-motion) */
body.anim .rv { opacity: 0; transform: translateY(26px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
body.anim .rv.in { opacity: 1; transform: none; }
body.anim .rv-letters span { display: inline-block; opacity: 0; transform: translateY(.16em);
  transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1); }
body.anim .rv-letters.in span { opacity: 1; transform: none; }
/* каскад хиро */
body.anim .n594, body.anim .nav-link, body.anim .n609, body.anim .n610 { opacity: 0; transform: translateY(16px);
  transition: opacity .9s cubic-bezier(.22,1,.36,1), transform .9s cubic-bezier(.22,1,.36,1); }
body.anim.hero-in .n594 { opacity: 1; transform: none; }
body.anim.hero-in .nav-link { opacity: 1; transform: none; transition-delay: .15s; }
body.anim.hero-in .n609 { opacity: 1; transform: none; transition-delay: .3s; }
body.anim.hero-in .n610 { opacity: 1; transform: none; transition-delay: .45s; }
/* hover карточек */
.card { transition: transform .5s cubic-bezier(.22,1,.36,1), filter .5s; }
.card:hover { transform: translateY(-6px); filter: drop-shadow(0 18px 28px rgba(120,60,30,.18)); }
```
ВНИМАНИЕ: `.card` уже получает `transition-delay` от reveal-stagger — это не конфликтует (delay действует и на hover, поэтому для карточек hover-transition объявлять с `transition-delay: 0ms !important` после `.in`: `body.anim .card.in { transition-delay: 0ms; }` — добавить эту строку).

- [ ] **Step 5.5: Прогон всего + глазной просмотр анимаций**

```bash
cd /tmp/pwtool && node probe.js http://localhost:8123/index.html \
 && node -e "
const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1000}});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
for(const y of [0,900,1700,2800,4500,5300,6200,7100,8600]){await p.evaluate(v=>scrollTo(0,v),y);await p.waitForTimeout(1100);
await p.screenshot({path:'/tmp/checks/a-'+y+'.png'});}await b.close();})();"
```
Открыть скрины: тексты проявились (не остались прозрачными), буквы UNCHARTED на месте, параллакс не оторвал планету/скалу от композиции (сдвиги ≤26px), зерно в хиро едва заметно.

- [ ] **Step 5.6: Дифф при reduced-motion + мобилка** — как раньше (t5/m5). Expected: дифф НЕ изменился относительно t4 (все анимации выключены при reduced-motion: `.anim` не вешается, канвасы не стартуют). Любой новый тайл = баг (прозрачный текст и т.п.) — чинить до чистоты.

- [ ] **Step 5.7: Commit**

```bash
git add index.html anim.css app.js shaders.js && git commit -m "Анимации: каскад хиро, scroll-reveal, параллакс слоёв, побуквенный UNCHARTED, зерно"
```

---

### Task 6: Финальная сверка и полировка

- [ ] **Step 6.1: Полный прогон**: probe.js, rmshot+finediff, mscroll (390×844) и дополнительно 768×1024. Свести список всех тайлов диффа и убедиться, что каждый попадает в разрешённые зоны (см. Инварианты). Прогнать `node mshot.js http://localhost:8123/index.html /tmp/checks/final-1280.png 1280 900 0` — проверить zoom-масштабирование (страница уменьшена, без горизонтального скролла).

- [ ] **Step 6.2: Производительность**: в DevTools-режиме Playwright снять трейс 5с скролла:
```bash
cd /tmp/pwtool && node -e "
const{chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1000}});
await p.goto('http://localhost:8123/index.html',{waitUntil:'networkidle'});
const fps=await p.evaluate(()=>new Promise(res=>{let f=0;const t0=performance.now();
const tick=()=>{f++;if(performance.now()-t0<3000){requestAnimationFrame(tick)}else res(f/3)};requestAnimationFrame(tick);
scrollTo({top:3000,behavior:'smooth'})}));console.log('fps≈',fps);await b.close();})();"
```
Expected: fps ≥ 50. Если ниже — проверить, что невидимые сцены не рисуются (band вне экрана при y=3000).

- [ ] **Step 6.3: Артефакты-кейсы**: открыть страницу, кликнуть стрелку карусели 6 раз подряд быстро (busy-флаг не даёт сломаться), открыть/закрыть модалку 3 раза, Tab-навигация до стрелок и Enter. Всё через Playwright-однострочники по образцу выше.

- [ ] **Step 6.4: Если что-то правили — финальный commit**

```bash
git add -A && git commit -m "Полировка: финальная сверка с эталоном, фиксы по результатам прогона"
```

---

## Self-review checklist (выполнен при написании)

- Спека покрыта: ссылки/модалка (T1), фотоокно (T2), скала+n623 (T3), карусель (T4), анимации (T5), верификация/перф (T0, T6). Мобилка не трогается нигде (только проверяется).
- Типы согласованы: `GLEngine.addScene(canvas, frag, texUrls, getUniforms)` и `swapTexture(scene, name, url, cb)` используются одинаково в T2/T4/T5; `window.ENGINE`, `REDUCED`, `LINKS`, `AROMAS` — единые имена.
- Плейсхолдеров нет; все тексты, GLSL, CSS и команды даны полностью.
