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
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const zoom = () => Math.max(document.documentElement.clientWidth, 769) / 1920;

  // --- ссылки из конфига ---
  document.querySelectorAll('[data-link]').forEach(el => {
    const url = LINKS[el.dataset.link];
    if (!url) return;
    if (el.tagName === 'A') { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
    else el.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
  });

  // --- вспомогательная функция: клик + Enter/Space ---
  const activate = (el, fn) => { el.addEventListener('click', fn); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } }); };

  // --- плавный скролл ---
  document.querySelectorAll('[data-scroll]').forEach(el => {
    activate(el, e => {
      e.preventDefault();
      const y = parseFloat(el.dataset.scroll) * (document.documentElement.clientWidth > 768 ? zoom() : 1);
      window.scrollTo({ top: y, behavior: REDUCED ? 'auto' : 'smooth' });
    });
  });

  // --- переход по якорю с другой страницы (catalog.html → index.html#about) ---
  const HASH_POS = { '#about': 7069, '#catalog': 1789, '#contacts': 8428 };
  if (HASH_POS[location.hash] && document.querySelector('.page')) {
    if (document.documentElement.clientWidth > 768) {
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
  const openModal = () => { lastFocus = document.activeElement; modal.hidden = false; document.body.classList.add('modal-open'); modal.querySelector('.buy-row').focus(); };
  const closeModal = () => { modal.hidden = true; document.body.classList.remove('modal-open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  document.querySelectorAll('[data-buy]').forEach(b => activate(b, openModal));
  modal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // --- WebGL band ---
  if (!REDUCED && window.GLEngine && document.documentElement.clientWidth > 768) {
    try {
      window.ENGINE = new GLEngine();
      const band = document.querySelector('canvas[data-shader="band"]');
      if (band) {
        const sc = ENGINE.addScene(band, BAND_FRAG, { uTex: 'public/images/adj/521-607-adj.webp' }, rect => ({
          uScroll: Math.min(1, Math.max(0, 1 - (rect.top + rect.height / 2) / innerHeight)),
        }));
        if (sc) {
          sc.onFail = () => document.body.classList.remove('webgl-on');
          const onReady = () => { if (sc.ready) document.body.classList.add('webgl-on'); else if (!sc.failed) requestAnimationFrame(onReady); };
          requestAnimationFrame(onReady);
        }
      }
      const grain = document.querySelector('canvas[data-shader="grain"]');
      if (grain) ENGINE.addScene(grain, GRAIN_FRAG, {}, () => ({}));
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
      desc: '<span class="ts4">аромат MANGO BLISS</span><br><span class="ts6">— </span><span class="ts7">билет в неизведанные<br>уголки тропиков мьянмы,<br>где сладкий аромат манго<br>переплетается с ежевикой,<br>иланг-илангом и ноткой<br>пачули</span>' },
    { caption: '/ NAMIBIA DUNES', img: 'public/images/render/aromas/namibia-dunes.webp', m: 'public/images/m/bottle-namibia.webp',
      desc: '<span class="ts4">аромат NAMIBIA DUNES</span><br><span class="ts6">— </span><span class="ts7">билет в пустыню НАМИБ<br>с бескрайними дюнами,<br>где сладкий апельсин тает в розовом перце, пряных специях и древесном кедре</span>' },
    { caption: '/ ISLAY SMOKE', img: 'public/images/render/aromas/islay-smoke.webp', m: 'public/images/m/bottle-islay.webp',
      desc: '<span class="ts4">аромат ISLAY SMOKE</span><br><span class="ts6">— </span><span class="ts7">прогулка по ветреным шотландским холмам,<br>где в воздухе ощущается запах выдержанного виски и табачного дыма. Теплые ноты какао и амбры окутывают словно вечерний туман</span>' },
    { caption: '/ CITRUS VETIVER', img: 'public/images/render/aromas/citrus-vetiver.webp', m: 'public/images/m/bottle-citrus.webp',
      desc: '<span class="ts4">аромат CITRUS VETIVER</span><br><span class="ts6">— </span><span class="ts7">поход в густые леса мабу, где свежесть ветивера<br>и тепло ореховой коры сливаются со сладким ароматом лимонной карамели и бобов тонка</span>' },
    { caption: '/ KAMCHATKA VEIL', img: 'public/images/render/aromas/kamchatka-veil.webp', m: 'public/images/m/bottle-kamchatka.webp',
      desc: '<span class="ts4">аромат KAMCHATKA VEIL</span><br><span class="ts6">— </span><span class="ts7">путешествие на вершины вулканов камчатки, где каждый вздох наполнен пикантным черным перцем<br>и бодрящим бергамотом<br>с нежностью ванили<br>и белого чая</span>' },
  ];
  const MOBILE = document.documentElement.clientWidth <= 768;
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
    let idx = 0, busy = false, particles = null;
    const fallbackImg = stage.querySelector('.bottle-fallback');
    // флакон из частиц: пейзаж разбит на ~30к вязких «капель» (см. ParticleBottle)
    if (window.ParticleBottle && !REDUCED && !MOBILE) {
      const pCv = document.createElement('canvas');
      pCv.className = 'particle-canvas';
      document.querySelector('.page').appendChild(pCv);
      const pb = new ParticleBottle(pCv);
      if (pb.failed) { pCv.remove(); }
      else pb.init(AROMAS.map(a => a.img), ok => {
        if (ok) {
          particles = pb;
          fallbackImg.style.visibility = 'hidden';
          stage.querySelector('.bottle-canvas').style.display = 'none';
          if (location.search.indexOf('morphdbg') >= 0) window.__pb = pb;   // для покадровой QA-съёмки
        } else pCv.remove();
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
    // смыв описания: маска уходит слева направо вслед каплям, новая надпись проявляется потоком
    const washDesc = (el, html) => {
      el.classList.add('washing');
      el.style.animation = 'washOut .58s cubic-bezier(.5,.1,.75,.5) forwards';
      setTimeout(() => {
        el.innerHTML = html;
        el.style.animation = 'washIn .72s cubic-bezier(.25,.4,.3,1) forwards';
        setTimeout(() => { el.classList.remove('washing'); el.style.animation = ''; }, 760);
      }, 600);
    };
    const swapTexts = (next, dir) => {
      cascadeCaption(capEl, AROMAS[next].caption);
      if (dir > 0 && particles) {
        setTimeout(() => washDesc(descEl, AROMAS[next].desc), 480);   // волна частиц долетела до текста
      } else {
        swapDescDir(descEl, AROMAS[next].desc, dir);
      }
    };
    const go = dir => {
      if (busy) return; busy = true;
      autoArm();
      const arrows = stage.querySelectorAll('.car-arrow');
      arrows.forEach(a => a.disabled = true);
      const release = () => { busy = false; arrows.forEach(a => a.disabled = false); };
      const next = (idx + dir + AROMAS.length) % AROMAS.length;
      swapTexts(next, dir);
      if (particles) {
        particles.transition(dir, next);
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
    let mi = 0, mfront = 0, mbusy = false;
    let mScene = null, mEng = null, mProg = 0, mDirU = 1;
    if (window.GLEngine && !REDUCED && document.documentElement.clientWidth <= 768) {
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
      mDirU = dir;
      cascadeCaption(mcap, AROMAS[next].caption);
      swapDescDir(mdesc, AROMAS[next].desc.replace(/<br>/g, ' '), dir);
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

  // --- мобильные scroll-reveal'ы ---
  if (!REDUCED) {
    const mrv = document.querySelectorAll('.m-rv');
    if (mrv.length) {
      const mio = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); mio.unobserve(e.target); }
      }), { threshold: .12 });
      mrv.forEach(el => mio.observe(el));
    }
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

  // --- анимации: каскад хиро, reveals, параллакс, побуквенный UNCHARTED ---
  if (!REDUCED) {
    document.body.classList.add('anim');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('hero-in')));
    const revealSel = ['.n617','.n618','.n619','.n692','.card','.geldiag','.creamdiag',
      '.lbl','.n725','.n726','.n729','.n620','.n621','.n622','.n623','.n624','.n629',
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
    requestAnimationFrame(paraTick);
  }
})();
