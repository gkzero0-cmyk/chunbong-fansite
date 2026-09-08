(() => {
  const page = document.body.dataset.page || '';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value = '') => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const state = { source: [], today: '', mode: 'upcoming', previousOffset: 1, calendarMonth: '' };

  async function json(url) {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function kstToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  function dateOnly(value = '') {
    return String(value || '').slice(0, 10);
  }

  function itemStartDate(item = {}) {
    return dateOnly(item.start);
  }

  function itemEndDate(item = {}) {
    return dateOnly(item.end || item.start);
  }

  function shiftDate(key, days) {
    const date = new Date(`${key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function shiftMonth(monthKey, delta) {
    const [year, month] = String(monthKey || '').split('-').map(Number);
    const date = new Date(Date.UTC(year || new Date().getUTCFullYear(), (month || 1) - 1 + delta, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  function intersectsDateRange(item, start, end) {
    const itemStart = itemStartDate(item);
    const itemEnd = itemEndDate(item);
    return Boolean(itemStart && itemEnd && itemEnd >= start && itemStart <= end);
  }

  function statusFor(item, today) {
    const start = itemStartDate(item);
    const end = itemEndDate(item);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  function sortByStart(items = []) {
    return [...items].sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
  }

  function upcomingItems(items = [], today = kstToday()) {
    return sortByStart(items.filter(item => itemEndDate(item) >= today))
      .sort((a, b) => {
        const aToday = statusFor(a, today) === 'today' ? 0 : 1;
        const bToday = statusFor(b, today) === 'today' ? 0 : 1;
        return aToday - bToday || String(a.start || '').localeCompare(String(b.start || ''));
      });
  }

  function previousWeekBounds(today = kstToday(), offset = 1) {
    const safeOffset = Math.max(1, Number(offset) || 1);
    const end = shiftDate(today, -1 - ((safeOffset - 1) * 7));
    return { start: shiftDate(end, -6), end };
  }

  function previousWeekItems(items = [], today = kstToday(), offset = 1) {
    const range = previousWeekBounds(today, offset);
    return sortByStart(items.filter(item => intersectsDateRange(item, range.start, range.end)));
  }

  window.__CHUNBONG_SCHEDULE_HELPERS__ = { upcomingItems, previousWeekItems, previousWeekBounds, shiftDate };

  function formatWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
      const start = fmt.format(new Date(item.start));
      return item.end ? `${start} ~ ${fmt.format(new Date(item.end))} KST` : `${start} KST`;
    }
    const fmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' });
    const start = fmt.format(new Date(`${itemStartDate(item)}T00:00:00+09:00`));
    if (!item.end || itemEndDate(item) === itemStartDate(item)) return start;
    const end = fmt.format(new Date(`${itemEndDate(item)}T00:00:00+09:00`));
    return `${start} ~ ${end}`;
  }

  function formatRangeDate(key) {
    const [year, month, day] = String(key || '').split('-').map(Number);
    return `${year}. ${month}. ${day}.`;
  }

  function calendarTime(item, dateKey) {
    if (!item?.isDateTime) return itemStartDate(item) === dateKey && itemEndDate(item) !== dateKey ? '종일 시작' : '종일';
    if (itemStartDate(item) !== dateKey) return '계속';
    return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(item.start));
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
      <p>${status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '이전에 진행된 일정입니다.'}</p>
      <a class="inline-link" href="${esc(item.link || 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99?pvs=74')}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a>
    </article>`;
  }

  function renderList(items, emptyText) {
    const grid = $('#schedule-grid');
    if (!grid) return;
    grid.innerHTML = items.length ? items.map((item, index) => scheduleCard(item, index, state.today)).join('') : `<div class="loading-card">${esc(emptyText)}</div>`;
  }

  function renderUpcoming() {
    renderList(upcomingItems(state.source, state.today), '오늘 이후 등록된 일정이 없습니다.');
  }

  function renderPrevious() {
    const range = previousWeekBounds(state.today, state.previousOffset);
    const label = $('#schedule-previous-range');
    if (label) label.textContent = `${formatRangeDate(range.start)} ~ ${formatRangeDate(range.end)}`;
    const newer = $('#schedule-previous-newer');
    if (newer) newer.disabled = state.previousOffset <= 1;
    renderList(previousWeekItems(state.source, state.today, state.previousOffset), '선택한 이전 주에 등록된 일정이 없습니다.');
  }

  function eventsForDate(dateKey) {
    return sortByStart(state.source.filter(item => intersectsDateRange(item, dateKey, dateKey)));
  }

  function renderCalendar() {
    const root = $('#schedule-calendar');
    if (!root) return;
    const monthKey = state.calendarMonth || state.today.slice(0, 7);
    const [year, month] = monthKey.split('-').map(Number);
    const monthLabel = $('#schedule-calendar-month');
    if (monthLabel) monthLabel.textContent = `${year}년 ${month}월`;
    const first = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells = [];
    for (let index = 0; index < first.getUTCDay(); index += 1) cells.push('<span class="schedule-calendar-day is-empty"></span>');
    for (let day = 1; day <= lastDay; day += 1) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = eventsForDate(key);
      const shown = events.slice(0, 3).map(item => `<span class="schedule-calendar-event"><time>${esc(calendarTime(item, key))}</time><strong>${esc(item.title || '일정')}</strong></span>`).join('');
      const more = events.length > 3 ? `<span class="schedule-calendar-more">+${events.length - 3}개 일정</span>` : '';
      cells.push(`<article class="schedule-calendar-day ${key === state.today ? 'is-today' : ''}"><div class="schedule-calendar-date"><b>${day}</b>${key === state.today ? '<small>오늘</small>' : ''}</div><div class="schedule-calendar-events">${shown}${more}</div></article>`);
    }
    while (cells.length % 7) cells.push('<span class="schedule-calendar-day is-empty"></span>');
    root.innerHTML = cells.join('');
  }

  function setMode(mode) {
    state.mode = ['upcoming', 'previous', 'calendar'].includes(mode) ? mode : 'upcoming';
    const grid = $('#schedule-grid');
    const previous = $('#schedule-previous-controls');
    const calendar = $('#schedule-calendar-shell');
    const heading = $('#schedule-heading');
    if (grid) grid.hidden = state.mode === 'calendar';
    if (previous) previous.hidden = state.mode !== 'previous';
    if (calendar) calendar.hidden = state.mode !== 'calendar';
    const labels = { upcoming: '다가오는 일정', previous: '이전 일정', calendar: '전체 일정' };
    if (heading) heading.textContent = labels[state.mode];
    [['upcoming', '#schedule-view-upcoming'], ['previous', '#schedule-view-previous'], ['calendar', '#schedule-view-calendar']].forEach(([key, selector]) => {
      const button = $(selector);
      if (!button) return;
      const active = key === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (state.mode === 'upcoming') renderUpcoming();
    else if (state.mode === 'previous') renderPrevious();
    else renderCalendar();
  }

  function bindControls() {
    $('#schedule-view-upcoming')?.addEventListener('click', () => setMode('upcoming'));
    $('#schedule-view-previous')?.addEventListener('click', () => setMode('previous'));
    $('#schedule-view-calendar')?.addEventListener('click', () => setMode('calendar'));
    $('#schedule-previous-older')?.addEventListener('click', () => { state.previousOffset += 1; renderPrevious(); });
    $('#schedule-previous-newer')?.addEventListener('click', () => { state.previousOffset = Math.max(1, state.previousOffset - 1); renderPrevious(); });
    $('#schedule-calendar-prev')?.addEventListener('click', () => { state.calendarMonth = shiftMonth(state.calendarMonth, -1); renderCalendar(); });
    $('#schedule-calendar-next')?.addEventListener('click', () => { state.calendarMonth = shiftMonth(state.calendarMonth, 1); renderCalendar(); });
    $('#schedule-calendar-today')?.addEventListener('click', () => { state.calendarMonth = state.today.slice(0, 7); renderCalendar(); });
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
    state.source = sortByStart(live.length ? live : backup);
    state.today = kstToday();
    if (!state.calendarMonth) state.calendarMonth = state.today.slice(0, 7);
    setMode(state.mode);
    const updated = $('#schedule-updated');
    if (updated) updated.textContent = live.length ? 'Notion 실시간 일정 · KST 기준' : 'Notion 최신 백업 · KST 기준';
  }

  function init() {
    if (page !== 'schedule') return;
    bindControls();
    refreshSchedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
