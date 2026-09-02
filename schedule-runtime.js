(() => {
  const grid = document.querySelector('#schedule-grid');
  const updated = document.querySelector('#schedule-updated');
  if (!grid) return;

  const source = window.CHUNBONG_CONTENT?.sources?.notion || 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99';
  const refreshMs = 3 * 60 * 1000;
  let loading = false;

  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function kstDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => (acc[part.type] = part.value, acc), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function formatWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const startText = formatter.format(new Date(item.start));
      if (!item.end) return `${startText} KST`;
      return `${startText} ~ ${formatter.format(new Date(item.end))} KST`;
    }
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short'
    });
    const startText = formatter.format(new Date(`${String(item.start).slice(0, 10)}T00:00:00+09:00`));
    if (!item.end || String(item.end).slice(0, 10) === String(item.start).slice(0, 10)) return startText;
    return `${startText} ~ ${formatter.format(new Date(`${String(item.end).slice(0, 10)}T00:00:00+09:00`))}`;
  }

  function statusFor(item, today) {
    const start = String(item.start || '').slice(0, 10);
    const end = String(item.end || item.start || '').slice(0, 10);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  function visibleItems(items) {
    const today = kstDateKey();
    const cutoff = new Date(`${today}T00:00:00+09:00`);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffKey = kstDateKey(cutoff);
    return [...items]
      .filter(item => item?.start && String(item.end || item.start).slice(0, 10) >= cutoffKey)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));
  }

  function render(items) {
    const today = kstDateKey();
    const rows = visibleItems(items);
    if (!rows.length) return false;
    const labels = { today: 'TODAY', upcoming: 'UPCOMING', recent: 'RECENT' };
    grid.innerHTML = rows.map((item, index) => {
      const status = statusFor(item, today);
      const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
      const description = status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '최근 진행된 일정입니다.';
      return `
        <article class="schedule-card schedule-${status} reveal visible" data-live-schedule="true">
          <div class="schedule-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="schedule-card-top"><span class="badge">${labels[status]}</span><div class="schedule-tags">${tags}</div></div>
          <h2>${esc(item.title)}</h2>
          <div class="time">${esc(formatWhen(item))}</div>
          <p>${description}</p>
          <a class="inline-link" href="${esc(item.link || source)}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a>
        </article>`;
    }).join('');
    if (updated) updated.textContent = 'Notion 실시간 일정 · 한국 시간(KST) · 3분마다 자동 최신화';
    return true;
  }

  async function loadLiveSchedule() {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch('/api/content?type=schedule', {
        headers: { accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) return;
      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      if (!items.length) return;
      render(items);
    } catch (_) {
      // page.js already rendered the bundled schedule snapshot as a safe fallback.
    } finally {
      loading = false;
    }
  }

  loadLiveSchedule();
  setInterval(() => {
    if (!document.hidden) loadLiveSchedule();
  }, refreshMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadLiveSchedule();
  });
})();
