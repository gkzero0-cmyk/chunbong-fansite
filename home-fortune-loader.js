(() => {
  'use strict';
  if (document.body.dataset.page !== 'home') return;

  const STYLE_HREF = 'daily-fortune.css?v=16';
  const SCRIPT_SRC = 'daily-fortune.js?v=15';
  let loading = null;

  function ensureStyle() {
    const existing = [...document.styleSheets].some(sheet => String(sheet.href || '').includes('daily-fortune.css')) ||
      document.querySelector('link[data-daily-fortune-style]');
    if (existing) return Promise.resolve();
    return new Promise(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = STYLE_HREF;
      link.dataset.dailyFortuneStyle = 'true';
      link.addEventListener('load', resolve, { once:true });
      link.addEventListener('error', resolve, { once:true });
      document.head.appendChild(link);
    });
  }

  function ensureScript() {
    if (window.CHUNBONG_DAILY_FORTUNE) return Promise.resolve();
    const existing = document.querySelector('script[data-daily-fortune-runtime]');
    if (existing) return new Promise(resolve => {
      existing.addEventListener('load', resolve, { once:true });
      existing.addEventListener('error', resolve, { once:true });
    });
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.defer = true;
      script.dataset.dailyFortuneRuntime = 'true';
      script.addEventListener('load', resolve, { once:true });
      script.addEventListener('error', resolve, { once:true });
      document.head.appendChild(script);
    });
  }

  function loadFortune() {
    if (!loading) loading = ensureStyle().then(ensureScript);
    return loading;
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-home-overview-fortune]');
    if (!trigger || window.CHUNBONG_DAILY_FORTUNE) return;
    event.preventDefault();
    loadFortune().then(() => document.dispatchEvent(new CustomEvent('chunbong:daily-fortune-open')));
  }, true);

  const warm = () => void loadFortune();
  if (document.readyState === 'complete') {
    ('requestIdleCallback' in window ? requestIdleCallback(warm, { timeout:1800 }) : setTimeout(warm, 900));
  } else {
    window.addEventListener('load', () => {
      ('requestIdleCallback' in window ? requestIdleCallback(warm, { timeout:1800 }) : setTimeout(warm, 900));
    }, { once:true });
  }
})();