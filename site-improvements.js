(() => {
  'use strict';

  const ROUTES = [
    {href:'index.html',label:'홈',keywords:'home 메인 춘봉 팬사이트'},
    {href:'schedule.html',label:'방송 일정',keywords:'schedule 오늘 방송 일정 스케줄'},
    {href:'notice.html',label:'공지',keywords:'notice 공지사항 소식'},
    {href:'vod.html',label:'다시보기',keywords:'vod replay 다시보기 방송'},
    {href:'clips.html',label:'핫클립',keywords:'clip catch 핫클립 클립'},
    {href:'fanart.html',label:'팬아트',keywords:'fanart 팬아트 그림'},
    {href:'youtube.html',label:'유튜브',keywords:'youtube shorts 춘봉tv 영상'},
    {href:'tarot.html',label:'타로',keywords:'tarot 오늘의 운세 카드'},
    {href:'minigames.html',label:'미니게임',keywords:'game 춘트리스 춘박 춘과 춘컬타일'},
    {href:'history.html',label:'방송 이력',keywords:'history 방송 이력 기록'},
    {href:'data.html',label:'춘봉 데이터',keywords:'data 통계 soop youtube 시청자'},
    {href:'changelog.html',label:'업데이트 일지',keywords:'update changelog 업데이트 변경사항'}
  ];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize = value => String(value || '').toLowerCase().replace(/\s+/g,' ').trim();

  function ensureAssets() {
    if (!document.querySelector('link[data-site-improvements]')) {
      const link=document.createElement('link');
      link.rel='stylesheet'; link.href='site-improvements.css'; link.dataset.siteImprovements='true';
      document.head.appendChild(link);
    }
  }

  function buildSearch() {
    const header=document.querySelector('.site-header');
    if(!header || document.querySelector('.site-search-trigger')) return;

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='site-search-trigger';
    trigger.setAttribute('aria-label','사이트 통합검색 열기');
    trigger.title='통합검색 (Ctrl/⌘ + K)';
    trigger.innerHTML='<span aria-hidden="true">⌕</span><b>검색</b><kbd>⌘K</kbd>';

    const anchor=header.querySelector('.changelog-button,.nav-toggle');
    header.insertBefore(trigger,anchor || null);

    const dialog=document.createElement('dialog');
    dialog.className='site-search-dialog';
    dialog.setAttribute('aria-label','춘봉 팬사이트 통합검색');
    dialog.innerHTML=`
      <div class="site-search-shell">
        <div class="site-search-head">
          <span aria-hidden="true">⌕</span>
          <input type="search" autocomplete="off" spellcheck="false" placeholder="일정, 공지, 다시보기, 타로, 미니게임…" aria-label="검색어 입력">
          <button type="button" data-site-search-close aria-label="검색 닫기">×</button>
        </div>
        <div class="site-search-results" role="listbox" aria-label="검색 결과"></div>
        <p class="site-search-help">메뉴와 주요 기능을 한 번에 찾습니다. <kbd>↑</kbd><kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 열기 · <kbd>Esc</kbd> 닫기</p>
      </div>`;
    document.body.appendChild(dialog);

    const input=dialog.querySelector('input');
    const results=dialog.querySelector('.site-search-results');
    let active=0;

    const render=()=>{
      const q=normalize(input.value);
      const rows=ROUTES.filter(row=>!q || normalize(row.label+' '+row.keywords).includes(q)).slice(0,10);
      active=Math.min(active,Math.max(0,rows.length-1));
      results.innerHTML=rows.length ? rows.map((row,i)=>`<a role="option" aria-selected="${i===active}" class="${i===active?'is-active':''}" href="${row.href}"><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.keywords.split(' ').slice(0,4).join(' · '))}</small><span>→</span></a>`).join('') : '<div class="site-search-empty">일치하는 메뉴가 없습니다.</div>';
    };

    const open=()=>{
      if(typeof dialog.showModal==='function'&&!dialog.open) dialog.showModal();
      else dialog.setAttribute('open','');
      active=0; render(); requestAnimationFrame(()=>input.focus());
    };
    const close=()=>{ if(dialog.open&&dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
    trigger.addEventListener('click',open);
    dialog.querySelector('[data-site-search-close]').addEventListener('click',close);
    dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
    input.addEventListener('input',()=>{active=0;render()});
    input.addEventListener('keydown',e=>{
      const links=[...results.querySelectorAll('a')];
      if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(active+1,Math.max(0,links.length-1));render()}
      if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,active-1);render()}
      if(e.key==='Enter'&&links[active]){e.preventDefault();location.href=links[active].href}
      if(e.key==='Escape')close();
    });
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}
    });
    render();
  }

  async function fetchJson(url,timeout=7000){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const res=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
      if(!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  const kstDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

  function firstUseful(items=[]){
    return (Array.isArray(items)?items:[]).find(item=>item&&typeof item==='object')||null;
  }
  function titleOf(item,fallback='확인하기'){
    return item?.title||item?.subject||item?.name||item?.text||fallback;
  }

  async function buildHomeDashboard(){
    if(document.body.dataset.page!=='home'||document.querySelector('.home-today-dashboard')) return;
    const portal=document.querySelector('.portal-section');
    if(!portal) return;
    const section=document.createElement('section');
    section.className='home-today-dashboard';
    section.innerHTML=`
      <div class="home-today-head">
        <div><p class="kicker">TODAY AT CHUNBONG</p><h2>오늘의 춘봉</h2></div>
        <p>오늘 확인할 내용을 빠르게 모았습니다.</p>
      </div>
      <div class="home-today-grid" aria-live="polite">
        <a class="home-today-card" href="schedule.html" data-home-card="schedule"><small>방송 일정</small><strong>일정을 불러오는 중…</strong><span>오늘 일정 확인 →</span></a>
        <a class="home-today-card" href="notice.html" data-home-card="notice"><small>최신 공지</small><strong>공지를 불러오는 중…</strong><span>공지 보기 →</span></a>
        <a class="home-today-card" href="youtube.html" data-home-card="youtube"><small>춘봉TV</small><strong>최신 영상을 불러오는 중…</strong><span>유튜브 보기 →</span></a>
        <a class="home-today-card accent" href="tarot.html"><small>DAILY TAROT</small><strong>오늘의 운세</strong><span>오늘 카드 확인 →</span></a>
      </div>`;
    portal.parentNode.insertBefore(section,portal);

    const update=(key,title,detail='')=>{
      const card=section.querySelector('[data-home-card="'+key+'"]');
      if(!card)return;
      card.querySelector('strong').textContent=title;
      if(detail) card.dataset.detail=detail;
    };

    const today=kstDate();
    const jobs=[
      fetchJson('/api/content?type=schedule').then(data=>{
        const items=Array.isArray(data.items)?data.items:[];
        const todayItem=items.find(item=>String(item?.date||item?.startDate||item?.datetime||'').includes(today))||firstUseful(items);
        update('schedule',todayItem?titleOf(todayItem,'오늘 일정 확인'):'오늘 등록된 일정 없음');
      }).catch(()=>update('schedule','일정 페이지에서 확인하기')),
      fetchJson('/api/content?type=notice').then(data=>{
        const item=firstUseful(data.items);
        update('notice',item?titleOf(item,'최신 공지 확인'):'새 공지 확인하기');
      }).catch(()=>update('notice','공지 페이지에서 확인하기')),
      fetchJson('/api/content?type=youtube').then(data=>{
        const item=firstUseful(data?.groups?.videos)||firstUseful(data.items);
        update('youtube',item?titleOf(item,'최신 영상 확인'):'최신 영상 확인하기');
      }).catch(()=>update('youtube','유튜브 페이지에서 확인하기'))
    ];
    await Promise.allSettled(jobs);
  }

  async function checkDeploymentSync(){
    const CACHE_KEY='chunbong-deploy-sync-v1';
    let cached=null;
    try{cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null')}catch(_){}
    const now=Date.now();
    if(cached&&now-cached.at<10*60*1000) return applyDeploymentState(cached);

    try{
      const [deployed,main]=await Promise.all([
        fetchJson('/api/version',5000),
        fetchJson('https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite/commits/main',5000)
      ]);
      const state={at:now,deployed:String(deployed?.sha||''),main:String(main?.sha||'')};
      try{localStorage.setItem(CACHE_KEY,JSON.stringify(state))}catch(_){}
      applyDeploymentState(state);
    }catch(_){}
  }

  function applyDeploymentState(state){
    const deployed=state?.deployed||'', main=state?.main||'';
    window.ChunbongDeploymentStatus={deployed,main,synced:Boolean(deployed&&main&&deployed===main)};
    if(!deployed||!main||deployed===main||document.querySelector('.deploy-sync-chip')) return;
    const chip=document.createElement('a');
    chip.className='deploy-sync-chip';
    chip.href='changelog.html';
    chip.title='GitHub main의 최신 변경사항이 Production에 아직 반영되지 않았습니다.';
    chip.innerHTML='<i></i><span>사이트 업데이트 반영 중</span>';
    document.body.appendChild(chip);
  }

  function addLoadingGuards(){
    if(document.body.dataset.page==='youtube'){
      const list=document.getElementById('youtube-list');
      if(list) list.setAttribute('aria-busy','true');
      setTimeout(()=>{
        const counts=[...document.querySelectorAll('[data-youtube-count]')];
        const stillLoading=counts.some(n=>n.textContent.trim()==='…'||n.textContent.trim()==='');
        if(stillLoading&&list&&!list.children.length){
          list.setAttribute('aria-busy','false');
          list.innerHTML='<div class="site-load-fallback"><strong>콘텐츠를 불러오지 못했습니다.</strong><p>잠시 후 새로고침하거나 YouTube 채널에서 확인해주세요.</p><button type="button" onclick="location.reload()">다시 불러오기</button></div>';
        }
      },10000);
    }
    if(document.body.dataset.page==='data'){
      const status=document.getElementById('data-status');
      setTimeout(()=>{
        if(!status)return;
        const text=status.textContent||'';
        if(/불러오는 중|계산하는 중/.test(text)){
          status.classList.add('is-delayed');
          const strong=status.querySelector('strong');
          const p=status.querySelector('p');
          if(strong)strong.textContent='데이터 응답이 평소보다 늦습니다.';
          if(p)p.textContent='마지막 정상 데이터가 있으면 그대로 유지하며 다시 시도할 수 있습니다.';
        }
      },12000);
    }
  }

  ensureAssets();
  buildSearch();
  buildHomeDashboard();
  addLoadingGuards();
  checkDeploymentSync();
})();