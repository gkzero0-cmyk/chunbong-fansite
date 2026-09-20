(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || core.page !== 'schedule') return;
  const { data, $, esc, loadContent, setupReveal } = core;

  const state = {
    items: [],
    usingLive: false,
    view: 'upcoming',
    selectedDate: '',
    previousOffset: 0,
    calendarCursor: null
  };

  function kstDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => (acc[part.type] = part.value, acc), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function dateFromKey(key) {
    return new Date(String(key) + 'T12:00:00+09:00');
  }

  function shiftKey(key, days) {
    const date = dateFromKey(key);
    date.setDate(date.getDate() + days);
    return kstDateKey(date);
  }

  function formatDayLabel(key, options = {}) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: options.month === false ? undefined : 'numeric',
      day: 'numeric',
      weekday: options.weekday === false ? undefined : 'short'
    }).format(dateFromKey(key));
  }

  function formatScheduleWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const start = new Date(item.start);
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      const startText = formatter.format(start);
      if (!item.end) return `${startText} KST`;
      return `${startText} ~ ${formatter.format(new Date(item.end))} KST`;
    }
    const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short'
    });
    const startText = dateFormatter.format(new Date(`${item.start}T00:00:00+09:00`));
    if (!item.end || item.end === item.start) return startText;
    const endText = dateFormatter.format(new Date(`${item.end}T00:00:00+09:00`));
    return `${startText} ~ ${endText}`;
  }

  function scheduleStatus(item, today) {
    const start = String(item.start || '').slice(0, 10);
    const end = String(item.end || item.start || '').slice(0, 10);
    if (start <= today && end >= today) return 'today';
    if (start > today) return 'upcoming';
    return 'recent';
  }

  function itemTouchesDate(item, key) {
    const start = String(item?.start || '').slice(0, 10);
    const end = String(item?.end || item?.start || '').slice(0, 10);
    return Boolean(start && start <= key && end >= key);
  }

  function formatRange(start, end) {
    return `${formatDayLabel(start)} ~ ${formatDayLabel(end)}`;
  }

  function icsEscape(value = '') {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function icsUtc(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function icsDate(key) {
    return String(key || '').replaceAll('-', '');
  }

  function buildIcs(item) {
    const uidSeed = [item.start || '', item.title || 'chunbong'].join('|');
    let hash = 0;
    for (const ch of uidSeed) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CHUNBONG FAN HUB//Schedule//KO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:chunbong-' + Math.abs(hash) + '@chunbong-fansite.vercel.app',
      'DTSTAMP:' + icsUtc(new Date())
    ];
    if (item.isDateTime) {
      const start = icsUtc(item.start);
      if (start) lines.push('DTSTART:' + start);
      const end = icsUtc(item.end);
      if (end) lines.push('DTEND:' + end);
    } else {
      const startKey = String(item.start || '').slice(0, 10);
      if (startKey) lines.push('DTSTART;VALUE=DATE:' + icsDate(startKey));
      const rawEnd = String(item.end || '').slice(0, 10);
      const endKey = rawEnd && rawEnd > startKey ? shiftKey(rawEnd, 1) : shiftKey(startKey, 1);
      if (endKey) lines.push('DTEND;VALUE=DATE:' + icsDate(endKey));
    }
    lines.push(
      'SUMMARY:' + icsEscape(item.title || '춘봉 방송'),
      'DESCRIPTION:' + icsEscape('춘봉 팬허브 방송 일정 · 일정은 변경될 수 있습니다.'),
      'URL:' + icsEscape(item.link || 'https://chunbong-fansite.vercel.app/schedule.html'),
      'END:VEVENT',
      'END:VCALENDAR'
    );
    return lines.join('\r\n');
  }

  function downloadCalendar(item) {
    const blob = new Blob([buildIcs(item)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = String(item.title || 'chunbong-schedule').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60);
    link.href = url;
    link.download = safeTitle + '.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function shareSchedule(item, button) {
    const text = `${item.title || '춘봉 방송'} · ${formatScheduleWhen(item)}`;
    const url = item.link || location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title || '춘봉 방송 일정', text, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text + '\n' + url);
        button.textContent = '복사 완료 ✓';
        setTimeout(() => { button.textContent = '공유'; }, 1800);
      }
    } catch (_) {}
  }

  function renderCards(items) {
    const grid = $('#schedule-grid');
    if (!grid) return;
    const today = kstDateKey();
    const statusLabel = { today: 'TODAY', upcoming: 'UPCOMING', recent: 'RECENT' };
    grid.innerHTML = items.length ? items.map((item, index) => {
      const status = scheduleStatus(item, today);
      const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
      const source = esc(item.link || data.sources?.notion || '#');
      return `
        <article class="schedule-card schedule-${status} reveal" data-schedule-index="${state.items.indexOf(item)}">
          <div class="schedule-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="schedule-card-top"><span class="badge">${statusLabel[status]}</span><div class="schedule-tags">${tags}</div></div>
          <h2>${esc(item.title || '춘봉 방송')}</h2>
          <div class="time">${esc(formatScheduleWhen(item))}</div>
          <p>${status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '최근 진행된 일정입니다.'}</p>
          <div class="schedule-card-actions">
            <button type="button" data-schedule-calendar>캘린더 추가</button>
            <button type="button" data-schedule-share>공유</button>
            <a href="${source}" target="_blank" rel="noreferrer">Notion ↗</a>
          </div>
        </article>`;
    }).join('') : '<div class="loading-card">선택한 기간에 등록된 일정이 없습니다.</div>';
    setupReveal();
  }

  function ensureMobileWeekStrip() {
    const toolbar = document.querySelector('.schedule-view-toolbar');
    if (!toolbar || document.querySelector('[data-schedule-mobile-week]')) return;
    const nav = document.createElement('nav');
    nav.className = 'schedule-mobile-week-strip';
    nav.dataset.scheduleMobileWeek = '';
    nav.setAttribute('aria-label', '앞으로 7일 일정');
    toolbar.insertAdjacentElement('afterend', nav);
  }

  function renderMobileWeekStrip() {
    ensureMobileWeekStrip();
    const root = document.querySelector('[data-schedule-mobile-week]');
    if (!root) return;
    const today = kstDateKey();
    root.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const key = shiftKey(today, index);
      const date = dateFromKey(key);
      const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', weekday:'short' }).format(date);
      const day = new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', day:'numeric' }).format(date);
      const count = state.items.filter(item => itemTouchesDate(item, key)).length;
      return `<button type="button" data-schedule-day="${key}" class="${state.selectedDate === key ? 'is-active' : ''}" aria-pressed="${String(state.selectedDate === key)}"><small>${index === 0 ? '오늘' : esc(weekday)}</small><strong>${esc(day)}</strong><small>${count ? count + '개' : '—'}</small></button>`;
    }).join('');
  }

  function renderUpcoming() {
    const today = kstDateKey();
    const rows = state.selectedDate
      ? state.items.filter(item => itemTouchesDate(item, state.selectedDate))
      : state.items.filter(item => String(item.end || item.start || '').slice(0,10) >= today);
    renderCards(rows);
    const heading = $('#schedule-heading');
    if (heading) heading.textContent = state.selectedDate ? formatDayLabel(state.selectedDate) + ' 일정' : '다가오는 일정';
  }

  function previousRange() {
    const today = kstDateKey();
    const end = shiftKey(today, -1 - state.previousOffset * 7);
    const start = shiftKey(end, -6);
    return { start, end };
  }

  function renderPrevious() {
    const { start, end } = previousRange();
    const rows = state.items.filter(item => {
      const key = String(item.start || '').slice(0,10);
      return key >= start && key <= end;
    }).sort((a,b) => String(b.start).localeCompare(String(a.start)));
    renderCards(rows);
    const label = $('#schedule-previous-range');
    if (label) label.textContent = formatRange(start, end);
    const newer = $('#schedule-previous-newer');
    if (newer) newer.disabled = state.previousOffset === 0;
    const heading = $('#schedule-heading');
    if (heading) heading.textContent = '이전 일정';
  }

  function monthCursorParts() {
    const key = state.calendarCursor || kstDateKey();
    const [year, month] = key.split('-').map(Number);
    return { year, month };
  }

  function renderCalendar() {
    const calendar = $('#schedule-calendar');
    if (!calendar) return;
    const { year, month } = monthCursorParts();
    const first = new Date(Date.UTC(year, month - 1, 1, 12));
    const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
    const firstWeekday = new Date(`${year}-${String(month).padStart(2,'0')}-01T00:00:00+09:00`).getDay();
    const today = kstDateKey();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push('<div class="schedule-calendar-day is-empty" aria-hidden="true"></div>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const events = state.items.filter(item => itemTouchesDate(item, key));
      const shown = events.slice(0,3).map(item => {
        const time = item.isDateTime ? new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(item.start)) : '종일';
        return `<button type="button" class="schedule-calendar-event" data-calendar-item="${state.items.indexOf(item)}"><time>${esc(time)}</time><strong>${esc(item.title || '방송')}</strong></button>`;
      }).join('');
      cells.push(`<div class="schedule-calendar-day ${key === today ? 'is-today' : ''}" data-calendar-date="${key}"><div class="schedule-calendar-date"><b>${day}</b>${key === today ? '<small>TODAY</small>' : ''}</div><div class="schedule-calendar-events">${shown}${events.length>3?'<span class="schedule-calendar-more">+'+(events.length-3)+'개 더보기</span>':''}</div></div>`);
    }
    calendar.innerHTML = cells.join('');
    const label = $('#schedule-calendar-month');
    if (label) label.textContent = `${year}년 ${month}월`;
    const heading = $('#schedule-heading');
    if (heading) heading.textContent = '전체 일정';
  }

  function setView(view) {
    state.view = ['upcoming','previous','calendar'].includes(view) ? view : 'upcoming';
    const grid = $('#schedule-grid');
    const calendarShell = $('#schedule-calendar-shell');
    const previous = $('#schedule-previous-controls');
    document.querySelectorAll('.schedule-view-button').forEach(button => {
      const active = button.id === 'schedule-view-' + state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (state.view === 'calendar') {
      grid.hidden = true;
      if (previous) previous.hidden = true;
      if (calendarShell) calendarShell.hidden = false;
      renderCalendar();
      return;
    }
    grid.hidden = false;
    if (calendarShell) calendarShell.hidden = true;
    if (previous) previous.hidden = state.view !== 'previous';
    if (state.view === 'previous') renderPrevious();
    else renderUpcoming();
  }

  function bindControls() {
    $('#schedule-view-upcoming')?.addEventListener('click', () => { state.selectedDate=''; renderMobileWeekStrip(); setView('upcoming'); });
    $('#schedule-view-previous')?.addEventListener('click', () => { state.selectedDate=''; renderMobileWeekStrip(); setView('previous'); });
    $('#schedule-view-calendar')?.addEventListener('click', () => { state.selectedDate=''; renderMobileWeekStrip(); setView('calendar'); });
    $('#schedule-previous-older')?.addEventListener('click', () => { state.previousOffset += 1; renderPrevious(); });
    $('#schedule-previous-newer')?.addEventListener('click', () => { if(state.previousOffset>0)state.previousOffset-=1;renderPrevious(); });
    $('#schedule-calendar-prev')?.addEventListener('click', () => {
      const {year,month}=monthCursorParts();
      const date=new Date(Date.UTC(year,month-2,1,12));
      state.calendarCursor=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-01`;
      renderCalendar();
    });
    $('#schedule-calendar-next')?.addEventListener('click', () => {
      const {year,month}=monthCursorParts();
      const date=new Date(Date.UTC(year,month,1,12));
      state.calendarCursor=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-01`;
      renderCalendar();
    });
    $('#schedule-calendar-today')?.addEventListener('click', () => { state.calendarCursor=kstDateKey();renderCalendar(); });

    document.addEventListener('click', event => {
      const day = event.target.closest('[data-schedule-day]');
      if (day) {
        state.selectedDate = state.selectedDate === day.dataset.scheduleDay ? '' : day.dataset.scheduleDay;
        state.view='upcoming';
        renderMobileWeekStrip();
        setView('upcoming');
        return;
      }
      const calendarEvent = event.target.closest('[data-calendar-item]');
      if (calendarEvent) {
        const item=state.items[Number(calendarEvent.dataset.calendarItem)];
        if(item){
          state.selectedDate=String(item.start||'').slice(0,10);
          renderMobileWeekStrip();
          setView('upcoming');
          document.querySelector('#schedule-grid')?.scrollIntoView({behavior:'smooth',block:'start'});
        }
        return;
      }
      const card = event.target.closest('[data-schedule-index]');
      if (!card) return;
      const item = state.items[Number(card.dataset.scheduleIndex)];
      if (!item) return;
      if (event.target.closest('[data-schedule-calendar]')) downloadCalendar(item);
      const shareButton = event.target.closest('[data-schedule-share]');
      if (shareButton) void shareSchedule(item, shareButton);
    });
  }

  async function renderSchedulePage() {
    const grid = $('#schedule-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-card">최신 일정을 확인하는 중...</div>';

    const fallbackItems = [...(data.notionSchedule || [])];
    const payload = await loadContent('schedule');
    const liveItems = Array.isArray(payload.items) ? payload.items : [];
    state.usingLive = liveItems.length > 0;
    state.items = [...(state.usingLive ? liveItems : fallbackItems)]
      .filter(item => item?.start)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));
    state.calendarCursor = kstDateKey();

    const fallbackUpdatedAt = data.notionScheduleUpdatedAt ? new Date(data.notionScheduleUpdatedAt) : null;
    const staleDays = !state.usingLive && fallbackUpdatedAt && !Number.isNaN(fallbackUpdatedAt.getTime())
      ? Math.floor((Date.now() - fallbackUpdatedAt.getTime()) / 86400000)
      : null;
    const scheduleStale = !state.usingLive && Number.isFinite(staleDays) && staleDays > 14;
    const updated = $('#schedule-updated');
    if (updated) {
      if (state.usingLive) {
        updated.textContent = 'Notion 일정 · 한국 시간(KST) 기준 · 실시간 API';
      } else {
        const stamp = fallbackUpdatedAt && !Number.isNaN(fallbackUpdatedAt.getTime())
          ? new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric'}).format(fallbackUpdatedAt)
          : '';
        updated.textContent = scheduleStale
          ? `실시간 API 연결 실패 · 저장 일정 ${stamp || '확인 필요'} · 최신 일정은 원본 확인 권장`
          : `저장된 Notion 일정 · 한국 시간(KST) 기준${stamp ? ' · '+stamp+' 동기화' : ''}`;
      }
    }

    renderMobileWeekStrip();
    setView('upcoming');
    setupReveal();
  }

  bindControls();
  void renderSchedulePage();
})();
