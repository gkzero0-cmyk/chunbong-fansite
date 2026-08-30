(() => {
  const page = document.body.dataset.page || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  async function json(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function kstToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  function statusFor(item, today) {
    const start = String(item.start || '').slice(0, 10);
    const end = String(item.end || item.start || '').slice(0, 10);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  function formatWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
      const start = fmt.format(new Date(item.start));
      return item.end ? `${start} ~ ${fmt.format(new Date(item.end))} KST` : `${start} KST`;
    }
    const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' });
    const start = fmt.format(new Date(`${String(item.start).slice(0,10)}T00:00:00+09:00`));
    if (!item.end || String(item.end).slice(0,10) === String(item.start).slice(0,10)) return start;
    const end = fmt.format(new Date(`${String(item.end).slice(0,10)}T00:00:00+09:00`));
    return `${start} ~ ${end}`;
  }

  function scheduleCard(item, index, today) {
    const status = statusFor(item, today);
    const labels = { today: 'TODAY', upcoming: 'UPCOMING', recent: 'RECENT' };
    const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
    return `<article class="schedule-card schedule-${status} reveal visible">
      <div class="schedule-number">${String(index + 1).padStart(2, '0')}</div>
      <div class="schedule-card-top"><span class="badge">${labels[status]}</span><div class="schedule-tags">${tags}</div></div>
      <h2>${esc(item.title)}</h2>
      <div class="time">${esc(formatWhen(item))}</div>
      <p>${status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '최근 진행된 일정입니다.'}</p>
      <a class="inline-link" href="${esc(item.link || 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99?pvs=74')}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a>
    </article>`;
  }

  async function refreshSchedule() {
    if (page !== 'schedule') return;
    const grid = $('#schedule-grid');
    if (!grid) return;
    const backup = window.CHUNBONG_CONTENT?.notionSchedule || [];
    let live = [];
    try {
      const payload = await json('/api/content?type=schedule');
      if (Array.isArray(payload.items)) live = payload.items;
    } catch (_) {}
    const source = live.length ? live : backup;
    const today = kstToday();
    const cutoff = new Date(`${today}T00:00:00+09:00`);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(cutoff);
    const visible = [...source]
      .filter(item => String(item.end || item.start || '').slice(0,10) >= cutoffKey)
      .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
    grid.innerHTML = visible.length ? visible.map((item, index) => scheduleCard(item, index, today)).join('') : '<div class="loading-card">등록된 일정이 없습니다.</div>';
    const updated = $('#schedule-updated');
    if (updated) updated.textContent = live.length ? 'Notion 실시간 일정 · KST 기준' : 'Notion 최신 백업 · KST 기준';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshSchedule);
  } else {
    refreshSchedule();
  }
})();
