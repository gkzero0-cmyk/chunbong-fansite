(() => {
  'use strict';
  let theme = 'dark';
  try {
    const stored = localStorage.getItem('chunbong-theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
