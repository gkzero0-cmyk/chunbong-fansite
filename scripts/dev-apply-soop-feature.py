from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'missing patch anchor: {label}')
    return text.replace(old, new, 1)


def regex_replace_once(text, pattern, replacement, label):
    compiled = re.compile(pattern, re.S)
    text, count = compiled.subn(lambda _m: replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'missing regex patch anchor: {label}')
    return text


# Core data wiring.
path = ROOT / 'lib' / 'chunbong-data.js'
text = path.read_text()
text = replace_once(
    text,
    "const soopExternalHistory = require('../data/soop-external-history.json');",
    "const soopExternalHistory = require('../data/soop-external-history.json');\nconst soopFollowerHistory = require('../data/soop-follower-history.json');",
    'follower history data import'
)
text = replace_once(
    text,
    "const { fetchExternalSoopStats, mergeExternalSessions, mergeSoopMetricSources, extractExternalSoopStatsFromHtml } = require('./soop-external');",
    "const { fetchExternalSoopStats, mergeExternalSessions, mergeSoopMetricSources, extractExternalSoopStatsFromHtml } = require('./soop-external');\nconst { fetchSoopStructuredLive, resolveLiveState } = require('./soop-live-state');",
    'live resolver import'
)

new_live = r'''async function fetchSoopLive() {
  let structuredSignal = null;
  try {
    structuredSignal = await fetchSoopStructuredLive({ headers: { 'user-agent': HTML_HEADERS['user-agent'] } });
  } catch (_) {}

  let htmlSignal = null;
  let metrics = { categoryId: '', categoryName: '', followerCount: null, fanclubCount: null };
  try {
    const response = await fetch(`https://play.sooplive.com/${SOOP_ID}`, { headers: HTML_HEADERS });
    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/"(?:broad_title|broadTitle)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      const viewerMatch = html.match(/"(?:total_view_cnt|viewer_count|viewerCount|view_cnt)"\s*:\s*"?(\d+)"?/i);
      const startMatch = html.match(/"(?:broad_start|broadStart|start_time|startTime)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      metrics = extractSoopPublicMetricsFromHtml(html);
      const hasLiveMetadata = Boolean(titleMatch || startMatch);
      htmlSignal = {
        live: hasLiveMetadata ? true : /스트리머가\s*오프라인입니다/.test(html) ? false : null,
        authoritative: false,
        broadcastId: '',
        title: titleMatch ? decodeJsonString(titleMatch[1]) : '',
        startedAt: startMatch ? decodeJsonString(startMatch[1]) : '',
        viewerCount: viewerMatch ? Number(viewerMatch[1]) : null,
        categoryId: metrics.categoryId,
        categoryName: metrics.categoryName,
        source: `https://play.sooplive.com/${SOOP_ID}`
      };
    }
  } catch (_) {}

  const resolved = resolveLiveState([structuredSignal, htmlSignal]);
  const live = resolved.live === true;
  return {
    ...resolved,
    title: live ? (resolved.title || htmlSignal?.title || '') : '',
    startedAt: live ? (resolved.startedAt || htmlSignal?.startedAt || '') : '',
    viewerCount: live ? (resolved.viewerCount ?? htmlSignal?.viewerCount ?? null) : null,
    categoryId: live ? (resolved.categoryId || htmlSignal?.categoryId || '') : '',
    categoryName: live ? (resolved.categoryName || htmlSignal?.categoryName || '') : '',
    followerCount: metrics.followerCount,
    fanclubCount: metrics.fanclubCount,
    source: resolved.source || htmlSignal?.source || `https://play.sooplive.com/${SOOP_ID}`
  };
}'''
pattern = re.compile(r"async function fetchSoopLive\(\) \{.*?\n\}\n\nasync function fetchSoopChannelProfile", re.S)
if new_live not in text:
    replacement = new_live + "\n\nasync function fetchSoopChannelProfile"
    text, count = pattern.subn(lambda _match: replacement, text, count=1)
    if count != 1:
        raise SystemExit('missing patch anchor: fetchSoopLive body')

read_follower = """function readFollowerHistory() {\n  return soopFollowerHistory && Array.isArray(soopFollowerHistory.points)\n    ? soopFollowerHistory\n    : { version: 1, points: [] };\n}\n\n"""
anchor = "function readSoopSessionHistory() {"
if read_follower not in text:
    if anchor not in text:
        raise SystemExit('missing patch anchor: read follower history')
    text = text.replace(anchor, read_follower + anchor, 1)
text = replace_once(text, "  const readSessions = deps.readSessions || readSoopSessionHistory;", "  const readSessions = deps.readSessions || readSoopSessionHistory;\n  const readFollower = deps.readFollowerHistory || readFollowerHistory;", 'follower history dependency')
text = replace_once(text, "  const soopAnalytics = buildSoopAnalytics(sessions, snapshots?.snapshots || [], live, now);", "  const followerHistory = readFollower();\n  const soopAnalytics = buildSoopAnalytics(sessions, snapshots?.snapshots || [], live, now, { followerHistory: followerHistory?.points || [] });", 'analytics follower history call')
text = replace_once(text, "      categories: soopAnalytics.categories,\n      recentSessions: soopAnalytics.recentSessions,", "      categories: soopAnalytics.categories,\n      categoryPeriods: soopAnalytics.categoryPeriods,\n      followerHistoryPointCount: Array.isArray(followerHistory?.points) ? followerHistory.points.length : 0,\n      recentSessions: soopAnalytics.recentSessions,", 'category periods response')
text = replace_once(text, "module.exports.fetchSoopLive = fetchSoopLive;", "module.exports.fetchSoopLive = fetchSoopLive;\nmodule.exports.fetchSoopStructuredLive = fetchSoopStructuredLive;", 'structured live export')
text = replace_once(text, "module.exports.readSnapshotHistory = readSnapshotHistory;", "module.exports.readSnapshotHistory = readSnapshotHistory;\nmodule.exports.readFollowerHistory = readFollowerHistory;", 'follower history export')
path.write_text(text)

# Dashboard period controls and category presentation.
path = ROOT / 'data.js'
text = path.read_text()
text = replace_once(
    text,
    "const state = { payload: null, platform: location.hash === '#youtube' ? 'youtube' : 'soop', soopView: 'daily', calendarMonth: '', refreshing: false };",
    "const state = { payload: null, platform: location.hash === '#youtube' ? 'youtube' : 'soop', soopView: 'daily', calendarMonth: '', dailyWeekOffset: 0, selectedMonth: '', refreshing: false };",
    'dashboard state periods'
)
helpers = r'''  function kstClientDateKey(value = new Date()) {
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime())) return '';
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).reduce((acc,part)=>{if(part.type!=='literal')acc[part.type]=part.value;return acc;},{});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function shiftDateKey(key, days) {
    const date=new Date(`${key}T12:00:00Z`);
    if(Number.isNaN(date.getTime())) return '';
    date.setUTCDate(date.getUTCDate()+days);
    return date.toISOString().slice(0,10);
  }

  function buildRollingWeekOptions(rows=[],todayKey='') {
    const today=/^20\d{2}-\d{2}-\d{2}$/.test(String(todayKey))?String(todayKey):kstClientDateKey(new Date());
    const dates=(Array.isArray(rows)?rows:[]).map(row=>String(row?.date||'').slice(0,10)).filter(date=>/^20\d{2}-\d{2}-\d{2}$/.test(date)).sort();
    const earliest=dates[0]||today;
    const diff=Math.max(0,Math.floor((Date.parse(`${today}T12:00:00Z`)-Date.parse(`${earliest}T12:00:00Z`))/86400000));
    const count=Math.max(1,Math.floor(diff/7)+1);
    return Array.from({length:count},(_,offset)=>{
      const end=shiftDateKey(today,-offset*7),start=shiftDateKey(end,-6);
      return {offset,start,end,label:offset===0?'최근 7일':`${start.slice(5).replace('-','.')} ~ ${end.slice(5).replace('-','.')}`};
    });
  }

  function filterDailyByWeek(rows=[],option={}) {
    return (Array.isArray(rows)?rows:[]).filter(row=>String(row?.date||'')>=String(option?.start||'')&&String(row?.date||'')<=String(option?.end||'')).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function availableMonthKeys(payload={}) {
    const months=new Set();
    for(const row of payload?.soop?.monthlyStats||[]) if(/^20\d{2}-\d{2}$/.test(String(row?.month||''))) months.add(String(row.month));
    for(const row of payload?.soop?.calendar||[]) {const month=String(row?.date||'').slice(0,7);if(/^20\d{2}-\d{2}$/.test(month))months.add(month);}
    return [...months].sort().reverse();
  }

'''
if 'function buildRollingWeekOptions' not in text:
    text = text.replace('  function kpi(label, value, desc, klass = \'\') {', helpers + "  function kpi(label, value, desc, klass = '') {", 1)

text = re.sub(r"^\s*kpi\('이번 달 후원자'.*\n", '', text, count=1, flags=re.M)

charts = r'''  function renderSoopPeriodControls(payload, weeks, months) {
    const dailyRoot=$('#data-daily-periods');
    if(dailyRoot){
      dailyRoot.innerHTML=weeks.map(option=>`<button type="button" class="data-period-chip ${option.offset===state.dailyWeekOffset?'is-active':''}" data-daily-week-offset="${option.offset}">${esc(option.label)}</button>`).join('');
      dailyRoot.querySelectorAll('[data-daily-week-offset]').forEach(button=>button.addEventListener('click',()=>{state.dailyWeekOffset=Number(button.dataset.dailyWeekOffset)||0;renderSoopCharts(payload);}));
    }
    const monthRoot=$('#data-month-periods');
    if(monthRoot){
      monthRoot.innerHTML=months.map(month=>{const label=`${Number(month.slice(5))}월`;return `<button type="button" class="data-period-chip ${month===state.selectedMonth?'is-active':''}" data-month-key="${month}">${label}</button>`;}).join('');
      monthRoot.querySelectorAll('[data-month-key]').forEach(button=>button.addEventListener('click',()=>{state.selectedMonth=button.dataset.monthKey||'';state.calendarMonth=state.selectedMonth;renderSoopCharts(payload);renderSoopCalendar(payload);renderSoopCategories(payload);}));
    }
  }

  function renderSoopCharts(payload) {
    const allDaily=payload?.soop?.daily||[],monthly=payload?.soop?.monthlyStats||[];
    const todayKey=kstClientDateKey(payload?.capturedAt||new Date());
    const weeks=buildRollingWeekOptions(allDaily,todayKey),months=availableMonthKeys(payload);
    if(!weeks.some(option=>option.offset===state.dailyWeekOffset)) state.dailyWeekOffset=0;
    if(!state.selectedMonth||!months.includes(state.selectedMonth)) state.selectedMonth=months.includes(todayKey.slice(0,7))?todayKey.slice(0,7):(months[0]||'');
    if(!state.calendarMonth&&state.selectedMonth) state.calendarMonth=state.selectedMonth;
    renderSoopPeriodControls(payload,weeks,months);
    const selectedWeek=weeks.find(option=>option.offset===state.dailyWeekOffset)||weeks[0];
    let cumulative=0;
    const daily=filterDailyByWeek(allDaily,selectedWeek).map(row=>({...row,cumulativeMinutes:(cumulative+=Number.isFinite(row.durationMinutes)?row.durationMinutes:0)}));
    const favoriteDelta=daily.map(row=>({date:row.date,value:Number.isFinite(row.followerDelta)?row.followerDelta:null}));
    const fanclubDelta=daily.map(row=>({date:row.date,value:Number.isFinite(row.fanclubDelta)?row.fanclubDelta:null}));
    $('#data-soop-chart').innerHTML=[
      createSvgChart({title:'일별 방송시간',rows:daily,key:'durationMinutes',formatter:minutes,valueKind:'minutes'}),
      createSvgChart({title:'누적 방송시간',rows:daily,key:'cumulativeMinutes',formatter:minutes,valueKind:'minutes'}),
      createSvgChart({title:'일별 평균 시청자',rows:daily,key:'averageViewers'}),
      createSvgChart({title:'일별 최대 시청자',rows:daily,key:'maxViewers'}),
      createSvgChart({title:'애청자 · 즐겨찾기 증감',rows:favoriteDelta,key:'value',formatter:signed,valueKind:'signed',empty:'확인된 날짜별 즐겨찾기 값이 2개 이상 있으면 표시합니다.'}),
      createSvgChart({title:'팬클럽 증감',rows:fanclubDelta,key:'value',formatter:signed,valueKind:'signed',empty:'일일 팬클럽 스냅샷이 2일 이상 쌓이면 표시합니다.'})
    ].join('');
    $('#data-soop-monthly-chart').innerHTML=[
      createSvgChart({title:'월별 방송시간',rows:monthly,key:'durationMinutes',labelKey:'month',formatter:minutes,valueKind:'minutes'}),
      createSvgChart({title:'월 평균 시청자',rows:monthly,key:'averageViewers',labelKey:'month'}),
      createSvgChart({title:'월 최대 시청자',rows:monthly,key:'maxViewers',labelKey:'month'}),
      createSvgChart({title:'애청자 월 증감',rows:monthly,key:'followerDelta',labelKey:'month',formatter:signed,valueKind:'signed'}),
      createSvgChart({title:'팬클럽 월 증감',rows:monthly,key:'fanclubDelta',labelKey:'month',formatter:signed,valueKind:'signed'})
    ].join('');
    renderDetailTable('#data-soop-daily-table',daily,false);
    renderDetailTable('#data-soop-monthly-table',monthly.filter(row=>row.month===state.selectedMonth),true);
  }
'''
text = regex_replace_once(text, r"  function renderSoopCharts\(payload\) \{.*?\n  \}\n\n  function renderCalendarDetail", charts + "\n  function renderCalendarDetail", 'render SOOP charts')

categories = r'''  function categoryRowsMarkup(rows=[]) {
    if(!rows.length) return '<div class="data-empty">해당 기간의 카테고리 기록이 없습니다.</div>';
    return rows.slice(0,24).map(row=>`<article class="data-category-row"><div class="data-category-copy"><strong>${esc(row.name||'미분류')}</strong><span>${number(row.streamCount)}회 · ${minutes(row.minutes)} · ${number(row.sharePercent)}%</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,Number(row.sharePercent)||0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>평균 ${number(row.averageViewers)} · 최대 ${number(row.maxViewers)}</small></article>`).join('');
  }

  function renderSoopCategories(payload) {
    const root=$('#data-soop-categories'),monthly=payload?.soop?.monthlyStats||[];
    const selected=monthly.find(row=>row.month===state.selectedMonth)||null;
    const selectedRows=Array.isArray(selected?.categories)?selected.categories:[];
    const recentRows=Array.isArray(payload?.soop?.categoryPeriods?.recentThreeMonths)?payload.soop.categoryPeriods.recentThreeMonths:[];
    const monthLabel=state.selectedMonth?`${Number(state.selectedMonth.slice(5))}월 카테고리 분포`:'선택 월 카테고리 분포';
    root.innerHTML=`<section class="data-category-period"><div class="data-category-period-head"><div><strong>${esc(monthLabel)}</strong><small>횟수 · 방송시간 · 비중</small></div></div>${categoryRowsMarkup(selectedRows)}</section><section class="data-category-period"><div class="data-category-period-head"><div><strong>최근 3개월 카테고리 분석</strong><small>현재 달 포함 최근 3개 달력 월 · 횟수 · 방송시간 · 비중</small></div></div>${categoryRowsMarkup(recentRows)}</section>`;
  }
'''
text = regex_replace_once(text, r"  function renderSoopCategories\(payload\) \{.*?\n  \}\n\n  function renderSessions", categories + "\n  function renderSessions", 'render SOOP categories')
path.write_text(text)

# Keep all raw daily history and remove stale KPI from cached HTML.
path = ROOT / 'data-enhancements.js'
text = path.read_text()
text = text.replace("const DISALLOWED_SOOP_LABELS = new Set(['이번 달 별풍선', '별풍선 시급', '이번 달 채금']);", "const DISALLOWED_SOOP_LABELS = new Set(['이번 달 별풍선', '별풍선 시급', '이번 달 채금', '이번 달 후원자']);")
text = re.sub(r"\n  function limitDailyRows\(rows = \[\]\) \{.*?\n  \}\n", "\n", text, count=1, flags=re.S)
text = text.replace("\n    soop.daily = limitDailyRows(soop.daily);", "")
path.write_text(text)

# Period/category styling.
path = ROOT / 'data-enhancements.css'
text = path.read_text()
extra = ".data-period-controls{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px}.data-period-chip{appearance:none;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.04);color:#a6a6a6;font:900 13px/1 inherit;padding:10px 15px;cursor:pointer;transition:.18s ease}.data-period-chip:hover{color:#fff;border-color:rgba(255,107,24,.5)}.data-period-chip.is-active{color:#fff;background:#ff6417;border-color:#ff6417;box-shadow:0 5px 16px rgba(255,100,23,.2)}.data-category-period{display:grid;gap:10px;margin-bottom:24px}.data-category-period:last-child{margin-bottom:0}.data-category-period-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:0 2px 4px}.data-category-period-head strong{display:block;color:#fff;font-size:18px}.data-category-period-head small{display:block;margin-top:5px;color:#888;font-size:12px}@media(max-width:760px){.data-period-controls{gap:6px}.data-period-chip{padding:9px 12px;font-size:12px}.data-category-period-head strong{font-size:16px}}"
if '.data-period-controls{' not in text:
    text += extra
path.write_text(text)

print('APPLIED_SOOP_CORE_AND_UI_PATCH=1')
