(() => {
  'use strict';

  const API = '/api/content?type=data';
  const CACHE_KEY = 'chunbong-data-dashboard-v1';
  const state = { payload: null, dailyWeekOffset: 0, selectedMonth: '', applying: false, scheduled: false };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const number = value => Number.isFinite(value) ? new Intl.NumberFormat('ko-KR').format(value) : '—';
  const signed = value => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${number(value)}` : '—';
  const minutes = value => {
    if (!Number.isFinite(value)) return '—';
    const total = Math.max(0, Math.round(value));
    const h = Math.floor(total / 60), m = total % 60;
    return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
  };

  function kstDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(date).reduce((acc, part) => { if (part.type !== 'literal') acc[part.type] = part.value; return acc; }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function shiftDateKey(key, days) {
    const date = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) return '';
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function formatRollingWeekLabel(option = {}) {
    const start=String(option?.start||''), end=String(option?.end||'');
    if(!/^20\d{2}-\d{2}-\d{2}$/.test(start)||!/^20\d{2}-\d{2}-\d{2}$/.test(end)) return '';
    const startText=start.replaceAll('-','.');
    const endText=start.slice(0,4)===end.slice(0,4)?end.slice(5).replace('-','.'):end.replaceAll('-','.');
    return `${startText} ~ ${endText}`;
  }

  function formatMonthLabel(month = '') {
    const value=String(month||'');
    return /^20\d{2}-\d{2}$/.test(value)?`${value.slice(0,4)}년 ${Number(value.slice(5))}월`:value;
  }

  function weekOptions(rows = [], todayKey = '') {
    const today = /^20\d{2}-\d{2}-\d{2}$/.test(String(todayKey)) ? String(todayKey) : kstDateKey();
    const dates = (Array.isArray(rows) ? rows : []).map(row => String(row?.date || '').slice(0,10)).filter(date => /^20\d{2}-\d{2}-\d{2}$/.test(date)).sort();
    const earliest = dates[0] || today;
    const diff = Math.max(0, Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${earliest}T12:00:00Z`)) / 86400000));
    return Array.from({ length: Math.max(1, Math.floor(diff / 7) + 1) }, (_, offset) => {
      const end = shiftDateKey(today, -offset * 7);
      const start = shiftDateKey(end, -6);
      const period = formatRollingWeekLabel({ start, end });
      return { offset, start, end, label: offset === 0 ? `최근 7일 · ${period}` : period };
    });
  }

  function weekRows(rows, option) {
    return (Array.isArray(rows) ? rows : []).filter(row => {
      const date = String(row?.date || '').slice(0,10);
      return date >= String(option?.start || '') && date <= String(option?.end || '');
    }).slice().sort((a,b) => String(a.date).localeCompare(String(b.date)));
  }

  function monthKeys(payload = {}) {
    const values = new Set();
    for (const row of payload?.soop?.monthlyStats || []) if (/^20\d{2}-\d{2}$/.test(String(row?.month || ''))) values.add(String(row.month));
    for (const row of payload?.soop?.calendar || []) {
      const month = String(row?.date || '').slice(0,7);
      if (/^20\d{2}-\d{2}$/.test(month)) values.add(month);
    }
    return [...values].sort().reverse();
  }

  function chart({ title, rows = [], key, labelKey = 'date', formatter = number, kind = 'number' }) {
    const clean = rows.map(row => ({ label: String(row?.[labelKey] || ''), value: Number.isFinite(row?.[key]) ? row[key] : null })).filter(row => row.label);
    const values = clean.map(row => row.value).filter(Number.isFinite);
    if (!clean.length || !values.length) return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">해당 기간의 데이터가 없습니다.</div></article>`;
    const width=760,height=270,left=48,right=28,top=50,bottom=40,min=Math.min(0,...values),max=Math.max(1,...values),span=Math.max(1,max-min);
    const x=i => clean.length === 1 ? width/2 : left + i*((width-left-right)/(clean.length-1));
    const y=v => height-bottom-((v-min)/span)*(height-top-bottom);
    const points = clean.map((row,i) => row.value === null ? null : `${x(i).toFixed(1)},${y(row.value).toFixed(1)}`).filter(Boolean).join(' ');
    const shortValue = value => {
      if (!Number.isFinite(value)) return '—';
      if (kind === 'minutes') return value >= 60 ? `${(value/60).toFixed(value%60?1:0)}h` : `${Math.round(value)}m`;
      if (kind === 'signed') return `${value>0?'+':''}${number(value)}`;
      return number(value);
    };
    const pointsMarkup = clean.map((row,i) => {
      if (row.value === null) return '';
      const xx=x(i), yy=y(row.value), valueText=formatter(row.value), cardX=Math.min(width-190,Math.max(8,xx-82));
      return `<g class="data-chart-point data-chart-hover" tabindex="0" aria-label="${esc(row.label)} ${esc(valueText)}"><line class="data-chart-crosshair" x1="${xx}" y1="${top}" x2="${xx}" y2="${height-bottom}"/><circle cx="${xx}" cy="${yy}" r="6"/><title>${esc(row.label)} · ${esc(valueText)}</title><g class="data-chart-hover-card" transform="translate(${cardX} ${Math.max(8,yy-58)})"><rect width="174" height="52" rx="9"/><text x="10" y="17">${esc(row.label)}</text><text class="value" x="10" y="35">${esc(valueText)}</text></g><text class="data-chart-value" x="${xx}" y="${Math.max(15,yy-12)}" text-anchor="middle">${esc(shortValue(row.value))}</text></g>`;
    }).join('');
    const grid = [0,1,2,3,4].map(i => { const yy=top+i*((height-top-bottom)/4); return `<line x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/>`; }).join('');
    const labelStep=Math.max(1,Math.ceil(clean.length/7));
    const labels=clean.map((row,i)=>i%labelStep&&i!==clean.length-1?'':`<text x="${x(i)}" y="${height-10}" text-anchor="middle">${esc(labelKey==='month'?row.label.slice(2):row.label.slice(5).replace('-','.'))}</text>`).join('');
    const latest=[...clean].reverse().find(row=>row.value!==null);
    return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${latest?esc(formatter(latest.value)):'-'}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointsMarkup}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function renderDetail(rootSelector, rows, monthly=false) {
    const root=$(rootSelector);
    if(!root) return;
    if(!rows.length){root.innerHTML='<div class="data-empty">해당 기간의 방송 데이터가 없습니다.</div>';return;}
    root.innerHTML=`<div class="data-detail-row data-detail-header"><span>${monthly?'월':'날짜'}</span><span>방송</span><span>방송시간</span><span>평균</span><span>최대</span><span>애청자 증감</span><span>팬클럽 수</span><span>팬클럽 증감</span></div>${rows.slice().reverse().map(row=>`<div class="data-detail-row"><strong>${esc(monthly?formatMonthLabel(row.month):row.date)}</strong><span>${number(row.streamCount)}회</span><span>${minutes(row.durationMinutes)}</span><span>${number(row.averageViewers)}</span><span>${number(row.maxViewers)}</span><span class="${Number(row.followerDelta)>0?'positive':Number(row.followerDelta)<0?'negative':''}">${signed(row.followerDelta)}</span><span>${number(row.fanclubCount)}</span><span class="${Number(row.fanclubDelta)>0?'positive':Number(row.fanclubDelta)<0?'negative':''}">${signed(row.fanclubDelta)}</span></div>`).join('')}`;
  }

  function renderDaily(payload) {
    const all=payload?.soop?.daily||[], today=kstDateKey(payload?.capturedAt||new Date()), options=weekOptions(all,today);
    if(!options.some(item=>item.offset===state.dailyWeekOffset)) state.dailyWeekOffset=0;
    const selected=options.find(item=>item.offset===state.dailyWeekOffset)||options[0];
    const root=$('#data-daily-periods');
    if(root){
      root.innerHTML=options.map(item=>`<button type="button" class="data-period-control ${item.offset===state.dailyWeekOffset?'is-active':''}" data-soop-week-index="${item.offset}">${esc(item.label)}</button>`).join('');
      root.querySelectorAll('[data-soop-week-index]').forEach(button=>button.addEventListener('click',()=>{state.dailyWeekOffset=Number(button.dataset.soopWeekIndex)||0;renderDaily(payload);}));
    }
    const rows=weekRows(all,selected);
    const chartRoot=$('#data-soop-chart');
    if(chartRoot) chartRoot.innerHTML=[
      chart({title:'일별 방송시간',rows,key:'durationMinutes',formatter:minutes,kind:'minutes'}),
      chart({title:'누적 방송시간',rows,key:'cumulativeMinutes',formatter:minutes,kind:'minutes'}),
      chart({title:'일별 평균 시청자',rows,key:'averageViewers'}),
      chart({title:'일별 최대 시청자',rows,key:'maxViewers'}),
      chart({title:'애청자 · 즐겨찾기 증감',rows,key:'followerDelta',formatter:signed,kind:'signed'}),
      chart({title:'팬클럽 수',rows,key:'fanclubCount'}),
      chart({title:'팬클럽 증감',rows,key:'fanclubDelta',formatter:signed,kind:'signed'})
    ].join('');
    renderDetail('#data-soop-daily-table',rows,false);
  }

  function categoryRows(rows=[]) {
    if(!rows.length) return '<div class="data-empty">해당 기간의 카테고리 기록이 없습니다.</div>';
    return rows.slice(0,24).map(row=>`<article class="data-category-row"><div class="data-category-copy"><strong>${esc(row.name||'미분류')}</strong><span>${number(row.streamCount)}회 · ${minutes(row.minutes)} · ${number(row.sharePercent)}%</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,Number(row.sharePercent)||0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>평균 ${number(row.averageViewers)} · 최대 ${number(row.maxViewers)}</small></article>`).join('');
  }

  function renderCategories(payload) {
    const monthly=payload?.soop?.monthlyStats||[], selected=monthly.find(row=>row.month===state.selectedMonth)||null;
    const selectedRows=Array.isArray(selected?.categories)?selected.categories:[];
    const recentRows=Array.isArray(payload?.soop?.categoryPeriods?.recentThreeMonths)?payload.soop.categoryPeriods.recentThreeMonths:[];
    const root=$('#data-soop-categories');
    if(!root) return;
    const monthLabel=state.selectedMonth?`${formatMonthLabel(state.selectedMonth)} 카테고리 분포`:'선택 월 카테고리 분포';
    const start=payload?.soop?.categoryPeriods?.recentThreeMonthsStart||'', through=payload?.soop?.categoryPeriods?.throughDate||'';
    root.innerHTML=`<section class="data-category-period"><div class="data-category-period-head"><div><strong>${esc(monthLabel)}</strong><small>횟수 · 방송시간 · 비중</small></div></div>${categoryRows(selectedRows)}</section><section class="data-category-period"><div class="data-category-period-head"><div><strong>최근 3개월 분석</strong><small>${esc(start&&through?`${start} ~ ${through} · `:'')}횟수 · 방송시간 · 비중</small></div></div>${categoryRows(recentRows)}</section>`;
  }

  function renderMonthly(payload) {
    const monthly=payload?.soop?.monthlyStats||[], months=monthKeys(payload), todayMonth=kstDateKey(payload?.capturedAt||new Date()).slice(0,7);
    if(!state.selectedMonth||!months.includes(state.selectedMonth)) state.selectedMonth=months.includes(todayMonth)?todayMonth:(months[0]||'');
    const root=$('#data-month-periods');
    if(root){
      root.innerHTML=months.map(month=>`<button type="button" class="data-period-control ${month===state.selectedMonth?'is-active':''}" data-soop-month-value="${month}">${esc(formatMonthLabel(month))}</button>`).join('');
      root.querySelectorAll('[data-soop-month-value]').forEach(button=>button.addEventListener('click',()=>{state.selectedMonth=button.dataset.soopMonthValue||'';renderMonthly(payload);renderCategories(payload);}));
    }
    const chartRoot=$('#data-soop-monthly-chart');
    if(chartRoot) chartRoot.innerHTML=[
      chart({title:'월별 방송시간',rows:monthly,key:'durationMinutes',labelKey:'month',formatter:minutes,kind:'minutes'}),
      chart({title:'누적 방송시간',rows:monthly,key:'cumulativeMinutes',labelKey:'month',formatter:minutes,kind:'minutes'}),
      chart({title:'월 평균 시청자',rows:monthly,key:'averageViewers',labelKey:'month'}),
      chart({title:'월 최대 시청자',rows:monthly,key:'maxViewers',labelKey:'month'}),
      chart({title:'애청자 월 증감',rows:monthly,key:'followerDelta',labelKey:'month',formatter:signed,kind:'signed'}),
      chart({title:'팬클럽 수',rows:monthly,key:'fanclubCount',labelKey:'month'}),
      chart({title:'팬클럽 월 증감',rows:monthly,key:'fanclubDelta',labelKey:'month',formatter:signed,kind:'signed'})
    ].join('');
    renderDetail('#data-soop-monthly-table',monthly.filter(row=>row.month===state.selectedMonth),true);
  }

  function syncOverview(payload) {
    const overview=payload?.soop?.overview||{};
    const panel=$('#data-soop-overview');
    if(!panel) return;
    panel.querySelectorAll('.data-kpi').forEach(card=>{
      const label=card.querySelector('small')?.textContent.trim()||'';
      if(label==='이번 달 후원자') card.remove();
      if(label==='SOOP STATUS'){
        const strong=card.querySelector('strong'), desc=card.querySelector('p');
        if(strong) strong.textContent=overview.live===true?'LIVE':overview.live===false?'OFFLINE':'확인 중';
        card.classList.toggle('live',overview.live===true);
        if(desc) desc.textContent=overview.live===true?`${overview.currentTitle||'현재 방송 중'}${overview.currentCategory?` · ${overview.currentCategory}`:''}`:'현재 SOOP 방송 상태';
      }
    });
  }

  function apply(payload=state.payload) {
    if(!payload||state.applying) return;
    state.applying=true;
    try { syncOverview(payload); renderDaily(payload); renderMonthly(payload); renderCategories(payload); }
    finally { state.applying=false; }
  }

  function readCached() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)||'null')?.payload||null; } catch { return null; }
  }

  function xhrPayload() {
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('GET',`${API}&refresh=1&_soop_periods=${Date.now()}`,true);
      xhr.setRequestHeader('cache-control','no-cache');
      xhr.onreadystatechange=()=>{
        if(xhr.readyState!==4)return;
        if(xhr.status>=200&&xhr.status<300){try{resolve(JSON.parse(xhr.responseText));}catch(error){reject(error);}}
        else reject(new Error(`SOOP period data ${xhr.status}`));
      };
      xhr.onerror=()=>reject(new Error('SOOP period data network error'));
      xhr.send();
    });
  }

  function scheduleApply(){
    if(state.scheduled||state.applying)return;
    state.scheduled=true;
    setTimeout(()=>{state.scheduled=false;apply();},30);
  }

  const cached=readCached();
  if(cached){state.payload=cached;apply(cached);}
  xhrPayload().then(payload=>{if(payload&&!payload.fallback){state.payload=payload;apply(payload);}}).catch(()=>{});
  const panel=$('#data-soop-panel');
  if(panel&&typeof MutationObserver!=='undefined') new MutationObserver(scheduleApply).observe(panel,{childList:true,subtree:true});

  const style=document.createElement('style');
  style.textContent='.data-period-controls{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.data-period-control{appearance:none;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.04);color:#a6a6a6;font:900 13px/1 inherit;padding:10px 15px;cursor:pointer;transition:.18s ease}.data-period-control:hover{color:#fff;border-color:rgba(255,107,24,.5)}.data-period-control.is-active{color:#fff;background:#ff6417;border-color:#ff6417;box-shadow:0 5px 16px rgba(255,100,23,.2)}.data-detail-row{grid-template-columns:1.2fr .65fr 1fr .75fr .75fr .9fr .9fr .9fr;min-width:860px}.data-category-period{display:grid;gap:10px;margin-bottom:24px}.data-category-period-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 2px 4px}.data-category-period-head strong{display:block;color:#fff;font-size:18px}.data-category-period-head small{display:block;margin-top:5px;color:#888;font-size:12px}@media(max-width:760px){.data-period-control{padding:9px 12px;font-size:12px}.data-category-period-head strong{font-size:16px}}';
  document.head.appendChild(style);
})();
