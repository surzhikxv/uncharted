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
  if (!REDUCED && window.GLEngine) {
    try {
      window.ENGINE = new GLEngine();
      const band = document.querySelector('canvas[data-shader="band"]');
      if (band) {
        const sc = ENGINE.addScene(band, BAND_FRAG, { uTex: 'public/images/adj/521-607-adj.png' }, rect => ({
          uScroll: Math.min(1, Math.max(0, 1 - (rect.top + rect.height / 2) / innerHeight)),
        }));
        if (sc) document.body.classList.add('webgl-on');
      }
    } catch (e) { console.warn('WebGL off:', e); }
  }
})();
