(() => {
  'use strict';

  const STORAGE_KEY = 'chunbong-activity-seen-v1';
  const REFRESH_MS = 3 * 60 * 1000;
  const MAX_SEEN_IDS = 240;
  const header = document.querySelector('.site-header');
  if (!header || header.querySelector('.activity-center')) return;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const wrapper = document.createElement('div');
  wrapper.className = 'activity-center';
  wrapper.innerHTML =
    '<button class="activity-bell" type="button" aria-label="새 소식 보기" aria-expanded="false" aria-controls="activity-panel">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>' +
      '<span class="activity-unread-dot" hidden aria-hidden="true"></span>' +
    '</button>' +
    '<section class="activity-panel" id="activity-panel" hidden aria-label="팬사이트 새 소식">' +
      '<header class="activity-panel-head"><div><small>CHUNBONG FAN HUB</small><strong>최근 업데이트</strong></div><button class="activity-close" type="button" aria-label="알림 닫기">×</button></header>' +
      '<div class="activity-tabs" role="tablist" aria-label="업데이트 종류">' +
        '<button type="button" class="active" data-activity-filter="all" role="tab" aria-selected="true">전체</button>' +
        '<button type="button" data-activity-filter="notice" role="tab" aria-selected="false">공지</button>' +
        '<button type="button" data-activity-filter="media" role="tab" aria-selected="false">영상</button>' +
        '<button type="button" data-activity-filter="fanart" role="tab" aria-selected="false">팬아트</button>' +
      '</div>' +
      '<div class="activity-status" aria-live="polite">새 소식을 불러오는 중...</div>' +
      '<div class="activity-list" hidden></div>' +
    '</section>';

  const themeToggle = header.querySelector('.theme-toggle');
  const navToggle = header.querySelector('.nav-toggle');
  if (themeToggle) themeToggle.insertAdjacentElement('afterend', wrapper);
  else header.insertBefore(wrapper, navToggle || null);

  const button = wrapper.querySelector('.activity-bell');
  const dot = wrapper.querySelector('.activity-unread-dot');
  const panel = wrapper.querySelector('.activity-panel');
  const closeButton = wrapper.querySelector('.activity-close');
  const status = wrapper.querySelector('.activity-status');
  const list = wrapper.querySelector('.activity-list');
  const tabs = [...wrapper.querySelectorAll('[data-activity-filter]')];

  const state = { items: [], filter: 'all', loaded: false, loading: false };

  function loadSeen() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return new Set(Array.isArray(parsed.ids) ? parsed.ids.map(String) : []);
    } catch (_) {
      return new Set();
    }
  }

  function saveSeen(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ids: [...ids].slice(-MAX_SEEN_IDS), seenAt: new Date().toISOString() }));
    } catch (_) {}
  }

  function updateUnreadDot() {
    if (!state.loaded || !state.items.length) {
      dot.hidden = true;
      return;
    }
    const seen = loadSeen();
    dot.hidden = !state.items.some(item => item && item.id && !seen.has(String(item.id)));
  }

  function markCurrentSeen() {
    if (!state.items.length) {
      dot.hidden = true;
      return;
    }
    const seen = loadSeen();
    state.items.forEach(item => { if (item && item.id) seen.add(String(item.id)); });
    saveSeen(seen);
    dot.hidden = true;
  }

  function kstParts(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return parts;
  }

  function dateKey(item) {
    const parts = kstParts(item.publishedAt);
    if (parts) return parts.year + '-' + parts.month + '-' + parts.day;
    const raw = String(item.originalDate || '');
    const match = raw.match(/20\d{2}-\d{2}-\d{2}/);
    return match ? match[0] : '날짜 미상';
  }

  function dateHeading(key) {
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(key)) return key;
    const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'})
      .format(new Date());
    const date = new Date(key + 'T00:00:00+09:00');
    const text = new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short'}).format(date);
    return key === today ? '오늘 · ' + text : text;
  }

  function timeText(item) {
    if (item.precision === 'datetime' && item.publishedAt) {
      return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(item.publishedAt));
    }
    if (item.originalDate && /\d{1,2}:\d{2}/.test(item.originalDate)) {
      const match = item.originalDate.match(/\d{1,2}:\d{2}/);
      if (match) return match[0];
    }
    return item.precision === 'date' ? '날짜 기준' : '시간 미상';
  }

  function rowHtml(item) {
    const thumb = item.thumb
      ? '<span class="activity-thumb"><img src="' + escapeHtml(item.thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></span>'
      : '<span class="activity-type-icon" data-type="' + escapeHtml(item.type) + '">' + escapeHtml((item.label || 'NEW').slice(0,2)) + '</span>';
    return '<a class="activity-item" href="' + escapeHtml(item.href || item.sourceHref || '#') + '" data-activity-id="' + escapeHtml(item.id || '') + '">' +
      thumb +
      '<span class="activity-item-copy"><span class="activity-item-meta"><b>' + escapeHtml(item.label || '업데이트') + '</b><time>' + escapeHtml(timeText(item)) + '</time></span>' +
      '<strong>' + escapeHtml(item.title || '새 콘텐츠') + '</strong>' +
      (item.meta ? '<small>' + escapeHtml(item.meta) + '</small>' : '') +
      '</span><span class="activity-arrow" aria-hidden="true">›</span></a>';
  }

  function render() {
    const items = state.filter === 'all' ? state.items : state.items.filter(item => item.group === state.filter);
    if (!items.length) {
      list.hidden = true;
      status.hidden = false;
      status.textContent = state.loaded ? '이 종류의 최근 업데이트가 없습니다.' : '새 소식을 불러오는 중...';
      return;
    }
    const groups = new Map();
    items.forEach(item => {
      const key = dateKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    list.innerHTML = [...groups.entries()].map(([key, rows]) =>
      '<section class="activity-day"><h3>' + escapeHtml(dateHeading(key)) + '</h3>' + rows.map(rowHtml).join('') + '</section>'
    ).join('');
    status.hidden = true;
    list.hidden = false;
  }

  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    try {
      const response = await fetch('/api/content?type=activity', { headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const payload = await response.json();
      state.items = Array.isArray(payload.items) ? payload.items : [];
      state.loaded = true;
      render();
      if (!panel.hidden) markCurrentSeen();
      else updateUnreadDot();
    } catch (_) {
      if (!state.loaded) {
        status.hidden = false;
        list.hidden = true;
        status.innerHTML = '새 소식을 불러오지 못했습니다.<br><button type="button" class="activity-retry">다시 시도</button>';
        status.querySelector('.activity-retry')?.addEventListener('click', refresh, { once:true });
      }
    } finally {
      state.loading = false;
    }
  }

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    wrapper.classList.toggle('open', open);
    if (open) {
      render();
      markCurrentSeen();
    }
  }

  button.addEventListener('click', () => setOpen(panel.hidden));
  closeButton.addEventListener('click', () => { setOpen(false); button.focus(); });
  tabs.forEach(tab => tab.addEventListener('click', () => {
    state.filter = tab.dataset.activityFilter || 'all';
    tabs.forEach(node => {
      const active = node === tab;
      node.classList.toggle('active', active);
      node.setAttribute('aria-selected', String(active));
    });
    render();
  }));
  document.addEventListener('click', event => {
    if (!panel.hidden && !wrapper.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false);
      button.focus();
    }
  });

  refresh();
  const timer = window.setInterval(refresh, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once:true });
})();
