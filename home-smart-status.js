(() => {
  'use strict';

  const card = document.querySelector('[data-home-smart-status]');
  if (!card) return;

  const STATION_URL = 'https://www.sooplive.com/station/chunbongtv';
  const LIVE_URL = 'https://play.sooplive.com/chunbongtv';
  const label = card.querySelector('[data-status-label]');
  const action = card.querySelector('[data-status-action]');

  const isHttp = value => /^https?:\/\//i.test(String(value || ''));

  async function fetchJson(key, url, ttl) {
    if (window.ChunbongCache) {
      return window.ChunbongCache.fetchJson(key, url, { ttl, force:true });
    }
    const response = await fetch(url, { headers:{ accept:'application/json' }, cache:'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  function apply({ live = false, href = STATION_URL, actionText = 'SOOP 방송국', title = '' } = {}) {
    card.classList.remove('is-loading','is-live','is-offline');
    card.classList.add(live ? 'is-live' : 'is-offline');
    card.href = isHttp(href) ? href : STATION_URL;
    card.dataset.broadcastState = live ? 'live' : 'offline';

    if (label) label.textContent = live ? 'LIVE' : 'OFFLINE';
    if (action) action.textContent = actionText;

    const accessibleTitle = live
      ? ['춘봉 LIVE', title, '지금 방송 보러가기'].filter(Boolean).join(' · ')
      : ['춘봉 OFFLINE', actionText].filter(Boolean).join(' · ');
    card.setAttribute('aria-label', accessibleTitle);
    card.title = accessibleTitle;
  }

  async function refresh() {
    let livePayload = null;
    try {
      livePayload = await fetchJson('home:smart-live','/api/content?type=live',30000);
    } catch (_) {}

    if (livePayload?.live === true) {
      const href = isHttp(livePayload.source) ? livePayload.source : LIVE_URL;
      apply({
        live:true,
        href,
        title:String(livePayload.title || ''),
        actionText:'지금 방송 보러가기'
      });
      return;
    }

    try {
      const vodPayload = await fetchJson('home:smart-vod','/api/content?type=vod',120000);
      const latest = Array.isArray(vodPayload?.items) ? vodPayload.items.find(item => isHttp(item?.link)) : null;
      if (latest) {
        apply({
          live:false,
          href:latest.link,
          actionText:'최근 방송 다시보기',
          title:String(latest.title || '')
        });
        return;
      }
    } catch (_) {}

    apply({ live:false, href:STATION_URL, actionText:'SOOP 방송국' });
  }

  void refresh();

  let timer = window.setInterval(refresh, 60000);
  window.addEventListener('pagehide', () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  }, { once:true });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
  });
})();
