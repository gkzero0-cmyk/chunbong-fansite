(() => {
  'use strict';

  const SOURCE_URL='https://www.sooplive.com/station/chunbongtv/post/202862381';
  const root=document.getElementById('history-content');
  const status=document.getElementById('history-sync-status');
  const guide=document.querySelector('[data-history-guide]');
  const viewButtons=[...document.querySelectorAll('[data-history-view]')];
  const viewTitle=document.querySelector('[data-history-view-title]');
  const viewDesc=document.querySelector('[data-history-view-desc]');
  const fallback=[...(Array.isArray(window.CHUNBONG_HISTORY_RECORDS)?window.CHUNBONG_HISTORY_RECORDS:[])];

  let currentView=location.hash.startsWith('#history-')
    ?'detail'
    :(localStorage.getItem('chunbong-history-view')==='detail'?'detail':'simple');
  let liveAnnual=[];
  let liveReady=false;
  let liveFetchedAt='';
  let simpleYear='all';
  let detailYear='all';
  let detailKind='all';
  let detailQuery='';
  let detailFiltersOpen=false;
  let simpleScrollY=0;
  let searchTimer=0;
  const monthOpenState=new Map();
  const monthlyCache=new Map();
  const monthLoading=new Map();
  const searchBundleLoadedYears=new Set();

  const kindOrder=['마인크래프트','주최','타로','대회','방송','게임','콘텐츠'];
  const CONTENT_LINK_RULES=[
    {test:/적자생존/,id:'justserver-survival'},
    {test:/머니게임/,id:'justserver-moneygame'},
    {test:/춘타클/,id:'chuntacle-2026'},
    {test:/레오펠/,id:'leopel'}
  ];

  const esc=(value='')=>String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function normalizeLabel(value=''){
    return String(value).toLowerCase().replace(/[\s:·<>\-_.]/g,'');
  }

  function stableHash(value=''){
    let hash=2166136261;
    for(const ch of String(value)){
      hash^=ch.codePointAt(0);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  function recordId(row={}){
    return `history-${String(row.start||'date')}-${stableHash(`${row.start||''}|${row.end||''}|${row.label||''}`)}`;
  }

  function contentHref(row={}){
    const label=String(row.label||'');
    if(/싸이감성/.test(label)) return row.start==='2024-05-19'?'/contents/psy-emotion-song-contest-1':'/contents/psy-emotion-song-contest-2';
    if(/^그냥서버(?:\s*:)?\s*$/.test(label)||(/그냥서버/.test(label)&&!/머니게임|적자생존/.test(label))) return '/contents/justserver-diamond';
    const rule=CONTENT_LINK_RULES.find(item=>item.test.test(label));
    return rule?`/contents/${rule.id}`:'';
  }

  function calendarHref(row={}){
    const date=String(row.start||'').slice(0,10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date)?`data.html?view=calendar&date=${encodeURIComponent(date)}#soop`:'';
  }

  function monthCacheKey(year,month){
    return `${Number(year)}-${String(Number(month)).padStart(2,'0')}`;
  }

  function allMonthItems(){
    return [...monthlyCache.values()].flat();
  }

  function inferKind(label=''){
    const text=String(label);
    if(/타로|사주|신점/.test(text)) return '타로';
    if(/대회|F1|CK|와튜버|랜드|스모오라|크루대전/.test(text)) return '대회';
    if(/GTA|배그|오버워치|옵치|WOW|스트리트 파이터|아르마|파블로프|언레일드|경찰과 도둑/.test(text)) return '게임';
    if(/노래자랑|설명회|사자컴퍼니 결성|춘동아리 결성|서버개발/.test(text)) return '주최';
    if(/입사|구독플러스|SOOP 스트리머 대상|크루 리빌딩|사자회 해체/.test(text)) return '방송';
    if(/서버|마병대|레오펠|퍼켓몬|해초마을|맹든링|픽크타|담월드|오함마|수미랜드|원블럭|다이아/.test(text)) return '마인크래프트';
    return '콘텐츠';
  }

  function isPreparation(label=''){
    return /설명회|1차 입주자 발표|\b모집\b|신청|면접|지원 영상|신청자 살펴보기|추가 운영자 모집/.test(String(label))
      && !/패러블 입사 발표/.test(String(label));
  }

  function isMajorSheetEvent(item={}){
    const text=String(item.label||'');
    if(isPreparation(text)) return false;
    if(item.end&&item.end!==item.start) return true;
    return /서버|월드|마병대|레오펠|퍼켓몬|맹든링|픽크타|대회|F1|입사|결성|해체|대상|구독플러스|노래자랑|크루 리빌딩|춘타클/.test(text);
  }

  function isFeatured(label=''){
    return /레오펠|패러블 입사|결성|마병대|SOOP 스트리머 대상|홍창의 숲|그냥서버|싸이감성 노래자랑|사자회 해체/.test(String(label))
      && !/설명회|입주자 발표|모집/.test(String(label));
  }

  function currentKstDate(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const pick=type=>parts.find(part=>part.type===type)?.value||'';
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  }

  function enrichSheetRecord(item){
    const label=String(item.label||'').trim();
    const today=currentKstDate();
    let state;
    if(item.start>today) state='예정';
    else if(item.end&&item.start<=today&&item.end>=today) state='진행';
    return {
      ...item,
      label,
      kind:inferKind(label),
      major:isMajorSheetEvent({...item,label}),
      featured:isFeatured(label),
      ...(state?{status:state}:{}),
      sources:['google-sheet'],
      sheet:true
    };
  }

  function supplementalRecords(){
    const keep=[
      'SOOP 핫터뷰 인터뷰 공개',
      '춘타클(춘봉 타로 클래스) 시작',
      '춘타클 제5회 · 마지막 수업',
      '마병대4 간부 최종 합격'
    ];
    return fallback
      .filter(row=>String(row.start||'')>='2025-01-01'&&keep.includes(row.label))
      .map(row=>({...row,supplemental:true}));
  }

  function dedupe(rows){
    const result=[];const seen=new Set();
    for(const row of rows){
      const key=[row.start,row.end||'',normalizeLabel(row.label)].join('|');
      if(seen.has(key)) continue;
      seen.add(key);
      result.push(row);
    }
    return result;
  }

  function records(){
    const rows=liveReady
      ?[
        ...fallback.filter(row=>String(row.start||'')<'2025-01-01'),
        ...liveAnnual,
        ...supplementalRecords()
      ]
      :[...fallback];

    return dedupe(rows)
      .filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(String(row?.start||'')))
      .map(row=>({...row,kind:row.kind||inferKind(row.label)}))
      .sort((a,b)=>String(b.start).localeCompare(String(a.start))||String(b.end||'').localeCompare(String(a.end||'')));
  }

  function fmt(value=''){
    const [y,m,d]=String(value).split('-');
    if(!y||!m||!d) return String(value||'');
    return `${y}. ${Number(m)}. ${Number(d)}`;
  }

  function compactDate(record={}){
    const start=String(record.start||'').split('-');
    const end=String(record.end||'').split('-');
    if(start.length<3) return displayDate(record);
    const startShort=`${start[1]}.${start[2]}`;
    if(!record.end||record.end===record.start) return startShort;
    if(end.length<3) return startShort;
    if(start[0]===end[0]) return `${startShort} ~ ${end[1]}.${end[2]}`;
    return `${startShort} ~ ${end[0]}.${end[1]}.${end[2]}`;
  }

  function displayDate(record={}){
    if(record.dateLabel) return String(record.dateLabel);
    if(record.status==='진행'&&!record.end) return `${fmt(record.start)} ~ 현재`;
    if(!record.end||record.end===record.start) return fmt(record.start);
    const [sy]=record.start.split('-');
    const [ey,em,ed]=record.end.split('-');
    return sy===ey
      ?`${fmt(record.start)} ~ ${Number(em)}. ${Number(ed)}`
      :`${fmt(record.start)} ~ ${fmt(record.end)}`;
  }

  function statusBadge(record={}){
    if(record.status==='예정') return '<span class="history-state is-planned">예정</span>';
    if(record.status==='진행') return '<span class="history-state is-live">진행 중</span>';
    return '';
  }

  function sourceBadges(record={}){
    const sources=Array.isArray(record.sources)?record.sources:[];
    return sources.length>=2?'<span class="history-verified">교차 확인</span>':'';
  }

  function yearSource(){
    return '';
  }

  function detailWindow(row={}){
    const label=String(row.label||'');
    if(/마병대\s*4|마병대4/.test(label)) return {start:'2026-09-07',end:row.end||row.start};
    if(/적자생존/.test(label)) return {start:'2026-09-12',end:row.end||row.start};
    return {start:row.start,end:row.end||row.start};
  }

  function inRange(date,row){
    if(!date||!row.start) return false;
    const window=detailWindow(row);
    return date>=window.start&&date<=window.end;
  }

  function detailTerms(row={}){
    const label=String(row.label||'');
    if(/하요리/.test(label)) return ['하요리'];
    if(/마병대\s*4|마병대4/.test(label)) return ['마병대','행정관'];
    if(/적자생존/.test(label)) return ['그냥서버','적자생존'];
    if(/춘타클/.test(label)) return ['춘타클'];
    if(/레오펠/.test(label)) return ['레오펠'];
    if(/머니게임/.test(label)) return ['머니게임','그냥서버'];
    return [];
  }

  function subEvents(row={}){
    const terms=detailTerms(row);
    if(!terms.length) return [];
    return allMonthItems()
      .filter(item=>inRange(item.date,row)&&terms.some(term=>String(item.label||'').includes(term)))
      .filter((item,index,array)=>array.findIndex(other=>other.date===item.date&&other.end===item.end&&other.label===item.label)===index)
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function monthsInWindow(row={}){
    const window=detailWindow(row);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(window.start)||!/^\d{4}-\d{2}-\d{2}$/.test(window.end)) return [];
    const [sy,sm]=window.start.split('-').map(Number);
    const [ey,em]=window.end.split('-').map(Number);
    const result=[];
    let year=sy,month=sm,guard=0;
    while((year<ey||(year===ey&&month<=em))&&guard<24){
      result.push({year,month,key:monthCacheKey(year,month)});
      month+=1;if(month===13){month=1;year+=1;}guard+=1;
    }
    return result;
  }

  function rowMonthsLoaded(row={}){
    const months=monthsInWindow(row);
    return months.length>0&&months.every(month=>monthlyCache.has(month.key));
  }

  function simpleRows(){
    return records().filter(row=>{
      const year=Number(String(row.start).slice(0,4));
      if(year<2025) return !row.detailOnly;
      return !row.detailOnly&&(row.major||row.featured||row.supplemental||row.status==='예정');
    });
  }

  function groupByYear(rows){
    return rows.reduce((acc,row)=>{
      const year=String(row.start).slice(0,4);
      (acc[year]||=[]).push(row);
      return acc;
    },{});
  }

  function groupByMonth(rows){
    return rows.reduce((acc,row)=>{
      const month=String(row.start).slice(5,7);
      (acc[month]||=[]).push(row);
      return acc;
    },{});
  }

  function renderYearFilters(years,scope,selected){
    return `<div class="history-year-filters ${scope==='detail'?'is-detail':''}" data-year-filter-scope="${scope}" aria-label="연도 필터">
      <button type="button" class="${selected==='all'?'is-active':''}" data-history-year="all">전체</button>
      ${years.map(year=>`<button type="button" class="${selected===year?'is-active':''}" data-history-year="${year}">${year}</button>`).join('')}
    </div>`;
  }

  function renderKindFilters(rows){
    const available=kindOrder.filter(kind=>rows.some(row=>row.kind===kind));
    return `<div class="history-kind-filters" aria-label="콘텐츠 유형 필터">
      <button type="button" class="${detailKind==='all'?'is-active':''}" data-history-kind="all">전체</button>
      ${available.map(kind=>`<button type="button" class="${detailKind===kind?'is-active':''}" data-history-kind="${esc(kind)}">${esc(kind)}</button>`).join('')}
    </div>`;
  }

  function bindYearFilters(scope,onSelect){
    root.querySelectorAll(`[data-year-filter-scope="${scope}"] [data-history-year]`).forEach(button=>{
      button.addEventListener('click',()=>onSelect(button.dataset.historyYear||'all'));
    });
  }

  function openDetailRecord(id){
    currentView='detail';
    localStorage.setItem('chunbong-history-view','detail');
    history.replaceState(null,'',`#${id}`);
    render();
    requestAnimationFrame(()=>scrollToRecord(id,true));
  }

  function bindSimpleRows(){
    root.querySelectorAll('[data-open-record]').forEach(row=>{
      const open=()=>openDetailRecord(row.dataset.openRecord);
      row.addEventListener('click',open);
      row.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}
      });
    });
  }

  function renderSimple(){
    const rows=simpleRows();
    const groups=groupByYear(rows);
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
    if(!rows.length){
      root.innerHTML='<div class="history-simple-empty"><strong>표시할 방송 이력이 없습니다.</strong><p>검증된 기록을 준비하고 있습니다.</p></div>';
      return;
    }

    root.innerHTML=`<section class="history-simple" aria-label="간단 방송 이력">
      <div class="history-simple-note"><strong>핵심 이력만 보기</strong><span>2025년 이후는 <b>Google Sheet ‘춘봉 다시보기’</b> 날짜·기간을 우선하고 준비 과정은 상세 보기로 분리합니다. 행을 누르면 같은 기록의 상세 위치로 이동합니다.</span></div>
      ${renderYearFilters(years,'simple',simpleYear)}
      <div class="history-simple-list">
        ${years.map(year=>`<section class="history-simple-year-section" data-simple-year="${year}" ${simpleYear!=='all'&&simpleYear!==year?'hidden':''}>
          <header class="history-simple-year-head"><div><strong>${year}</strong><span>${groups[year].length}개 핵심 이력</span></div>${yearSource(year)}</header>
          <div class="history-simple-table-head" aria-hidden="true"><span>날짜 / 기간</span><span>내용</span></div>
          <div class="history-simple-year-list">
            ${groups[year].map(row=>{
              const id=recordId(row);
              return `<article class="history-simple-row ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" tabindex="0" role="link" data-open-record="${id}" aria-label="${esc(row.label)} 상세 기록 보기">
                <time class="history-simple-date" datetime="${esc(row.start)}">${esc(compactDate(row))}</time>
                <p class="history-simple-content"><span>${esc(row.label)}</span>${statusBadge(row)}<span class="history-row-arrow" aria-hidden="true">→</span></p>
              </article>`;
            }).join('')}
          </div>
        </section>`).join('')}
      </div>
      <footer class="history-simple-foot"><span>${liveReady?'Google Sheet 자동 갱신':'검증 스냅샷 기준'} · 핵심 이력 ${rows.length}개</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 전체 보기 →</button></footer>
    </section>`;

    root.querySelector('[data-open-detail]')?.addEventListener('click',()=>setView('detail'));
    bindSimpleRows();
    bindYearFilters('simple',year=>{
      simpleYear=year;
      root.querySelectorAll('[data-year-filter-scope="simple"] [data-history-year]').forEach(button=>button.classList.toggle('is-active',button.dataset.historyYear===year));
      root.querySelectorAll('[data-simple-year]').forEach(section=>{section.hidden=year!=='all'&&section.dataset.simpleYear!==year;});
    });
  }

  function detailSearchText(row){
    const children=subEvents(row);
    return [row.label,row.kind,row.detail,row.start,row.end,...children.map(item=>item.label)]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function highlightHtml(value='',query=''){
    const source=String(value);
    const needle=String(query).trim();
    if(!needle) return esc(source);
    const lower=source.toLowerCase();
    const target=needle.toLowerCase();
    let cursor=0;
    let html='';
    while(true){
      const index=lower.indexOf(target,cursor);
      if(index<0){html+=esc(source.slice(cursor));break;}
      html+=esc(source.slice(cursor,index));
      html+=`<mark>${esc(source.slice(index,index+needle.length))}</mark>`;
      cursor=index+needle.length;
    }
    return html;
  }

  function applyHighlights(){
    const query=detailQuery.trim();
    root.querySelectorAll('[data-highlight]').forEach(node=>{
      node.innerHTML=highlightHtml(node.dataset.raw||'',query);
    });
  }

  function applyDetailFilters(){
    const query=detailQuery.trim().toLowerCase();
    const filtering=detailYear!=='all'||detailKind!=='all'||Boolean(query);
    let visibleCount=0;

    root.querySelectorAll('[data-history-detail-item]').forEach(item=>{
      const yearMatch=detailYear==='all'||item.dataset.year===detailYear;
      const kindMatch=detailKind==='all'||item.dataset.kind===detailKind;
      const textMatch=!query||String(item.dataset.search||'').includes(query);
      const visible=yearMatch&&kindMatch&&textMatch;
      item.hidden=!visible;
      if(visible) visibleCount+=1;
    });

    root.querySelectorAll('[data-history-month-block]').forEach(block=>{
      const visibleItems=[...block.querySelectorAll('[data-history-detail-item]')].filter(item=>!item.hidden);
      block.hidden=visibleItems.length===0;
      if(filtering&&visibleItems.length) block.open=true;
      else if(!filtering&&monthOpenState.has(block.dataset.monthKey)) block.open=monthOpenState.get(block.dataset.monthKey);
    });

    root.querySelectorAll('[data-history-year-block]').forEach(block=>{
      block.hidden=![...block.querySelectorAll('[data-history-month-block]')].some(month=>!month.hidden);
    });

    root.querySelectorAll('[data-year-filter-scope="detail"] [data-history-year]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.historyYear===detailYear);
    });
    root.querySelectorAll('[data-history-kind]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.historyKind===detailKind);
    });

    const count=root.querySelector('[data-history-results-count]');
    if(count) count.textContent=`${visibleCount}개 기록`;
    const empty=root.querySelector('[data-history-search-empty]');
    if(empty) empty.hidden=visibleCount!==0;

    applyHighlights();
  }

  function copyRecordLink(id,button){
    const url=new URL(location.href);
    url.hash=id;
    const done=()=>{
      const previous=button.textContent;
      button.textContent='복사됨';
      button.classList.add('is-copied');
      setTimeout(()=>{button.textContent=previous;button.classList.remove('is-copied');},1200);
    };
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(url.toString()).then(done).catch(()=>{location.hash=id;});
    }else{
      location.hash=id;
    }
  }

  function bindDetailControls(){
    const input=root.querySelector('[data-history-search]');
    const clear=root.querySelector('[data-history-search-clear]');

    if(input){
      input.value=detailQuery;
      input.addEventListener('input',()=>{
        detailQuery=input.value;
        applyDetailFilters();
      });
      input.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&input.value){
          detailQuery='';
          input.value='';
          applyDetailFilters();
          input.focus();
        }
      });
    }

    clear?.addEventListener('click',()=>{
      detailQuery='';
      if(input){input.value='';input.focus();}
      applyDetailFilters();
    });

    bindYearFilters('detail',year=>{
      detailYear=year;
      applyDetailFilters();
    });

    root.querySelectorAll('[data-history-kind]').forEach(button=>{
      button.addEventListener('click',()=>{
        detailKind=button.dataset.historyKind||'all';
        applyDetailFilters();
      });
    });

    root.querySelectorAll('[data-history-month-block]').forEach(block=>{
      block.addEventListener('toggle',()=>{
        if(!detailQuery&&detailYear==='all'&&detailKind==='all') monthOpenState.set(block.dataset.monthKey,block.open);
      });
    });

    root.querySelectorAll('[data-copy-record]').forEach(button=>{
      button.addEventListener('click',event=>{
        event.stopPropagation();
        copyRecordLink(button.dataset.copyRecord,button);
      });
    });

    applyDetailFilters();
  }

  function shouldOpenMonth(year,month,yearIndex,monthIndex){
    const key=`${year}-${month}`;
    if(monthOpenState.has(key)) return monthOpenState.get(key);
    const hash=location.hash.slice(1);
    if(hash){
      const target=records().find(row=>recordId(row)===hash);
      if(target&&target.start.slice(0,4)===year&&target.start.slice(5,7)===month) return true;
    }
    return yearIndex===0&&monthIndex<3;
  }

  function renderDetail(){
    const rows=records();
    const groups=groupByYear(rows);
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));

    root.innerHTML=`<section class="history-curated-detail">
      <div class="history-detail-controls">
        <div class="history-detail-tools">
          <label class="history-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" data-history-search placeholder="레오펠, 마병대, 행정관 검색" aria-label="방송 이력 검색" autocomplete="off">
            <button type="button" data-history-search-clear aria-label="검색어 지우기">×</button>
          </label>
          <span class="history-results-count" data-history-results-count>${rows.length}개 기록</span>
        </div>
        ${renderKindFilters(rows)}
        ${renderYearFilters(years,'detail',detailYear)}
      </div>

      <div class="history-search-empty" data-history-search-empty hidden><strong>검색 결과가 없습니다.</strong><span>검색어, 유형 또는 연도 필터를 바꿔보세요.</span></div>

      ${years.map((year,yearIndex)=>{
        const months=groupByMonth(groups[year]);
        const monthKeys=Object.keys(months).sort((a,b)=>b.localeCompare(a));
        return `<section class="history-year-block" data-history-year-block data-year="${year}">
          <header class="history-year-header"><div class="history-year-title"><span>${year}</span><div><h2>${year}년 방송 이력</h2>${yearSource(year)}</div></div><small>${groups[year].length}개 기록</small></header>
          <div class="history-months">
            ${monthKeys.map((month,monthIndex)=>{
              const monthKey=`${year}-${month}`;
              const open=shouldOpenMonth(year,month,yearIndex,monthIndex);
              return `<details class="history-month-block" data-history-month-block data-month-key="${monthKey}" ${open?'open':''}>
                <summary class="history-month-head"><div><strong>${Number(month)}월</strong><span>${months[month].length}개 기록</span></div><span class="history-month-chevron" aria-hidden="true">⌄</span></summary>
                <div class="history-timeline">
                  ${months[month].map(row=>{
                    const children=subEvents(row);
                    const id=recordId(row);
                    const search=detailSearchText(row);
                    return `<article id="${id}" class="history-timeline-item ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" data-history-detail-item data-year="${year}" data-kind="${esc(row.kind||'콘텐츠')}" data-search="${esc(search)}">
                      <div class="history-timeline-date">${esc(displayDate(row))}</div>
                      <div class="history-timeline-card">
                        <div class="history-record-head">
                          <h3 data-highlight data-raw="${esc(row.label)}">${esc(row.label)}</h3>
                          <button type="button" class="history-record-link" data-copy-record="${id}" aria-label="${esc(row.label)} 기록 링크 복사">링크</button>
                        </div>
                        <div class="history-timeline-meta"><span>${esc(row.kind||'방송')}</span>${row.featured?'<b>주요 이력</b>':''}${statusBadge(row)}${sourceBadges(row)}</div>
                        ${row.detail?`<p data-highlight data-raw="${esc(row.detail)}">${esc(row.detail)}</p>`:''}
                        ${children.length?`<details class="history-event-details"><summary>세부 방송 기록 ${children.length}개 보기 <span>⌄</span></summary><ol>${children.map(item=>`<li><time>${esc(item.end?displayDate({start:item.date,end:item.end}):fmt(item.date))}</time><span data-highlight data-raw="${esc(item.label)}">${esc(item.label)}</span></li>`).join('')}</ol></details>`:''}
                      </div>
                    </article>`;
                  }).join('')}
                </div>
              </details>`;
            }).join('')}
          </div>
        </section>`;
      }).join('')}

      <footer class="history-curated-source"><strong>데이터 기준</strong><p>2025년 이후 날짜·기간은 Google Sheet를 우선하고, SOOP 공식 기록·방송국·공개 자료는 역할과 설명 보강 및 교차 확인에 사용합니다. 월별 시트가 추가되면 세부 기록도 자동으로 연결하도록 구성했습니다.</p><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 방송 이력 원본 ↗</a></footer>
    </section>`;

    bindDetailControls();
    requestAnimationFrame(()=>scrollToHashRecord(false));
  }

  function scrollToRecord(id,flash=false){
    const target=document.getElementById(id);
    if(!target) return;
    const month=target.closest('[data-history-month-block]');
    if(month) month.open=true;
    target.scrollIntoView({behavior:'smooth',block:'center'});
    if(flash){
      target.classList.add('is-targeted');
      setTimeout(()=>target.classList.remove('is-targeted'),1800);
    }
  }

  function scrollToHashRecord(flash=false){
    const id=location.hash.slice(1);
    if(id.startsWith('history-')) scrollToRecord(id,flash);
  }

  function updateViewUI(){
    viewButtons.forEach(button=>{
      const active=button.dataset.historyView===currentView;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(viewTitle) viewTitle.textContent=currentView==='simple'?'핵심 방송 이력':'탐색 가능한 상세 방송 이력';
    if(viewDesc) viewDesc.textContent=currentView==='simple'
      ?'연도별 핵심 사건을 빠르게 훑고 원하는 기록을 눌러 상세로 이동합니다.'
      :'검색·유형·연도 필터와 월별 접기를 이용해 원하는 기록을 찾습니다.';
    document.body.dataset.historyView=currentView;
    if(guide) guide.hidden=currentView==='simple';
  }

  function render(){
    if(!root) return;
    if(currentView==='detail') renderDetail(); else renderSimple();
    updateViewUI();

    if(status){
      const suffix=liveFetchedAt
        ?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(liveFetchedAt))+' KST'
        :'';
      status.textContent=liveReady
        ?`Google Sheet 자동 갱신 · 2025~2026 최신 기록${suffix?' · '+suffix:''}`
        :'검증 스냅샷 표시 중 · Google Sheet 연결 확인 중';
    }
  }

  function setView(view){
    currentView=view==='detail'?'detail':'simple';
    localStorage.setItem('chunbong-history-view',currentView);
    if(currentView==='simple'&&location.hash.startsWith('#history-')) history.replaceState(null,'',location.pathname+location.search);
    render();
  }

  function recordSignature(rows){
    return rows.map(row=>[row.start,row.end||'',row.label].join('|')).join(';;');
  }

  async function loadJson(url){
    const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok) throw new Error(`request_failed_${response.status}`);
    return response.json();
  }

  async function loadLiveSheets(){
    try{
      const before=recordSignature(records());
      const [y2025,y2026,m2025,m2026]=await Promise.all([
        loadJson('/api/history-sheet?sheet=2025'),
        loadJson('/api/history-sheet?sheet=2026'),
        loadJson('/api/history-sheet?sheet=months&year=2025'),
        loadJson('/api/history-sheet?sheet=months&year=2026')
      ]);

      if(!y2025.ok||!y2026.ok||!Array.isArray(y2025.items)||!Array.isArray(y2026.items)||y2025.items.length<30||y2026.items.length<40){
        throw new Error('sheet_data_incomplete');
      }

      liveAnnual=[...y2025.items,...y2026.items].map(enrichSheetRecord);
      liveMonths=[
        ...(Array.isArray(m2025.items)?m2025.items:[]),
        ...(Array.isArray(m2026.items)?m2026.items:[])
      ];
      liveFetchedAt=y2026.fetchedAt||y2025.fetchedAt||'';
      liveReady=true;

      const after=recordSignature(records());
      if(after!==before||currentView==='detail') render();
      else if(status){
        const suffix=liveFetchedAt
          ?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(liveFetchedAt))+' KST'
          :'';
        status.textContent=`Google Sheet 자동 갱신 · 2025~2026 최신 기록${suffix?' · '+suffix:''}`;
      }
    }catch(_error){
      liveReady=false;
      if(status) status.textContent='검증 스냅샷 표시 중 · Google Sheet 연결 지연';
    }
  }

  viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.historyView)));
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#history-')){
      currentView='detail';
      localStorage.setItem('chunbong-history-view','detail');
      render();
    }
  });

  window.__CHUNBONG_HISTORY_HELPERS__={records,displayDate,compactDate,renderSimple,renderDetail,setView,loadLiveSheets,recordId};
  render();
  loadLiveSheets();
})();