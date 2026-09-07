(() => {
  'use strict';

  const API = '/api/content?type=data';
  const STYLE_HREF = 'data-soop-periods-v2.css';
  const state = {
    payload: null,
    dailyMonth: '',
    dailyWeekOffset: null,
    monthlyYear: '',
    monthlyMonth: 'all',
    applying: false,
    scheduled: false
  };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
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

  function monthLabel(value = '') {
    return /^20\d{2}-\d{2}$/.test(value) ? `${value.slice(0,4)}년 ${Number(value.slice(5))}월` : value;
  }

  function yearLabel(value = '') {
    return /^20\d{2}$/.test(value) ? `${value}년` : value;
  }

  function countDeltaText(count, delta) {
    return `${number(count)} (${signed(Number.isFinite(delta) ? delta : 0)})`;
  }

  function mergeDefined(base = {}, extra = {}) {
    const next = { ...base };
    for (const [key, value] of Object.entries(extra || {})) {
      if (value !== undefined && value !== null) next[key] = value;
    }
    return next;
  }

  function snapshotRows(payload = {}) {
    const rows = [];
    for (const trend of Array.isArray(payload?.trends) ? payload.trends : []) {
      const date = dateKey(trend?.date || trend?.capturedAt);
      if (!date) continue;
      rows.push({
        date,
        capturedAt: String(trend?.capturedAt || ''),
        followerCount: Number.isFinite(trend?.soop?.followerCount) ? trend.soop.followerCount : null,
        fanclubCount: Number.isFinite(trend?.soop?.fanclubCount) ? trend.soop.fanclubCount : null
      });
    }
    const today = dateKey(payload?.capturedAt);
    const overview = payload?.soop?.overview || {};
    if (today && (Number.isFinite(overview.followerCount) || Number.isFinite(overview.fanclubCount))) {
      rows.push({
        date: today,
        capturedAt: String(payload?.capturedAt || ''),
        followerCount: Number.isFinite(overview.followerCount) ? overview.followerCount : null,
        fanclubCount: Number.isFinite(overview.fanclubCount) ? overview.fanclubCount : null
      });
    }
    const byDate = new Map();
    for (const row of rows.sort((a,b)=>a.date.localeCompare(b.date)||a.capturedAt.localeCompare(b.capturedAt))) {
      const previous = byDate.get(row.date) || { date: row.date, followerCount: null, fanclubCount: null };
      byDate.set(row.date, {
        ...previous,
        ...row,
        followerCount: Number.isFinite(row.followerCount) ? row.followerCount : previous.followerCount,
        fanclubCount: Number.isFinite(row.fanclubCount) ? row.fanclubCount : previous.fanclubCount
      });
    }
    return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }

  function mergeDailyHistory(payload = {}) {
    const soop = payload?.soop || {};
    const byDate = new Map();
    for (const source of [soop.calendar, soop.daily]) {
      for (const row of Array.isArray(source) ? source : []) {
        const date = dateKey(row?.date);
        if (!date) continue;
        byDate.set(date, mergeDefined(byDate.get(date) || { date }, { ...row, date }));
      }
    }

    const snapshots = snapshotRows(payload);
    let previousFollower = null;
    let previousFanclub = null;
    for (const snapshot of snapshots) {
      const row = byDate.get(snapshot.date);
      const followerDelta = Number.isFinite(snapshot.followerCount) && Number.isFinite(previousFollower)
        ? snapshot.followerCount - previousFollower : null;
      const fanclubDelta = Number.isFinite(snapshot.fanclubCount) && Number.isFinite(previousFanclub)
        ? snapshot.fanclubCount - previousFanclub : null;
      if (row) {
        byDate.set(snapshot.date, mergeDefined(row, {
          followerCount: snapshot.followerCount,
          followerDelta,
          fanclubCount: snapshot.fanclubCount,
          fanclubDelta
        }));
      }
      if (Number.isFinite(snapshot.followerCount)) previousFollower = snapshot.followerCount;
      if (Number.isFinite(snapshot.fanclubCount)) previousFanclub = snapshot.fanclubCount;
    }

    const rows = [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
    let cumulative = 0;
    return rows.map(row => {
      const next = { ...row };
      if (Number.isFinite(next.cumulativeMinutes)) cumulative = Math.max(cumulative, next.cumulativeMinutes);
      else {
        cumulative += Number.isFinite(next.durationMinutes) ? next.durationMinutes : 0;
        next.cumulativeMinutes = cumulative;
      }
      return next;
    });
  }

  function mergeMonthlyHistory(payload = {}) {
    return (Array.isArray(payload?.soop?.monthlyStats) ? payload.soop.monthlyStats : [])
      .filter(row => monthKey(row?.month))
      .map(row => ({ ...row, month: monthKey(row.month) }))
      .sort((a,b)=>a.month.localeCompare(b.month));
  }

  function dailyMonthMetric(rows = [], month = '', countKey = '') {
    const key = monthKey(month);
    if (!key) return { count:null, delta:null };
    const start = `${key}-01`;
    let previous = null;
    let count = null;
    for (const row of rows) {
      const date = dateKey(row?.date);
      if (!date) continue;
      const value = Number.isFinite(row?.[countKey]) ? row[countKey] : null;
      if (date < start) {
        if (value !== null) previous = value;
        continue;
      }
      if (monthKey(date) !== key) {
        if (date > start) break;
        continue;
      }
      if (value !== null) count = value;
    }
    return {
      count,
      delta: Number.isFinite(count) && Number.isFinite(previous) ? count - previous : null
    };
  }

  function calendarMonthMetrics(payload = {}, date = '', dailyRows = null, monthlyRows = null) {
    const month = monthKey(date);
    if (!month) return { month:'', followerCount:null, followerDelta:null, fanclubCount:null, fanclubDelta:null };
    const daily = Array.isArray(dailyRows) ? dailyRows : mergeDailyHistory(payload);
    const monthly = Array.isArray(monthlyRows) ? monthlyRows : mergeMonthlyHistory(payload);
    const summary = monthly.find(row => row.month === month) || {};
    const followerFallback = dailyMonthMetric(daily, month, 'followerCount');
    const fanclubFallback = dailyMonthMetric(daily, month, 'fanclubCount');
    return {
      month,
      followerCount: Number.isFinite(summary.followerCount) ? summary.followerCount : followerFallback.count,
      followerDelta: Number.isFinite(summary.followerDelta) ? summary.followerDelta : followerFallback.delta,
      fanclubCount: Number.isFinite(summary.fanclubCount) ? summary.fanclubCount : fanclubFallback.count,
      fanclubDelta: Number.isFinite(summary.fanclubDelta) ? summary.fanclubDelta : fanclubFallback.delta
    };
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
    return `${start.replaceAll('-','.')} ~ ${start.slice(0,4)===end.slice(0,4)?end.slice(5).replace('-','.'):end.replaceAll('-','.')}`;
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
    return rows.filter(row => row.date >= option.start && row.date <= option.end);
  }

  function baseChart({ title, rows = [], key, labelKey = 'date', formatter = number, kind = 'number' }) {
    const clean = rows.map(row => ({ label: String(row?.[labelKey] || ''), value: Number.isFinite(row?.[key]) ? row[key] : null })).filter(row => row.label);
    const values = clean.map(row => row.value).filter(Number.isFinite);
    if (!clean.length || !values.length) return `<article class="data-chart-card data-v3-chart"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">해당 기간의 데이터가 없습니다.</div></article>`;
    const width=760,height=270,left=48,right=28,top=50,bottom=40,min=Math.min(0,...values),max=Math.max(1,...values),span=Math.max(1,max-min);
    const x=i=>clean.length===1?width/2:left+i*((width-left-right)/(clean.length-1));
    const y=v=>height-bottom-((v-min)/span)*(height-top-bottom);
    const points=clean.map((row,i)=>row.value===null?null:`${x(i).toFixed(1)},${y(row.value).toFixed(1)}`).filter(Boolean).join(' ');
    const short=value=>kind==='minutes'?(value>=60?`${(value/60).toFixed(value%60?1:0)}h`:`${Math.round(value)}m`):kind==='signed'?signed(value):number(value);
    const pointMarkup=clean.map((row,i)=>{
      if(row.value===null)return '';
      const xx=x(i),yy=y(row.value),valueText=formatter(row.value),cardX=Math.min(width-210,Math.max(8,xx-92));
      return `<g class="data-chart-point data-chart-hover" tabindex="0" aria-label="${esc(row.label)} ${esc(valueText)}"><line class="data-chart-crosshair" x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}"/><circle cx="${xx}" cy="${yy}" r="6"/><title>${esc(row.label)} · ${esc(valueText)}</title><g class="data-chart-hover-card" transform="translate(${cardX} ${Math.max(8,yy-66)})"><rect width="196" height="60" rx="10"/><text x="12" y="19">${esc(row.label)}</text><text class="value" x="12" y="43">${esc(valueText)}</text></g><text class="data-chart-value" x="${xx}" y="${Math.max(15,yy-12)}" text-anchor="middle">${esc(short(row.value))}</text></g>`;
    }).join('');
    const grid=[0,1,2,3,4].map(i=>{const yy=top+i*((height-top-bottom)/4);return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/>`;}).join('');
    const step=Math.max(1,Math.ceil(clean.length/7));
    const labels=clean.map((row,i)=>i%step&&i!==clean.length-1?'':`<text x="${x(i)}" y="${height-10}" text-anchor="middle">${esc(labelKey==='month'?row.label.slice(2):row.label.slice(5).replace('-','.'))}</text>`).join('');
    const latest=[...clean].reverse().find(row=>row.value!==null);
    return `<article class="data-chart-card data-v3-chart"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${latest?esc(formatter(latest.value)):'—'}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointMarkup}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function combinedMetricChart({ title, rows = [], countKey, deltaKey, labelKey = 'date', klass = '' }) {
    const clean = rows.map(row => ({
      label: String(row?.[labelKey] || ''),
      count: Number.isFinite(row?.[countKey]) ? row[countKey] : null,
      delta: Number.isFinite(row?.[deltaKey]) ? row[deltaKey] : 0
    })).filter(row=>row.label&&row.count!==null);
    if(!clean.length)return `<article class="data-chart-card data-v3-chart ${klass}"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">해당 기간의 기록이 없습니다.</div></article>`;
    const values=clean.map(row=>row.count),rawMin=Math.min(...values),rawMax=Math.max(...values),padding=Math.max(2,Math.ceil((rawMax-rawMin||4)*.35));
    const min=rawMin-padding,max=rawMax+padding,span=Math.max(1,max-min),width=760,height=270,left=48,right=28,top=50,bottom=40;
    const x=i=>clean.length===1?width/2:left+i*((width-left-right)/(clean.length-1));
    const y=v=>height-bottom-((v-min)/span)*(height-top-bottom);
    const points=clean.map((row,i)=>`${x(i).toFixed(1)},${y(row.count).toFixed(1)}`).join(' ');
    const periodDelta=clean.reduce((sum,row)=>sum+(Number.isFinite(row.delta)?row.delta:0),0),latest=clean.at(-1);
    const pointMarkup=clean.map((row,i)=>{
      const xx=x(i),yy=y(row.count),valueText=countDeltaText(row.count,row.delta),cardX=Math.min(width-230,Math.max(8,xx-102));
      return `<g class="data-chart-point data-chart-hover" tabindex="0" aria-label="${esc(row.label)} ${esc(valueText)}"><line class="data-chart-crosshair" x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}"/><circle cx="${xx}" cy="${yy}" r="6"/><title>${esc(row.label)} · ${esc(valueText)}</title><g class="data-chart-hover-card" transform="translate(${cardX} ${Math.max(8,yy-66)})"><rect width="216" height="60" rx="10"/><text x="12" y="19">${esc(row.label)}</text><text class="value" x="12" y="43">${esc(valueText)}</text></g><text class="data-chart-value" x="${xx}" y="${Math.max(15,yy-12)}" text-anchor="middle">${esc(valueText)}</text></g>`;
    }).join('');
    const grid=[0,1,2,3,4].map(i=>{const yy=top+i*((height-top-bottom)/4);return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/>`;}).join('');
    const step=Math.max(1,Math.ceil(clean.length/7));
    const labels=clean.map((row,i)=>i%step&&i!==clean.length-1?'':`<text x="${x(i)}" y="${height-10}" text-anchor="middle">${esc(labelKey==='month'?row.label.slice(2):row.label.slice(5).replace('-','.'))}</text>`).join('');
    return `<article class="data-chart-card data-v3-chart ${klass}"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${esc(countDeltaText(latest.count,periodDelta))}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointMarkup}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function followerCombinedChart(args = {}) {
    return combinedMetricChart({ ...args, countKey:'followerCount', deltaKey:'followerDelta', klass:'data-follower-combined' });
  }

  function fanclubCombinedChart(args = {}) {
    return combinedMetricChart({ ...args, countKey:'fanclubCount', deltaKey:'fanclubDelta', klass:'data-fanclub-combined' });
  }

  function renderDetail(rootSelector, rows = [], monthly = false) {
    const root=$(rootSelector);
    if(!root)return;
    if(!rows.length){root.innerHTML='<div class="data-empty">해당 기간의 방송 데이터가 없습니다.</div>';return;}
    root.innerHTML=`<div class="data-detail-row data-detail-header"><span>${monthly?'월':'날짜'}</span><span>방송</span><span>방송시간</span><span>평균</span><span>최대</span><span>애청자</span><span>팬클럽</span></div>${rows.slice().reverse().map(row=>`<div class="data-detail-row"><strong>${esc(monthly?monthLabel(row.month):row.date)}</strong><span>${number(row.streamCount)}회</span><span>${minutes(row.durationMinutes)}</span><span>${number(row.averageViewers)}</span><span>${number(row.maxViewers)}</span><span class="${Number(row.followerDelta)>0?'positive':Number(row.followerDelta)<0?'negative':''}">${esc(countDeltaText(row.followerCount,row.followerDelta))}</span><span class="${Number(row.fanclubDelta)>0?'positive':Number(row.fanclubDelta)<0?'negative':''}">${esc(countDeltaText(row.fanclubCount,row.fanclubDelta))}</span></div>`).join('')}`;
  }

  function renderDaily(payload) {
    const all=mergeDailyHistory(payload),months=[...new Set(all.map(row=>monthKey(row.date)).filter(Boolean))].sort().reverse(),root=$('#data-daily-periods');
    if(!months.length)return;
    if(!state.dailyMonth||!months.includes(state.dailyMonth))state.dailyMonth=months[0];
    const today=dateKey(payload?.capturedAt)||all.at(-1)?.date||'';
    const weeks=weekOptions(all,today).filter(option=>all.some(row=>monthKey(row.date)===state.dailyMonth&&row.date>=option.start&&row.date<=option.end));
    if(!weeks.some(option=>option.offset===state.dailyWeekOffset))state.dailyWeekOffset=weeks[0]?.offset??null;
    const selected=weeks.find(option=>option.offset===state.dailyWeekOffset)||weeks[0];
    if(root){
      root.innerHTML=`<div class="data-period-selectors"><label><span>월 선택</span><select class="data-period-select data-daily-month-select" aria-label="일별 기록 월 선택">${months.map(month=>`<option value="${month}" ${month===state.dailyMonth?'selected':''}>${esc(monthLabel(month))}</option>`).join('')}</select></label><label><span>7일 구간</span><select class="data-period-select data-daily-week-select" aria-label="일별 7일 구간 선택">${weeks.map(option=>`<option value="${option.offset}" ${option.offset===state.dailyWeekOffset?'selected':''}>${esc(option.label)}</option>`).join('')}</select></label></div>`;
      root.querySelector('.data-daily-month-select')?.addEventListener('change',event=>{state.dailyMonth=event.target.value;state.dailyWeekOffset=null;renderDaily(payload);});
      root.querySelector('.data-daily-week-select')?.addEventListener('change',event=>{state.dailyWeekOffset=Number(event.target.value);renderDaily(payload);});
    }
    const rows=selected?rowsForWeek(all,selected):[];
    const chartRoot=$('#data-soop-chart');
    if(chartRoot)chartRoot.innerHTML=[
      baseChart({title:'일별 방송시간',rows,key:'durationMinutes',formatter:minutes,kind:'minutes'}),
      baseChart({title:'누적 방송시간',rows,key:'cumulativeMinutes',formatter:minutes,kind:'minutes'}),
      baseChart({title:'일별 평균 시청자',rows,key:'averageViewers'}),
      baseChart({title:'일별 최대 시청자',rows,key:'maxViewers'}),
      followerCombinedChart({title:'애청자 · 즐겨찾기 수 · 증감',rows,labelKey:'date'}),
      fanclubCombinedChart({title:'팬클럽 수 · 증감',rows,labelKey:'date'})
    ].join('');
    renderDetail('#data-soop-daily-table',rows,false);
  }

  function renderMonthly(payload) {
    const monthly=mergeMonthlyHistory(payload),years=[...new Set(monthly.map(row=>row.month.slice(0,4)))].sort().reverse();
    if(!years.length)return;
    if(!state.monthlyYear||!years.includes(state.monthlyYear))state.monthlyYear=years[0];
    const yearMonths=monthly.filter(row=>row.month.startsWith(`${state.monthlyYear}-`)).map(row=>row.month);
    if(state.monthlyMonth!=='all'&&!yearMonths.includes(state.monthlyMonth))state.monthlyMonth='all';
    const root=$('#data-month-periods');
    if(root){
      root.innerHTML=`<div class="data-period-selectors"><label><span>연도 선택</span><select class="data-period-select data-month-year-select" aria-label="월별 기록 연도 선택">${years.map(year=>`<option value="${year}" ${year===state.monthlyYear?'selected':''}>${esc(yearLabel(year))}</option>`).join('')}</select></label><label><span>월 선택</span><select class="data-period-select data-month-month-select" aria-label="월별 기록 월 선택"><option value="all" ${state.monthlyMonth==='all'?'selected':''}>전체</option>${yearMonths.map(month=>`<option value="${month}" ${month===state.monthlyMonth?'selected':''}>${Number(month.slice(5))}월</option>`).join('')}</select></label></div>`;
      root.querySelector('.data-month-year-select')?.addEventListener('change',event=>{state.monthlyYear=event.target.value;state.monthlyMonth='all';renderMonthly(payload);});
      root.querySelector('.data-month-month-select')?.addEventListener('change',event=>{state.monthlyMonth=event.target.value;renderMonthly(payload);});
    }
    const rows=monthly.filter(row=>row.month.startsWith(`${state.monthlyYear}-`)&&(state.monthlyMonth==='all'||row.month===state.monthlyMonth));
    const chartRoot=$('#data-soop-monthly-chart');
    if(chartRoot)chartRoot.innerHTML=[
      baseChart({title:'월별 방송시간',rows,key:'durationMinutes',labelKey:'month',formatter:minutes,kind:'minutes'}),
      baseChart({title:'누적 방송시간',rows,key:'cumulativeMinutes',labelKey:'month',formatter:minutes,kind:'minutes'}),
      baseChart({title:'월 평균 시청자',rows,key:'averageViewers',labelKey:'month'}),
      baseChart({title:'월 최대 시청자',rows,key:'maxViewers',labelKey:'month'}),
      followerCombinedChart({title:'애청자 수 · 월 증감',rows,labelKey:'month'}),
      fanclubCombinedChart({title:'팬클럽 수 · 월 증감',rows,labelKey:'month'})
    ].join('');
    renderDetail('#data-soop-monthly-table',rows,true);
  }

  function renderCalendarDetail(row, monthlyMetrics = null) {
    const root=$('#data-soop-calendar-detail');
    if(!root)return;
    if(!row){root.innerHTML='<div class="data-empty">방송한 날짜를 선택하면 상세 기록을 보여줍니다.</div>';return;}
    const sessions=Array.isArray(row.sessions)?row.sessions:[];
    const counts=monthlyMetrics||row;
    root.innerHTML=`<small>${esc(row.date)}</small><h3>${number(row.streamCount)}회 방송 · ${esc(minutes(row.durationMinutes))}</h3><div class="data-calendar-stats"><span>평균 <b>${number(row.averageViewers)}</b></span><span>최대 <b>${number(row.maxViewers)}</b></span><span>애청자 <b>${esc(countDeltaText(counts.followerCount,counts.followerDelta))}</b></span><span>팬클럽 <b>${esc(countDeltaText(counts.fanclubCount,counts.fanclubDelta))}</b></span></div>${sessions.map(session=>`<article class="data-calendar-session"><strong>${esc(session.title||'춘봉 방송')}</strong><span>${esc(minutes(session.durationMinutes))} · 평균 ${number(session.averageViewers)} · 최대 ${number(session.maxViewers)}</span></article>`).join('')}`;
  }

  function enhanceCalendar(payload) {
    const rows=mergeDailyHistory(payload),monthlyRows=mergeMonthlyHistory(payload),map=new Map(rows.map(row=>[row.date,row]));
    const monthlyMap=new Map([...new Set(rows.map(row=>monthKey(row.date)).filter(Boolean))].map(month=>[month,calendarMonthMetrics(payload,`${month}-01`,rows,monthlyRows)]));
    const renderDate=date=>renderCalendarDetail(map.get(date),monthlyMap.get(monthKey(date))||null);
    $$('[data-calendar-date]').forEach(button=>{
      if(button.dataset.v3Bound==='1')return;
      button.dataset.v3Bound='1';
      button.addEventListener('click',()=>setTimeout(()=>renderDate(button.dataset.calendarDate),0));
    });
    const shown=dateKey($('#data-soop-calendar-detail small')?.textContent||'');
    if(shown&&map.has(shown))renderDate(shown);
    else {
      const first=$('[data-calendar-date]:not([disabled])');
      if(first&&map.has(first.dataset.calendarDate))renderDate(first.dataset.calendarDate);
    }
  }

  function removeUnsupportedKpis() {
    $('#data-soop-overview')?.querySelectorAll('.data-kpi').forEach(card=>{
      const label=card.querySelector('small')?.textContent.trim()||'';
      if(label === '이번 달 후원자')card.remove();
    });
  }

  function calendarBindingsCurrent() {
    const buttons=$$('[data-calendar-date]');
    return buttons.length > 0 && buttons.every(button=>button.dataset.v3Bound==='1');
  }

  function isV3Current() {
    return !!(
      $('#data-soop-chart .data-v3-chart')
      && $('#data-soop-monthly-chart .data-v3-chart')
      && $('#data-daily-periods .data-daily-month-select')
      && $('#data-daily-periods .data-daily-week-select')
      && $('#data-month-periods .data-month-year-select')
      && $('#data-month-periods .data-month-month-select')
      && calendarBindingsCurrent()
    );
  }

  function apply(payload=state.payload) {
    if(!payload?.soop||state.applying)return;
    state.payload=payload;
    state.applying=true;
    try {
      renderDaily(payload);
      renderMonthly(payload);
      enhanceCalendar(payload);
      removeUnsupportedKpis();
    } finally {
      state.applying=false;
    }
  }

  function scheduleApply(force=false) {
    if(state.scheduled||state.applying||(!force&&isV3Current()))return;
    state.scheduled=true;
    setTimeout(()=>{
      state.scheduled=false;
      if(state.payload)apply(state.payload);
    },0);
  }

  function isDataRequest(input) {
    const url=typeof input==='string'?input:input?.url;
    return typeof url==='string'&&url.includes(API);
  }

  function installFetchTap() {
    const previousFetch=window.fetch.bind(window);
    window.fetch=async function v3Fetch(input,init){
      const response=await previousFetch(input,init);
      if(isDataRequest(input)&&response.ok){
        response.clone().json().then(payload=>{
          if(payload?.soop){state.payload=payload;scheduleApply(true);}
        }).catch(()=>{});
      }
      return response;
    };
  }

  ensureStyles();
  installFetchTap();
  const observer=new MutationObserver(()=>scheduleApply(false));
  const panel=$('#data-soop-panel');
  if(panel)observer.observe(panel,{childList:true,subtree:true});

  window.__CHUNBONG_SOOP_PERIOD_V3__={mergeDailyHistory,mergeMonthlyHistory,countDeltaText,followerCombinedChart,fanclubCombinedChart,calendarMonthMetrics,renderCalendarDetail,calendarBindingsCurrent,isV3Current,apply};
  window.__CHUNBONG_SOOP_PERIOD_V2__=window.__CHUNBONG_SOOP_PERIOD_V3__;
})();