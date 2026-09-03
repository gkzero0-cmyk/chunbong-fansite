from pathlib import Path
import re


def replace_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    return updated


def patch_api():
    path = Path('lib/chunbong-data.js')
    text = path.read_text()
    if 'const readExternalHistory =' not in text:
        old = """  const readSnapshots = deps.readSnapshots || readSnapshotHistory;
  const readSessions = deps.readSessions || readSoopSessionHistory;
  const errors = [];
"""
        new = """  const readSnapshots = deps.readSnapshots || readSnapshotHistory;
  const readSessions = deps.readSessions || readSoopSessionHistory;
  const readExternalHistory = deps.readExternalHistory || (deps.readSessions ? () => ({ version: 1, cutoffKst: '', sessions: [], sourceSummary: null, categoryReference: null }) : () => soopExternalHistory);
  const errors = [];
"""
        if old not in text:
            raise RuntimeError('readExternalHistory insertion point missing')
        text = text.replace(old, new, 1)
        old = """  const snapshots = readSnapshots();
  const sessionStore = readSessions();
  const measuredSessions = Array.isArray(sessionStore?.sessions) ? sessionStore.sessions : [];
  const sessions = mergeExternalSessions(measuredSessions, soopExternalHistory.sessions || [], soopExternalHistory.cutoffKst || '');
  const soopAnalytics = buildSoopAnalytics(sessions, snapshots?.snapshots || [], live, now);
  const externalSummary = soopExternalHistory.sourceSummary || {};
"""
        new = """  const snapshots = readSnapshots();
  const sessionStore = readSessions();
  const externalHistory = readExternalHistory() || { version: 1, cutoffKst: '', sessions: [] };
  const measuredSessions = Array.isArray(sessionStore?.sessions) ? sessionStore.sessions : [];
  const sessions = mergeExternalSessions(measuredSessions, externalHistory.sessions || [], externalHistory.cutoffKst || '');
  const soopAnalytics = buildSoopAnalytics(sessions, snapshots?.snapshots || [], live, now);
  const externalSummary = externalHistory.sourceSummary || {};
"""
        if old not in text:
            raise RuntimeError('external history aggregation point missing')
        text = text.replace(old, new, 1)
        text = text.replace("cutoffKst: soopExternalHistory.cutoffKst || '',", "cutoffKst: externalHistory.cutoffKst || '',")
        text = text.replace("backfillCount: Array.isArray(soopExternalHistory.sessions) ? soopExternalHistory.sessions.length : 0,", "backfillCount: Array.isArray(externalHistory.sessions) ? externalHistory.sessions.length : 0,")
        text = text.replace("sourceSummary: soopExternalHistory.sourceSummary || null,", "sourceSummary: externalHistory.sourceSummary || null,")
        text = text.replace("categoryReference: soopExternalHistory.categoryReference || null,", "categoryReference: externalHistory.categoryReference || null,")

    if 'soopAnalytics.overview.totalAirtimeMinutes' not in text:
        old = """  soopAnalytics.overview.knownTotalMinutes = soopAnalytics.overview.measuredTotalMinutes;
  soopAnalytics.overview.externalAverageViewers = mergedMetrics.averageViewers ?? externalSummary.recent30DayAverageViewers ?? null;
  soopAnalytics.overview.externalMaxViewers = mergedMetrics.maxViewers ?? externalSummary.recent30DayPeakViewers ?? null;
  soopAnalytics.overview.externalMinViewers = mergedMetrics.minViewers ?? null;
  soopAnalytics.overview.externalAirtimeMinutes = mergedMetrics.airtimeMinutes ?? externalSummary.recent30DayAirtimeMinutes ?? null;
  soopAnalytics.overview.externalFieldSources = mergedMetrics.fieldSources;
"""
        new = """  soopAnalytics.overview.knownTotalMinutes = soopAnalytics.overview.measuredTotalMinutes;
  soopAnalytics.overview.externalAverageViewers = mergedMetrics.averageViewers ?? externalSummary.recent30DayAverageViewers ?? null;
  soopAnalytics.overview.externalMaxViewers = mergedMetrics.maxViewers ?? externalSummary.recent30DayPeakViewers ?? null;
  soopAnalytics.overview.externalMinViewers = mergedMetrics.minViewers ?? null;
  soopAnalytics.overview.externalAirtimeMinutes = mergedMetrics.airtimeMinutes ?? externalSummary.recent30DayAirtimeMinutes ?? null;
  soopAnalytics.overview.totalAirtimeMinutes = mergedMetrics.totalAirtimeMinutes ?? null;
  soopAnalytics.overview.subscriberCount = mergedMetrics.subscriberCount ?? null;
  soopAnalytics.overview.supporterCount = mergedMetrics.supporterCount ?? null;
  soopAnalytics.overview.monthUniqueViewers = mergedMetrics.monthUniqueViewers ?? null;
  soopAnalytics.overview.viewershipHours = mergedMetrics.viewershipHours ?? null;
  soopAnalytics.overview.cumulativeUsers = mergedMetrics.cumulativeUsers ?? null;
  soopAnalytics.overview.cumulativeUpCount = mergedMetrics.cumulativeUpCount ?? null;
  soopAnalytics.overview.currentMonthCategories = Array.isArray(mergedMetrics.categories) ? mergedMetrics.categories : [];
  soopAnalytics.overview.externalFieldSources = mergedMetrics.fieldSources;
  if (mergedMetrics.fieldSources?.airtimeMinutes === 'trackify' && Number.isFinite(mergedMetrics.airtimeMinutes)) {
    soopAnalytics.overview.monthDurationMinutes = mergedMetrics.airtimeMinutes;
    soopAnalytics.overview.monthDurationSource = 'trackify';
  }
  if (mergedMetrics.fieldSources?.averageViewers === 'trackify' && Number.isFinite(mergedMetrics.averageViewers)) {
    soopAnalytics.overview.monthAverageViewers = mergedMetrics.averageViewers;
    soopAnalytics.overview.monthAverageViewerSource = 'trackify';
  }
  if (mergedMetrics.fieldSources?.maxViewers === 'trackify' && Number.isFinite(mergedMetrics.maxViewers)) {
    soopAnalytics.overview.monthMaxViewers = mergedMetrics.maxViewers;
    soopAnalytics.overview.monthMaxViewerSource = 'trackify';
  }
"""
        if old not in text:
            raise RuntimeError('overview metric insertion point missing')
        text = text.replace(old, new, 1)
    path.write_text(text)


def patch_ui():
    path = Path('data.js')
    text = path.read_text()
    if 'function sourceChip(source)' not in text:
        replacement = r'''  const SOURCE_URLS = {
    trackify: 'https://www.trackify.kr/soop/chunbongtv', auro: 'https://auro.live/creator/afreeca/chunbongtv', softc: 'https://viewership.softc.one/channel/afreeca/chunbongtv', streamscharts: 'https://streamscharts.com/channels/chunbongtv/streams?platform=afreecatv', soop: 'https://www.sooplive.com/station/chunbongtv'
  };
  function measurementBadge(kind) {
    const labels={viewer:'팬사이트 5분 측정',follower:'공개 스냅샷',fanclub:'공개 스냅샷',public:'공개 데이터',external:'외부 공개 기록','fan-site-sampled-5m':'팬사이트 5분 측정','external-public-record':'외부 공개 기록',trackify:'Trackify',auro:'Auro',softc:'Softc',streamscharts:'Streams Charts',soop:'SOOP 공개값'};
    return `<span class="data-measurement-badge source-${esc(kind||'public')}">${esc(labels[kind]||labels.public)}</span>`;
  }
  function sourceChip(source) { const key=String(source||'').toLowerCase(), labels={trackify:'Trackify',auro:'Auro',softc:'Softc',streamscharts:'Streams Charts',soop:'SOOP'}, url=SOURCE_URLS[key]; return url ? `<a class="data-source-chip" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(labels[key]||source)} ↗</a>` : measurementBadge(source||'public'); }
  function formatChartValue(value,kind='number') { if(!Number.isFinite(value))return '—'; if(kind==='minutes'){if(Math.abs(value)>=60){const h=value/60;return `${Number.isInteger(h)?h:h.toFixed(1)}h`;}return `${Math.round(value)}m`;} if(kind==='signed')return `${value>0?'+':''}${new Intl.NumberFormat('ko-KR').format(value)}`; if(Math.abs(value)>=10000)return new Intl.NumberFormat('ko-KR',{notation:'compact',maximumFractionDigits:1}).format(value); return new Intl.NumberFormat('ko-KR').format(value); }
  function snapshotDeltaRows(trends=[],key){let previous=null;return trends.map(row=>{const current=Number.isFinite(row?.soop?.[key])?row.soop[key]:null;const value=current!==null&&previous!==null?current-previous:null;if(current!==null)previous=current;return{date:row?.date||'',value};});}

  function kpi'''
        text = replace_once(text, r"  function measurementBadge\(kind\) \{.*?\n  \}\n\n  function kpi", replacement, 'measurement badge')

    if 'data-chart-value' not in text:
        replacement = r'''  function createSvgChart({ title, rows = [], key, labelKey = 'date', formatter = number, valueKind = 'number', empty = '측정 데이터가 아직 없습니다.' }) {
    const clean=rows.map(row=>({label:row?.[labelKey]||'',value:Number.isFinite(row?.[key])?row[key]:null})).filter(row=>row.label), values=clean.map(row=>row.value).filter(Number.isFinite);
    if(!clean.length||!values.length)return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">${esc(empty)}</div></article>`;
    const width=760,height=260,padLeft=46,padRight=28,padTop=48,padBottom=38,minValue=Math.min(0,...values),maxValue=Math.max(1,...values),span=Math.max(1,maxValue-minValue);
    const x=i=>clean.length===1?width/2:padLeft+i*((width-padLeft-padRight)/(clean.length-1)), y=v=>height-padBottom-((v-minValue)/span)*(height-padTop-padBottom), points=clean.map((row,i)=>row.value===null?null:`${x(i).toFixed(1)},${y(row.value).toFixed(1)}`).filter(Boolean).join(' '), labelStep=Math.max(1,Math.ceil(clean.length/10));
    const pointsAndValues=clean.map((row,i)=>{if(row.value===null)return'';const xx=x(i),yy=y(row.value),show=clean.length<=10||i%labelStep===0||i===clean.length-1;return `<g class="data-chart-point" tabindex="0"><circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="4.5"/><title class="data-chart-tooltip">${esc(row.label)} · ${esc(formatter(row.value))}</title>${show?`<text class="data-chart-value" x="${xx.toFixed(1)}" y="${Math.max(15,yy-11).toFixed(1)}" text-anchor="middle">${esc(formatChartValue(row.value,valueKind))}</text>`:''}</g>`;}).join('');
    const zeroY=y(0),grid=[0,1,2,3,4].map(i=>{const yy=padTop+i*((height-padTop-padBottom)/4);return `<line x1="${padLeft}" y1="${yy}" x2="${width-padRight}" y2="${yy}"/>`;}).join('')+(minValue<0?`<line class="zero-line" x1="${padLeft}" y1="${zeroY}" x2="${width-padRight}" y2="${zeroY}"/>`:''),xStep=Math.max(1,Math.ceil(clean.length/7)),labels=clean.map((row,i)=>i%xStep&&i!==clean.length-1?'':`<text x="${x(i).toFixed(1)}" y="${height-9}" text-anchor="middle">${esc(labelKey==='month'?String(row.label).slice(2):shortDate(row.label))}</text>`).join(''),latest=[...clean].reverse().find(row=>row.value!==null);
    return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${latest?esc(formatter(latest.value)):'-'}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointsAndValues}</g><g class="chart-labels">${labels}</g></svg></article>`;
  }

  function renderStatus'''
        text = replace_once(text, r"  function createSvgChart\(.*?\n  \}\n\n  function renderStatus", replacement, 'chart renderer')

    if "kpi('전체 누적 방송시간'" not in text:
        replacement = r'''  function renderSoopOverview(payload) {
    const o=payload?.soop?.overview||{},metricSources=payload?.soop?.live?.metricSources||o.externalFieldSources||{},liveText=o.live===true?'LIVE':o.live===false?'OFFLINE':'확인 중',liveDesc=o.live===true?`${esc(o.currentTitle||'현재 방송 중')} · ${esc(o.currentCategory||'카테고리 확인 중')}`:'현재 SOOP 방송 상태';
    const totalMinutes=Number.isFinite(o.totalAirtimeMinutes)?o.totalAirtimeMinutes:o.knownTotalMinutes,totalSource=Number.isFinite(o.totalAirtimeMinutes)?(o.externalFieldSources?.totalAirtimeMinutes||'trackify'):'viewer';
    const cards=[kpi('SOOP STATUS',liveText,liveDesc,o.live===true?'live':''),kpi('현재 시청자',number(o.currentViewerCount),`${measurementBadge(metricSources.viewerCount||'viewer')} 현재 공개 동접`),kpi('오늘 방송시간',minutes(o.todayDurationMinutes),`${measurementBadge('viewer')} 방송 세션 기준`),kpi('이번 달 방송시간',minutes(o.monthDurationMinutes),`${measurementBadge(o.monthDurationSource||'viewer')} 월 누적`),kpi('전체 누적 방송시간',minutes(totalMinutes),`${measurementBadge(totalSource)} 확인 가능한 전체 기록`),kpi('월 평균 시청자',number(o.monthAverageViewers),`${measurementBadge(o.monthAverageViewerSource||'viewer')} 월 평균 동접`),kpi('월 최대 시청자',number(o.monthMaxViewers),`${measurementBadge(o.monthMaxViewerSource||'viewer')} 월 최고 동접`),kpi('애청자 · 즐겨찾기',number(o.followerCount),`${measurementBadge(metricSources.followerCount||o.externalFieldSources?.followerCount||'follower')} 월 증감 ${esc(signed(o.followerDelta))}`),kpi('팬클럽',number(o.fanclubCount),`${measurementBadge(metricSources.fanclubCount||o.externalFieldSources?.fanclubCount||'fanclub')} 월 증감 ${esc(signed(o.fanclubDelta))}`),kpi('SOOP 구독자',number(o.subscriberCount),`${measurementBadge(o.externalFieldSources?.subscriberCount||'trackify')} 공개 구독 수`),kpi('서포터',number(o.supporterCount),`${measurementBadge(o.externalFieldSources?.supporterCount||'trackify')} 공개 누적`),kpi('이번 달 고유 시청자',number(o.monthUniqueViewers),`${measurementBadge(o.externalFieldSources?.monthUniqueViewers||'trackify')} 월 누적 유저`),kpi('이번 달 뷰어십',Number.isFinite(o.viewershipHours)?`${number(o.viewershipHours)}시간`:'측정 불가',`${measurementBadge(o.externalFieldSources?.viewershipHours||'trackify')} 평균×방송시간`),kpi('누적 UP',number(o.cumulativeUpCount),`${measurementBadge(o.externalFieldSources?.cumulativeUpCount||'trackify')} 누적 UP수`),kpi('누적 유저',number(o.cumulativeUsers),`${measurementBadge(o.externalFieldSources?.cumulativeUsers||'trackify')} 공개 누적`),kpi('외부 30일 참고',`${number(payload?.soop?.externalHistory?.sourceSummary?.recent30DayAverageViewers)} / ${number(payload?.soop?.externalHistory?.sourceSummary?.recent30DayPeakViewers)}`,`${measurementBadge('streamscharts')} 평균 / 최대 참고값`)];
    const available=new Set(Object.values(o.externalFieldSources||{}).filter(Boolean)),chips=['trackify','auro','softc','streamscharts'].filter(src=>available.has(src)||payload?.soop?.externalHistory?.currentFallback?.sources?.some(item=>item.source===src)).map(sourceChip).join('');
    $('#data-soop-overview').innerHTML=cards.join('')+(chips?`<div class="data-source-strip"><small>보조 공개 데이터</small>${chips}</div>`:'');
  }

  function renderDetailTable'''
        text = replace_once(text, r"  function renderSoopOverview\(payload\) \{.*?\n  \}\n\n  function renderDetailTable", replacement, 'overview renderer')

    if "title:'누적 방송시간'" not in text:
        replacement = r'''  function renderSoopCharts(payload) {
    const daily=payload?.soop?.daily||[],monthly=payload?.soop?.monthlyStats||[],trends=payload?.trends||[],favoriteDelta=snapshotDeltaRows(trends,'followerCount'),fanclubDelta=snapshotDeltaRows(trends,'fanclubCount');
    $('#data-soop-chart').innerHTML=[createSvgChart({title:'일별 방송시간',rows:daily,key:'durationMinutes',formatter:minutes,valueKind:'minutes'}),createSvgChart({title:'누적 방송시간',rows:daily,key:'cumulativeMinutes',formatter:minutes,valueKind:'minutes'}),createSvgChart({title:'일별 평균 시청자',rows:daily,key:'averageViewers'}),createSvgChart({title:'일별 최대 시청자',rows:daily,key:'maxViewers'}),createSvgChart({title:'애청자 · 즐겨찾기 증감',rows:favoriteDelta,key:'value',formatter:signed,valueKind:'signed',empty:'일일 즐겨찾기 스냅샷이 2일 이상 쌓이면 표시합니다.'}),createSvgChart({title:'팬클럽 증감',rows:fanclubDelta,key:'value',formatter:signed,valueKind:'signed',empty:'일일 팬클럽 스냅샷이 2일 이상 쌓이면 표시합니다.'})].join('');
    $('#data-soop-monthly-chart').innerHTML=[createSvgChart({title:'월별 방송시간',rows:monthly,key:'durationMinutes',labelKey:'month',formatter:minutes,valueKind:'minutes'}),createSvgChart({title:'월 평균 시청자',rows:monthly,key:'averageViewers',labelKey:'month'}),createSvgChart({title:'월 최대 시청자',rows:monthly,key:'maxViewers',labelKey:'month'}),createSvgChart({title:'애청자 월 증감',rows:monthly,key:'followerDelta',labelKey:'month',formatter:signed,valueKind:'signed'}),createSvgChart({title:'팬클럽 월 증감',rows:monthly,key:'fanclubDelta',labelKey:'month',formatter:signed,valueKind:'signed'})].join('');
    renderDetailTable('#data-soop-daily-table',daily,false);renderDetailTable('#data-soop-monthly-table',monthly,true);
  }

  function renderCalendarDetail'''
        text = replace_once(text, r"  function renderSoopCharts\(payload\) \{.*?\n  \}\n\n  function renderCalendarDetail", replacement, 'SOOP charts')

    if '이번 달 카테고리 분포' not in text:
        replacement = r'''  function renderSoopCategories(payload) {
    const rows=payload?.soop?.categories||[],o=payload?.soop?.overview||{},trackifyRows=Array.isArray(o.currentMonthCategories)?o.currentMonthCategories:[],external=payload?.soop?.externalHistory?.categoryReference,root=$('#data-soop-categories');
    const trackifyBlock=trackifyRows.length?`<section class="data-external-reference trackify"><div class="data-external-reference-head"><div><strong>이번 달 카테고리 분포</strong><small>${measurementBadge('trackify')} 현재 월 공개 집계</small></div>${sourceChip('trackify')}</div>${trackifyRows.map(row=>`<article class="data-category-row external"><div class="data-category-copy"><strong>${esc(row.name||'미분류')}</strong><span>이번 달 방송 비중</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,Number(row.sharePercent)||0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>Trackify 월간 분포</small></article>`).join('')}</section>`:'';
    const measured=rows.length?rows.slice(0,20).map(row=>`<article class="data-category-row"><div class="data-category-copy"><strong>${esc(row.name||'미분류')}</strong><span>${number(row.streamCount)}회 · ${minutes(row.minutes)}</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,Number(row.sharePercent)||0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>평균 ${number(row.averageViewers)} · 최대 ${number(row.maxViewers)}</small></article>`).join(''):'<div class="data-empty">팬사이트 실측 카테고리 데이터는 수집 시작일부터 누적됩니다.</div>';
    const externalRows=Array.isArray(external?.categories)?external.categories:[],externalTotal=externalRows.reduce((sum,row)=>sum+(Number(row.minutes)||0),0),externalBlock=externalRows.length?`<section class="data-external-reference"><div class="data-external-reference-head"><div><strong>과거 카테고리 참고</strong><small>${measurementBadge('streamscharts')} 공개 방송시간 집계</small></div><a href="${esc(external.url||SOURCE_URLS.streamscharts)}" target="_blank" rel="noreferrer">출처 ↗</a></div>${externalRows.map(row=>{const share=externalTotal?Math.round((Number(row.minutes)||0)/externalTotal*100):0;return `<article class="data-category-row external"><div class="data-category-copy"><strong>${esc(row.name)}</strong><span>${number(row.streams)}회 · ${minutes(row.minutes)}</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,share)}%"></span></div><b>${share}%</b><small>외부 공개 방송시간 집계</small></article>`;}).join('')}</section>`:'';
    root.innerHTML=`${trackifyBlock}${externalBlock}<section class="data-measured-categories">${measured}</section>`;
  }

  function renderSessions'''
        text = replace_once(text, r"  function renderSoopCategories\(payload\) \{.*?\n  \}\n\n  function renderSessions", replacement, 'category renderer')
    path.write_text(text)

    css_path = Path('data.css')
    css = css_path.read_text()
    if '.data-chart-value' not in css:
        css += "\n.data-chart-value{fill:#f3e5d9;font-size:10px;font-weight:900;paint-order:stroke;stroke:#0b0b0b;stroke-width:4px;stroke-linejoin:round}.data-chart-tooltip{pointer-events:none}.data-chart-svg .zero-line{stroke:#6a4a37;stroke-dasharray:4 4}.data-chart-point{outline:none}.data-source-strip{grid-column:1/-1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:13px 15px;border:1px solid #292929;border-radius:16px;background:#0d0d0d}.data-source-strip>small{color:#777;font-size:10px;font-weight:900;margin-right:4px}.data-source-chip{display:inline-flex;align-items:center;padding:6px 9px;border:1px solid #3a3029;border-radius:999px;background:#17110e;color:#ffad78;font-size:9px;font-weight:900}.data-source-chip:hover{border-color:#ff6b18}.data-measurement-badge.source-trackify{border-color:#604528;background:#20160d}.data-measurement-badge.source-auro,.data-measurement-badge.source-softc{border-color:#39404c;background:#111720;color:#b7c9e7}.data-measurement-badge.source-streamscharts{border-color:#3f394d;background:#16121e;color:#cfc1e8}.data-external-reference.trackify{border-color:#6a4523;background:linear-gradient(155deg,#21150c,#0d0d0d)}@media(max-width:760px){.data-chart-value{font-size:9px}.data-source-strip{padding:11px}}\n"
        css_path.write_text(css)

    html_path = Path('data.html')
    html = html_path.read_text()
    old = '평균/최대 시청자는 약 5분 간격의 공개 시청자 수를 팬사이트가 측정해 계산합니다. 애청자·팬클럽 값이 공개 응답에서 안정적으로 확인되지 않는 시점에는 <b>측정 불가</b>로 표시합니다. 수집 시작 이전의 시청자·증감 데이터는 임의로 복원하지 않습니다.'
    if old in html:
        html = html.replace(old, '평균/최대 시청자는 팬사이트 5분 측정과 공개 통계 기록을 함께 사용합니다. SOOP 직접값이 없을 때는 Trackify·Auro·Softc·Streams Charts의 공개 통계를 보조 자료로 사용하며 각 값에 출처를 표시합니다. 수집 시작 이전 값을 특정 날짜에 임의 배분하지 않습니다.')
        html_path.write_text(html)


if __name__ == '__main__':
    patch_api()
    patch_ui()
    print('SOOP_DASHBOARD_PATCH_OK=1')
