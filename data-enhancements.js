(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const DATA_ENDPOINT = '/api/content?type=data';

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function kstDateKey(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function formatFullDate(value) {
    const text = String(value || '');
    const match = text.match(/^(20\d{2})-(\d{2})-(\d{2})$/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : text;
  }

  function normalizeDailyTrendRows(rows = [], payload = {}) {
    const byDate = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      const date = String(row?.date || '').slice(0, 10);
      if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) continue;
      const previous = byDate.get(date);
      const previousTime = Date.parse(previous?.capturedAt || '') || 0;
      const currentTime = Date.parse(row?.capturedAt || '') || 0;
      if (!previous || currentTime >= previousTime) byDate.set(date, { ...row, date });
    }

    const channel = payload?.youtube?.channel || {};
    const currentDate = kstDateKey(payload?.capturedAt || Date.now());
    const hasCurrentYoutube = [channel.subscriberCount, channel.viewCount, channel.videoCount].some(value => finite(value) !== null);
    if (currentDate && hasCurrentYoutube) {
      const previous = byDate.get(currentDate) || { date: currentDate };
      byDate.set(currentDate, {
        ...previous,
        date: currentDate,
        capturedAt: payload?.capturedAt || previous.capturedAt || '',
        youtube: {
          ...(previous.youtube || {}),
          ...(finite(channel.subscriberCount) !== null ? { subscriberCount: channel.subscriberCount } : {}),
          ...(finite(channel.viewCount) !== null ? { viewCount: channel.viewCount } : {}),
          ...(finite(channel.videoCount) !== null ? { videoCount: channel.videoCount } : {})
        }
      });
    }
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  function legacyExternalSession(item) {
    const source = `${item?.source?.name || ''} ${item?.source?.url || ''}`.toLowerCase();
    const id = String(item?.id || '').toLowerCase();
    return source.includes('streamscharts')
      || source.includes('streams charts')
      || source.includes('auro.live')
      || id.startsWith('external-streamscharts-')
      || id.startsWith('external-auro-');
  }

  function stripLegacySoopData(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    payload.trends = normalizeDailyTrendRows(payload.trends, payload);
    const soop = payload.soop;
    if (!soop || typeof soop !== 'object') return payload;

    const history = soop.externalHistory || {};
    const cutoffKst = String(history.cutoffKst || '');
    const currentFallback = history.currentFallback && typeof history.currentFallback === 'object'
      ? { ...history.currentFallback }
      : {};
    const allowedSources = new Set(['trackify', 'softc']);
    currentFallback.sources = (Array.isArray(currentFallback.sources) ? currentFallback.sources : []).filter(item => allowedSources.has(String(item?.source || '').toLowerCase()));
    currentFallback.errors = (Array.isArray(currentFallback.errors) ? currentFallback.errors : []).filter(item => allowedSources.has(String(item?.source || '').toLowerCase()));
    if (currentFallback.fieldSources && typeof currentFallback.fieldSources === 'object') {
      currentFallback.fieldSources = Object.fromEntries(Object.entries(currentFallback.fieldSources).filter(([, source]) => allowedSources.has(String(source || '').toLowerCase()) || String(source || '').toLowerCase() === 'soop'));
    }

    soop.externalHistory = { ...history, cutoffKst, backfillCount: 0, sourceSummary:null, categoryReference:null, currentFallback };
    soop.recentSessions = (Array.isArray(soop.recentSessions) ? soop.recentSessions : []).filter(item => !legacyExternalSession(item));

    const overview = soop.overview || {};
    const prefer = (field, fallbackField = field) => {
      const value = finite(currentFallback?.[field]);
      if (value !== null) overview[fallbackField] = value;
    };
    prefer('followerCount');
    prefer('fanclubCount');
    prefer('subscriberCount');
    prefer('supporterCount');
    prefer('averageViewers', 'monthAverageViewers');
    prefer('maxViewers', 'monthMaxViewers');
    prefer('airtimeMinutes', 'monthDurationMinutes');
    prefer('monthUniqueViewers');
    prefer('viewershipHours');
    prefer('cumulativeUsers');
    prefer('cumulativeUpCount');
    prefer('totalAirtimeMinutes');
    prefer('monthlyStarCount');
    prefer('starsPerHour');
    prefer('monthlySupporterCount');
    prefer('monthlyChatCount');
    prefer('monthlyKickCount');
    prefer('monthlyMuteCount');
    if (Array.isArray(currentFallback.categories) && currentFallback.categories.length) overview.currentMonthCategories = currentFallback.categories;
    soop.overview = overview;
    return payload;
  }

  function isDataRequest(input) {
    const url = typeof input === 'string' ? input : input?.url;
    return typeof url === 'string' && url.includes(DATA_ENDPOINT);
  }

  function installDataFetchTransform() {
    window.fetch = async function transformedFetch(input, init) {
      const response = await nativeFetch(input, init);
      if (!isDataRequest(input) || !response.ok) return response;
      try {
        const payload = await response.clone().json();
        const transformed = stripLegacySoopData(payload);
        const headers = new Headers(response.headers);
        headers.set('content-type', 'application/json; charset=utf-8');
        headers.delete('content-length');
        headers.delete('content-encoding');
        headers.delete('etag');
        return new Response(JSON.stringify(transformed), { status: response.status, statusText: response.statusText, headers });
      } catch (_) {
        return response;
      }
    };
  }

  function hideUnavailableSoopCards() {
    const panel = document.querySelector('#data-soop-panel');
    if (!panel) return;

    panel.querySelectorAll('.data-kpi').forEach(card => {
      const label = card.querySelector('small')?.textContent.trim() || '';
      const value = card.querySelector('strong')?.textContent.trim() || '';
      if (value === '측정 불가' || label === '외부 30일 참고') card.remove();
    });
    panel.querySelectorAll('.data-source-strip,.data-source-chip,.data-measurement-badge').forEach(node => node.remove());
    panel.querySelectorAll('#data-soop-chart .data-chart-card,#data-soop-monthly-chart .data-chart-card').forEach(card => {
      if (card.querySelector('.data-empty')) card.remove();
    });
    panel.querySelectorAll('*').forEach(node => {
      if (node.children.length === 0 && node.textContent.trim() === '측정 불가') node.textContent = '—';
      if (node.children.length === 0 && node.textContent.includes('Trackify 월간 분포')) node.textContent = node.textContent.replace('Trackify 월간 분포', '월간 분포');
      if (node.children.length === 0 && node.textContent.trim() === 'Trackify 카테고리 순위') node.textContent = '카테고리 순위';
    });
  }

  function enhanceChartLabels() {
    document.querySelectorAll('.data-chart-hover').forEach(point => {
      const labelNode = point.querySelector('.data-chart-hover-card text:not(.value)');
      if (labelNode) labelNode.textContent = formatFullDate(labelNode.textContent.trim());
      const title = point.querySelector('title');
      if (title) title.textContent = title.textContent.replace(/^(20\d{2})-(\d{2})-(\d{2})/, '$1.$2.$3');
      const aria = point.getAttribute('aria-label');
      if (aria) point.setAttribute('aria-label', aria.replace(/^(20\d{2})-(\d{2})-(\d{2})/, '$1.$2.$3'));
    });
  }

  function refreshPresentation() {
    hideUnavailableSoopCards();
    enhanceChartLabels();
  }

  installDataFetchTransform();
  const observer = new MutationObserver(refreshPresentation);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshPresentation, { once: true });
  else refreshPresentation();
})();
