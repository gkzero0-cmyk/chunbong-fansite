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
  const searchIndexLoadedYears=new Set();
  const searchIndexLoading=new Map();
  let contentIndex=[];
  let contentIndexLoaded=false;
  let contentIndexLoading=null;

  const kindOrder=['마인크래프트','주최','대회','게임','타로','활동','방송','콘텐츠'];

  // Names alone are not always enough to identify a server or the importance of a record.
  // Keep verified exceptions here, while generic inference handles obvious names.
  const HISTORY_RECORD_RULES=[
    {test:/^춘이괜$/i,importance:'normal'},
    {test:/^읍더스게이트\s*3$/i,importance:'normal'},
    {test:/^현실합방\s*w\.\s*스노$/i,importance:'normal'},
    {test:/^서버개발 방송$/i,kind:'방송',importance:'normal'},
    {test:/구독플러스/i,kind:'방송',importance:'normal'},
    {test:/^레오펠\s*2\s*무기한 연기$/i,kind:'주최',importance:'core',type:'주최'},
    {test:/^레오펠(?:\s*:?\s*.*)?$/i,kind:'주최'},
    {test:/^그냥서버(?:\s*:?\s*.*)?$/i,kind:'주최'},
    {test:/^춘타클(?:\s*.*)?$/i,kind:'타로'},
    {test:/^처니랜드\s*쪼이팀\s*뻐꾸기병$/i,kind:'대회',importance:'core',type:'대회'},
    {test:/^버추얼 종합대회 시즌3\s*:\s*넥버워치 중계$/i,kind:'대회',importance:'core',type:'대회·중계'},

    {test:/^홍창의 숲$/i,kind:'마인크래프트',importance:'core',type:'서버·마크'},
    {test:/^린코레일\s*2$/i,kind:'마인크래프트',importance:'core',type:'서버·마크'},
    {test:/^꾸다방\s*2\.5$/i,kind:'마인크래프트',importance:'core',type:'서버·마크'},
    {test:/^감블러의 놀이터$/i,kind:'마인크래프트',importance:'core',type:'서버·마크'},
    {test:/^또오냥의 조까치수련회\s*2$/i,kind:'마인크래프트',importance:'core',type:'서버·마크'},

    {test:/^GTA 좀비서버/i,kind:'게임',importance:'core',type:'게임 서버'},
    {test:/^여우도시$/i,kind:'게임',importance:'core',type:'게임 서버'},
    {test:/^고래시티$/i,kind:'게임',importance:'core',type:'게임 서버'}
  ];

  function recordRule(label=''){
    const text=String(label||'').trim();
    return HISTORY_RECORD_RULES.find(rule=>rule.test.test(text))||null;
  }

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
    if(!contentIndex.length) return '';
    const labelNorm=normalizeLabel(row.label||'');
    if(!labelNorm) return '';
    let best=null,bestScore=0;
    for(const item of contentIndex){
      const names=[item.title,...(Array.isArray(item.aliases)?item.aliases:[])].filter(Boolean);
      let score=0;
      for(const name of names){
        const nameNorm=normalizeLabel(name);
        if(nameNorm.length<3) continue;
        if(labelNorm===nameNorm) score=Math.max(score,200+nameNorm.length);
        else if(labelNorm.includes(nameNorm)) score=Math.max(score,100+nameNorm.length);
        else if(nameNorm.includes(labelNorm)&&labelNorm.length>=5) score=Math.max(score,70+labelNorm.length);
      }
      if(!score) continue;
      const rowStart=String(row.start||'');
      const itemStart=String(item.startDate||item.start||'');
      if(rowStart&&itemStart){
        if(rowStart===itemStart) score+=30;
        else if(rowStart.slice(0,4)===itemStart.slice(0,4)) score+=5;
      }
      if(score>bestScore){best=item;bestScore=score;}
    }
    return best?.id?`/contents/${encodeURIComponent(best.id)}`:'';
  }

  function calendarHref(row={}){
    const date=String(row.start||'').slice(0,10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date)?`data.html?view=calendar&date=${encodeURIComponent(date)}#soop`:'';
  }

  async function ensureContentIndex(){
    if(contentIndexLoaded) return contentIndex;
    if(contentIndexLoading) return contentIndexLoading;
    contentIndexLoading=loadJson('/api/content?type=chunbong-contents')
      .then(payload=>{
        contentIndex=(Array.isArray(payload?.items)?payload.items:[])
          .filter(item=>item?.id&&item?.title)
          .map(item=>({
            id:String(item.id),
            title:String(item.title),
            aliases:Array.isArray(item.aliases)?item.aliases.map(String):[],
            startDate:String(item.startDate||''),
            endDate:String(item.endDate||'')
          }));
        contentIndexLoaded=true;
        return contentIndex;
      })
      .catch(()=>{contentIndexLoaded=true;return [];})
      .finally(()=>{contentIndexLoading=null;});
    return contentIndexLoading;
  }

  function monthCacheKey(year,month){
    return `${Number(year)}-${String(Number(month)).padStart(2,'0')}`;
  }

  function allMonthItems(){
    return [...monthlyCache.values()].flat();
  }

  function inferKind(label=''){
    const text=String(label);
    const override=recordRule(text);
    if(override?.kind) return override.kind;
    if(/타로|사주|신점/.test(text)) return '타로';
    if(/대회|F1|CK|와튜버|스모오라|크루대전/.test(text)) return '대회';
    if(/GTA|배그|배틀 그라운드|오버워치|옵치|WOW|스트리트 파이터|아르마|파블로프|언레일드|경찰과 도둑|버워치/.test(text)) return '게임';
    if(/입사 발표|결성|해체|크루 리빌딩|SOOP 스트리머 대상/.test(text)) return '활동';
    if(/노래자랑/.test(text)) return '주최';
    if(/입사|인터뷰/.test(text)) return '방송';
    if(/서버|마병대|레오펠|퍼켓몬|해초마을|맹든링|픽크타|담월드|오함마|수미랜드|원블럭|다이아/.test(text)) return '마인크래프트';
    return '콘텐츠';
  }

  function isPreparation(label=''){
    return /설명회|입주자 발표|모집|신청|면접|지원 영상|신청자 살펴보기|추가 운영자 모집/.test(String(label))
      && !/패러블 입사 발표/.test(String(label));
  }

  function simpleDecision(item={}){
    const text=String(item.label||'').trim();
    const override=recordRule(text);
    const kind=override?.kind||item.kind||inferKind(text);

    if(!text||item.detailOnly) return {include:false,type:'',importance:'normal',reason:'detail-only'};
    if(isPreparation(text)) return {include:false,type:'',importance:'normal',reason:'preparation'};
    if(override?.importance==='normal') return {include:false,type:'',importance:'normal',reason:'curated-normal'};
    if(override?.importance==='core') return {
      include:true,
      type:override.type||(kind==='마인크래프트'?'서버·마크':kind==='게임'?'게임 서버':kind),
      importance:'core',
      reason:'curated-core'
    };

    if(/입사 발표|결성|해체|크루 리빌딩|SOOP 스트리머 대상/.test(text)){
      return {include:true,type:'활동 변화',importance:'core',reason:'milestone'};
    }

    if(kind==='마인크래프트') return {include:true,type:'서버·마크',importance:'core',reason:'minecraft'};
    if(kind==='대회') return {include:true,type:'대회',importance:'core',reason:'competition'};
    if(kind==='주최') return {include:true,type:'주최',importance:'core',reason:'hosted'};

    if(/배그|배틀 그라운드|아르마|오버워치|옵치|버워치|언레일드|경찰과 도둑|스모오라|세바버|왁업|랜버워치/i.test(text)){
      return {include:true,type:'합방·게임',importance:'core',reason:'official-game-event'};
    }

    if(/노래자랑|춘타클/.test(text)){
      return {include:true,type:kind==='타로'?'타로':'콘텐츠',importance:'core',reason:'signature-content'};
    }

    return {include:false,type:'',importance:'normal',reason:'detail'};
  }

  function isMajorSheetEvent(item={}){
    return simpleDecision({...item,kind:item.kind||inferKind(item.label)}).include;
  }

  function isFeatured(label=''){
    return /레오펠|패러블 입사|결성|마병대|SOOP 스트리머 대상|홍창의 숲|그냥서버|싸이감성 노래자랑|사자회 해체/.test(String(label))
      && !/설명회|입주자 발표|모집/.test(String(label));
  }

  function simpleTypeLabel(row={}){
    const override=recordRule(row.label);
    return override?.type||simpleDecision(row).type||({
      '마인크래프트':'서버·마크',
      '대회':'대회',
      '주최':'주최',
      '타로':'타로',
      '게임':'게임',
      '활동':'활동 변화',
      '방송':'방송'
    }[row.kind]||'콘텐츠');
  }

  function simpleYearSummary(rows=[]){
    const counts=new Map();
    rows.forEach(row=>{
      const type=simpleTypeLabel(row);
      counts.set(type,(counts.get(type)||0)+1);
    });
    const top=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,2);
    return top.map(([type,count])=>`${type} ${count}`).join(' · ');
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
    const kind=inferKind(label);
    const selection=simpleDecision({...item,label,kind});
    return {
      ...item,
      label,
      kind,
      importance:selection.importance,
      major:selection.include,
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
      return simpleDecision(row).include;
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
    simpleScrollY=window.scrollY||0;
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
      <div class="history-simple-note"><strong>핵심 이력 기준</strong><span>서버·마크 · 공식 대회/게임 이벤트 · 직접 주최 콘텐츠 · 크루/소속 등 활동 변화를 중심으로 표시합니다. 일반 합방·개인 콘텐츠·준비 과정은 상세 보기에서 확인할 수 있습니다.</span></div>
      ${renderYearFilters(years,'simple',simpleYear)}
      <div class="history-simple-list">
        ${years.map(year=>`<section class="history-simple-year-section" data-simple-year="${year}" ${simpleYear!=='all'&&simpleYear!==year?'hidden':''}>
          <header class="history-simple-year-head"><div><strong>${year}</strong><span>${groups[year].length}개 핵심 이력 <em class="history-simple-year-breakdown">${esc(simpleYearSummary(groups[year]))}</em></span></div>${yearSource(year)}</header>
          <div class="history-simple-table-head" aria-hidden="true"><span>날짜 / 기간</span><span>내용</span><span>유형</span></div>
          <div class="history-simple-year-list">
            ${groups[year].map(row=>{
              const id=recordId(row);
              return `<article class="history-simple-row ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" tabindex="0" role="link" data-open-record="${id}" aria-label="${esc(row.label)} 상세 기록 보기">
                <time class="history-simple-date" datetime="${esc(row.start)}">${esc(compactDate(row))}</time>
                <p class="history-simple-content"><span>${esc(row.label)}</span>${statusBadge(row)}<span class="history-row-arrow" aria-hidden="true">→</span></p>
                <span class="history-simple-type">${esc(simpleTypeLabel(row))}</span>
              </article>`;
            }).join('')}
          </div>
        </section>`).join('')}
      </div>
      <footer class="history-simple-foot"><span>간단 보기 ${rows.length}개 · 준비 과정과 전체 기록은 상세 보기에서 확인</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 전체 보기 →</button></footer>
    </section>`;

    root.querySelector('[data-open-detail]')?.addEventListener('click',()=>setView('detail'));
    bindSimpleRows();
    bindYearFilters('simple',year=>{
      simpleYear=year;
      root.querySelectorAll('[data-year-filter-scope="simple"] [data-history-year]').forEach(button=>button.classList.toggle('is-active',button.dataset.historyYear===year));
      root.querySelectorAll('[data-simple-year]').forEach(section=>{section.hidden=year!=='all'&&section.dataset.simpleYear!==year;});
    });
  }

  function detailBaseSearchText(row){
    return [row.label,row.kind,row.detail,row.start,row.end]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function detailChildSearchText(row){
    return subEvents(row).map(item=>item.label).filter(Boolean).join(' ').toLowerCase();
  }

  function detailSearchText(row){
    return [detailBaseSearchText(row),detailChildSearchText(row)].filter(Boolean).join(' ');
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
      const baseMatch=!query||String(item.dataset.searchBase||'').includes(query);
      const detailMatch=Boolean(query)&&String(item.dataset.searchDetail||'').includes(query);
      const textMatch=baseMatch||detailMatch;
      const visible=yearMatch&&kindMatch&&textMatch;
      item.hidden=!visible;
      const matchBadge=item.querySelector('[data-search-match]');
      if(matchBadge) matchBadge.hidden=!(visible&&query&&!baseMatch&&detailMatch);
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

  async function loadMonth(year,month){
    const key=monthCacheKey(year,month);
    if(monthlyCache.has(key)) return monthlyCache.get(key);
    if(monthLoading.has(key)) return monthLoading.get(key);
    const promise=loadJson(`/api/history-sheet?sheet=month&year=${year}&month=${month}`)
      .then(payload=>{
        const items=Array.isArray(payload?.items)?payload.items:[];
        monthlyCache.set(key,items.map(item=>({...item,month:Number(month)})));
        return monthlyCache.get(key);
      })
      .catch(()=>{
        monthlyCache.set(key,[]);
        return [];
      })
      .finally(()=>monthLoading.delete(key));
    monthLoading.set(key,promise);
    return promise;
  }

  async function loadMonthsForRow(row={}){
    const months=monthsInWindow(row);
    if(!months.length) return;
    await Promise.all(months.map(item=>loadMonth(item.year,item.month)));
    if(currentView==='detail'){
      const id=recordId(row);
      renderDetail();
      requestAnimationFrame(()=>scrollToRecord(id,false));
    }
  }

  async function loadYearMonthsForSearch(year){
    const numeric=Number(year);
    if(!Number.isFinite(numeric)||searchIndexLoadedYears.has(numeric)) return;
    if(searchIndexLoading.has(numeric)) return searchIndexLoading.get(numeric);
    const promise=loadJson(`/api/history-sheet?sheet=search-index&year=${numeric}`)
      .then(payload=>{
        const grouped=new Map();
        for(const item of Array.isArray(payload?.items)?payload.items:[]){
          const month=Number(item.month||String(item.date||'').slice(5,7));
          if(!month) continue;
          const key=monthCacheKey(numeric,month);
          if(!grouped.has(key)) grouped.set(key,[]);
          grouped.get(key).push(item);
        }
        for(const [key,items] of grouped){
          if(!monthlyCache.has(key)) monthlyCache.set(key,items);
        }
        searchIndexLoadedYears.add(numeric);
      })
      .catch(()=>{})
      .finally(()=>searchIndexLoading.delete(numeric));
    searchIndexLoading.set(numeric,promise);
    return promise;
  }

  async function ensureDeepSearch(){
    const query=detailQuery.trim();
    if(query.length<2) return;
    const years=detailYear==='all'?[2026,2025]:[Number(detailYear)];
    const note=root.querySelector('[data-history-search-note]');
    if(note) note.textContent='세부 방송 기록까지 찾는 중…';
    await Promise.all(years.map(loadYearMonthsForSearch));
    if(currentView==='detail'&&detailQuery.trim()===query){
      renderDetail();
      const next=root.querySelector('[data-history-search]');
      if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}
    }
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
    const filterToggle=root.querySelector('[data-history-filter-toggle]');
    const filterPanel=root.querySelector('[data-history-filter-panel]');

    if(input){
      input.value=detailQuery;
      input.addEventListener('input',()=>{
        detailQuery=input.value;
        applyDetailFilters();
        clearTimeout(searchTimer);
        if(detailQuery.trim().length>=2) searchTimer=setTimeout(()=>void ensureDeepSearch(),420);
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

    filterToggle?.addEventListener('click',()=>{
      detailFiltersOpen=!detailFiltersOpen;
      filterToggle.setAttribute('aria-expanded',String(detailFiltersOpen));
      filterPanel?.classList.toggle('is-collapsed',!detailFiltersOpen);
    });

    bindYearFilters('detail',year=>{
      detailYear=year;
      applyDetailFilters();
      if(detailQuery.trim().length>=2) void ensureDeepSearch();
    });

    root.querySelectorAll('[data-history-kind]').forEach(button=>{
      button.addEventListener('click',()=>{
        detailKind=button.dataset.historyKind||'all';
        detailFiltersOpen=detailKind!=='all'||detailFiltersOpen;
        applyDetailFilters();
      });
    });

    root.querySelector('[data-history-kind-reset]')?.addEventListener('click',()=>{
      detailKind='all';
      applyDetailFilters();
    });

    root.querySelectorAll('[data-history-month-block]').forEach(block=>{
      const loadOpenMonth=()=>{
        if(!block.open) return;
        const year=Number(block.dataset.year),month=Number(block.dataset.month);
        if(year>=2025&&!monthlyCache.has(monthCacheKey(year,month))){
          void loadMonth(year,month).then(()=>{if(currentView==='detail') renderDetail();});
        }
      };
      block.addEventListener('toggle',()=>{
        if(!detailQuery&&detailYear==='all'&&detailKind==='all') monthOpenState.set(block.dataset.monthKey,block.open);
        loadOpenMonth();
      });
      loadOpenMonth();
    });

    root.querySelectorAll('[data-load-sub-events]').forEach(button=>{
      button.addEventListener('click',()=>{
        const id=button.dataset.loadSubEvents;
        const row=records().find(item=>recordId(item)===id);
        if(!row) return;
        button.disabled=true;
        button.textContent='세부 기록 불러오는 중…';
        void loadMonthsForRow(row);
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
    return yearIndex===0&&monthIndex<1;
  }

  function renderDetail(){
    const rows=records();
    const groups=groupByYear(rows);
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
    const activeFilterCount=detailKind==='all'?0:1;

    root.innerHTML=`<section class="history-curated-detail">
      <div class="history-detail-controls">
        <div class="history-detail-tools">
          <label class="history-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" data-history-search placeholder="레오펠, 마병대, 행정관 검색" aria-label="방송 이력 검색" autocomplete="off">
            <button type="button" data-history-search-clear aria-label="검색어 지우기">×</button>
          </label>
          <button type="button" class="history-filter-toggle ${activeFilterCount?'is-active':''}" data-history-filter-toggle aria-expanded="${detailFiltersOpen}">
            필터${activeFilterCount?` · ${esc(detailKind)}`:''}
          </button>
          <span class="history-results-count" data-history-results-count>${rows.length}개 기록</span>
        </div>
        <div class="history-filter-panel ${detailFiltersOpen?'':'is-collapsed'}" data-history-filter-panel>
          <div class="history-filter-panel-head"><strong>콘텐츠 유형</strong><button type="button" data-history-kind-reset>초기화</button></div>
          ${renderKindFilters(rows)}
        </div>
        ${renderYearFilters(years,'detail',detailYear)}
        <small class="history-search-note" data-history-search-note>검색은 제목·설명과 불러온 세부 기록을 함께 확인합니다.</small>
      </div>

      <div class="history-search-empty" data-history-search-empty hidden><strong>검색 결과가 없습니다.</strong><span>검색어, 유형 또는 연도 필터를 바꿔보세요.</span></div>

      ${years.map((year,yearIndex)=>{
        const months=groupByMonth(groups[year]);
        const monthKeys=Object.keys(months).sort((a,b)=>b.localeCompare(a));
        return `<section class="history-year-block" data-history-year-block data-year="${year}">
          <header class="history-year-header"><div class="history-year-title"><span>${year}</span><div><h2>${year}년 방송 이력</h2></div></div><small>${groups[year].length}개 기록</small></header>
          <div class="history-months">
            ${monthKeys.map((month,monthIndex)=>{
              const monthKey=`${year}-${month}`;
              const open=shouldOpenMonth(year,month,yearIndex,monthIndex);
              return `<details class="history-month-block" data-history-month-block data-month-key="${monthKey}" data-year="${year}" data-month="${Number(month)}" ${open?'open':''}>
                <summary class="history-month-head"><div><strong>${Number(month)}월</strong><span>${months[month].length}개 기록</span></div><span class="history-month-chevron" aria-hidden="true">⌄</span></summary>
                <div class="history-timeline">
                  ${months[month].map(row=>{
                    const children=subEvents(row);
                    const id=recordId(row);
                    const search=detailSearchText(row);
                    const searchBase=detailBaseSearchText(row);
                    const searchDetail=detailChildSearchText(row);
                    const content=contentHref(row);
                    const calendar=calendarHref(row);
                    const calendarLabel=row.end&&row.end!==row.start?'시작일 기록':'캘린더';
                    const actionLinks=`${content?`<a href="${esc(content)}">콘텐츠</a>`:''}${calendar?`<a href="${esc(calendar)}">${calendarLabel}</a>`:''}<button type="button" data-copy-record="${id}" aria-label="${esc(row.label)} 기록 링크 복사">링크</button>`;
                    const canLoad=detailTerms(row).length>0&&Number(year)>=2025&&!rowMonthsLoaded(row);
                    const compact=!row.featured&&!row.detail&&!children.length&&!canLoad;
                    return `<article id="${id}" class="history-timeline-item ${compact?'is-compact':''} ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" data-history-detail-item data-year="${year}" data-kind="${esc(row.kind||'콘텐츠')}" data-search="${esc(search)}" data-search-base="${esc(searchBase)}" data-search-detail="${esc(searchDetail)}">
                      <div class="history-timeline-date">${esc(displayDate(row))}</div>
                      <div class="history-timeline-card">
                        <div class="history-record-head">
                          <h3 data-highlight data-raw="${esc(row.label)}">${esc(row.label)}</h3>
                          <div class="history-record-actions">${actionLinks}</div>
                          <details class="history-record-more"><summary>관련 보기</summary><div>${actionLinks}</div></details>
                        </div>
                        <div class="history-timeline-meta"><span>${esc(row.kind||'방송')}</span>${row.featured?'<b>주요 이력</b>':''}${statusBadge(row)}${sourceBadges(row)}<span class="history-search-match" data-search-match hidden>세부 기록 일치</span></div>
                        ${row.detail?`<p data-highlight data-raw="${esc(row.detail)}">${esc(row.detail)}</p>`:''}
                        ${children.length?`<details class="history-event-details"><summary>세부 방송 기록 ${children.length}개 보기 <span>⌄</span></summary><ol>${children.map(item=>`<li><time>${esc(item.end?displayDate({start:item.date,end:item.end}):fmt(item.date))}</time><span data-highlight data-raw="${esc(item.label)}">${esc(item.label)}</span></li>`).join('')}</ol></details>`:canLoad?`<button type="button" class="history-load-details" data-load-sub-events="${id}">세부 방송 기록 불러오기</button>`:''}
                      </div>
                    </article>`;
                  }).join('')}
                </div>
              </details>`;
            }).join('')}
          </div>
        </section>`;
      }).join('')}

      <footer class="history-curated-source"><strong>데이터 기준</strong><p>2025년 이후는 지속 갱신되는 방송 기록을 우선하고, SOOP 공식 기록·방송국·공개 자료로 역할과 설명을 보강합니다. 세부 방송 기록은 필요한 경우에만 불러와 초기 로딩을 가볍게 유지합니다.</p><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 방송 이력 원본 ↗</a></footer>
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
      ?'서버·마크, 공식 대회/게임 이벤트, 주최 콘텐츠와 활동 변화를 중심으로 확인합니다.'
      :'검색·유형·연도 필터와 월별 접기를 이용해 원하는 기록을 찾습니다.';
    document.body.dataset.historyView=currentView;
    if(guide) guide.hidden=currentView==='simple';
  }

  function render(){
    if(!root) return;
    if(currentView==='detail') renderDetail(); else renderSimple();
    updateViewUI();

    if(status){
      status.textContent=liveReady?'':'최신 기록 확인 중';
    }
  }

  function setView(view){
    const next=view==='detail'?'detail':'simple';
    if(currentView==='simple'&&next==='detail') simpleScrollY=window.scrollY||0;
    currentView=next;
    localStorage.setItem('chunbong-history-view',currentView);
    if(currentView==='simple'&&location.hash.startsWith('#history-')) history.replaceState(null,'',location.pathname+location.search);
    render();
    if(currentView==='detail'&&!contentIndexLoaded){
      void ensureContentIndex().then(()=>{if(currentView==='detail') renderDetail();});
    }
    if(currentView==='simple'&&simpleScrollY>0) requestAnimationFrame(()=>window.scrollTo({top:simpleScrollY,behavior:'auto'}));
  }

  function readAnnualCache(){
    try{
      const cached=JSON.parse(sessionStorage.getItem('chunbong-history-annual-v1')||'null');
      if(!cached||!Array.isArray(cached.items)||cached.items.length<50) return null;
      if(Date.now()-Number(cached.savedAt||0)>10*60*1000) return null;
      return cached;
    }catch(_error){return null;}
  }

  function writeAnnualCache(items,fetchedAt){
    try{
      sessionStorage.setItem('chunbong-history-annual-v1',JSON.stringify({
        savedAt:Date.now(),
        fetchedAt:fetchedAt||'',
        items
      }));
    }catch(_error){}
  }

  function recordSignature(rows){
    return rows.map(row=>[row.start,row.end||'',row.label].join('|')).join(';;');
  }

  async function loadJson(url){
    const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok) throw new Error(`request_failed_${response.status}`);
    return response.json();
  }

  async function loadLiveSheets({renderOnSuccess=true}={}){
    try{
      const before=recordSignature(records());
      const [y2025,y2026]=await Promise.all([
        loadJson('/api/history-sheet?sheet=2025'),
        loadJson('/api/history-sheet?sheet=2026')
      ]);

      if(!y2025.ok||!y2026.ok||!Array.isArray(y2025.items)||!Array.isArray(y2026.items)||y2025.items.length<30||y2026.items.length<40){
        throw new Error('sheet_data_incomplete');
      }

      const freshItems=[...y2025.items,...y2026.items];
      liveAnnual=freshItems.map(enrichSheetRecord);
      liveFetchedAt=y2026.fetchedAt||y2025.fetchedAt||'';
      liveReady=true;
      writeAnnualCache(freshItems,liveFetchedAt);

      const after=recordSignature(records());
      if(renderOnSuccess&&(after!==before||currentView==='detail')) render();
      else if(status) status.textContent='';
      return true;
    }catch(_error){
      if(!liveReady){
        liveReady=false;
        if(status) status.textContent='최신 기록 연결이 지연되고 있습니다';
      }
      return false;
    }
  }

  async function initialize(){
    const cached=readAnnualCache();
    if(cached){
      liveAnnual=cached.items.map(enrichSheetRecord);
      liveFetchedAt=cached.fetchedAt||'';
      liveReady=true;
      if(currentView==='detail') await ensureContentIndex();
      render();
      void loadLiveSheets({renderOnSuccess:true});
      return;
    }

    let fallbackRendered=false;
    const fallbackTimer=setTimeout(()=>{
      fallbackRendered=true;
      render();
    },420);

    const tasks=[loadLiveSheets({renderOnSuccess:false})];
    if(currentView==='detail') tasks.push(ensureContentIndex());
    await Promise.allSettled(tasks);
    clearTimeout(fallbackTimer);
    render();
    if(fallbackRendered&&status&&liveReady) status.textContent='';
  }

  viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.historyView)));
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#history-')){
      currentView='detail';
      localStorage.setItem('chunbong-history-view','detail');
      render();
      if(!contentIndexLoaded) void ensureContentIndex().then(()=>{if(currentView==='detail') renderDetail();});
    }
  });

  window.__CHUNBONG_HISTORY_HELPERS__={records,displayDate,compactDate,renderSimple,renderDetail,setView,loadLiveSheets,recordId,inferKind,simpleDecision,simpleTypeLabel};
  void initialize();
})();