(() => {
  'use strict';

  const SOURCE_URL='https://www.sooplive.com/station/chunbongtv/post/202862381';
  const root=document.getElementById('history-content');
  const status=document.getElementById('history-sync-status');
  const guide=document.querySelector('[data-history-guide]');
  const viewButtons=[...document.querySelectorAll('[data-history-view]')];
  const viewTitle=document.querySelector('[data-history-view-title]');
  const viewDesc=document.querySelector('[data-history-view-desc]');
  const meta=window.CHUNBONG_HISTORY_META||{};
  const fallback=[...(Array.isArray(window.CHUNBONG_HISTORY_RECORDS)?window.CHUNBONG_HISTORY_RECORDS:[])];

  let currentView=localStorage.getItem('chunbong-history-view')==='detail'?'detail':'simple';
  let liveAnnual=[];
  let liveMonth=[];
  let liveReady=false;
  let liveFetchedAt='';

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

  function enrichSheetRecord(item){
    const label=String(item.label||'').trim();
    return {
      ...item,
      label,
      kind:inferKind(label),
      major:containsAny(label,majorMatchers),
      featured:containsAny(label,featuredMatchers),
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
    return fallback.filter(row=>String(row.start||'')>='2025-01-01'&&keep.includes(row.label)).map(row=>({...row,supplemental:true}));
  }

  function dedupe(rows){
    const result=[];const seen=new Set();
    for(const row of rows){
      const key=[row.start,row.end||'',normalizeLabel(row.label)].join('|');
      if(seen.has(key)) continue;
      seen.add(key);result.push(row);
    }
    return result;
  }

  function records(){
    let rows;
    if(liveReady){
      rows=[
        ...fallback.filter(row=>String(row.start||'')<'2025-01-01'),
        ...liveAnnual,
        ...supplementalRecords()
      ];
    }else rows=[...fallback];
    return dedupe(rows)
      .filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(String(row?.start||'')))
      .sort((a,b)=>String(b.start).localeCompare(String(a.start))||String(b.end||'').localeCompare(String(a.end||'')));
  }

  function fmt(value=''){
    const [y,m,d]=String(value).split('-');
    if(!y||!m||!d) return String(value||'');
    return `${y}. ${Number(m)}. ${Number(d)}`;
  }

  function displayDate(record={}){
    if(record.dateLabel) return String(record.dateLabel);
    if(record.status==='진행'&&!record.end) return `${fmt(record.start)} ~ 현재`;
    if(!record.end||record.end===record.start) return fmt(record.start);
    const [sy]=record.start.split('-');
    const [ey,em,ed]=record.end.split('-');
    return sy===ey?`${fmt(record.start)} ~ ${Number(em)}. ${Number(ed)}`:`${fmt(record.start)} ~ ${fmt(record.end)}`;
  }

  function statusBadge(record={}){
    if(record.status==='예정') return '<span class="history-state is-planned">예정</span>';
    if(record.status==='진행') return '<span class="history-state is-live">진행 중</span>';
    return '';
  }

  function sourceBadges(record={}){
    const sources=Array.isArray(record.sources)?record.sources:[];
    const sheet=sources.includes('google-sheet')?'<span class="history-verified is-sheet">Google Sheet 기준</span>':'';
    const cross=sources.length>=2?'<span class="history-verified">교차 확인</span>':'';
    return sheet+cross;
  }

  function inRange(date,row){
    if(!date||!row.start) return false;
    return date>=row.start&&date<=(row.end||row.start);
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
    return liveMonth.filter(item=>inRange(item.date,row)&&terms.some(term=>String(item.label||'').includes(term)));
  }

  function renderSimple(){
    const rows=records().filter(row=>{
      const year=Number(String(row.start).slice(0,4));
      if(year<2025) return !row.detailOnly;
      return !row.detailOnly&&(row.major||row.featured||row.supplemental||row.status==='예정');
    });
    const years=[...new Set(rows.map(row=>row.start.slice(0,4)))];
    if(!rows.length){
      root.innerHTML='<div class="history-simple-empty"><strong>표시할 방송 이력이 없습니다.</strong><p>검증된 기록을 준비하고 있습니다.</p></div>';
      return;
    }
    root.innerHTML=`<section class="history-simple" aria-label="간단 방송 이력">
      <div class="history-simple-note"><strong>2025년 이후 기준</strong><span><b>Google Sheet ‘춘봉 다시보기’</b>의 날짜·기간을 우선 사용하고, 핵심 이력만 선별해 표시합니다.</span></div>
      <div class="history-year-filters" aria-label="연도 필터"><button type="button" class="is-active" data-history-year="all">전체</button>${years.map(year=>`<button type="button" data-history-year="${year}">${year}</button>`).join('')}</div>
      <div class="history-simple-head" aria-hidden="true"><span>년도</span><span>날짜 / 기간</span><span>내용</span></div>
      <div class="history-simple-list">${rows.map((row,index)=>{
        const year=row.start.slice(0,4),prev=index?rows[index-1].start.slice(0,4):'';
        return `<article class="history-simple-row ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" data-history-row data-year="${year}">
          <strong class="history-simple-year">${year!==prev?year:''}</strong>
          <time class="history-simple-date" datetime="${esc(row.start)}">${esc(displayDate(row))}</time>
          <p class="history-simple-content"><span>${esc(row.label)}</span>${statusBadge(row)}</p>
        </article>`;}).join('')}</div>
      <footer class="history-simple-foot"><span>${liveReady?'Google Sheet 실시간 기준':'검증 스냅샷 기준'} · 핵심 이력 ${rows.length}개</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 보기 →</button></footer>
    </section>`;
    root.querySelector('[data-open-detail]')?.addEventListener('click',()=>setView('detail'));
    root.querySelectorAll('[data-history-year]').forEach(button=>button.addEventListener('click',()=>{
      const selected=button.dataset.historyYear;
      root.querySelectorAll('[data-history-year]').forEach(node=>node.classList.toggle('is-active',node===button));
      root.querySelectorAll('[data-history-row]').forEach(row=>{row.hidden=selected!=='all'&&row.dataset.year!==selected;});
    }));
  }

  function renderDetail(){
    const rows=records();
    const groups=rows.reduce((acc,row)=>{const year=row.start.slice(0,4);(acc[year]||=[]).push(row);return acc;},{});
    root.innerHTML=`<section class="history-curated-detail">
      <div class="history-detail-note">
        <div><strong>2025년 이후</strong><span>Google Sheet 연간 ‘춘봉 다시보기’의 날짜·기간을 우선 사용합니다.</span></div>
        <div><strong>상세 기록</strong><span>연간 대표 이력 전체와, 연결 가능한 월별 세부 방송 기록을 함께 보여줍니다.</span></div>
        <div><strong>업데이트</strong><span>${liveReady?'실시간 시트 연동':'검증 스냅샷 표시 중'}</span></div>
      </div>
      ${Object.keys(groups).sort((a,b)=>b.localeCompare(a)).map(year=>`<section class="history-year-block">
        <header><span>${year}</span><h2>${year}년 방송 이력</h2><small>${groups[year].length}개 기록</small></header>
        <div class="history-timeline">${groups[year].map(row=>{
          const children=subEvents(row);
          return `<article class="history-timeline-item ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}">
            <div class="history-timeline-date">${esc(displayDate(row))}</div>
            <div class="history-timeline-card">
              <div class="history-timeline-meta"><span>${esc(row.kind||'방송')}</span>${row.featured?'<b>주요 이력</b>':''}${statusBadge(row)}${sourceBadges(row)}</div>
              <h3>${esc(row.label)}</h3>
              ${row.detail?`<p>${esc(row.detail)}</p>`:''}
              ${children.length?`<details class="history-event-details"><summary>세부 방송 기록 ${children.length}개 보기 <span>⌄</span></summary><ol>${children.map(item=>`<li><time>${esc(fmt(item.date))}</time><span>${esc(item.label)}</span></li>`).join('')}</ol></details>`:''}
            </div>
          </article>`;}).join('')}</div>
      </section>`).join('')}
      <footer class="history-curated-source"><strong>데이터 기준</strong><p>2025년 이후 날짜·기간은 Google Sheet를 우선하고, SOOP 공식 기록·방송국·공개 자료는 역할과 설명 보강 및 교차 확인에 사용합니다. 2024년 이전은 기존 공식/공개 자료 검증 기록을 유지합니다.</p><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 방송 이력 원본 ↗</a></footer>
    </section>`;
  }

  function updateViewUI(){
    viewButtons.forEach(button=>{
      const active=button.dataset.historyView===currentView;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(viewTitle) viewTitle.textContent=currentView==='simple'?'핵심 방송 이력':'연도별 상세 방송 이력';
    if(viewDesc) viewDesc.textContent=currentView==='simple'
      ?'2025년 이후는 Google Sheet 기준의 핵심 사건만 간결하게 확인합니다.'
      :'Google Sheet 대표 기록 전체와 연결된 세부 방송 흐름을 확인합니다.';
    document.body.dataset.historyView=currentView;
    if(guide) guide.hidden=currentView==='simple';
  }

  function render(){
    if(!root) return;
    if(currentView==='detail') renderDetail(); else renderSimple();
    updateViewUI();
    if(status){
      const suffix=liveFetchedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(liveFetchedAt))+' KST':'';
      status.textContent=liveReady?`Google Sheet 연동 · 2025~2026 최신 기록${suffix?' · '+suffix:''}`:`검증 스냅샷 표시 중 · Google Sheet 연결 확인 중`;
    }
  }

  function setView(view){
    currentView=view==='detail'?'detail':'simple';
    localStorage.setItem('chunbong-history-view',currentView);
    render();
  }

  async function loadLiveSheets(){
    try{
      const urls=['2025','2026','26.9'].map(sheet=>`/api/history-sheet?sheet=${encodeURIComponent(sheet)}`);
      const responses=await Promise.all(urls.map(url=>fetch(url,{headers:{accept:'application/json'},cache:'no-store'})));
      if(responses.some(response=>!response.ok)) throw new Error('sheet response failed');
      const [y2025,y2026,m2609]=await Promise.all(responses.map(response=>response.json()));
      if(!y2025.ok||!y2026.ok||!Array.isArray(y2025.items)||!Array.isArray(y2026.items)||y2025.items.length<30||y2026.items.length<40) throw new Error('sheet data incomplete');
      liveAnnual=[...y2025.items,...y2026.items].map(enrichSheetRecord);
      liveMonth=Array.isArray(m2609.items)?m2609.items:[];
      liveFetchedAt=y2026.fetchedAt||y2025.fetchedAt||'';
      liveReady=true;
      render();
    }catch(error){
      liveReady=false;
      if(status) status.textContent='검증 스냅샷 표시 중 · Google Sheet 연결 지연';
    }
  }

  viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.historyView)));
  window.__CHUNBONG_HISTORY_HELPERS__={records,displayDate,renderSimple,renderDetail,setView,loadLiveSheets};
  render();
  loadLiveSheets();
})();