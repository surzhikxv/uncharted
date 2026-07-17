(function () {
  'use strict';
  const LINKS = {
    wildberries: 'https://www.wildberries.ru/brands/uncharted',
    goldapple:   'https://goldapple.ru/brands/uncharted',
    ozon:        'https://www.ozon.ru/seller/uncharted-1545281/products/?miniapp=seller_1545281',
    letu:        'https://www.letu.ru/brand/uncharted',
    vk:          'https://vk.com/unchartedcosmetics',
    instagram:   'https://www.instagram.com/uncharted_cosmetics/',
    email:       'mailto:info.uncharted@list.ru',
  };
  const PRODUCTS = {
    'gel-450-kamchatka-veil': {
      label: 'KAMCHATKA VEIL · гель для душа · 450 мл',
      goldapple: 'https://goldapple.ru/99000004326-no1-frozen-black-pepper',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-gel-dlya-dusha-kamchatka-veil/181100699',
      wildberries: 'https://www.wildberries.ru/catalog/884672873/detail.aspx',
    },
    'gel-450-islay-smoke': {
      label: 'ISLAY SMOKE · гель для душа · 450 мл',
      goldapple: 'https://goldapple.ru/99000116008-islay-smoke',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-gel-dlya-dusha-islay-smoke/181200040',
      wildberries: 'https://www.wildberries.ru/catalog/549449189/detail.aspx',
    },
    'gel-450-mango-bliss': {
      label: 'MANGO BLISS · гель для душа · 450 мл',
      goldapple: 'https://goldapple.ru/99000004327-no3-mango-bliss',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-gel-dlya-dusha-mango-bliss/181200045',
      wildberries: 'https://www.wildberries.ru/catalog/235077800/detail.aspx',
    },
    'gel-450-namibia-dunes': {
      label: 'NAMIBIA DUNES · гель для душа · 450 мл',
      goldapple: 'https://goldapple.ru/99000004325-no5-spicy-frangipani',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-gel-dlya-dusha-spicy-frangipani/181100698',
      wildberries: 'https://www.wildberries.ru/catalog/1225289179/detail.aspx',
    },
    'cream-450-citrus-vetiver': {
      label: 'CITRUS VETIVER · крем для рук и тела · 450 мл',
      goldapple: 'https://goldapple.ru/99000047659-no6-citrus-vetiver',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-citrus-vetiver/181200037',
      wildberries: 'https://www.wildberries.ru/catalog/318042677/detail.aspx',
    },
    'cream-450-frozen-black-pepper': {
      label: 'FROZEN BLACK PEPPER · крем для рук и тела · 450 мл',
      goldapple: 'https://goldapple.ru/99000047661-no1-frozen-black-pepper',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-frozen-black-pepper/181200036',
      wildberries: 'https://www.wildberries.ru/catalog/318042678/detail.aspx',
    },
    'cream-450-spicy-frangipani': {
      label: 'SPICY FRANGIPANI · крем для рук и тела · 450 мл',
      goldapple: 'https://goldapple.ru/99000047656-no5-spicy-frangipani',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-spicy-frangipani/181200039',
      wildberries: 'https://www.wildberries.ru/catalog/318042676/detail.aspx',
    },
    'cream-450-mango-bliss': {
      label: 'MANGO BLISS · крем для рук и тела · 450 мл',
      goldapple: 'https://goldapple.ru/99000047655-no3-mango-bliss',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-mango-bliss/181200038',
      wildberries: 'https://www.wildberries.ru/catalog/318042679/detail.aspx',
    },
    'cream-450-islay-smoke': {
      label: 'ISLAY SMOKE · крем для рук и тела · 450 мл',
      goldapple: 'https://goldapple.ru/99000149169-uncharted-tobacco-whiskey-vanilla-cocoa',
      wildberries: 'https://www.wildberries.ru/catalog/883807325/detail.aspx',
    },
    'cream-50-citrus-vetiver': {
      label: 'CITRUS VETIVER · крем для рук и тела · 50 мл',
      goldapple: 'https://goldapple.ru/99000047659-no6-citrus-vetiver',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-citrus-vetiver/185200373',
      wildberries: 'https://www.wildberries.ru/catalog/318042883/detail.aspx',
    },
    'cream-50-mango-bliss': {
      label: 'MANGO BLISS · крем для рук и тела · 50 мл',
      goldapple: 'https://goldapple.ru/99000047655-no3-mango-bliss',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-mango-bliss/185200372',
      wildberries: 'https://www.wildberries.ru/catalog/318042881/detail.aspx',
    },
    'cream-50-frozen-black-pepper': {
      label: 'FROZEN BLACK PEPPER · крем для рук и тела · 50 мл',
      goldapple: 'https://goldapple.ru/99000047661-no1-frozen-black-pepper',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-frozen-black-pepper/185200371',
      wildberries: 'https://www.wildberries.ru/catalog/318042880/detail.aspx',
    },
    'cream-50-spicy-frangipani': {
      label: 'SPICY FRANGIPANI · крем для рук и тела · 50 мл',
      goldapple: 'https://goldapple.ru/99000047656-no5-spicy-frangipani',
      letu: 'https://www.letu.ru/product/uncharted-parfyumirovannyi-krem-dlya-ruk-i-tela-spicy-frangipani/185200370',
      wildberries: 'https://www.wildberries.ru/catalog/318042882/detail.aspx',
    },
  };
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE_MAX = 768;
  const zoom = () => Math.max(document.documentElement.clientWidth, MOBILE_MAX + 1) / 1920;

  // --- ссылки из конфига ---
  document.querySelectorAll('[data-link]:not(.buy-row)').forEach(el => {
    const url = LINKS[el.dataset.link];
    if (!url) return;
    if (el.tagName === 'A') { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
  });

  // --- вспомогательная функция: клик + Enter/Space ---
  const activate = (el, fn) => {
    if (!el) return;
    el.addEventListener('click', fn);
    if (el.matches('button, a[href]')) return;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
    });
  };

  // --- плавный скролл ---
  document.querySelectorAll('[data-scroll]').forEach(el => {
    activate(el, e => {
      e.preventDefault();
      const y = parseFloat(el.dataset.scroll) * (document.documentElement.clientWidth > MOBILE_MAX ? zoom() : 1);
      window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  // --- переход по якорю с другой страницы (catalog.html → index.html#about) ---
  const HASH_POS = { '#about': 6849, '#catalog': 1789, '#contacts': 8428 };
  if (HASH_POS[location.hash] && document.querySelector('.page')) {
    if (document.documentElement.clientWidth > MOBILE_MAX) {
      scrollTo(0, HASH_POS[location.hash] * zoom());
    } else {
      const m = document.getElementById('m-' + location.hash.slice(1));
      if (m) m.scrollIntoView();
    }
  }

  // --- иконки футера кликабельны как соседние ссылки ---
  [['n647','vk'],['n651','instagram'],['n660','goldapple'],['n671','wildberries'],['n680','ozon'],['n684','letu'],['n687','letu']].forEach(([cls, key]) => {
    const el = document.querySelector('.' + cls);
    if (el) { el.style.cursor = 'pointer'; el.addEventListener('click', () => window.open(LINKS[key], '_blank', 'noopener')); }
  });

  // --- модалка КУПИТЬ ---
  const modal = document.getElementById('buyModal');
  let lastFocus = null;
  const modalBackground = [...document.body.children].filter(el => el !== modal && !['SCRIPT', 'STYLE'].includes(el.tagName));
  const setModalBackground = inert => modalBackground.forEach(el => { el.inert = inert; });
  const modalFocusable = () => [...modal.querySelectorAll('a[href], button:not([disabled])')]
    .filter(el => !el.hidden && getComputedStyle(el).display !== 'none');
  const productKeyFrom = source => {
    if (typeof source === 'string') return PRODUCTS[source] ? source : null;
    const card = source && source.closest && source.closest('.sc-card, .m-product-card, .cat-card');
    const image = card && card.querySelector('img');
    if (!image) return null;
    const filename = (image.currentSrc || image.src).split('/').pop().split('?')[0].replace(/\.webp$/i, '');
    return PRODUCTS[filename] ? filename : null;
  };
  const openModal = source => {
    const productKey = productKeyFrom(source);
    const product = productKey && PRODUCTS[productKey];
    if (!product) return;
    const productLabel = modal.querySelector('[data-buy-product]');
    if (productLabel) productLabel.textContent = product.label;
    let visibleRows = 0;
    modal.querySelectorAll('.buy-row[data-link]').forEach(row => {
      const url = product[row.dataset.link];
      row.hidden = !url;
      if (!url) {
        row.removeAttribute('href');
        row.removeAttribute('aria-label');
        return;
      }
      visibleRows += 1;
      row.href = url;
      row.setAttribute('aria-label', `Купить ${product.label} в ${row.textContent.trim()}`);
    });
    const emptyState = modal.querySelector('[data-buy-empty]');
    if (emptyState) emptyState.hidden = visibleRows > 0;
    lastFocus = document.activeElement;
    modal.hidden = false;
    setModalBackground(true);
    document.body.classList.add('modal-open');
    (modal.querySelector('.buy-row:not([hidden])') || modal.querySelector('.buy-close')).focus();
  };
  const closeModal = () => {
    modal.hidden = true;
    setModalBackground(false);
    document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  document.querySelectorAll('[data-buy]:not(.cat-btn--ghost)').forEach(b => activate(b, () => openModal(b)));
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    const focusable = modalFocusable();
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // --- карусель продуктов: горизонтальный скролл + стрелки + скроллбар + drag ---
  const sc = document.querySelector('.showcase');
  if (sc) {
    const track = sc.querySelector('.sc-track');
    const prev = sc.querySelector('.sc-arrow--prev');
    const next = sc.querySelector('.sc-arrow--next');
    const bar = sc.querySelector('.sc-bar');
    const thumb = sc.querySelector('.sc-thumb');
    const vis = () => (document.documentElement.clientWidth > MOBILE_MAX ? document.documentElement.clientWidth / 1920 : 1);
    const step = () => {
      const card = track.querySelector('.sc-card');
      // шаг = одна карточка + gap (раньше прокручивало целую «страницу» видимых карточек)
      return card ? card.offsetWidth + 36 : track.clientWidth * 0.8;   // design-px (zoom не влияет на layout-метрики)
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const x = track.scrollLeft;
      prev.hidden = x <= 2;
      next.hidden = x >= max - 2;
      const ratio = track.clientWidth / track.scrollWidth;
      thumb.style.width = Math.min(100, ratio * 100) + '%';
      const room = bar.clientWidth - thumb.offsetWidth;
      thumb.style.transform = 'translateX(' + (max > 0 ? (x / max) * room : 0) + 'px)';
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: REDUCED ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: REDUCED ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    // перетаскивание ползунка
    thumb.addEventListener('pointerdown', e => {
      e.preventDefault();
      const max = track.scrollWidth - track.clientWidth;
      const barW = bar.getBoundingClientRect().width;        // экранные px (с учётом zoom)
      const x0 = e.clientX, l0 = track.scrollLeft;
      thumb.setPointerCapture(e.pointerId);
      const mv = ev => { track.scrollLeft = l0 + ((ev.clientX - x0) / barW) * max; };
      const up = () => { thumb.removeEventListener('pointermove', mv); thumb.removeEventListener('pointerup', up); };
      thumb.addEventListener('pointermove', mv);
      thumb.addEventListener('pointerup', up);
    });
    // клик по дорожке — прыжок
    bar.addEventListener('pointerdown', e => {
      if (e.target === thumb) return;
      const r = bar.getBoundingClientRect();
      const max = track.scrollWidth - track.clientWidth;
      track.scrollTo({ left: ((e.clientX - r.left) / r.width) * max, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    // drag мышью по карточкам
    let pd = false, px0 = 0, pl0 = 0, moved = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      pd = true; px0 = e.clientX; pl0 = track.scrollLeft; moved = false; track.classList.add('dragging');
    });
    track.addEventListener('pointermove', e => {
      if (!pd) return;
      const dx = e.clientX - px0;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = pl0 - dx / vis();
    });
    const endDrag = () => { if (pd) { pd = false; track.classList.remove('dragging'); } };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    update();
  }

  // --- WebGL band ---
  if (!REDUCED && window.GLEngine && document.documentElement.clientWidth > MOBILE_MAX) {
    try {
      window.ENGINE = new GLEngine();
      // фотополоса-каньон (band) убрана по макету; webgl-on теперь ставит сцена grain
      const grain = document.querySelector('canvas[data-shader="grain"]');
      if (grain) {
        const gsc = ENGINE.addScene(grain, GRAIN_FRAG, {}, () => ({}));
        if (gsc) {
          gsc.onFail = () => document.body.classList.remove('webgl-on');
          const onReady = () => { if (gsc.ready) document.body.classList.add('webgl-on'); else if (!gsc.failed) requestAnimationFrame(onReady); };
          requestAnimationFrame(onReady);
        }
      }
      // атмосферный туман у модели на hero
      const fog = document.querySelector('canvas[data-shader="fog"]');
      if (fog) ENGINE.addScene(fog, MIST_FRAG, {}, () => ({}));
      // течение струи геля на помпе
      const flow = document.querySelector('canvas[data-shader="flow"]');
      if (flow) {
        const fsc = ENGINE.addScene(flow, FLOW_FRAG, { uTex: 'public/images/render/pump-697.webp' }, () => ({}));
        if (fsc) {
          const fb = document.querySelector('.pump-fallback');
          fsc.onFail = () => { flow.style.display = 'none'; fb.style.visibility = 'visible'; };
          const onFlowReady = () => { if (fsc.ready) fb.style.visibility = 'hidden'; else if (!fsc.failed) requestAnimationFrame(onFlowReady); };
          requestAnimationFrame(onFlowReady);
        }
      }
    } catch (e) { console.warn('WebGL off:', e); }
  }

  // --- карусель ароматов ---
  const AROMAS = [
    { caption: '/ MANGO BLISS', img: 'public/images/render/bottle-625.webp', m: 'public/images/m/bottle-mango.webp',
      desc: '<span class="ts4">аромат MANGO BLISS</span><br><span class="ts6">— </span><span class="ts7">билет в неизведанные<br>уголки тропиков мьянмы,<br>где сладкий аромат манго<br>переплетается с ежевикой,<br>иланг-илангом и ноткой<br>пачули</span>',
      mobileDesc: 'АРОМАТ MANGO BLISS — БИЛЕТ В НЕИЗВЕДАННЫЕ УГОЛКИ ТРОПИКОВ МЬЯНМЫ, ГДЕ СЛАДКИЙ АРОМАТ МАНГО ПЕРЕПЛЕТАЕТСЯ С ЕЖЕВИКОЙ, ИЛАНГ-ИЛАНГОМ И НОТКОЙ ПАЧУЛИ' },
    { caption: '/ NAMIBIA DUNES', img: 'public/images/render/aromas/namibia-dunes.webp', m: 'public/images/m/bottle-namibia.webp',
      desc: '<span class="ts4">аромат NAMIBIA DUNES</span><br><span class="ts6">— </span><span class="ts7">билет в пустыню НАМИБ<br>с бескрайними дюнами,<br>где сладкий апельсин тает в розовом перце, пряных специях и древесном кедре</span>',
      mobileDesc: 'АРОМАТ NAMIBIA DUNES — БИЛЕТ В ПУСТЫНЮ НАМИБ С БЕСКРАЙНИМИ ДЮНАМИ, ГДЕ СЛАДКИЙ АПЕЛЬСИН ТАЕТ В РОЗОВОМ ПЕРЦЕ, ПРЯНЫХ СПЕЦИЯХ И ДРЕВЕСНОМ КЕДРЕ' },
    { caption: '/ ISLAY SMOKE', img: 'public/images/render/aromas/islay-smoke.webp', m: 'public/images/m/bottle-islay.webp',
      desc: '<span class="ts4">аромат ISLAY SMOKE</span><br><span class="ts6">— </span><span class="ts7">прогулка по ветреным шотландским холмам,<br>где в воздухе ощущается запах выдержанного виски и табачного дыма. Теплые ноты какао и амбры окутывают словно вечерний туман</span>',
      mobileDesc: 'АРОМАТ ISLAY SMOKE — ПРОГУЛКА ПО ВЕТРЕНЫМ ШОТЛАНДСКИМ ХОЛМАМ, ГДЕ В ВОЗДУХЕ ОЩУЩАЕТСЯ ЗАПАХ ВЫДЕРЖАННОГО ВИСКИ И ТАБАЧНОГО ДЫМА, А НОТЫ КАКАО И АМБРЫ ОКУТЫВАЮТ СЛОВНО ВЕЧЕРНИЙ ТУМАН' },
    { caption: '/ CITRUS VETIVER', img: 'public/images/render/aromas/citrus-vetiver.webp', m: 'public/images/m/bottle-citrus.webp',
      desc: '<span class="ts4">аромат CITRUS VETIVER</span><br><span class="ts6">— </span><span class="ts7">поход в густые леса мабу, где свежесть ветивера<br>и тепло ореховой коры сливаются со сладким ароматом лимонной карамели и бобов тонка</span>',
      mobileDesc: 'АРОМАТ CITRUS VETIVER — ПОХОД В ГУСТЫЕ ЛЕСА МАБУ, ГДЕ СВЕЖЕСТЬ ВЕТИВЕРА И ТЕПЛО ОРЕХОВОЙ КОРЫ СЛИВАЮТСЯ СО СЛАДКИМ АРОМАТОМ ЛИМОННОЙ КАРАМЕЛИ И БОБОВ ТОНКА' },
    { caption: '/ KAMCHATKA VEIL', img: 'public/images/render/aromas/kamchatka-veil.webp', m: 'public/images/m/bottle-kamchatka.webp',
      desc: '<span class="ts4">аромат KAMCHATKA VEIL</span><br><span class="ts6">— </span><span class="ts7">путешествие на вершины вулканов камчатки, где каждый вздох наполнен пикантным черным перцем<br>и бодрящим бергамотом<br>с нежностью ванили<br>и белого чая</span>',
      mobileDesc: 'АРОМАТ KAMCHATKA VEIL — ПУТЕШЕСТВИЕ НА ВЕРШИНЫ ВУЛКАНОВ КАМЧАТКИ, ГДЕ ПИКАНТНЫЙ ЧЁРНЫЙ ПЕРЕЦ И БОДРЯЩИЙ БЕРГАМОТ СОЕДИНЯЮТСЯ С НЕЖНОСТЬЮ ВАНИЛИ И БЕЛОГО ЧАЯ' },
  ];
  const aromaStatus = document.getElementById('aromaStatus');
  const announceAroma = index => {
    if (aromaStatus) aromaStatus.textContent = 'Выбран аромат ' + AROMAS[index].caption.replace(/^\/\s*/, '');
  };
  const MOBILE = document.documentElement.clientWidth <= MOBILE_MAX;
  // по просьбе заказчика: сложная анимация воды/морфа во флаконе (секция АРОМАТЫ)
  // отключена — карусель использует простой кроссфейд (десктоп и мобилка).
  const NO_AROMA_FLUID = true;
  AROMAS.forEach(a => { const i = new Image(); i.src = MOBILE ? a.m : a.img; });
  // --- смена текста карусели: побуквенный каскад для подписи, направленный blur для описания ---
  const cascadeCaption = (el, txt) => {
    if (REDUCED) { el.textContent = txt; return; }
    const mk = (t, cls) => [...t].map((ch, i) =>
      '<span class="cl ' + cls + '" style="transition-delay:' + (i * 20) + 'ms">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>').join('');
    el.setAttribute('aria-label', txt);
    el.innerHTML = mk(el.textContent, 'out-l');
    requestAnimationFrame(() => el.querySelectorAll('.cl').forEach(sp => sp.classList.add('gone')));
    setTimeout(() => {
      el.innerHTML = mk(txt, 'in-l');
      requestAnimationFrame(() => requestAnimationFrame(() =>
        el.querySelectorAll('.cl').forEach(sp => sp.classList.add('here'))));
      setTimeout(() => { el.textContent = txt; el.removeAttribute('aria-label'); }, 1050);
    }, 520);
  };
  const swapDescDir = (el, html, dir) => {
    if (REDUCED) { el.innerHTML = html; return; }
    el.style.setProperty('--sx', (dir * 34) + 'px');
    el.style.setProperty('--sk', (-dir * 5) + 'deg');     // вязкое утягивание вслед фронту
    el.classList.add('out');
    setTimeout(() => {                                    // подмена — когда фронт геля у центра флакона
      el.innerHTML = html;
      el.style.setProperty('--sx', (-dir * 34) + 'px');
      el.style.setProperty('--sk', (dir * 5) + 'deg');
      void el.offsetWidth;
      el.classList.remove('out');
    }, 620);
  };

  const capEl = document.querySelector('.n622'), descEl = document.querySelector('.n624');
  const stage = document.querySelector('.bottle-stage');
  if (stage && capEl && descEl) {
    capEl.classList.add('fade-swap'); descEl.classList.add('fade-swap');
    let idx = 0, busy = false, fluid = null;
    const fallbackImg = stage.querySelector('.bottle-fallback');
    // флакон — сплошная вязкая среда: фуллскрин-шейдер + CPU-поле скоростей (см. FluidBottle)
    if (!NO_AROMA_FLUID && window.FluidBottle && !REDUCED && !MOBILE) {
      const fCv = document.createElement('canvas');
      fCv.className = 'fluid-canvas';
      document.querySelector('.page').appendChild(fCv);
      const fb = new FluidBottle(fCv);
      if (fb.failed) { fCv.remove(); }
      else fb.init(AROMAS.map(a => a.img), ok => {
        if (ok) {
          fb.curIdx = fb.nextIdx = idx;          // пока грузились текстуры, могли листать фоллбеком
          fluid = fb;
          fallbackImg.style.visibility = 'hidden';
          stage.querySelector('.bottle-canvas').style.display = 'none';
          // потеря GL-контекста (сброс GPU, долгие сессии) — возврат на фоллбек
          fCv.addEventListener('webglcontextlost', e => {
            e.preventDefault();
            fluid = null;
            fallbackImg.src = AROMAS[idx].img;
            fallbackImg.style.visibility = '';
            fb.destroy(); fCv.remove();
          });
          if (location.search.indexOf('morphdbg') >= 0) window.__fb = fb;   // для покадровой QA-съёмки
        } else { fb.destroy(); fCv.remove(); }
      });
    }
    // автоплей: вперёд каждые 7с, пока секция на экране, вкладка активна и курсор не на карусели;
    // любое листание (ручное или авто) перезапускает отсчёт
    const AUTO_MS = 7000;
    let autoTimer = 0, autoHover = false, autoVisible = false;
    const autoArm = () => {
      clearTimeout(autoTimer);
      if (REDUCED) return;
      autoTimer = setTimeout(() => {
        if (autoVisible && !autoHover && !document.hidden && !busy) go(1); else autoArm();
      }, AUTO_MS);
    };
    if (!REDUCED) {
      new IntersectionObserver(es => es.forEach(e => { autoVisible = e.isIntersecting; }), { threshold: .35 }).observe(stage);
      [stage, descEl].forEach(el => {
        el.addEventListener('pointerenter', () => { autoHover = true; });
        el.addEventListener('pointerleave', () => { autoHover = false; });
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) autoArm(); });
      autoArm();
    }
    // смыв описания ведёт САМА вода: каждый кадр маска и снос букв привязаны
    // к фронту листа из бреши (fluid.ves.wall + fluid.reach, sim-px → page-px);
    // буквы намокают ровно когда их накрывает янтарь, уносятся по потоку и
    // растворяются позади фронта; новый текст проявляется после его прохода
    const washDesc = (el, html) => {
      const t0 = performance.now();
      const L = 1186, W = 496;                       // дизайн-сетка .n624
      const front = () => fluid && fluid.transT < 3
        ? 705 + (fluid.ves.wall + fluid.reach) * .82
        : L + Math.max(0, performance.now() - t0 - 230) / 480 * W;   // страховка без воды
      el.classList.add('washing');
      el.style.setProperty('--washP', '0');
      let swapped = false;
      const tick = () => {
        if (swapped) return;
        const p = Math.min(1.2, (front() - L) / W);
        if (p > 0) el.style.setProperty('--washP', p.toFixed(4));
        if (p >= 1.06 || performance.now() - t0 > 1600) {
          swapped = true;                            // фронт прошёл блок — буквы унесены
          el.innerHTML = html;
          el.classList.remove('washing');
          el.style.removeProperty('--washP');
          el.classList.add('wash-in');               // новый текст осаждается за водой
          setTimeout(() => el.classList.remove('wash-in'), 680);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const swapTexts = (next, dir) => {
      cascadeCaption(capEl, AROMAS[next].caption);
      if (dir > 0 && fluid) washDesc(descEl, AROMAS[next].desc);
      else swapDescDir(descEl, AROMAS[next].desc, dir);
    };
    const go = dir => {
      if (busy) return; busy = true;
      autoArm();
      const arrows = stage.querySelectorAll('.car-arrow');
      arrows.forEach(a => a.disabled = true);
      const release = () => { busy = false; arrows.forEach(a => a.disabled = false); };
      const next = (idx + dir + AROMAS.length) % AROMAS.length;
      announceAroma(next);
      swapTexts(next, dir);
      if (fluid) {
        fluid.transition(dir, next);
        setTimeout(() => { idx = next; release(); }, 1900);
      } else if (REDUCED) {
        fallbackImg.src = AROMAS[next].img; idx = next; release();
      } else {
        fallbackImg.style.opacity = 0;
        setTimeout(() => { fallbackImg.src = AROMAS[next].img; fallbackImg.style.opacity = 1; idx = next; release(); }, 480);
      }
    };
    activate(stage.querySelector('.car-next'), () => go(1));
    activate(stage.querySelector('.car-prev'), () => go(-1));
  }

  // --- мобильная карусель ароматов: WebGL-морф, фоллбек — направленный кроссфейд ---
  const mstage = document.querySelector('.m-car-stage');
  if (mstage) {
    const imgs = mstage.querySelectorAll('.m-car-img');
    const mcap = document.querySelector('.m-car-caption');
    const mdesc = document.querySelector('.m-car-desc');
    const mdots = [...document.querySelectorAll('.m-car-dots span')];
    let mi = 0, mfront = 0, mbusy = false;
    let mScene = null, mEng = null, mProg = 0, mDirU = 1;
    if (!NO_AROMA_FLUID && window.GLEngine && !REDUCED && document.documentElement.clientWidth <= MOBILE_MAX) {
      try {
        mEng = new GLEngine();
        const cv = document.createElement('canvas');
        cv.className = 'm-car-canvas';
        mstage.appendChild(cv);
        mScene = mEng.addScene(cv, MORPH_FRAG, { uFrom: AROMAS[0].m, uTo: AROMAS[0].m },
          () => ({ uProgress: mProg, uDir: mDirU }));
        if (mScene) {
          mScene.onFail = () => { cv.remove(); mScene = null; };
          const onR = () => {
            if (mScene && mScene.ready) imgs.forEach(i => i.style.visibility = 'hidden');
            else if (mScene && !mScene.failed) requestAnimationFrame(onR);
          };
          requestAnimationFrame(onR);
        }
      } catch (e) { mScene = null; }
    }
    // мобильный автоплей: те же 7с, пауза пока палец на карусели
    let mTimer = 0, mVis = false, mTouch = false;
    const mArm = () => {
      clearTimeout(mTimer);
      if (REDUCED || !MOBILE) return;
      mTimer = setTimeout(() => {
        if (mVis && !mTouch && !document.hidden && !mbusy) mgo(1); else mArm();
      }, 7000);
    };
    if (!REDUCED && MOBILE) {
      new IntersectionObserver(es => es.forEach(e => { mVis = e.isIntersecting; }), { threshold: .35 }).observe(mstage);
      mstage.addEventListener('pointerdown', () => { mTouch = true; });
      mstage.addEventListener('pointerup', () => { mTouch = false; });
      mstage.addEventListener('pointercancel', () => { mTouch = false; });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) mArm(); });
      mArm();
    }
    const mgo = dir => {
      if (mbusy) return; mbusy = true;
      mArm();
      const next = (mi + dir + AROMAS.length) % AROMAS.length;
      announceAroma(next);
      mDirU = dir;
      mdots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === next));
      if (mcap) cascadeCaption(mcap, AROMAS[next].caption);
      if (mdesc) swapDescDir(mdesc, (AROMAS[next].mobileDesc || AROMAS[next].desc).replace(/<br>/g, ' '), dir);
      if (mScene && mScene.ready) {
        mEng.swapTexture(mScene, 'uTo', AROMAS[next].m, ok => {
          if (!ok) { mi = next; mbusy = false; return; }
          const t0 = performance.now(), DUR = 1250;
          const ease = t => .5 - .5 * Math.cos(Math.PI * t);
          const step = now => {
            const t = Math.min(1, (now - t0) / DUR);
            mProg = ease(t);
            if (t < 1) requestAnimationFrame(step);
            else mEng.swapTexture(mScene, 'uFrom', AROMAS[next].m, () => { mProg = 0; mi = next; mbusy = false; });
          };
          requestAnimationFrame(step);
        });
        return;
      }
      // фоллбек: направленный кроссфейд картинок
      const back = 1 - mfront;
      const el = imgs[back];
      const swap = () => {
        el.classList.remove('from-left', 'from-right');
        el.classList.add(dir > 0 ? 'from-right' : 'from-left');
        void el.offsetWidth;
        el.classList.add('is-on');
        el.removeAttribute('aria-hidden');
        imgs[mfront].classList.remove('is-on');
        imgs[mfront].setAttribute('aria-hidden', 'true');
        mfront = back;
        setTimeout(() => { mi = next; mbusy = false; }, REDUCED ? 0 : 900);
      };
      el.alt = 'Флакон ' + AROMAS[next].caption.replace('/ ', '');
      if (el.src.endsWith(AROMAS[next].m)) { swap(); return; }
      el.onload = swap;
      el.onerror = () => { mbusy = false; };
      el.src = AROMAS[next].m;
      if (el.complete && el.naturalWidth) { el.onload = null; swap(); }
    };
    activate(document.querySelector('.m-car-prev'), () => mgo(-1));
    activate(document.querySelector('.m-car-next'), () => mgo(1));
    let x0 = null;
    mstage.addEventListener('pointerdown', e => { x0 = e.clientX; });
    mstage.addEventListener('pointerup', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) mgo(dx < 0 ? 1 : -1);
    });
  }

  const mobileAromas = document.querySelector('.m-aromas');
  const mobileTopbar = document.querySelector('.m-topbar');
  if (MOBILE && mobileAromas && mobileTopbar) {
    new IntersectionObserver(entries => entries.forEach(entry => {
      mobileTopbar.classList.toggle('is-over-aromas', entry.isIntersecting);
    }), { rootMargin: '-1px 0px -88% 0px', threshold: .001 }).observe(mobileAromas);
  }

  // --- каталог: живые фильтры + появление карточек ---
  const catGrid = document.querySelector('.cat-grid');
  if (catGrid) {
    const cards = [...catGrid.querySelectorAll('.cat-card')];
    const filters = document.querySelectorAll('.cat-filter');
    const timers = new Map();
    filters.forEach(btn => btn.addEventListener('click', () => {
      filters.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      const f = btn.dataset.filter;
      cards.forEach(card => {
        const show = f === 'all' || card.dataset.cat === f;
        clearTimeout(timers.get(card));
        if (show) {
          card.hidden = false;
          requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('is-out')));
        } else {
          card.classList.add('is-out');
          timers.set(card, setTimeout(() => { card.hidden = true; }, REDUCED ? 0 : 360));
        }
      });
    }));
    if (!REDUCED) {
      const cio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          setTimeout(() => { e.target.style.transitionDelay = ''; }, 900);
          cio.unobserve(e.target);
        }
      }), { threshold: .1 });
      cards.forEach((card, i) => {
        card.classList.add('rv-card');
        card.style.transitionDelay = (i % 4) * 110 + 'ms';
        cio.observe(card);
      });
    }
  }

  // --- карточка товара в каталоге: «Подробнее» показывает товар крупнее ---
  const productDialog = document.getElementById('productDialog');
  if (productDialog) {
    const productImage = document.getElementById('productDialogImage');
    const productTitle = document.getElementById('productDialogTitle');
    const productType = document.getElementById('productDialogType');
    const productVolume = document.getElementById('productDialogVolume');
    const detailClose = productDialog.querySelector('[data-detail-close]');
    const detailBuy = productDialog.querySelector('[data-detail-buy]');
    let detailFocus = null;
    let detailProductKey = null;

    const closeDetail = restoreFocus => {
      if (!productDialog.open) return;
      if (!restoreFocus) detailFocus = null;
      productDialog.close();
    };

    document.querySelectorAll('.cat-btn--ghost[data-buy]').forEach(button => activate(button, () => {
      const card = button.closest('.cat-card');
      const image = card.querySelector('.cat-photo img');
      detailFocus = button;
      detailProductKey = productKeyFrom(button);
      productImage.src = image.currentSrc || image.src;
      productImage.alt = image.alt;
      productTitle.textContent = card.querySelector('.cat-name').textContent;
      productType.textContent = card.querySelector('.cat-type').textContent;
      productVolume.textContent = card.querySelector('.cat-vol').textContent;
      productDialog.showModal();
      detailClose.focus();
    }));

    detailClose.addEventListener('click', () => closeDetail(true));
    productDialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeDetail(true); }
    });
    productDialog.addEventListener('click', event => {
      if (event.target === productDialog) closeDetail(true);
    });
    productDialog.addEventListener('close', () => {
      if (detailFocus && detailFocus.focus) detailFocus.focus();
      detailFocus = null;
    });
    detailBuy.addEventListener('click', () => {
      const productKey = detailProductKey;
      closeDetail(false);
      openModal(productKey);
    });
  }

  // --- анимации: каскад хиро, reveals, параллакс, побуквенный UNCHARTED ---
  if (!REDUCED) {
    document.body.classList.add('anim');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('hero-in')));
    const revealSel = ['.n617','.n618','.n619','.n692','.showcase','.geldiag','.creamdiag',
      '.lbl','.n725','.n726','.n729a','.n729b','.n620','.n621','.n622','.n623','.n624','.n629',
      '.n631','.n632','.n633','.n634','.n635','.n636','.n637','.n638','.n639','.n657','.n658'];
    const els = document.querySelectorAll('.page ' + revealSel.join(', .page '));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        if (e.target.style.transitionDelay) setTimeout(() => { e.target.style.transitionDelay = ''; }, 1000);
        io.unobserve(e.target);
      } }), { threshold: .15 });
    let cardN = 0;
    els.forEach(el => {
      const m = getComputedStyle(el).transform;
      if (m && m !== 'none') { const ty = parseFloat(m.split(',').pop()); if (ty) el.style.setProperty('--ty', ty + 'px'); }
      el.classList.add('rv');
      if (el.classList.contains('card')) el.style.transitionDelay = (cardN++ * 120) + 'ms';
      io.observe(el);
    });
    // побуквенный UNCHARTED
    const giant = document.querySelector('.n630');
    if (giant) {
      const word = giant.textContent;
      giant.setAttribute('aria-label', word); giant.textContent = ''; giant.classList.add('rv-letters');
      [...word].forEach((ch, i) => { const s = document.createElement('span'); s.textContent = ch;
        s.setAttribute('aria-hidden', 'true'); s.style.transitionDelay = (i * 60) + 'ms'; giant.appendChild(s); });
      new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) {
        giant.classList.add('in');
        setTimeout(() => { giant.textContent = word; giant.removeAttribute('aria-label'); }, 1400);
        o.disconnect();
      } }), { threshold: .3 }).observe(giant);
    }
    // параллакс слоёв
    const PARA = [['.n731', 26], ['.n690', 14], ['.n697', 12], ['.hero-right', 9], ['.hero-streak', 6]];
    const items = PARA.map(([sel, amp]) => ({ el: document.querySelector(sel), amp, cur: 0 })).filter(i => i.el);
    const paraTick = () => {
      const vh = innerHeight;
      items.forEach(it => {
        const r = it.el.getBoundingClientRect();
        if (r.bottom < -60 || r.top > vh + 60) return;           // вне экрана — не трогаем
        const t = ((r.top + r.height / 2) - vh / 2) / vh;
        const target = Math.max(-1, Math.min(1, t)) * it.amp;
        if (Math.abs(target - it.cur) < .02) return;             // дошли — не пишем каждый кадр
        it.cur += (target - it.cur) * .08;
        it.el.style.transform = 'translate3d(0,' + it.cur.toFixed(2) + 'px,0)';
      });
      requestAnimationFrame(paraTick);
    };
    if (!MOBILE && items.length) requestAnimationFrame(paraTick);
  }
})();
