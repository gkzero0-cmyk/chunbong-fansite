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

  let currentView=localStorage.getItem('chunbong-history-view')==='detail'?'detail':'simple';
  let liveAnnual=[];
  let liveMonth=[];
  let liveReady=false;
  let liveFetchedAt='';
  let simpleYear='all';
  let detailYear='all';
  let detailQuery='';

  const esc=(value='')=>String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const majorMatchers=[
    '수미랜드','담월드','더켓몬','퍼켓몬','GTA 좀비서버','레오펠','패러블 입사','여우도시',
    '오함마3','레귤러원','춘동아리 결성','춘동아리 다이아서버','마병대3','해초마을2',
    '돌발서버','첫 구독플러스 방송','맹든링','사자회 원블럭','SOOP 스트리머 대상',
    '다이아랜딩','홍창의 숲','하루살이 서버','충동서버','그냥서버','싸이감성 노래자랑',
    '사자회 해체','픽크타2','고래시티','춘타클','사자컴퍼니 결성','두둥투어','하요리 서버','마병대 4'
  ];
  const featuredMatchers=[
    '레오펠','패러블 입사','춘동아리 결성','마병대3','SOOP 스트리머 대상',
    '홍창의 숲','그냥서버','싸이감성 노래자랑','사자회 해체','사자컴퍼니 결성','마병대 4'
  ];

  function normalizeLabel(value=''){
    return String(value).toLowerCase().replace(/[\s:·<>\-_.]/g,'');
  }

  function containsAny(label,list){
    const normalized=normalizeLabel(label);
    return list.some(value=>normalized.includes(normalizeLabel(value)));
  }

  function inferKind(label=''){
    const text=String(label);
    if(/타로|사주|신점/.test(text)) return '타로';
    if(/노래자랑|설명회|사자컴퍼니 결성|춘동아리 결성/.test(text)) return '주최';
    if(/서버|마병대|레오펠|퍼켓몬|해초마을|맹든링|픽크타|여우도시|고래시티|담월드|오함마/.test(text)) return '마인크래프트';
    if(/대회|F1|배그|오버워치|와튜버|CK|랜드|스모오라/.test(text)) return '대회';
    if(/입사|구독플러스|SOOP 스트리머 대상|크루 리빌딩|사자회 해체/.test(text)) return '방송';
    return '콘텐츠';
  }

  function isMajorSheetEvent(label=''){
    const text=String(label);
    if(/설명회|1차 입주자 발표|\b모집\b|신청|면접|지원 영상/.test(text)&&!/패러블 입사 발표/.test(text)) return false;
    return containsAny(text,majorMatchers);
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
      major:isMajorSheetEvent(label),
      featured:containsAny(label,featuredMatchers)&&!/설명회|1차 입주자 발표/.test(label),
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

  function yearSource(year){
    return Number(year)>=2025
      ?'<span class="history-year-source is-sheet">Google Sheet 기준 · 자동 갱신</span>'
      :'<span class="history-year-source">SOOP · 공개 자료 교차 검증</span>';
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
    return [];
  }

  function subEvents(row={}){
    const terms=detailTerms(row);
    if(!terms.length) return [];
    return liveMonth
      .filter(item=>inRange(item.date,row)&&terms.some(term=>String(item.label||'').includes(term)))
      .filter((item,index,array)=>array.findIndex(other=>other.date===item.date&&other.end===item.end&&other.label===item.label)===index);
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

  function bindYearFilters(scope,onSelect){
    root.querySelectorAll(`[data-year-filter-scope="${scope}"] [data-history-year]`).forEach(button=>{
      button.addEventListener('click',()=>{
        onSelect(button.dataset.historyYear||'all');
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
      <div class="history-simple-note"><strong>핵심 이력만 보기</strong><span>2025년 이후는 <b>Google Sheet ‘춘봉 다시보기’</b> 날짜·기간을 우선하고 준비 과정은 상세 보기로 분리합니다.</span></div>
      ${renderYearFilters(years,'simple',simpleYear)}
      <div class="history-simple-list">
        ${years.map(year=>`<section class="history-simple-year-section" data-simple-year="${year}" ${simpleYear!=='all'&&simpleYear!==year?'hidden':''}>
          <header class="history-simple-year-head"><div><strong>${year}</strong><span>${groups[year].length}개 핵심 이력</span></div>${yearSource(year)}</header>
          <div class="history-simple-table-head" aria-hidden="true"><span>날짜 / 기간</span><span>내용</span></div>
          <div class="history-simple-year-list">
            ${groups[year].map(row=>`<article class="history-simple-row ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}">
              <time class="history-simple-date" datetime="${esc(row.start)}">${esc(compactDate(row))}</time>
              <p class="history-simple-content"><span>${esc(row.label)}</span>${statusBadge(row)}</p>
            </article>`).join('')}
          </div>
        </section>`).join('')}
      </div>
      <footer class="history-simple-foot"><span>${liveReady?'Google Sheet 자동 갱신':'검증 스냅샷 기준'} · 핵심 이력 ${rows.length}개</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 보기 →</button></footer>
    </section>`;

    root.querySelector('[data-open-detail]')?.addEventListener('click',()=>setView('detail'));
    bindYearFilters('simple',year=>{
      simpleYear=year;
      root.querySelectorAll('[data-year-filter-scope="simple"] [data-history-year]').forEach(button=>button.classList.toggle('is-active',button.dataset.historyYear===year));
      root.querySelectorAll('[data-simple-year]').forEach(section=>{section.hidden=year!=='all'&&section.dataset.simpleYear!==year;});
    });
  }

  function detailSearchText(row){
    return [row.label,row.kind,row.detail,row.start,row.end].filter(Boolean).join(' ').toLowerCase();
  }

  function applyDetailFilters(){
    const query=detailQuery.trim().toLowerCase();
    let visibleCount=0;

    root.querySelectorAll('[data-history-detail-item]').forEach(item=>{
      const yearMatch=detailYear==='all'||item.dataset.year===detailYear;
      const textMatch=!query||String(item.dataset.search||'').includes(query);
      const visible=yearMatch&&textMatch;
      item.hidden=!visible;
      if(visible) visibleCount+=1;
    });

    root.querySelectorAll('[data-history-month-block]').forEach(block=>{
      block.hidden=![...block.querySelectorAll('[data-history-detail-item]')].some(item=>!item.hidden);
    });

    root.querySelectorAll('[data-history-year-block]').forEach(block=>{
      block.hidden=![...block.querySelectorAll('[data-history-month-block]')].some(month=>!month.hidden);
    });

    root.querySelectorAll('[data-year-filter-scope="detail"] [data-history-year]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.historyYear===detailYear);
    });

    const count=root.querySelector('[data-history-results-count]');
    if(count) count.textContent=`${visibleCount}개 기록`;

    const empty=root.querySelector('[data-history-search-empty]');
    if(empty) empty.hidden=visibleCount!==0;
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

    applyDetailFilters();
  }

  function renderDetail(){
    const rows=records();
    const groups=groupByYear(rows);
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));

    root.innerHTML=`<section class="history-curated-detail">
      <div class="history-detail-note">
        <div><strong>2025년 이후</strong><span>Google Sheet 연간 ‘춘봉 다시보기’의 날짜·기간을 우선 사용합니다.</span></div>
        <div><strong>상세 기록</strong><span>연도 → 월 → 사건 순서로 보고, 연결된 세부 방송 흐름은 펼쳐서 확인합니다.</span></div>
        <div><strong>업데이트</strong><span>${liveReady?'Google Sheet 자동 갱신':'검증 스냅샷 표시 중'}</span></div>
      </div>

      <div class="history-detail-tools">
        <label class="history-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" data-history-search placeholder="레오펠, 마병대, 타로 검색" aria-label="방송 이력 검색" autocomplete="off">
          <button type="button" data-history-search-clear aria-label="검색어 지우기">×</button>
        </label>
        <span class="history-results-count" data-history-results-count>${rows.length}개 기록</span>
      </div>

      ${renderYearFilters(years,'detail',detailYear)}

      <div class="history-search-empty" data-history-search-empty hidden><strong>검색 결과가 없습니다.</strong><span>다른 키워드나 연도를 선택해보세요.</span></div>

      ${years.map(year=>{
        const months=groupByMonth(groups[year]);
        const monthKeys=Object.keys(months).sort((a,b)=>b.localeCompare(a));
        return `<section class="history-year-block" data-history-year-block data-year="${year}">
          <header class="history-year-header"><div class="history-year-title"><span>${year}</span><div><h2>${year}년 방송 이력</h2>${yearSource(year)}</div></div><small>${groups[year].length}개 기록</small></header>
          <div class="history-months">
            ${monthKeys.map(month=>`<section class="history-month-block" data-history-month-block>
              <header class="history-month-head"><strong>${Number(month)}월</strong><span>${months[month].length}개</span></header>
              <div class="history-timeline">
                ${months[month].map(row=>{
                  const children=subEvents(row);
                  return `<article class="history-timeline-item ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" data-history-detail-item data-year="${year}" data-search="${esc(detailSearchText(row))}">
                    <div class="history-timeline-date">${esc(displayDate(row))}</div>
                    <div class="history-timeline-card">
                      <h3>${esc(row.label)}</h3>
                      <div class="history-timeline-meta"><span>${esc(row.kind||'방송')}</span>${row.featured?'<b>주요 이력</b>':''}${statusBadge(row)}${sourceBadges(row)}</div>
                      ${row.detail?`<p>${esc(row.detail)}</p>`:''}
                      ${children.length?`<details class="history-event-details"><summary>세부 방송 기록 ${children.length}개 보기 <span>⌄</span></summary><ol>${children.map(item=>`<li><time>${esc(item.end?displayDate({start:item.date,end:item.end}):fmt(item.date))}</time><span>${esc(item.label)}</span></li>`).join('')}</ol></details>`:''}
                    </div>
                  </article>`;}).join('')}
              </div>
            </section>`).join('')}
          </div>
        </section>`;
      }).join('')}

      <footer class="history-curated-source"><strong>데이터 기준</strong><p>2025년 이후 날짜·기간은 Google Sheet를 우선하고, SOOP 공식 기록·방송국·공개 자료는 역할과 설명 보강 및 교차 확인에 사용합니다. 2024년 이전은 기존 공식/공개 자료 검증 기록을 유지합니다.</p><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 방송 이력 원본 ↗</a></footer>
    </section>`;

    bindDetailControls();
  }

  function updateViewUI(){
    viewButtons.forEach(button=>{
      const active=button.dataset.historyView===currentView;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(viewTitle) viewTitle.textContent=currentView==='simple'?'핵심 방송 이력':'검색 가능한 상세 방송 이력';
    if(viewDesc) viewDesc.textContent=currentView==='simple'
      ?'연도별 핵심 사건과 날짜만 빠르게 확인합니다.'
      :'연도·월별 기록을 검색하고 세부 방송 흐름까지 펼쳐봅니다.';
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
    render();
  }

  function recordSignature(rows){
    return rows.map(row=>[row.start,row.end||'',row.label].join('|')).join(';;');
  }

  async function loadLiveSheets(){
    try{
      const before=recordSignature(records());
      const urls=['2025','2026','26.9'].map(sheet=>`/api/history-sheet?sheet=${encodeURIComponent(sheet)}`);
      const responses=await Promise.all(urls.map(url=>fetch(url,{headers:{accept:'application/json'},cache:'no-store'})));
      if(responses.some(response=>!response.ok)) throw new Error('sheet response failed');
      const [y2025,y2026,m2609]=await Promise.all(responses.map(response=>response.json()));
      if(!y2025.ok||!y2026.ok||!Array.isArray(y2025.items)||!Array.isArray(y2026.items)||y2025.items.length<30||y2026.items.length<40) throw new Error('sheet data incomplete');

      liveAnnual=[...y2025.items,...y2026.items].map(enrichSheetRecord);
      liveMonth=Array.isArray(m2609.items)?m2609.items:[];
      liveFetchedAt=y2026.fetchedAt||y2025.fetchedAt||'';
      liveReady=true;

      const after=recordSignature(records());
      if(after!==before) render();
      else if(status){
        const suffix=liveFetchedAt
          ?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(liveFetchedAt))+' KST'
          :'';
        status.textContent=`Google Sheet 자동 갱신 · 2025~2026 최신 기록${suffix?' · '+suffix:''}`;
      }
    }catch(error){
      liveReady=false;
      if(status) status.textContent='검증 스냅샷 표시 중 · Google Sheet 연결 지연';
    }
  }

  viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.historyView)));
  window.__CHUNBONG_HISTORY_HELPERS__={records,displayDate,compactDate,renderSimple,renderDetail,setView,loadLiveSheets};
  render();
  loadLiveSheets();
})();