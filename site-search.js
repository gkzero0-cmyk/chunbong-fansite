(() => {
  'use strict';
  const header=document.querySelector('.site-header');
  if(!header||header.querySelector('.site-search')) return;

  const PAGES=[
    {title:'홈',meta:'춘봉 팬사이트 메인',href:'index.html',label:'HOME',keywords:'메인 홈'},
    {title:'방송 일정',meta:'오늘과 예정된 방송 일정',href:'schedule.html',label:'일정',keywords:'스케줄 방송'},
    {title:'공지',meta:'SOOP 공식 공지',href:'notice.html',label:'공지',keywords:'알림 소식'},
    {title:'다시보기',meta:'최근 방송 다시보기',href:'vod.html',label:'VOD',keywords:'방송 영상'},
    {title:'핫클립',meta:'Catch와 클립',href:'clips.html',label:'CLIP',keywords:'캐치 짧은영상'},
    {title:'팬아트',meta:'팬카페 팬아트 갤러리',href:'fanart.html',label:'ART',keywords:'그림 갤러리'},
    {title:'유튜브',meta:'춘봉TV 영상과 Shorts',href:'youtube.html',label:'YT',keywords:'youtube shorts 쇼츠'},
    {title:'타로 보기',meta:'78장 풀덱 타로 리딩',href:'tarot.html',label:'TAROT',keywords:'운세 카드'},
    {title:'미니게임',meta:'춘트리스 · 춘박게임 · 춘과게임 · 춘컬타일',href:'minigames.html',label:'GAME',keywords:'게임 테트리스'},
    {title:'춘봉 방송 이력',meta:'공식 방송 기록',href:'history.html',label:'기록',keywords:'히스토리 방송이력'},
    {title:'춘봉 데이터',meta:'SOOP · YouTube 공개 데이터',href:'data.html',label:'DATA',keywords:'통계 분석 그래프'},
    {title:'업데이트 일지',meta:'팬사이트 변경 기록',href:'changelog.html',label:'LOG',keywords:'변경 업데이트'}
  ];
  const wrapper=document.createElement('div');
  wrapper.className='site-search';
  wrapper.innerHTML='<button class="site-search-button" type="button" aria-label="통합검색 열기" title="통합검색 (Ctrl/⌘+K)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg><span class="site-search-shortcut">⌘K</span></button>';
  const activity=header.querySelector('.activity-center');
  const changelog=header.querySelector('.changelog-button');
  const theme=header.querySelector('.theme-toggle');
  const navToggle=header.querySelector('.nav-toggle');
  if(activity) activity.insertAdjacentElement('beforebegin',wrapper);
  else if(changelog) changelog.insertAdjacentElement('afterend',wrapper);
  else if(theme) theme.insertAdjacentElement('afterend',wrapper);
  else header.insertBefore(wrapper,navToggle||null);

  const dialog=document.createElement('dialog');
  dialog.className='site-search-dialog';
  dialog.setAttribute('aria-label','춘봉 팬사이트 통합검색');
  dialog.innerHTML='<div class="site-search-shell"><div class="site-search-head"><div class="site-search-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg><input class="site-search-input" type="search" autocomplete="off" spellcheck="false" placeholder="일정, 공지, 영상, 팬아트 등을 검색하세요" aria-label="검색어"><button class="site-search-close" type="button" aria-label="검색 닫기">×</button></div></div><div class="site-search-body"><div class="site-search-status" aria-live="polite"></div><div class="site-search-results"></div><div class="site-search-help">↑↓ 이동 · Enter 열기 · Esc 닫기</div></div></div>';
  document.body.appendChild(dialog);
  const openButton=wrapper.querySelector('.site-search-button');
  const input=dialog.querySelector('.site-search-input');
  const closeButton=dialog.querySelector('.site-search-close');
  const status=dialog.querySelector('.site-search-status');
  const results=dialog.querySelector('.site-search-results');
  const state={remote:[],loaded:false,loading:false,active:-1};

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const norm=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();
  const fetchJson=async(type)=>{
    const key='site-search:'+type;
    const url='/api/content?type='+type;
    if(window.ChunbongCache) return window.ChunbongCache.fetchJson(key,url,{ttl:180000});
    const response=await fetch(url,{headers:{accept:'application/json'}});
    if(!response.ok) throw new Error('HTTP '+response.status);
    return response.json();
  };
  const formatSchedule=item=>{
    const start=item?.start?new Date(item.start):null;
    const when=start&&!Number.isNaN(start.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(start):'일정';
    return {title:item?.title||'춘봉 방송 일정',meta:when+' · '+(Array.isArray(item?.tags)?item.tags.join(' · '):''),href:item?.link||'schedule.html',label:'일정',keywords:'방송 스케줄'};
  };
  async function loadRemote(){
    if(state.loaded||state.loading) return;
    state.loading=true;status.textContent='최신 콘텐츠 검색 데이터를 불러오는 중...';
    const [activity,schedule]=await Promise.allSettled([fetchJson('activity'),fetchJson('schedule')]);
    const rows=[];
    if(activity.status==='fulfilled') (activity.value?.items||[]).forEach(item=>rows.push({title:item.title||item.label||'새 콘텐츠',meta:[item.label,item.meta,item.originalDate].filter(Boolean).join(' · '),href:item.href||item.sourceHref||'#',label:item.label||'NEW',keywords:[item.type,item.group].filter(Boolean).join(' ')}));
    if(schedule.status==='fulfilled') (schedule.value?.items||[]).forEach(item=>rows.push(formatSchedule(item)));
    state.remote=rows;state.loaded=true;state.loading=false;render();
  }
  function score(row,q){
    if(!q) return 10;
    const title=norm(row.title),meta=norm(row.meta),keywords=norm(row.keywords);
    if(title===q) return 0;
    if(title.startsWith(q)) return 1;
    if(title.includes(q)) return 2;
    if(meta.includes(q)) return 3;
    if(keywords.includes(q)) return 4;
    return 99;
  }
  function currentRows(){
    const q=norm(input.value);
    const staticRows=PAGES.map(row=>({...row,group:'바로가기'}));
    const remoteRows=state.remote.map(row=>({...row,group:'콘텐츠'}));
    return [...staticRows,...remoteRows].map(row=>({...row,_score:score(row,q)})).filter(row=>row._score<99).sort((a,b)=>a._score-b._score||a.title.localeCompare(b.title,'ko')).slice(0,q?28:10);
  }
  function render(){
    const q=norm(input.value),rows=currentRows();
    state.active=-1;
    status.textContent=q?(rows.length?rows.length+'개의 결과':'검색 결과가 없습니다.'):(state.loading?'최신 콘텐츠를 불러오는 중...':'메뉴와 최신 콘텐츠를 검색할 수 있습니다.');
    if(!rows.length){results.innerHTML='<div class="site-search-empty">다른 검색어로 찾아보세요.</div>';return;}
    const groups=new Map();
    rows.forEach(row=>{if(!groups.has(row.group))groups.set(row.group,[]);groups.get(row.group).push(row);});
    results.innerHTML=[...groups.entries()].map(([group,items])=>'<section class="site-search-group"><div class="site-search-group-title">'+esc(group)+'</div>'+items.map(row=>'<a class="site-search-result" href="'+esc(row.href)+'"><span class="site-search-icon">'+esc(String(row.label||'GO').slice(0,5))+'</span><span class="site-search-copy"><strong>'+esc(row.title)+'</strong><small>'+esc(row.meta||'춘봉 팬사이트')+'</small></span><span>›</span></a>').join('')+'</section>').join('');
  }
  function links(){return [...results.querySelectorAll('.site-search-result')];}
  function setActive(next){
    const items=links();if(!items.length)return;
    state.active=(next+items.length)%items.length;
    items.forEach((node,index)=>node.classList.toggle('is-keyboard-active',index===state.active));
    items[state.active].focus({preventScroll:true});items[state.active].scrollIntoView({block:'nearest'});
  }
  function open(){
    if(!dialog.open) dialog.showModal();
    input.value='';render();requestAnimationFrame(()=>input.focus());
    void loadRemote();
  }
  function close(){if(dialog.open)dialog.close();}
  openButton.addEventListener('click',open);
  closeButton.addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  input.addEventListener('input',render);
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'){event.preventDefault();setActive(state.active+1);}
    else if(event.key==='ArrowUp'){event.preventDefault();setActive(state.active-1);}
    else if(event.key==='Enter'&&document.activeElement===input){const first=links()[0];if(first){event.preventDefault();first.click();}}
  });
  document.addEventListener('keydown',event=>{
    const shortcut=(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k';
    if(shortcut){event.preventDefault();dialog.open?close():open();}
  });
  render();
})();