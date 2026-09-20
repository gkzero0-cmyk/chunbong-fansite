(() => {
  'use strict';
  const core = window.ChunbongPageCore;
  if (!core || core.page !== 'schedule') return;
  const { data, $, esc, loadContent, setupReveal } = core;

  function kstDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((acc, part) => (acc[part.type] = part.value, acc), {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function formatScheduleWhen(item) {
    if (!item?.start) return '시간 미정';
    if (item.isDateTime) {
      const start = new Date(item.start);
      const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      });
      const startText = formatter.format(start);
      if (!item.end) return `${startText} KST`;
      return `${startText} ~ ${formatter.format(new Date(item.end))} KST`;
    }
    const dateFormatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' });
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

  function renderMobileWeekStrip(items,today) {
    if (!window.matchMedia('(max-width:760px)').matches) return;
    const toolbar = $('#schedule-view-upcoming')?.closest('.schedule-view-toolbar');
    if (!toolbar) return;
    let strip = document.getElementById('mobile-schedule-week');
    if (!strip) {
      strip = document.createElement('div');
      strip.id = 'mobile-schedule-week';
      strip.className = 'mobile-schedule-week reveal';
      strip.setAttribute('aria-label', '7일 방송 일정 빠른 보기');
      toolbar.insertAdjacentElement('afterend', strip);
    }
    const base = new Date(today + 'T00:00:00+09:00');
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base.getTime() + index * 86400000);
      const key = kstDateKey(date);
      return {
        key,
        label: new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(date),
        day: new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', day: 'numeric' }).format(date),
        count: items.filter(item => String(item?.start || '').slice(0, 10) === key).length
      };
    });
    strip.innerHTML = days.map(day => '<button type="button" class="mobile-schedule-day' +
      (day.key === today ? ' is-today is-selected' : '') +
      (day.count ? ' has-event' : '') +
      '" data-schedule-day="' + esc(day.key) + '" aria-pressed="' + String(day.key === today) + '">' +
      '<small>' + esc(day.label) + '</small><strong>' + esc(day.day) + '</strong><i aria-hidden="true"></i></button>').join('');

    const apply = key => {
      const cards = [...document.querySelectorAll('#schedule-grid .schedule-card')];
      let visible = 0;
      cards.forEach(card => {
        const show = card.dataset.scheduleDate === key;
        card.hidden = !show;
        if (show) visible += 1;
      });
      let empty = document.getElementById('mobile-schedule-empty');
      if (!empty) {
        empty = document.createElement('div');
        empty.id = 'mobile-schedule-empty';
        empty.className = 'mobile-schedule-empty';
        empty.hidden = true;
        document.getElementById('schedule-grid')?.insertAdjacentElement('afterend', empty);
      }
      empty.hidden = visible > 0;
      empty.textContent = visible ? '' : '선택한 날짜에 등록된 일정이 없습니다.';
      strip.querySelectorAll('[data-schedule-day]').forEach(button => {
        const selected = button.dataset.scheduleDay === key;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
    };
    strip.querySelectorAll('[data-schedule-day]').forEach(button => button.addEventListener('click', () => apply(button.dataset.scheduleDay)));
    apply(today);
  }

  async function renderSchedulePage() {
    const grid = $('#schedule-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading-card">최신 일정을 확인하는 중...</div>';

    const today = kstDateKey();
    const fallbackItems = [...(data.notionSchedule || [])];
    const payload = await loadContent('schedule');
    const liveItems = Array.isArray(payload.items) ? payload.items : [];
    const usingLive = liveItems.length > 0;
    const items = [...(usingLive ? liveItems : fallbackItems)]
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));

    const visibleItems = items.filter(item => {
      const end = String(item.end || item.start || '').slice(0, 10);
      const cutoff = new Date(`${today}T00:00:00+09:00`);
      cutoff.setDate(cutoff.getDate() - 7);
      return end >= kstDateKey(cutoff);
    });

    const statusLabel = { today: 'TODAY', upcoming: 'UPCOMING', recent: 'RECENT' };
    const fallbackUpdatedAt = data.notionScheduleUpdatedAt ? new Date(data.notionScheduleUpdatedAt) : null;
    const staleDays = !usingLive && fallbackUpdatedAt && !Number.isNaN(fallbackUpdatedAt.getTime())
      ? Math.floor((Date.now() - fallbackUpdatedAt.getTime()) / 86400000)
      : null;
    const scheduleStale = !usingLive && Number.isFinite(staleDays) && staleDays > 14;

    grid.innerHTML = visibleItems.length ? visibleItems.map((item, index) => {
      const status = scheduleStatus(item, today);
      const tags = (item.tags || []).map(tag => `<span class="schedule-tag" data-tag="${esc(tag)}">${esc(tag)}</span>`).join('');
      return `
        <article class="schedule-card schedule-${status} reveal" data-schedule-date="${esc(String(item.start || '').slice(0, 10))}">
          <div class="schedule-number">${String(index + 1).padStart(2, '0')}</div>
          <div class="schedule-card-top"><span class="badge">${statusLabel[status]}</span><div class="schedule-tags">${tags}</div></div>
          <h2>${esc(item.title)}</h2>
          <div class="time">${esc(formatScheduleWhen(item))}</div>
          <p>${status === 'today' ? '오늘 예정된 방송 일정입니다.' : status === 'upcoming' ? '예정된 방송 일정입니다.' : '최근 진행된 일정입니다.'}</p>
          <a class="inline-link" href="${esc(item.link || data.sources?.notion)}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a>
        </article>`;
    }).join('') : scheduleStale
      ? `<div class="loading-card"><strong>실시간 일정을 불러오지 못했고 저장된 일정 정보도 오래되었습니다.</strong><br>마지막 동기화 후 ${staleDays}일이 지나 현재 일정은 원본에서 확인해 주세요.<br><a class="inline-link" href="${esc(data.sources?.notion || '#')}" target="_blank" rel="noreferrer">Notion 일정 원본 ↗</a></div>`
      : '<div class="loading-card">등록된 일정이 없습니다.</div>';

    renderMobileWeekStrip(visibleItems, today);

    const updated = $('#schedule-updated');
    if (updated) {
      if (usingLive) {
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
    setupReveal();
  }

  void renderSchedulePage();
})();
