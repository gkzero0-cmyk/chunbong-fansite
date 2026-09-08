(() => {
  'use strict';

  const page = document.body.dataset.page || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const API = '/api/content?type=data';
  const number = value => Number.isFinite(value) ? new Intl.NumberFormat('ko-KR').format(value) : '측정 불가';
  const signed = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${number(value)}` : '';

  function countDeltaText(count, delta) {
    if (!Number.isFinite(count)) return Number.isFinite(delta) ? signed(delta) : '측정 불가';
    return `${number(count)}${Number.isFinite(delta) ? ` (${signed(delta)})` : ''}`;
  }

  window.__CHUNBONG_RECENT_SESSION_METRIC_HELPERS__ = { countDeltaText };
  if (page !== 'data') return;

  let payload = null;
  let scheduled = false;

  function apply(data = payload) {
    if (!data?.soop) return;
    payload = data;
    const rows = Array.isArray(data.soop.recentSessions) ? data.soop.recentSessions : [];
    const cards = $$('#data-soop-sessions .data-session-card');
    cards.forEach((card, index) => {
      const row = rows[index];
      if (!row) return;
      const metrics = $$('.data-session-metrics span b', card);
      if (metrics[3]) metrics[3].textContent = countDeltaText(row.followerCount, row.followerDelta);
      if (metrics[4]) metrics[4].textContent = countDeltaText(row.fanclubCount, row.fanclubDelta);
    });
  }

  function scheduleApply(data = payload) {
    if (data?.soop) payload = data;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  function isDataRequest(input) {
    const url = typeof input === 'string' ? input : input?.url;
    return typeof url === 'string' && url.includes(API);
  }

  function installFetchTap() {
    const previousFetch = window.fetch.bind(window);
    window.fetch = async function recentSessionMetricFetch(input, init) {
      const response = await previousFetch(input, init);
      if (isDataRequest(input) && response.ok) {
        response.clone().json().then(data => scheduleApply(data)).catch(() => {});
      }
      return response;
    };
  }

  async function prime() {
    try {
      const response = await fetch(API, { headers: { accept: 'application/json' } });
      if (!response.ok) return;
      scheduleApply(await response.json());
    } catch (_) {}
  }

  installFetchTap();
  const root = $('#data-soop-sessions');
  if (root) new MutationObserver(() => scheduleApply()).observe(root, { childList: true, subtree: true });
  prime();
})();
