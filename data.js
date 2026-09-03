(() => {
  const API = '/api/content?type=data';
  const REFRESH_MS = 300000;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const number = value => Number.isFinite(value) ? new Intl.NumberFormat('ko-KR').format(value) : '측정 불가';
  const signed = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${number(value)}` : '측정 불가';
  const minutes = value => {
    if (!Number.isFinite(value)) return '측정 불가';
    const total = Math.max(0, Math.round(value));
    const h = Math.floor(total / 60), m = total % 60;
    return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
  };
  const shortDate = value => String(value || '').slice(5).replace('-', '.');
  const formatUpdated = value => {
    if (!value) return '업데이트 시간 확인 중';
    try { return `${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))} KST 업데이트`; }
    catch (_) { return '업데이트 시간 확인 중'; }
  };
  const viewText = item => Number.isFinite(item?.viewCount) ? `조회수 ${number(item.viewCount)}` : (item?.meta || '조회수 확인 중');
  const state = { payload: null, platform: location.hash === '#youtube' ? 'youtube' : 'soop', soopView: 'daily', calendarMonth: '' };

  function measurementBadge(kind) {
    const labels = {
      viewer: '팬사이트 5분 측정',
      follower: 'SOOP 공개 스냅샷',
      fanclub: 'SOOP 공개값',
      public: '공개 데이터',
      external: '외부 공개 기록'
    };
    return `<span class="data-measurement-badge">${esc(labels[kind] || labels.public)}</span>`;
  }

  function kpi(label, value, desc, klass = '') {
    return `<article class="data-kpi ${klass}"><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${desc}</p></article>`;
  }

  function createSvgChart({ title, rows = [], key, labelKey = 'date', formatter = number, empty = '측정 데이터가 아직 없습니다.' }) {
    const clean = rows.map(row => ({ label: row?.[labelKey] || '', value: Number.isFinite(row?.[key]) ? row[key] : null })).filter(row => row.label);
    const values = clean.map(row => row.value).filter(Number.isFinite);
    if (!clean.length || !values.length) return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">${esc(empty)}</div></article>`;
    const width = 720, height = 220, padX = 38, padY = 26;
    const minValue = Math.min(0, ...values), maxValue = Math.max(1, ...values);
    const span = Math.max(1, maxValue - minValue);
    const x = index => clean.length === 1 ? width / 2 : padX + index * ((width - padX * 2) / (clean.length - 1));
    const y = value => height - padY - ((value - minValue) / span) * (height - padY * 2);
    const points = clean.map((row, index) => row.value === null ? null : `${x(index).toFixed(1)},${y(row.value).toFixed(1)}`).filter(Boolean).join(' ');
    const circles = clean.map((row, index) => row.value === null ? '' : `<circle cx="${x(index).toFixed(1)}" cy="${y(row.value).toFixed(1)}" r="4"><title>${esc(row.label)} · ${esc(formatter(row.value))}</title></circle>`).join('');
    const grid = [0,1,2,3,4].map(index => { const yy = padY + index * ((height - padY * 2) / 4); return `<line x1="${padX}" y1="${yy}" x2="${width-padX}" y2="${yy}"/>`; }).join('');
    const step = Math.max(1, Math.ceil(clean.length / 6));
    const labels = clean.map((row,index) => index % step ? '' : `<text x="${x(index).toFixed(1)}" y="${height-6}" text-anchor="middle">${esc(String(row.label).slice(labelKey === 'month' ? 2 : 5))}</text>`).join('');
    const latest = [...clean].reverse().find(row => row.value !== null);
    return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${latest ? esc(formatter(latest.value)) : '-'}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${circles}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function renderStatus(payload) {
    const root = $('#data-status');
    const errors = Array.isArray(payload?.errors) ? payload.errors : [];
    root.classList.remove('ready','partial','error');
    root.classList.add(payload?.fallback ? 'error' : errors.length ? 'partial' : 'ready');
    const strong = root.querySelector('strong');
    if (strong) strong.textContent = payload?.fallback ? '공개 데이터를 불러오지 못했습니다.' : errors.length ? '일부 공개 지표는 현재 확인할 수 없습니다.' : 'SOOP · YouTube 공개 데이터가 최신 상태입니다.';
    $('#data-updated').textContent = formatUpdated(payload?.capturedAt);
    root.querySelector('.data-error-note')?.remove();
    if (errors.length) {
      const note = document.createElement('div');
      note.className = 'data-error-note';
      note.textContent = errors.map(error => `${error.platform}: ${error.source || 'data'}`).join(' · ');
      root.appendChild(note);
    }
  }

  function renderSoopOverview(payload) {
    const o = payload?.soop?.overview || {};
    const liveText = o.live === true ? 'LIVE' : o.live === false ? 'OFFLINE' : '확인 중';
    const liveDesc = o.live === true ? `${esc(o.currentTitle || '현재 방송 중')} · ${esc(o.currentCategory || '카테고리 확인 중')}` : '현재 SOOP 방송 상태';
    $('#data-soop-overview').innerHTML = [
      kpi('SOOP STATUS', liveText, liveDesc, o.live === true ? 'live' : ''),
      kpi('현재 시청자', number(o.currentViewerCount), `${measurementBadge('viewer')} 실시간 공개값`),
      kpi('오늘 방송시간', minutes(o.todayDurationMinutes), `${measurementBadge('viewer')} 종료 세션 기준`),
      kpi('이번 달 방송시간', minutes(o.monthDurationMinutes), `${measurementBadge('viewer')} 실측 누적`),
      kpi('월 평균 시청자', number(o.monthAverageViewers), `${measurementBadge('viewer')} 샘플 가중 평균`),
      kpi('월 최대 시청자', number(o.monthMaxViewers), `${measurementBadge('viewer')} 실측 최고값`),
      kpi('애청자', number(o.followerCount), `${measurementBadge('follower')} 월 증감 ${esc(signed(o.followerDelta))}`),
      kpi('팬클럽', number(o.fanclubCount), `${measurementBadge('fanclub')} 월 증감 ${esc(signed(o.fanclubDelta))}`),
      kpi('외부 30일 참고', `${number(payload?.soop?.externalHistory?.sourceSummary?.recent30DayAverageViewers)} / ${number(payload?.soop?.externalHistory?.sourceSummary?.recent30DayPeakViewers)}`, `${measurementBadge('external')} 평균 / 최대 시청자`)
    ].join('');
  }

  function renderDetailTable(root, rows, monthly = false) {
    const el = $(root);
    if (!rows?.length) { el.innerHTML = '<div class="data-empty">측정된 방송 데이터가 아직 없습니다.</div>'; return; }
    el.innerHTML = `<div class="data-detail-row data-detail-header"><span>${monthly ? '월' : '날짜'}</span><span>방송</span><span>방송시간</span><span>평균</span><span>최대</span><span>애청자</span><span>팬클럽</span></div>${rows.slice().reverse().slice(0, 24).map(row => `<div class="data-detail-row"><strong>${esc(monthly ? row.month : row.date)}</strong><span>${number(row.streamCount)}회</span><span>${minutes(row.durationMinutes)}</span><span>${number(row.averageViewers)}</span><span>${number(row.maxViewers)}</span><span class="${Number(row.followerDelta) > 0 ? 'positive' : Number(row.followerDelta) < 0 ? 'negative' : ''}">${signed(row.followerDelta)}</span><span class="${Number(row.fanclubDelta) > 0 ? 'positive' : Number(row.fanclubDelta) < 0 ? 'negative' : ''}">${signed(row.fanclubDelta)}</span></div>`).join('')}`;
  }

  function renderSoopCharts(payload) {
    const daily = payload?.soop?.daily || [];
    const monthly = payload?.soop?.monthlyStats || [];
    $('#data-soop-chart').innerHTML = [
      createSvgChart({ title:'일별 방송시간', rows:daily, key:'durationMinutes', formatter:minutes }),
      createSvgChart({ title:'일별 평균 시청자', rows:daily, key:'averageViewers' }),
      createSvgChart({ title:'일별 최대 시청자', rows:daily, key:'maxViewers' }),
      createSvgChart({ title:'애청자 일일 증감', rows:daily, key:'followerDelta', formatter:signed })
    ].join('');
    $('#data-soop-monthly-chart').innerHTML = [
      createSvgChart({ title:'월별 방송시간', rows:monthly, key:'durationMinutes', labelKey:'month', formatter:minutes }),
      createSvgChart({ title:'월 평균 시청자', rows:monthly, key:'averageViewers', labelKey:'month' }),
      createSvgChart({ title:'월 최대 시청자', rows:monthly, key:'maxViewers', labelKey:'month' }),
      createSvgChart({ title:'애청자 월 증감', rows:monthly, key:'followerDelta', labelKey:'month', formatter:signed })
    ].join('');
    renderDetailTable('#data-soop-daily-table', daily, false);
    renderDetailTable('#data-soop-monthly-table', monthly, true);
  }

  function renderCalendarDetail(row) {
    const root = $('#data-soop-calendar-detail');
    if (!row) { root.innerHTML = '<div class="data-empty">방송한 날짜를 선택하면 상세 기록을 보여줍니다.</div>'; return; }
    const sessions = Array.isArray(row.sessions) ? row.sessions : [];
    root.innerHTML = `<small>${esc(row.date)}</small><h3>${number(row.streamCount)}회 방송 · ${esc(minutes(row.durationMinutes))}</h3><div class="data-calendar-stats"><span>평균 <b>${number(row.averageViewers)}</b></span><span>최대 <b>${number(row.maxViewers)}</b></span><span>애청자 <b>${signed(row.followerDelta)}</b></span><span>팬클럽 <b>${signed(row.fanclubDelta)}</b></span></div>${sessions.map(session => `<article class="data-calendar-session"><strong>${esc(session.title || '춘봉 방송')}</strong><span>${esc(minutes(session.durationMinutes))} · 평균 ${number(session.averageViewers)} · 최대 ${number(session.maxViewers)}</span></article>`).join('')}`;
  }

  function renderSoopCalendar(payload) {
    const rows = payload?.soop?.calendar || [];
    const map = new Map(rows.map(row => [row.date, row]));
    if (!state.calendarMonth) state.calendarMonth = (rows.at(-1)?.date || new Date().toISOString().slice(0,10)).slice(0,7);
    const [year, month] = state.calendarMonth.split('-').map(Number);
    $('#data-calendar-month').textContent = `${year}년 ${month}월`;
    const first = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startWeekday = first.getUTCDay();
    const cells = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push('<span class="data-calendar-day is-empty"></span>');
    for (let day = 1; day <= lastDay; day += 1) {
      const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const row = map.get(key);
      cells.push(`<button class="data-calendar-day ${row ? 'has-stream' : ''}" type="button" data-calendar-date="${key}" ${row ? '' : 'disabled'}><b>${day}</b>${row ? `<span>${minutes(row.durationMinutes)}</span><small>평균 ${number(row.averageViewers)}</small>` : '<span>—</span>'}</button>`);
    }
    while (cells.length % 7) cells.push('<span class="data-calendar-day is-empty"></span>');
    $('#data-soop-calendar').innerHTML = cells.join('');
    $$('[data-calendar-date]').forEach(button => button.addEventListener('click', () => renderCalendarDetail(map.get(button.dataset.calendarDate))));
    const firstRow = rows.find(row => row.date?.startsWith(`${state.calendarMonth}-`));
    renderCalendarDetail(firstRow || null);
  }

  function renderSoopCategories(payload) {
    const rows = payload?.soop?.categories || [];
    const external = payload?.soop?.externalHistory?.categoryReference;
    const root = $('#data-soop-categories');
    const measured = rows.length ? rows.slice(0, 20).map(row => `<article class="data-category-row"><div class="data-category-copy"><strong>${esc(row.name || '미분류')}</strong><span>${number(row.streamCount)}회 · ${minutes(row.minutes)}</span></div><div class="data-category-bar"><span style="--share:${Math.max(1, Number(row.sharePercent) || 0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>평균 ${number(row.averageViewers)} · 최대 ${number(row.maxViewers)}</small></article>`).join('') : '<div class="data-empty">팬사이트 실측 카테고리 데이터는 수집 시작일부터 누적됩니다.</div>';
    const externalRows = Array.isArray(external?.categories) ? external.categories : [];
    const externalTotal = externalRows.reduce((sum, row) => sum + (Number(row.minutes) || 0), 0);
    const externalBlock = externalRows.length ? `<section class="data-external-reference"><div class="data-external-reference-head"><div><strong>과거 카테고리 참고</strong><small>${measurementBadge('external')} Streams Charts 공개 집계</small></div><a href="${esc(external.url || '#')}" target="_blank" rel="noreferrer">출처 ↗</a></div>${externalRows.map(row => { const share = externalTotal ? Math.round((Number(row.minutes) || 0) / externalTotal * 100) : 0; return `<article class="data-category-row external"><div class="data-category-copy"><strong>${esc(row.name)}</strong><span>${number(row.streams)}회 · ${minutes(row.minutes)}</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,share)}%"></span></div><b>${share}%</b><small>외부 공개 방송시간 집계</small></article>`; }).join('')}</section>` : '';
    root.innerHTML = `${externalBlock}<section class="data-measured-categories">${measured}</section>`;
  }

  function renderSessions(payload) {
    const rows = payload?.soop?.recentSessions || [];
    const root = $('#data-soop-sessions');
    if (!rows.length) { root.innerHTML = '<div class="data-empty">실측 방송 세션이 쌓이면 방송별 평균·최대 시청자를 표시합니다.</div>'; return; }
    root.innerHTML = rows.map(row => { const badge = row.measurement === 'external-public-record' ? measurementBadge('external') : measurementBadge('viewer'); return `<article class="data-session-card"><div><small>${esc(row.date || '')} · ${badge}</small><strong>${esc(row.title || '춘봉 방송')}</strong></div><div class="data-session-metrics"><span>방송 <b>${minutes(row.durationMinutes)}</b></span><span>평균 <b>${number(row.averageViewers)}</b></span><span>최대 <b>${number(row.maxViewers)}</b></span><span>애청자 <b>${signed(row.followerDelta)}</b></span><span>팬클럽 <b>${signed(row.fanclubDelta)}</b></span></div></article>`; }).join('');
  }

  function topPanel(title, items) {
    const rows = items || [];
    return `<section class="data-top-panel"><h3>${esc(title)}</h3>${rows.length ? `<ol class="data-top-list">${rows.map((item,index) => `<li><span class="data-top-rank">${index+1}</span><a class="data-top-copy" href="${esc(item.link || '#')}" target="_blank" rel="noreferrer"><strong>${esc(item.title || '제목 없음')}</strong><small>${esc(item.date || item.kind || '')}</small></a><b>${esc(viewText(item))}</b></li>`).join('')}</ol>` : '<div class="data-empty">조회수 데이터를 확인할 수 있는 콘텐츠가 없습니다.</div>'}</section>`;
  }

  function renderYoutubePanel(payload) {
    const channel = payload?.youtube?.channel || {}, monthly = payload?.youtube?.monthly || {};
    $('#data-youtube-overview').innerHTML = [
      kpi('구독자', number(channel.subscriberCount), `${measurementBadge('public')} ${esc(channel.subscriberText || '')}`, 'youtube'),
      kpi('총 조회수', number(channel.viewCount), `${measurementBadge('public')} ${esc(channel.viewText || '')}`, 'youtube'),
      kpi('공개 영상', number(channel.videoCount), `${measurementBadge('public')} ${esc(channel.videoText || '')}`, 'youtube'),
      kpi('이번 달 업로드', `${number(monthly.uploadCount)}개`, '최근 공개 콘텐츠 기준', 'youtube')
    ].join('');
    const trends = payload?.trends || [];
    $('#data-youtube-trend').innerHTML = [
      createSvgChart({ title:'구독자 변화', rows:trends, key:'subscriberCount', formatter:number, empty:'구독자 일일 스냅샷이 쌓이면 표시합니다.' }),
      createSvgChart({ title:'총 조회수 변화', rows:trends, key:'viewCount', formatter:number, empty:'총 조회수 스냅샷이 쌓이면 표시합니다.' })
    ].join('');
    // Snapshot values live below youtube in the API, so project them for the generic SVG renderer.
    const projected = trends.map(row => ({ date:row.date, subscriberCount:row?.youtube?.subscriberCount, viewCount:row?.youtube?.viewCount }));
    $('#data-youtube-trend').innerHTML = [
      createSvgChart({ title:'구독자 변화', rows:projected, key:'subscriberCount', formatter:number, empty:'구독자 일일 스냅샷이 쌓이면 표시합니다.' }),
      createSvgChart({ title:'총 조회수 변화', rows:projected, key:'viewCount', formatter:number, empty:'총 조회수 스냅샷이 쌓이면 표시합니다.' })
    ].join('');
    $('#data-youtube-top').innerHTML = topPanel('YouTube TOP', payload?.topContent?.youtube);
    const recent = [...(payload?.youtube?.recentVideos || []), ...(payload?.youtube?.recentShorts || [])].slice(0, 12);
    $('#data-youtube-recent').innerHTML = recent.length ? recent.map(item => `<a class="data-recent-card" href="${esc(item.link || '#')}" target="_blank" rel="noreferrer"><small>YOUTUBE · ${esc(item.date || item.kind || '최근')}</small><strong>${esc(item.title || '제목 없음')}</strong><span>${esc(viewText(item))} ↗</span></a>`).join('') : '<div class="data-empty">최근 YouTube 콘텐츠를 불러오지 못했습니다.</div>';
  }

  function selectPlatform(platform, updateHash = true) {
    state.platform = platform === 'youtube' ? 'youtube' : 'soop';
    $$('[data-platform-tab]').forEach(button => {
      const active = button.dataset.platformTab === state.platform;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $$('[data-platform-panel]').forEach(panel => { panel.hidden = panel.dataset.platformPanel !== state.platform; });
    if (updateHash) location.hash = state.platform === 'youtube' ? '#youtube' : '#soop';
  }

  function selectSoopView(view) {
    state.soopView = ['daily','monthly','calendar'].includes(view) ? view : 'daily';
    $$('[data-soop-view-tab]').forEach(button => {
      const active = button.dataset.soopViewTab === state.soopView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $$('[data-soop-view]').forEach(panel => {
      const active = panel.dataset.soopView === state.soopView;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  }

  function shiftCalendar(delta) {
    const [year, month] = (state.calendarMonth || new Date().toISOString().slice(0,7)).split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + delta, 1));
    state.calendarMonth = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
    if (state.payload) renderSoopCalendar(state.payload);
  }

  function render(payload) {
    state.payload = payload;
    renderStatus(payload);
    renderSoopOverview(payload);
    renderSoopCharts(payload);
    renderSoopCalendar(payload);
    renderSoopCategories(payload);
    renderSessions(payload);
    renderYoutubePanel(payload);
    selectPlatform(state.platform, false);
    selectSoopView(state.soopView);
  }

  async function refresh() {
    try {
      const response = await fetch(API, { headers:{ accept:'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      render(await response.json());
    } catch (error) {
      const root = $('#data-status');
      root.classList.remove('ready','partial'); root.classList.add('error');
      root.querySelector('strong').textContent = '춘봉 데이터를 불러오지 못했습니다.';
      $('#data-updated').textContent = error?.message || '네트워크 오류';
    }
  }

  $$('[data-platform-tab]').forEach(button => button.addEventListener('click', () => selectPlatform(button.dataset.platformTab)));
  $$('[data-soop-view-tab]').forEach(button => button.addEventListener('click', () => selectSoopView(button.dataset.soopViewTab)));
  $('#data-calendar-prev')?.addEventListener('click', () => shiftCalendar(-1));
  $('#data-calendar-next')?.addEventListener('click', () => shiftCalendar(1));
  $('#data-retry')?.addEventListener('click', refresh);
  window.addEventListener('hashchange', () => selectPlatform(location.hash === '#youtube' ? 'youtube' : 'soop', false));
  selectPlatform(state.platform, false);
  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
})();
