(() => {
  'use strict';

  let scheduled = false;
  let restoring = false;

  function compactViewIsCurrent() {
    const daily = document.querySelector('#data-soop-chart');
    const monthly = document.querySelector('#data-soop-monthly-chart');
    const dailyControls = document.querySelector('#data-daily-periods');
    const monthlyControls = document.querySelector('#data-month-periods');
    if (!daily || !monthly || !dailyControls || !monthlyControls) return true;
    return !!(
      daily.querySelector('.data-fanclub-combined')
      && monthly.querySelector('.data-fanclub-combined')
      && dailyControls.querySelector('.data-daily-month-select')
      && dailyControls.querySelector('.data-daily-week-select')
      && monthlyControls.querySelector('.data-month-year-select')
    );
  }

  function schedulePersistentRender() {
    if (scheduled || restoring || compactViewIsCurrent()) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      if (compactViewIsCurrent()) return;
      const retry = document.querySelector('#data-retry');
      if (!retry) return;
      restoring = true;
      retry.click();
      setTimeout(() => { restoring = false; }, 800);
    }, 40);
  }

  const observer = new MutationObserver(schedulePersistentRender);
  const targets = ['#data-soop-chart','#data-soop-monthly-chart','#data-daily-periods','#data-month-periods']
    .map(selector => document.querySelector(selector))
    .filter(Boolean);
  for (const target of targets) observer.observe(target, { childList: true, subtree: true });

  window.__CHUNBONG_SOOP_PERIOD_PERSISTENCE__ = { schedulePersistentRender, compactViewIsCurrent };
})();
