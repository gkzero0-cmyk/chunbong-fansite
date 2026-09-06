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
  const state = { payload: null, platform: location.hash === '#youtube' ? 'youtube' : 'soop', soopView: 'daily', calendarMonth: '', refreshing: false };

  const SOURCE_URLS = {
    trackify: 'https://www.trackify.kr/soop/chunbongtv',
    auro: 'https://auro.live/creator/afreeca/chunbongtv',
    softc: 'https://viewership.softc.one/channel/afreeca/chunbongtv',
    streamscharts: 'https://streamscharts.com/channels/chunbongtv/streams?platform=afreecatv',
    soop: 'https://www.sooplive.com/station/chunbongtv'
  };

  function measurementBadge(kind) {
    const labels={viewer:'팬사이트 5분 측정',follower:'공개 스냅샷',fanclub:'공개 스냅샷',public:'공개 데이터',external:'외부 공개 기록','fan-site-sampled-5m':'팬사이트 5분 측정','external-public-record':'외부 공개 기록',trackify:'Trackify',auro:'Auro',softc:'Softc',streamscharts:'Streams Charts',soop:'SOOP 공개값'};
    return `<span class="data-measurement-badge source-${esc(kind||'public')}">${esc(labels[kind]||labels.public)}</span>`;
  }

  function sourceChip(source) {
    const key=String(source||'').toLowerCase(), labels={trackify:'Trackify',auro:'Auro',softc:'Softc',streamscharts:'Streams Charts',soop:'SOOP'}, url=SOURCE_URLS[key];
    return url ? `<a class="data-source-chip" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(labels[key]||source)} ↗</a>` : measurementBadge(source||'public');
  }

  function formatChartValue(value,kind='number') {
    if(!Number.isFinite(value)) return '—';
    if(kind==='minutes') {
      if(Math.abs(value)>=60) { const h=value/60; return `${Number.isInteger(h)?h:h.toFixed(1)}h`; }
      return `${Math.round(value)}m`;
    }
    if(kind==='signed') return `${value>0?'+':''}${new Intl.NumberFormat('ko-KR').format(value)}`;
    if(Math.abs(value)>=10000) return new Intl.NumberFormat('ko-KR',{notation:'compact',maximumFractionDigits:1}).format(value);
    return new Intl.NumberFormat('ko-KR').format(value);
  }

  function snapshotDeltaRows(trends=[],key) {
    let previous=null;
    return trends.map(row=>{
      const current=Number.isFinite(row?.soop?.[key])?row.soop[key]:null;
      const value=current!==null&&previous!==null?current-previous:null;
      if(current!==null) previous=current;
      return {date:row?.date||'',value};
    });
  }

  function latestYoutubeSnapshot(trends=[]) {
    for (let index=trends.length-1; index>=0; index-=1) {
      const youtube=trends[index]?.youtube;
      if (youtube && [youtube.subscriberCount,youtube.viewCount,youtube.videoCount].some(Number.isFinite)) return youtube;
    }
    return {};
  }

  function recentSortTime(item, now=Date.now()) {
    if (item?.dateIso) {
      const direct=Date.parse(item.dateIso);
      if (Number.isFinite(direct)) return direct;
    }
    const text=String(item?.date||'').trim();
    const direct=text.match(/(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/);
    if (direct) return Date.UTC(Number(direct[1]),Number(direct[2])-1,Number(direct[3]));
    const rules=[[/([0-9]+)\s*분\s*전/,60000],[/([0-9]+)\s*시간\s*전/,3600000],[/([0-9]+)\s*일\s*전/,86400000],[/([0-9]+)\s*주\s*전/,604800000],[/([0-9]+)\s*개월\s*전/,2592000000],[/([0-9]+)\s*년\s*전/,31536000000]];
    for (const [pattern,unit] of rules) { const match=text.match(pattern); if(match) return now-Number(match[1])*unit; }
    return 0;
  }

  function mergeYoutubeRecent(videos=[],shorts=[],limit=12) {
    const byId=new Map();
    for (const item of [...videos,...shorts]) {
      if (!item?.id) continue;
      const existing=byId.get(item.id);
      if (!existing) { byId.set(item.id,item); continue; }
      const shortKind=existing.kind==='shorts'||item.kind==='shorts';
      byId.set(item.id,{...existing,...item,kind:shortKind?'shorts':(item.kind||existing.kind),link:shortKind?`https://www.youtube.com/shorts/${item.id}`:(item.link||existing.link),dateIso:item.dateIso||existing.dateIso||'',date:item.date||existing.date||''});
    }
    return [...byId.values()].sort((a,b)=>recentSortTime(b)-recentSortTime(a)).slice(0,limit);
  }

  function kpi(label, value, desc, klass = '') {
    return `<article class="data-kpi ${klass}"><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${desc}</p></article>`;
  }

  function createSvgChart({ title, rows = [], key, labelKey = 'date', formatter = number, valueKind = 'number', empty = '측정 데이터가 아직 없습니다.' }) {
    const clean=rows.map(row=>({label:row?.[labelKey]||'',value:Number.isFinite(row?.[key])?row[key]:null})).filter(row=>row.label);
    const values=clean.map(row=>row.value).filter(Number.isFinite);
    if(!clean.length||!values.length) return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong></div><div class="data-empty">${esc(empty)}</div></article>`;
    const width=760,height=270,padLeft=48,padRight=28,padTop=50,padBottom=40,minValue=Math.min(0,...values),maxValue=Math.max(1,...values),span=Math.max(1,maxValue-minValue);
    const x=i=>clean.length===1?width/2:padLeft+i*((width-padLeft-padRight)/(clean.length-1));
    const y=v=>height-padBottom-((v-minValue)/span)*(height-padTop-padBottom);
    const points=clean.map((row,i)=>row.value===null?null:`${x(i).toFixed(1)},${y(row.value).toFixed(1)}`).filter(Boolean).join(' ');
    const labelStep=Math.max(1,Math.ceil(clean.length/10));
    const pointsAndValues=clean.map((row,i)=>{
      if(row.value===null) return '';
      const xx=x(i),yy=y(row.value),show=clean.length<=10||i%labelStep===0||i===clean.length-1;
      const tooltipValue=formatter(row.value);
      const cardX=Math.min(width-190,Math.max(8,xx-82));
      return `<g class="data-chart-point data-chart-hover" tabindex="0" aria-label="${esc(row.label)} ${esc(tooltipValue)}"><line class="data-chart-crosshair" x1="${xx.toFixed(1)}" y1="${padTop}" x2="${xx.toFixed(1)}" y2="${height-padBottom}"/><circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="5"/><title class="data-chart-tooltip">${esc(row.label)} · ${esc(tooltipValue)}</title><g class="data-chart-hover-card" transform="translate(${cardX.toFixed(1)} ${Math.max(8,yy-58).toFixed(1)})"><rect width="164" height="42" rx="9"/><text x="10" y="16">${esc(row.label)}</text><text class="value" x="10" y="33">${esc(tooltipValue)}</text></g>${show?`<text class="data-chart-value" x="${xx.toFixed(1)}" y="${Math.max(15,yy-11).toFixed(1)}" text-anchor="middle">${esc(formatChartValue(row.value,valueKind))}</text>`:''}</g>`;
    }).join('');
    const zeroY=y(0);
    const grid=[0,1,2,3,4].map(i=>{const yy=padTop+i*((height-padTop-padBottom)/4);return `<line x1="${padLeft}" y1="${yy}" x2="${width-padRight}" y2="${yy}"/>`;}).join('')+(minValue<0?`<line class="zero-line" x1="${padLeft}" y1="${zeroY}" x2="${width-padRight}" y2="${zeroY}"/>`:'');
    const xStep=Math.max(1,Math.ceil(clean.length/7));
    const labels=clean.map((row,i)=>i%xStep&&i!==clean.length-1?'':`<text x="${x(i).toFixed(1)}" y="${height-10}" text-anchor="middle">${esc(labelKey==='month'?String(row.label).slice(2):shortDate(row.label))}</text>`).join('');
    const latest=[...clean].reverse().find(row=>row.value!==null);
    return `<article class="data-chart-card"><div class="data-chart-head"><strong>${esc(title)}</strong><b>${latest?esc(formatter(latest.value)):'-'}</b></div><svg class="data-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><g class="chart-grid">${grid}</g><polyline class="chart-line" points="${points}"/><g class="chart-points">${pointsAndValues}</g><g class="chart-labels">${labels}</g></svg></article>`;
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
    const o=payload?.soop?.overview||{};
    const external=payload?.soop?.externalHistory?.currentFallback||{};
    const metricSources=payload?.soop?.live?.metricSources||o.externalFieldSources||{};
    const liveText=o.live===true?'LIVE':o.live===false?'OFFLINE':'확인 중';
    const liveDesc=o.live===true?`${esc(o.currentTitle||'현재 방송 중')} · ${esc(o.currentCategory||'카테고리 확인 중')}`:'현재 SOOP 방송 상태';
    const totalMinutes=Number.isFinite(o.totalAirtimeMinutes)?o.totalAirtimeMinutes:o.knownTotalMinutes;
    const totalSource=Number.isFinite(o.totalAirtimeMinutes)?(o.externalFieldSources?.totalAirtimeMinutes||'trackify'):'viewer';
    const cards=[
      kpi('SOOP STATUS',liveText,liveDesc,o.live===true?'live':''),
      kpi('현재 시청자',number(o.currentViewerCount),`${measurementBadge(metricSources.viewerCount||'viewer')} 현재 공개 동접`),
      kpi('오늘 방송시간',minutes(o.todayDurationMinutes),`${measurementBadge('viewer')} 방송 세션 기준`),
      kpi('이번 달 방송시간',minutes(o.monthDurationMinutes),`${measurementBadge(o.monthDurationSource||'viewer')} 월 누적`),
      kpi('전체 누적 방송시간',minutes(totalMinutes),`${measurementBadge(totalSource)} 확인 가능한 전체 기록`),
      kpi('월 평균 시청자',number(o.monthAverageViewers),`${measurementBadge(o.monthAverageViewerSource||'viewer')} 월 평균 동접`),
      kpi('월 최대 시청자',number(o.monthMaxViewers),`${measurementBadge(o.monthMaxViewerSource||'viewer')} 월 최고 동접`),
      kpi('애청자 · 즐겨찾기',number(o.followerCount),`${measurementBadge(metricSources.followerCount||o.externalFieldSources?.followerCount||'follower')} 월 증감 ${esc(signed(o.followerDelta))}`),
      kpi('팬클럽',number(o.fanclubCount),`${measurementBadge(metricSources.fanclubCount||o.externalFieldSources?.fanclubCount||'fanclub')} 월 증감 ${esc(signed(o.fanclubDelta))}`),
      kpi('SOOP 구독자',number(o.subscriberCount),`${measurementBadge(o.externalFieldSources?.subscriberCount||'trackify')} 공개 구독 수`),
      kpi('서포터',number(o.supporterCount),`${measurementBadge(o.externalFieldSources?.supporterCount||'trackify')} 공개 누적`),
      kpi('이번 달 고유 시청자',number(o.monthUniqueViewers),`${measurementBadge(o.externalFieldSources?.monthUniqueViewers||'trackify')} 월 누적 유저`),
      kpi('이번 달 뷰어십',Number.isFinite(o.viewershipHours)?`${number(o.viewershipHours)}시간`:'측정 불가',`${measurementBadge(o.externalFieldSources?.viewershipHours||'trackify')} 평균×방송시간`),
      kpi('누적 UP',number(o.cumulativeUpCount),`${measurementBadge(o.externalFieldSources?.cumulativeUpCount||'trackify')} 누적 UP수`),
      kpi('누적 유저',number(o.cumulativeUsers),`${measurementBadge(o.externalFieldSources?.cumulativeUsers||'trackify')} 공개 누적`),
      kpi('이번 달 별풍선',number(external.monthlyStarCount),`${measurementBadge(external.fieldSources?.monthlyStarCount||'trackify')} 월 공개 합계`,'data-kpi-secondary'),
      kpi('별풍선 시급',number(external.starsPerHour),`${measurementBadge(external.fieldSources?.starsPerHour||'trackify')} 별 / 방송시간`,'data-kpi-secondary'),
      kpi('이번 달 후원자',number(external.monthlySupporterCount),`${measurementBadge(external.fieldSources?.monthlySupporterCount||'trackify')} 월 공개 인원`,'data-kpi-secondary'),
      kpi('이번 달 채팅',number(external.monthlyChatCount),`${measurementBadge(external.fieldSources?.monthlyChatCount||'trackify')} 월 공개 합계`,'data-kpi-secondary'),
      kpi('이번 달 강퇴',Number.isFinite(external.monthlyKickCount)?`${number(external.monthlyKickCount)}건`:'측정 불가',`${measurementBadge(external.fieldSources?.monthlyKickCount||'trackify')} 집계 수치만 표시`,'data-kpi-secondary'),
      kpi('이번 달 채금',Number.isFinite(external.monthlyMuteCount)?`${number(external.monthlyMuteCount)}건`:'측정 불가',`${measurementBadge(external.fieldSources?.monthlyMuteCount||'trackify')} 집계 수치만 표시`,'data-kpi-secondary'),
      kpi('방송국 개설일',external.stationOpenedAt||'측정 불가',`${measurementBadge(external.fieldSources?.stationOpenedAt||'trackify')} 공개 프로필`,'data-kpi-secondary'),
      kpi('최근 방송일',external.latestBroadcastDate||'측정 불가',`${measurementBadge(external.fieldSources?.latestBroadcastDate||'trackify')} 공개 기록`,'data-kpi-secondary'),
      kpi('외부 30일 참고',`${number(payload?.soop?.externalHistory?.sourceSummary?.recent30DayAverageViewers)} / ${number(payload?.soop?.externalHistory?.sourceSummary?.recent30DayPeakViewers)}`,`${measurementBadge('streamscharts')} 평균 / 최대 참고값`)
    ];
    const available=new Set([...Object.values(o.externalFieldSources||{}),...Object.values(external.fieldSources||{})].filter(Boolean));
    const chips=['trackify','auro','softc','streamscharts'].filter(src=>available.has(src)||external?.sources?.some(item=>item.source===src)).map(sourceChip).join('');
    $('#data-soop-overview').innerHTML=cards.join('')+(chips?`<div class="data-source-strip"><small>보조 공개 데이터</small>${chips}</div>`:'');
  }

  function renderDetailTable(root, rows, monthly = false) {
    const el = $(root);
    if (!rows?.length) { el.innerHTML = '<div class="data-empty">측정된 방송 데이터가 아직 없습니다.</div>'; return; }
    el.innerHTML = `<div class="data-detail-row data-detail-header"><span>${monthly ? '월' : '날짜'}</span><span>방송</span><span>방송시간</span><span>평균</span><span>최대</span><span>애청자</span><span>팬클럽</span></div>${rows.slice().reverse().slice(0,24).map(row=>`<div class="data-detail-row"><strong>${esc(monthly?row.month:row.date)}</strong><span>${number(row.streamCount)}회</span><span>${minutes(row.durationMinutes)}</span><span>${number(row.averageViewers)}</span><span>${number(row.maxViewers)}</span><span class="${Number(row.followerDelta)>0?'positive':Number(row.followerDelta)<0?'negative':''}">${signed(row.followerDelta)}</span><span class="${Number(row.fanclubDelta)>0?'positive':Number(row.fanclubDelta)<0?'negative':''}">${signed(row.fanclubDelta)}</span></div>`).join('')}`;
  }

  function renderSoopCharts(payload) {
    const daily=payload?.soop?.daily||[],monthly=payload?.soop?.monthlyStats||[],trends=payload?.trends||[];
    const favoriteDelta=snapshotDeltaRows(trends,'followerCount'),fanclubDelta=snapshotDeltaRows(trends,'fanclubCount');
    $('#data-soop-chart').innerHTML=[
      createSvgChart({title:'일별 방송시간',rows:daily,key:'durationMinutes',formatter:minutes,valueKind:'minutes'}),
      createSvgChart({title:'누적 방송시간',rows:daily,key:'cumulativeMinutes',formatter:minutes,valueKind:'minutes'}),
      createSvgChart({title:'일별 평균 시청자',rows:daily,key:'averageViewers'}),
      createSvgChart({title:'일별 최대 시청자',rows:daily,key:'maxViewers'}),
      createSvgChart({title:'애청자 · 즐겨찾기 증감',rows:favoriteDelta,key:'value',formatter:signed,valueKind:'signed',empty:'일일 즐겨찾기 스냅샷이 2일 이상 쌓이면 표시합니다.'}),
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
    renderDetailTable('#data-soop-monthly-table',monthly,true);
  }

  function renderCalendarDetail(row) {
    const root=$('#data-soop-calendar-detail');
    if(!row){root.innerHTML='<div class="data-empty">방송한 날짜를 선택하면 상세 기록을 보여줍니다.</div>';return;}
    const sessions=Array.isArray(row.sessions)?row.sessions:[];
    root.innerHTML=`<small>${esc(row.date)}</small><h3>${number(row.streamCount)}회 방송 · ${esc(minutes(row.durationMinutes))}</h3><div class="data-calendar-stats"><span>평균 <b>${number(row.averageViewers)}</b></span><span>최대 <b>${number(row.maxViewers)}</b></span><span>애청자 <b>${signed(row.followerDelta)}</b></span><span>팬클럽 <b>${signed(row.fanclubDelta)}</b></span></div>${sessions.map(session=>`<article class="data-calendar-session"><strong>${esc(session.title||'춘봉 방송')}</strong><span>${esc(minutes(session.durationMinutes))} · 평균 ${number(session.averageViewers)} · 최대 ${number(session.maxViewers)}</span></article>`).join('')}`;
  }

  function renderSoopCalendar(payload) {
    const rows=payload?.soop?.calendar||[],map=new Map(rows.map(row=>[row.date,row]));
    if(!state.calendarMonth) state.calendarMonth=(rows.at(-1)?.date||new Date().toISOString().slice(0,10)).slice(0,7);
    const [year,month]=state.calendarMonth.split('-').map(Number);
    $('#data-calendar-month').textContent=`${year}년 ${month}월`;
    const first=new Date(Date.UTC(year,month-1,1)),lastDay=new Date(Date.UTC(year,month,0)).getUTCDate(),startWeekday=first.getUTCDay(),cells=[];
    for(let i=0;i<startWeekday;i+=1) cells.push('<span class="data-calendar-day is-empty"></span>');
    for(let day=1;day<=lastDay;day+=1){
      const key=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,row=map.get(key);
      cells.push(`<button class="data-calendar-day ${row?'has-stream':''}" type="button" data-calendar-date="${key}" ${row?'':'disabled'}><b>${day}</b>${row?`<span>${minutes(row.durationMinutes)}</span><small>평균 ${number(row.averageViewers)}</small>`:'<span>—</span>'}</button>`);
    }
    while(cells.length%7) cells.push('<span class="data-calendar-day is-empty"></span>');
    $('#data-soop-calendar').innerHTML=cells.join('');
    $$('[data-calendar-date]').forEach(button=>button.addEventListener('click',()=>renderCalendarDetail(map.get(button.dataset.calendarDate))));
    renderCalendarDetail(rows.find(row=>row.date?.startsWith(`${state.calendarMonth}-`))||null);
  }

  function renderSoopCategories(payload) {
    const rows=payload?.soop?.categories||[],o=payload?.soop?.overview||{},trackifyRows=Array.isArray(o.currentMonthCategories)?o.currentMonthCategories:[];
    const currentFallback=payload?.soop?.externalHistory?.currentFallback||{},rankings=Array.isArray(currentFallback.categoryRankings)?currentFallback.categoryRankings:[];
    const external=payload?.soop?.externalHistory?.categoryReference,root=$('#data-soop-categories');
    const rankingBlock=rankings.length?`<section class="data-external-reference trackify"><div class="data-external-reference-head"><div><strong>Trackify 카테고리 순위</strong><small>${measurementBadge('trackify')} 공개 순위 · 후원자 순위 제외</small></div>${sourceChip('trackify')}</div><ol class="data-rank-list">${rankings.map(row=>`<li><strong>${esc(row.name||'카테고리')}</strong><b>${number(row.rank)}위</b><span>${row.new?'NEW':Number.isFinite(row.change)?signed(row.change):'변동 없음'}</span></li>`).join('')}</ol></section>`:'';
    const trackifyBlock=trackifyRows.length?`<section class="data-external-reference trackify"><div class="data-external-reference-head"><div><strong>이번 달 카테고리 분포</strong><small>${measurementBadge('trackify')} 현재 월 공개 집계</small></div>${sourceChip('trackify')}</div>${trackifyRows.map(row=>`<article class="data-category-row external"><div class="data-category-copy"><strong>${esc(row.name||'미분류')}</strong><span>이번 달 방송 비중</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,Number(row.sharePercent)||0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>Trackify 월간 분포</small></article>`).join('')}</section>`:'';
    const measured=rows.length?rows.slice(0,20).map(row=>`<article class="data-category-row"><div class="data-category-copy"><strong>${esc(row.name||'미분류')}</strong><span>${number(row.streamCount)}회 · ${minutes(row.minutes)}</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,Number(row.sharePercent)||0)}%"></span></div><b>${number(row.sharePercent)}%</b><small>평균 ${number(row.averageViewers)} · 최대 ${number(row.maxViewers)}</small></article>`).join(''):'<div class="data-empty">팬사이트 실측 카테고리 데이터는 수집 시작일부터 누적됩니다.</div>';
    const externalRows=Array.isArray(external?.categories)?external.categories:[],externalTotal=externalRows.reduce((sum,row)=>sum+(Number(row.minutes)||0),0);
    const externalBlock=externalRows.length?`<section class="data-external-reference"><div class="data-external-reference-head"><div><strong>과거 카테고리 참고</strong><small>${measurementBadge('streamscharts')} 공개 방송시간 집계</small></div><a href="${esc(external.url||SOURCE_URLS.streamscharts)}" target="_blank" rel="noreferrer">출처 ↗</a></div>${externalRows.map(row=>{const share=externalTotal?Math.round((Number(row.minutes)||0)/externalTotal*100):0;return `<article class="data-category-row external"><div class="data-category-copy"><strong>${esc(row.name)}</strong><span>${number(row.streams)}회 · ${minutes(row.minutes)}</span></div><div class="data-category-bar"><span style="--share:${Math.max(1,share)}%"></span></div><b>${share}%</b><small>외부 공개 방송시간 집계</small></article>`;}).join('')}</section>`:'';
    root.innerHTML=`${rankingBlock}${trackifyBlock}${externalBlock}<section class="data-measured-categories">${measured}</section>`;
  }

  function renderSessions(payload) {
    const rows=payload?.soop?.recentSessions||[],root=$('#data-soop-sessions');
    if(!rows.length){root.innerHTML='<div class="data-empty">실측 방송 세션이 쌓이면 방송별 평균·최대 시청자를 표시합니다.</div>';return;}
    root.innerHTML=rows.map(row=>{const badge=row.measurement==='external-public-record'?measurementBadge('external'):measurementBadge('viewer');return `<article class="data-session-card"><div><small>${esc(row.date||'')} · ${badge}</small><strong>${esc(row.title||'춘봉 방송')}</strong></div><div class="data-session-metrics"><span>방송 <b>${minutes(row.durationMinutes)}</b></span><span>평균 <b>${number(row.averageViewers)}</b></span><span>최대 <b>${number(row.maxViewers)}</b></span><span>애청자 <b>${signed(row.followerDelta)}</b></span><span>팬클럽 <b>${signed(row.fanclubDelta)}</b></span></div></article>`;}).join('');
  }

  function topPanel(title,items) {
    const rows=items||[];
    return `<section class="data-top-panel"><h3>${esc(title)}</h3>${rows.length?`<ol class="data-top-list">${rows.map((item,index)=>`<li><span class="data-top-rank">${index+1}</span><a class="data-top-copy" href="${esc(item.link||'#')}" target="_blank" rel="noreferrer"><strong>${esc(item.title||'제목 없음')}</strong><small>${esc(item.date||item.kind||'')}</small></a><b>${esc(viewText(item))}</b></li>`).join('')}</ol>`:'<div class="data-empty">조회수 데이터를 확인할 수 있는 콘텐츠가 없습니다.</div>'}</section>`;
  }

  function renderYoutubePanel(payload) {
    const channel=payload?.youtube?.channel||{},monthly=payload?.youtube?.monthly||{},trends=payload?.trends||[],snapshot=latestYoutubeSnapshot(trends);
    const subscriberCount=Number.isFinite(channel.subscriberCount)?channel.subscriberCount:snapshot.subscriberCount;
    const viewCount=Number.isFinite(channel.viewCount)?channel.viewCount:snapshot.viewCount;
    const videoCount=Number.isFinite(channel.videoCount)?channel.videoCount:snapshot.videoCount;
    $('#data-youtube-overview').innerHTML=[
      kpi('구독자',number(subscriberCount),`${measurementBadge('public')} ${esc(channel.subscriberText||'최신 공개 스냅샷 보완')}`,'youtube'),
      kpi('총 조회수',number(viewCount),`${measurementBadge('public')} ${esc(channel.viewText||'최신 공개 스냅샷 보완')}`,'youtube'),
      kpi('공개 영상',number(videoCount),`${measurementBadge('public')} ${esc(channel.videoText||'최신 공개 스냅샷 보완')}`,'youtube'),
      kpi('이번 달 업로드',`${number(monthly.uploadCount)}개`,'영상 · Shorts 통합 기준','youtube')
    ].join('');
    const projected=trends.map(row=>({date:row.date,subscriberCount:row?.youtube?.subscriberCount,viewCount:row?.youtube?.viewCount}));
    $('#data-youtube-trend').innerHTML=[
      createSvgChart({title:'구독자 변화',rows:projected,key:'subscriberCount',formatter:number,empty:'구독자 일일 스냅샷이 쌓이면 표시합니다.'}),
      createSvgChart({title:'총 조회수 변화',rows:projected,key:'viewCount',formatter:number,empty:'총 조회수 스냅샷이 쌓이면 표시합니다.'})
    ].join('');
    $('#data-youtube-top').innerHTML=topPanel('YouTube TOP',payload?.topContent?.youtube);
    const recent=mergeYoutubeRecent(payload?.youtube?.recentVideos||[],payload?.youtube?.recentShorts||[],12);
    $('#data-youtube-recent').innerHTML=recent.length?recent.map(item=>`<a class="data-recent-card" href="${esc(item.link||'#')}" target="_blank" rel="noreferrer"><small>YOUTUBE · ${item.kind==='shorts'?'SHORTS':'VIDEO'} · ${esc(item.date||'최근')}</small><strong>${esc(item.title||'제목 없음')}</strong><span>${esc(viewText(item))} ↗</span></a>`).join(''):'<div class="data-empty">최근 YouTube 콘텐츠를 불러오지 못했습니다.</div>';
  }

  function selectPlatform(platform,updateHash=true) {
    state.platform=platform==='youtube'?'youtube':'soop';
    $$('[data-platform-tab]').forEach(button=>{const active=button.dataset.platformTab===state.platform;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
    $$('[data-platform-panel]').forEach(panel=>{panel.hidden=panel.dataset.platformPanel!==state.platform;});
    if(updateHash) location.hash=state.platform==='youtube'?'#youtube':'#soop';
  }

  function selectSoopView(view) {
    state.soopView=['daily','monthly','calendar'].includes(view)?view:'daily';
    $$('[data-soop-view-tab]').forEach(button=>{const active=button.dataset.soopViewTab===state.soopView;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
    $$('[data-soop-view]').forEach(panel=>{const active=panel.dataset.soopView===state.soopView;panel.classList.toggle('is-active',active);panel.hidden=!active;});
  }

  function shiftCalendar(delta) {
    const [year,month]=(state.calendarMonth||new Date().toISOString().slice(0,7)).split('-').map(Number),date=new Date(Date.UTC(year,month-1+delta,1));
    state.calendarMonth=`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
    if(state.payload) renderSoopCalendar(state.payload);
  }

  function render(payload) {
    state.payload=payload;
    renderStatus(payload);
    renderSoopOverview(payload);
    renderSoopCharts(payload);
    renderSoopCalendar(payload);
    renderSoopCategories(payload);
    renderSessions(payload);
    renderYoutubePanel(payload);
    selectPlatform(state.platform,false);
    selectSoopView(state.soopView);
  }

  function setRetryState(mode) {
    const button=$('#data-retry');
    if(!button) return;
    button.classList.toggle('data-retry-loading',mode==='loading');
    button.disabled=mode==='loading';
    button.textContent=mode==='loading'?'갱신 중…':mode==='success'?'갱신 완료':mode==='error'?'다시 시도':'새로고침';
    if(mode==='success') setTimeout(()=>{if(!state.refreshing) button.textContent='새로고침';},1200);
  }

  async function refresh({force=false}={}) {
    if(force&&state.refreshing) return;
    if(force){state.refreshing=true;setRetryState('loading');}
    const url=force?`${API}&refresh=1&_ts=${Date.now()}`:API;
    try {
      const response=await fetch(url,force?{headers:{accept:'application/json'},cache:'no-store'}:{headers:{accept:'application/json'}});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      render(await response.json());
      if(force) setRetryState('success');
    } catch(error) {
      const root=$('#data-status');
      root.classList.remove('ready','partial');root.classList.add('error');
      root.querySelector('strong').textContent='춘봉 데이터를 불러오지 못했습니다.';
      $('#data-updated').textContent=error?.message||'네트워크 오류';
      if(force) setRetryState('error');
    } finally {
      if(force){state.refreshing=false;const button=$('#data-retry');if(button)button.disabled=false;}
    }
  }

  $$('[data-platform-tab]').forEach(button=>button.addEventListener('click',()=>selectPlatform(button.dataset.platformTab)));
  $$('[data-soop-view-tab]').forEach(button=>button.addEventListener('click',()=>selectSoopView(button.dataset.soopViewTab)));
  $('#data-calendar-prev')?.addEventListener('click',()=>shiftCalendar(-1));
  $('#data-calendar-next')?.addEventListener('click',()=>shiftCalendar(1));
  $('#data-retry')?.addEventListener('click',()=>refresh({force:true}));
  window.addEventListener('hashchange',()=>selectPlatform(location.hash==='#youtube'?'youtube':'soop',false));
  selectPlatform(state.platform,false);
  refresh();
  setInterval(()=>{if(!document.hidden)refresh();},REFRESH_MS);
})();