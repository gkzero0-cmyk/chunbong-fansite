(() => {
  'use strict';

  const API = '/api/content?type=data';
  const STYLE_HREF = 'data-soop-periods-v2.css';
  const state = { payload: null, dailyMonth: '', dailyWeekOffset: null, monthlyYear: '' };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const number = value => Number.isFinite(value) ? new Intl.NumberFormat('ko-KR').format(value) : '—';
  const signed = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${number(value)}` : '—';
  const minutes = value => {
    if (!Number.isFinite(value)) return '—';
    const total = Math.max(0, Math.round(value));
    const hours = Math.floor(total / 60), mins = total % 60;
    return hours ? `${hours}시간${mins ? ` ${mins}분` : ''}` : `${mins}분`;
  };

  function ensureStyles() {
    if (document.querySelector(`link[href="${STYLE_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLE_HREF;
    document.head.appendChild(link);
  }

  function dateKey(value) {
    const key = String(value || '').slice(0, 10);
    return /^20\d{2}-\d{2}-\d{2}$/.test(key) ? key : '';
  }

  function monthKey(value) {
    const key = String(value || '').slice(0, 7);
    return /^20\d{2}-\d{2}$/.test(key) ? key : '';
  }

  function mergeDefined(base = {}, extra = {}) {
    const next = { ...base };
    for (const [key, value] of Object.entries(extra || {})) if (value !== undefined && value !== null) next[key] = value;
    return next;
  }

  function mergeDailyHistory(payload = {}) {
    const soop = payload?.soop || {};
    const sources = [
      soop.calendar,
      soop.dailyStats,
      soop.history?.daily,
      soop.analytics?.daily,
      soop.dailyHistory,
      soop.daily
    ];
    const byDate = new Map();
    for (const rows of sources) {
      for (const row of Array.isArray(rows) ? rows : []) {
        const date = dateKey(row?.date);
        if (!date) continue;
        byDate.set(date, mergeDefined(byDate.get(date) || { date }, { ...row, date }));
      }
    }
    const rows = [...byDate.values()].sort((a,b) => String(a.date).localeCompare(String(b.date)));
    let cumulative = 0;
    let previousFanclub = null;
    let previousFollower = null;
    return rows.map(row => {
      const next = { ...row };
      if (Number.isFinite(next.cumulativeMinutes)) cumulative = Math.max(cumulative, next.cumulativeMinutes);
      else {
        cumulative += Number.isFinite(next.durationMinutes) ? next.durationMinutes : 0;
        next.cumulativeMinutes = cumulative;
      }
      if (!Number.isFinite(next.fanclubDelta) && Number.isFinite(next.fanclubCount) && Number.isFinite(previousFanclub)) next.fanclubDelta = next.fanclubCount - previousFanclub;
      if (!Number.isFinite(next.followerDelta) && Number.isFinite(next.followerCount) && Number.isFinite(previousFollower)) next.followerDelta = next.followerCount - previousFollower;
      if (Number.isFinite(next.fanclubCount)) previousFanclub = next.fanclubCount;
      if (Number.isFinite(next.followerCount)) previousFollower = next.followerCount;
      return next;
    });
  }

  function aggregateDailyMonth(rows = [], month = '') {
    const monthRows = rows.filter(row => monthKey(row?.date) === month).sort((a,b) => String(a.date).localeCompare(String(b.date)));
    if (!monthRows.length) return null;
    const finite = (key) => monthRows.map(row => row?.[key]).filter(Number.isFinite);
    const durationMinutes = finite('durationMinutes').reduce((sum, value) => sum + value, 0);
    const streamCount = finite('streamCount').reduce((sum, value) => sum + value, 0);
    const averageValues = finite('averageViewers');
    const maxValues = finite('maxViewers');
    const lastFinite = key => [...monthRows].reverse().map(row => row?.[key]).find(Number.isFinite);
    return {
      month,
      durationMinutes,
      streamCount,
      averageViewers: averageValues.length ? Math.round(averageValues.reduce((sum,value)=>sum+value,0) / averageValues.length) : null,
      maxViewers: maxValues.length ? Math.max(...maxValues) : null,
      followerDelta: finite('followerDelta').reduce((sum,value)=>sum+value,0),
      fanclubCount: lastFinite('fanclubCount'),
      fanclubDelta: finite('fanclubDelta').reduce((sum,value)=>sum+value,0),
      cumulativeMinutes: lastFinite('cumulativeMinutes')
    };
  }

  function mergeMonthlyHistory(payload = {}, dailyRows = mergeDailyHistory(payload)) {
    const byMonth = new Map();
    for (const row of Array.isArray(payload?.soop?.monthlyStats) ? payload.soop.monthlyStats : []) {
      const month = monthKey(row?.month);
      if (month) byMonth.set(month, { ...row, month });
    }
    const months = new Set(dailyRows.map(row => monthKey(row?.date)).filter(Boolean));
    for (const month of months) {
      const derived = aggregateDailyMonth(dailyRows, month);
      const existing = byMonth.get(month);
      if (!existing) byMonth.set(month, derived);
      else {
        const next = { ...existing };
        for (const [key, value] of Object.entries(derived || {})) if (!Number.isFinite(next[key]) && Number.isFinite(value)) next[key] = value;
        byMonth.set(month, next);
      }
    }
    return [...byMonth.values()].sort((a,b) => String(a.month).localeCompare(String(b.month)));
  }

  function shiftDateKey(key, days) {
    const date = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return '';
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function formatWeekLabel(option = {}) {
    const start = dateKey(option.start), end = dateKey(option.end);
    if (!start || !end) return '';
    const left = start.replaceAll('-','.');
    const right = start.slice(0,4) === end.slice(0,4) ? end.slice(5).replace('-','.') : end.replaceAll('-','.');
    return `${left} ~ ${right}`;
  }

  function weekOptions(rows = [], today = '') {
    const dates = rows.map(row => dateKey(row?.date)).filter(Boolean).sort();
    if (!dates.length) return [];
    const anchor = dateKey(today) || dates.at(-1);
    const earliest = dates[0];
    const diff = Math.max(0, Math.floor((Date.parse(`${anchor}T12:00:00Z`) - Date.parse(`${earliest}T12:00:00Z`)) / 86400000));
    return Array.from({ length: Math.floor(diff / 7) + 1 }, (_, offset) => {
      const end = shiftDateKey(anchor, -offset * 7);
      const start = shiftDateKey(end, -6);
      return { offset, start, end, label: formatWeekLabel({ start, end }) };
    });
  }

  function rowsForWeek(rows = [], option = {}) {
    return rows.filter(row => {
      const date = dateKey(row?.date);
      return date && date >= option.start && date <= option.end;
    });
  }

  function monthLabel(month = '') {
    return /^20\d{2}-\d{2}$/.test(month) ? `${month.slice(0,4)}년 ${Number(month.slice(5))}월` : month;
  }

  function yearLabel(year = '') { return /^20\d{2}$/.test(year) ? `${year}년` : year; }

  function periodFanclubDeltaSum(rows = []) {
    return rows.reduce((sum, row) => sum + (Number.isFinite(row?.fanclubDelta) ? row.fanclubDelta : 0), 0);
  }

  function countDeltaText(count, delta) {
    return `${number(count)} (${signed(Number.isFinite(delta) ? delta : 0)})`;
  }

  function baseChart({ title, rows = [], key, labelKey = 'date', formatter = number, kind = 'number' }) {
    const clean = rows.map(row => ({ label: String(row?.[labelKey] || ''), value: Number.isFinite(row?.[key]) ? row[key] : null })).filter(row => row.label);
    const values = clean.map(row => row.value).filter(Number.isFinite);
    if (!clean.length || !values.length) return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">해당 기간의 데이터가 없습니다.</div></article>`;
    const width=760,height=270,left=48,right=28,top=50,bottom=40,min=Math.min(0,...values),max=Math.max(1,...values),span=Math.max(1,max-min);
    const x=i => clean.length===1 ? width/2 : left+i*((width-left-right)/(clean.length-1));
    const y=v => height-bottom-((v-min)/span)*(height-top-bottom);
    const points=clean.map((row,i)=>row.value===null?null:`${x(i).toFixed(1)},${y(row.value).toFixed(1)}`).filter(Boolean).join(' ');
    const short = value => kind==='minutes' ? (value>=60?`${(value/60).toFixed(value%60?1:0)}h`:`${Math.round(value)}m`) : kind==='signed' ? signed(value) : number(value);
    const pointMarkup=clean.map((row,i)=>{
      if(row.value===null) return '';
      const xx=x(i),yy=y(row.value),valueText=formatter(row.value),cardX=Math.min(width-210,Math.max(8,xx-92));
      return `<g class="data-chart-point data-chart-hover" tabindex="0" aria-label="${esc(row.label)} ${esc(valueText)}"><line class="data-chart-crosshair" x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}"/><circle cx="${xx}" cy="${yy}" r="6"/><title>${esc(row.label)} · ${esc(valueText)}</title><g class="data-chart-hover-card" transform="translate(${cardX} ${Math.max(8,yy-66)})"><rect width="196" height="60" rx="10"/><text x="12" y="19">${esc(row.label)}</text><text class="value" x="12" y="43">${esc(valueText)}</text></g><text class="data-chart-value" x="${xx}" y="${Math.max(15,yy-12)}" text-anchor="middle">${esc(short(row.value))}</text></g>`;
    }).join('');
    const grid=[0,1,2,3,4].map(i=>{const yy=top+i*((height-top-bottom)/4);return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/>`;}).join('');
    const step=Math.max(1,Math.ceil(clean.length/7));
    const labels=clean.map((row,i)=>i%step&&i!==clean.length-1?'':`<text x="${x(i)}" y="${height-10}" text-anchor="middle">${esc(labelKey==='month'?row.label.slice(2):row.label.slice(5).replace('-','.'))}</text>`).join('');
    const latest=[...clean].reverse().find(row=>row.value!==null);
    return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${latest?esc(formatter(latest.value)):'—'}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointMarkup}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function fanclubCombinedChart({ title = '팬클럽', rows = [], labelKey = 'date' }) {
    const clean = rows.map(row => ({
      label: String(row?.[labelKey] || ''),
      count: Number.isFinite(row?.fanclubCount) ? row.fanclubCount : null,
      delta: Number.isFinite(row?.fanclubDelta) ? row.fanclubDelta : 0
    })).filter(row => row.label && row.count !== null);
    if (!clean.length) return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">해당 기간의 팬클럽 기록이 없습니다.</div></article>`;
    const values=clean.map(row=>row.count),rawMin=Math.min(...values),rawMax=Math.max(...values),padding=Math.max(2,Math.ceil((rawMax-rawMin||4)*0.35));
    const min=rawMin-padding,max=rawMax+padding,span=Math.max(1,max-min),width=760,height=270,left=48,right=28,top=50,bottom=40;
    const x=i=>clean.length===1?width/2:left+i*((width-left-right)/(clean.length-1));
    const y=v=>height-bottom-((v-min)/span)*(height-top-bottom);
    const points=clean.map((row,i)=>`${x(i).toFixed(1)},${y(row.count).toFixed(1)}`).join(' ');
    const periodDelta=periodFanclubDeltaSum(rows);
    const latest=clean.at(-1);
    const pointMarkup=clean.map((row,i)=>{
      const xx=x(i),yy=y(row.count),valueText=countDeltaText(row.count,row.delta),cardX=Math.min(width-230,Math.max(8,xx-102));
      return `<g class="data-chart-point data-chart-hover fanclub-combined-point" tabindex="0" aria-label="${esc(row.label)} ${esc(valueText)}"><line class="data-chart-crosshair" x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}"/><circle cx="${xx}" cy="${yy}" r="6"/><title>${esc(row.label)} · ${esc(valueText)}</title><g class="data-chart-hover-card" transform="translate(${cardX} ${Math.max(8,yy-66)})"><rect width="216" height="60" rx="10"/><text x="12" y="19">${esc(row.label)}</text><text class="value" x="12" y="43">${esc(valueText)}</text></g><text class="data-chart-value fanclub-combined-value" x="${xx}" y="${Math.max(15,yy-12)}" text-anchor="middle">${esc(valueText)}</text></g>`;
    }).join('');
    const grid=[0,1,2,3,4].map(i=>{const yy=top+i*((height-top-bottom)/4);return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/>`;}).join('');
    const step=Math.max(1,Math.ceil(clean.length/7));
    const labels=clean.map((row,i)=>i%step&&i!==clean.length-1?'':`<text x="${x(i)}" y="${height-10}" text-anchor="middle">${esc(labelKey==='month'?row.label.slice(2):row.label.slice(5).replace('-','.'))}</text>`).join('');
    return `<article class="data-chart-card data-fanclub-combined"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${esc(countDeltaText(latest.count,periodDelta))}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointMarkup}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function renderDetail(rootSelector, rows = [], monthly = false) {
    const root=$(rootSelector);
    if(!root) return;
    if(!rows.length){root.innerHTML='<div class="data-empty">해당 기간의 방송 데이터가 없습니다.</div>';return;}
    root.innerHTML=`<div class="data-detail-row data-detail-header"><span>${monthly?'월':'날짜'}</span><span>방송</span><span>방송시간</span><span>평균</span><span>최대</span><span>애청자</span><span>팬클럽</span></div>${rows.slice().reverse().map(row=>`<div class="data-detail-row"><strong>${esc(monthly?monthLabel(row.month):row.date)}</strong><span>${number(row.streamCount)}회</span><span>${minutes(row.durationMinutes)}</span><span>${number(row.averageViewers)}</span><span>${number(row.maxViewers)}</span><span class="${Number(row.followerDelta)>0?'positive':Number(row.followerDelta)<0?'negative':''}">${signed(row.followerDelta)}</span><span class="${Number(row.fanclubDelta)>0?'positive':Number(row.fanclubDelta)<0?'negative':''}">${esc(countDeltaText(row.fanclubCount,row.fanclubDelta))}</span></div>`).join('')}`;
  }

  function dailyMonthKeys(rows = []) { return [...new Set(rows.map(row=>monthKey(row?.date)).filter(Boolean))].sort().reverse(); }

  function renderDaily(payload) {
    const all=mergeDailyHistory(payload), months=dailyMonthKeys(all), root=$('#data-daily-periods');
    if(!months.length) return;
    if(!state.dailyMonth || !months.includes(state.dailyMonth)) state.dailyMonth=months[0];
    const today=dateKey(payload?.capturedAt)||all.at(-1)?.date||'';
    const allWeeks=weekOptions(all,today);
    const weeks=allWeeks.filter(option=>option.start.slice(0,7)===state.dailyMonth||option.end.slice(0,7)===state.dailyMonth||all.some(row=>monthKey(row.date)===state.dailyMonth&&row.date>=option.start&&row.date<=option.end));
    if(!weeks.some(option=>option.offset===state.dailyWeekOffset)) state.dailyWeekOffset=weeks[0]?.offset ?? null;
    const selected=weeks.find(option=>option.offset===state.dailyWeekOffset)||weeks[0];
    if(root){
      root.innerHTML=`<div class="data-period-selectors"><label><span>월 선택</span><select class="data-period-select data-daily-month-select" aria-label="일별 기록 월 선택">${months.map(month=>`<option value="${month}" ${month===state.dailyMonth?'selected':''}>${esc(monthLabel(month))}</option>`).join('')}</select></label><label><span>7일 구간</span><select class="data-period-select data-daily-week-select" aria-label="일별 7일 구간 선택">${weeks.map(option=>`<option value="${option.offset}" ${option.offset===state.dailyWeekOffset?'selected':''}>${esc(option.label)}</option>`).join('')}</select></label></div>`;
      root.querySelector('.data-daily-month-select')?.addEventListener('change',event=>{state.dailyMonth=event.target.value;state.dailyWeekOffset=null;renderDaily(payload);});
      root.querySelector('.data-daily-week-select')?.addEventListener('change',event=>{state.dailyWeekOffset=Number(event.target.value);renderDaily(payload);});
    }
    const rows=selected?rowsForWeek(all,selected):[];
    const chartRoot=$('#data-soop-chart');
    if(chartRoot) chartRoot.innerHTML=[
      baseChart({title:'일별 방송시간',rows,key:'durationMinutes',formatter:minutes,kind:'minutes'}),
      baseChart({title:'누적 방송시간',rows,key:'cumulativeMinutes',formatter:minutes,kind:'minutes'}),
      baseChart({title:'일별 평균 시청자',rows,key:'averageViewers'}),
      baseChart({title:'일별 최대 시청자',rows,key:'maxViewers'}),
      baseChart({title:'애청자 · 즐겨찾기 증감',rows,key:'followerDelta',formatter:signed,kind:'signed'}),
      fanclubCombinedChart({title:'팬클럽 수 · 증감',rows,labelKey:'date'})
    ].join('');
    renderDetail('#data-soop-daily-table',rows,false);
  }

  function renderMonthly(payload) {
    const daily=mergeDailyHistory(payload), monthly=mergeMonthlyHistory(payload,daily), years=[...new Set(monthly.map(row=>String(row.month||'').slice(0,4)).filter(year=>/^20\d{2}$/.test(year)))].sort().reverse();
    if(!years.length) return;
    if(!state.monthlyYear || !years.includes(state.monthlyYear)) state.monthlyYear=years[0];
    const root=$('#data-month-periods');
    if(root){
      root.innerHTML=`<div class="data-period-selectors"><label><span>연도 선택</span><select class="data-period-select data-month-year-select" aria-label="월별 기록 연도 선택">${years.map(year=>`<option value="${year}" ${year===state.monthlyYear?'selected':''}>${esc(yearLabel(year))}</option>`).join('')}</select></label></div>`;
      root.querySelector('.data-month-year-select')?.addEventListener('change',event=>{state.monthlyYear=event.target.value;renderMonthly(payload);});
    }
    const rows=monthly.filter(row=>String(row.month||'').startsWith(`${state.monthlyYear}-`));
    const chartRoot=$('#data-soop-monthly-chart');
    if(chartRoot) chartRoot.innerHTML=[
      baseChart({title:'월별 방송시간',rows,key:'durationMinutes',labelKey:'month',formatter:minutes,kind:'minutes'}),
      baseChart({title:'누적 방송시간',rows,key:'cumulativeMinutes',labelKey:'month',formatter:minutes,kind:'minutes'}),
      baseChart({title:'월 평균 시청자',rows,key:'averageViewers',labelKey:'month'}),
      baseChart({title:'월 최대 시청자',rows,key:'maxViewers',labelKey:'month'}),
      baseChart({title:'애청자 월 증감',rows,key:'followerDelta',labelKey:'month',formatter:signed,kind:'signed'}),
      fanclubCombinedChart({title:'팬클럽 수 · 월 증감',rows,labelKey:'month'})
    ].join('');
    renderDetail('#data-soop-monthly-table',rows,true);
  }

  function render(payload) {
    if(!payload?.soop) return;
    state.payload=payload;
    renderDaily(payload);
    renderMonthly(payload);
  }

  async function fetchAndRender() {
    try {
      const response=await fetch(`${API}&_period_v2=${Date.now()}`,{cache:'no-store'});
      if(!response.ok) return;
      render(await response.json());
    } catch (error) { console.warn('SOOP period v2 render skipped',error); }
  }

  ensureStyles();
  fetchAndRender();
  document.querySelector('#data-retry')?.addEventListener('click',()=>setTimeout(fetchAndRender,100));
  window.addEventListener('hashchange',()=>{ if(state.payload) render(state.payload); });

  window.__CHUNBONG_SOOP_PERIOD_V2__={mergeDailyHistory,mergeMonthlyHistory,periodFanclubDeltaSum,countDeltaText,fanclubCombinedChart};

  // Regression example for the combined label contract: 7606 (+7)
})();
