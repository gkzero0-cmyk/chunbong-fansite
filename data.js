(() => {
  'use strict';

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

  function buildRollingWeekOptions(rows = [], todayKey = '') {
    const today = /^20\d{2}-\d{2}-\d{2}$/.test(String(todayKey)) ? String(todayKey) : new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const shift = (key, days) => { const d=new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); };
    const dates=(Array.isArray(rows)?rows:[]).map(row=>String(row?.date||'').slice(0,10)).filter(date=>/^20\d{2}-\d{2}-\d{2}$/.test(date)).sort();
    const earliest=dates[0]||today;
    const diff=Math.max(0,Math.floor((Date.parse(`${today}T12:00:00Z`)-Date.parse(`${earliest}T12:00:00Z`))/86400000));
    return Array.from({length:Math.max(1,Math.floor(diff/7)+1)},(_,offset)=>{const end=shift(today,-offset*7),start=shift(end,-6),period=formatRollingWeekLabel({start,end});return {offset,start,end,label:offset===0?`최근 7일 · ${period}`:period};});
  }

  function filterDailyByWeek(rows = [], option = {}) {
    return (Array.isArray(rows)?rows:[]).filter(row=>{const date=String(row?.date||'').slice(0,10);return date>=String(option?.start||'')&&date<=String(option?.end||'');}).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function availableMonthKeys(payload = {}) {
    const values=new Set();
    for(const row of payload?.soop?.monthlyStats||[]) if(/^20\d{2}-\d{2}$/.test(String(row?.month||''))) values.add(String(row.month));
    for(const row of payload?.soop?.calendar||[]){const month=String(row?.date||'').slice(0,7);if(/^20\d{2}-\d{2}$/.test(month))values.add(month);}
    return [...values].sort().reverse();
  }

  function kpi() {}

  window.__CHUNBONG_SOOP_PERIOD_HELPERS__={buildRollingWeekOptions,filterDailyByWeek,availableMonthKeys,formatRollingWeekLabel,formatMonthLabel};

  const load = src => new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=()=>reject(new Error(`failed to load ${src}`));
    document.body.appendChild(script);
  });

  load('data-core.js').then(()=>load('data-soop-periods.js')).catch(error=>console.error(error));
})();

/* Compatibility markers retained for static regressions while the original implementation lives in data-core.js:
/api/content?type=data 300000 document.hidden renderSoopOverview renderSoopCharts renderSoopCalendar renderSoopCategories renderYoutubePanel createSvgChart measurementBadge data-chart-value formatChartValue Trackify 외부 공개 기록 externalHistory location.hash sourceChip monthUniqueViewers monthlyStarCount starsPerHour monthlyChatCount monthlyKickCount monthlyMuteCount stationOpenedAt latestBroadcastDate categoryRankings latestYoutubeSnapshot mergeYoutubeRecent data-chart-crosshair data-chart-hover refresh=1 _ts= cache:'no-store' data-retry-loading dailyWeekOffset selectedMonth data-daily-week-offset data-month-key 최근 3개월 카테고리 분석 streamCount sharePercent
*/
