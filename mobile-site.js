(()=>{
  'use strict';
  const body=document.body;
  if(!body?.dataset?.page||body.dataset.game)return;

  const mobile=window.matchMedia('(max-width:760px)');
  const appMedia=window.matchMedia('(display-mode: standalone)');
  const params=new URLSearchParams(window.location.search);
  const launchedFromPwa=params.get('source')==='pwa';
  const appMode=Boolean(appMedia.matches||window.navigator.standalone===true||launchedFromPwa);
  const header=document.querySelector('.site-header');
  const nav=document.getElementById('main-nav');
  const toggle=document.querySelector('.nav-toggle');

  const ICONS={
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.2 12 4l9 7.2v8.3a.5.5 0 0 1-.5.5h-5.2v-6H8.7v6H3.5a.5.5 0 0 1-.5-.5Z"></path></svg>',
    schedule:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"></path><path d="M8 12h3M13 12h3M8 16h3M13 16h3"></path></svg>',
    tarot:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z"></path><path d="M5 4v3M3.5 5.5h3M19 16v4M17 18h4"></path></svg>',
    minigames:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10a4 4 0 0 1 3.8 5.2l-1 3A2.6 2.6 0 0 1 15.6 18L13 16H11l-2.6 2a2.6 2.6 0 0 1-4.2-1.8l-1-3A4 4 0 0 1 7 8Z"></path><path d="M8 11v4M6 13h4M16.5 12h.01M18 14h.01"></path></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle></svg>'
  };

  if(mobile.matches)body.classList.add('mobile-tabbar-mode');
  if(appMode){
    body.classList.add('pwa-app-mode');
    body.dataset.pwaMode='standalone';
    document.documentElement.classList.add('pwa-app-mode');
  }

  function syncNavLock(){
    if(!mobile.matches){
      body.classList.remove('mobile-site-nav-open');
      return;
    }
    body.classList.toggle('mobile-site-nav-open',Boolean(nav?.classList.contains('open')));
  }

  function closeNav(){
    if(!nav?.classList.contains('open'))return;
    nav.classList.remove('open');
    toggle?.setAttribute('aria-expanded','false');
    body.classList.remove('mobile-site-nav-open');
  }

  toggle?.addEventListener('click',()=>requestAnimationFrame(syncNavLock));
  nav?.addEventListener('click',event=>{
    if(event.target.closest('a'))requestAnimationFrame(syncNavLock);
  });

  let moreBackdrop=null;
  let moreButton=null;

  function closeAppMore({restoreFocus=true}={}){
    if(!moreBackdrop||moreBackdrop.hidden)return;
    moreBackdrop.hidden=true;
    body.classList.remove('pwa-app-more-open');
    moreButton?.setAttribute('aria-expanded','false');
    if(restoreFocus)moreButton?.focus();
  }

  function createAppNavigation(){
    if(!mobile.matches||document.querySelector('[data-pwa-app-tabbar]'))return;
    const page=body.dataset.page||'home';
    const primaryPages=new Set(['home','schedule','tarot','minigames']);
    const tabs=[
      {key:'home',href:'index.html',label:'홈'},
      {key:'schedule',href:'schedule.html',label:'일정'},
      {key:'tarot',href:'tarot.html',label:'타로'},
      {key:'minigames',href:'minigames.html',label:'미니게임'}
    ];

    const bar=document.createElement('nav');
    bar.className='pwa-app-tabbar';
    bar.dataset.pwaAppTabbar='';
    bar.setAttribute('aria-label','모바일 빠른 메뉴');
    for(const item of tabs){
      const link=document.createElement('a');
      link.href=item.href;
      link.dataset.pwaAppTab=item.key;
      link.innerHTML=`${ICONS[item.key]}<span>${item.label}</span>`;
      if(page===item.key){
        link.classList.add('is-active');
        link.setAttribute('aria-current','page');
      }
      bar.appendChild(link);
    }

    moreButton=document.createElement('button');
    moreButton.type='button';
    moreButton.setAttribute('data-pwa-app-more-toggle','');
    moreButton.setAttribute('aria-expanded','false');
    moreButton.setAttribute('aria-controls','pwa-app-more-sheet');
    moreButton.innerHTML=`${ICONS.more}<span>더보기</span>`;
    if(!primaryPages.has(page))moreButton.classList.add('is-active');
    bar.appendChild(moreButton);

    moreBackdrop=document.createElement('div');
    moreBackdrop.className='pwa-app-more-backdrop';
    moreBackdrop.dataset.pwaAppMore='';
    moreBackdrop.hidden=true;
    moreBackdrop.innerHTML=`
      <section class="pwa-app-more-sheet" id="pwa-app-more-sheet" role="dialog" aria-modal="true" aria-labelledby="pwa-app-more-title">
        <div class="pwa-app-more-head">
          <div><small>CHUNBONG FAN HUB</small><strong id="pwa-app-more-title">더보기</strong></div>
          <button type="button" class="pwa-app-more-close" aria-label="더보기 닫기">×</button>
        </div>
        <div class="pwa-app-more-grid">
          <a href="notice.html" data-more-page="notice"><span>공지</span><small>최신 공지</small></a>
          <a href="vod.html" data-more-page="vod"><span>다시보기</span><small>방송 VOD</small></a>
          <a href="clips.html" data-more-page="clips"><span>핫클립</span><small>CATCH · 클립</small></a>
          <a href="fanart.html" data-more-page="fanart"><span>팬아트</span><small>팬 작품</small></a>
          <a href="youtube.html" data-more-page="youtube"><span>유튜브</span><small>춘봉TV</small></a>
          <a href="history.html" data-more-page="history"><span>방송 이력</span><small>방송 기록</small></a>
          <a href="data.html" data-more-page="data"><span>춘봉 데이터</span><small>통계 · 분석</small></a>
          <a href="changelog.html" data-more-page="changelog"><span>업데이트</span><small>변경 기록</small></a>
          <a href="myhub.html" data-more-page="myhub"><span>내 팬허브</span><small>보관함 · 기록</small></a>
        </div>
      </section>`;

    moreBackdrop.querySelectorAll('[data-more-page]').forEach(link=>{
      const active=link.dataset.morePage===page;
      if(active){
        link.classList.add('is-active');
        link.setAttribute('aria-current','page');
      }
    });

    const openMore=()=>{
      closeNav();
      moreBackdrop.hidden=false;
      body.classList.add('pwa-app-more-open');
      moreButton.setAttribute('aria-expanded','true');
      requestAnimationFrame(()=>moreBackdrop.querySelector('.pwa-app-more-close')?.focus());
    };
    moreButton.addEventListener('click',()=>{
      if(moreBackdrop.hidden)openMore();
      else closeAppMore();
    });
    moreBackdrop.querySelector('.pwa-app-more-close')?.addEventListener('click',()=>closeAppMore());
    moreBackdrop.addEventListener('click',event=>{
      if(event.target===moreBackdrop)closeAppMore();
    });
    moreBackdrop.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeAppMore({restoreFocus:false})));

    document.body.append(moreBackdrop,bar);
  }

  function createIosInstallHelp(){
    if(appMode||!mobile.matches||body.dataset.page!=='home'||document.querySelector('[data-pwa-ios-install]'))return;
    const ua=navigator.userAgent||'';
    const isIos=/iPhone|iPad|iPod/i.test(ua);
    const isSafari=/Safari/i.test(ua)&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    if(!isIos||!isSafari)return;

    const button=document.createElement('button');
    button.type='button';
    button.className='pwa-ios-install-chip';
    button.dataset.pwaIosInstall='';
    button.innerHTML='<span aria-hidden="true">＋</span><strong>홈 화면에 추가</strong>';

    const guide=document.createElement('div');
    guide.className='pwa-ios-guide-backdrop';
    guide.dataset.pwaIosGuide='';
    guide.hidden=true;
    guide.innerHTML=`
      <section class="pwa-ios-guide" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-guide-title">
        <button type="button" class="pwa-ios-guide-close" aria-label="설치 안내 닫기">×</button>
        <small>iPhone · Safari</small>
        <h2 id="pwa-ios-guide-title">춘봉 팬허브를 앱처럼 사용하기</h2>
        <ol>
          <li><b>1</b><span>Safari 아래쪽의 <strong>공유</strong> 버튼을 누릅니다.</span></li>
          <li><b>2</b><span><strong>홈 화면에 추가</strong>를 선택합니다.</span></li>
          <li><b>3</b><span><strong>추가</strong>를 누르면 홈 화면에서 앱처럼 실행됩니다.</span></li>
        </ol>
      </section>`;

    const close=()=>{
      guide.hidden=true;
      body.classList.remove('pwa-ios-guide-open');
      button.focus();
    };
    button.addEventListener('click',()=>{
      guide.hidden=false;
      body.classList.add('pwa-ios-guide-open');
      requestAnimationFrame(()=>guide.querySelector('.pwa-ios-guide-close')?.focus());
    });
    guide.querySelector('.pwa-ios-guide-close')?.addEventListener('click',close);
    guide.addEventListener('click',event=>{if(event.target===guide)close();});
    document.body.append(button,guide);
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      if(moreBackdrop&&!moreBackdrop.hidden){
        closeAppMore();
        return;
      }
      const iosGuide=document.querySelector('[data-pwa-ios-guide]');
      if(iosGuide&&!iosGuide.hidden){
        iosGuide.querySelector('.pwa-ios-guide-close')?.click();
        return;
      }
      if(mobile.matches&&nav?.classList.contains('open')){
        closeNav();
        toggle?.focus();
      }
    }
  });

  document.addEventListener('click',event=>{
    if(!mobile.matches||!nav?.classList.contains('open'))return;
    if(nav.contains(event.target)||toggle?.contains(event.target))return;
    closeNav();
  });

  function syncHeader(){
    if(!header)return;
    header.classList.toggle('is-mobile-scrolled',mobile.matches&&window.scrollY>16);
  }

  function syncViewport(){
    const height=window.visualViewport?.height||window.innerHeight;
    document.documentElement.style.setProperty('--mobile-visual-height',height+'px');
    const keyboardOpen=Boolean(
      mobile.matches&&window.visualViewport&&
      (window.innerHeight-window.visualViewport.height)>120
    );
    body.classList.toggle('pwa-app-keyboard-open',keyboardOpen);
  }

  const horizontalSelectors=[
    '.schedule-view-toolbar','.schedule-week-nav','.schedule-calendar-scroll',
    '.clip-tabs','.youtube-tabs','.hero-tags','.footer-links',
    '.data-platform-tabs','.data-soop-view-tabs','.data-period-controls',
    '.data-detail-table','.data-calendar-wrap'
  ];
  function labelScrollable(){
    if(!mobile.matches)return;
    horizontalSelectors.forEach(selector=>{
      document.querySelectorAll(selector).forEach(node=>{
        node.dataset.mobileScrollable='true';
      });
    });
  }

  mobile.addEventListener?.('change',()=>{
    body.classList.toggle('mobile-tabbar-mode',mobile.matches);
    syncNavLock();
    syncHeader();
    syncViewport();
    labelScrollable();
    createAppNavigation();
    createIosInstallHelp();
  });
  appMedia.addEventListener?.('change',()=>window.location.reload());
  window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});
  window.addEventListener('resize',()=>{syncViewport();labelScrollable()},{passive:true});
  window.addEventListener('scroll',syncHeader,{passive:true});

  syncNavLock();
  syncHeader();
  syncViewport();
  labelScrollable();
  createAppNavigation();
  createIosInstallHelp();
})();

/* Mobile/PWA experience wave 1 — installed-app dashboard, tarot dock, floating UI coordination. */
(()=>{
  'use strict';
  const body=document.body;
  if(!body?.dataset?.page||body.dataset.game)return;
  const mobile=window.matchMedia('(max-width:760px)');
  const appMode=Boolean(
    window.matchMedia('(display-mode: standalone)').matches||
    window.navigator.standalone===true||
    new URLSearchParams(location.search).get('source')==='pwa'
  );
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const kstKey=(value=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(value);
  const timeText=value=>{
    if(!value||!String(value).includes('T'))return '시간 미정';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '시간 미정';
    return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  };
  async function getJson(type,ttl=60000){
    if(window.ChunbongCache)return window.ChunbongCache.fetchJson('mobile-wave1:'+type,'/api/content?type='+type,{ttl});
    const response=await fetch('/api/content?type='+type,{headers:{accept:'application/json'}});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return response.json();
  }

  async function renderInstalledHome(){
    if(!mobile.matches||!appMode||body.dataset.page!=='home')return;
    const root=document.querySelector('[data-app-home-panel]');
    if(!root)return;
    body.classList.add('pwa-home-dashboard-mode');
    const personal=window.ChunbongPersonal?.read?.()||{};
    const challenge=window.ChunbongPersonal?.dailyChallenge?.();
    const recent=personal.recent||null;
    root.setAttribute('aria-live','polite');
    root.innerHTML='<div class="pwa-dashboard-loading">오늘의 팬허브를 준비하고 있어요.</div>';
    const [liveResult,scheduleResult]=await Promise.allSettled([getJson('live',30000),getJson('schedule',60000)]);
    const live=liveResult.status==='fulfilled'&&liveResult.value?.live===true?liveResult.value:null;
    const items=scheduleResult.status==='fulfilled'&&Array.isArray(scheduleResult.value?.items)?scheduleResult.value.items:[];
    const today=kstKey();
    const todayItems=items.filter(item=>String(item?.start||'').slice(0,10)===today);
    const next=todayItems[0]||items.find(item=>String(item?.start||'').slice(0,10)>=today);
    const recentHref=recent?.href||recent?.sourceHref||'vod.html';
    const recentTitle=recent?.title||'최근 영상 보기';
    const tarotLatest=personal?.tarot?.[0]?.cards?.[0]?.name||'오늘의 카드 보기';
    const liveBlock=live
      ? '<a class="pwa-dashboard-live is-live" href="https://www.sooplive.com/station/chunbongtv" target="_blank" rel="noreferrer"><span class="pwa-live-dot"></span><div><small>LIVE NOW</small><strong>'+esc(live.title||'춘봉 LIVE')+'</strong><p>'+esc([live.categoryName,Number(live.viewerCount)>0?Number(live.viewerCount).toLocaleString('ko-KR')+'명 시청 중':'지금 방송 중'].filter(Boolean).join(' · '))+'</p></div><b>SOOP에서 보기 →</b></a>'
      : '<a class="pwa-dashboard-live" href="schedule.html"><span class="pwa-live-dot"></span><div><small>'+(next?'NEXT SCHEDULE':'TODAY')+'</small><strong>'+esc(next?.title||'오늘 등록된 방송 일정이 없습니다.')+'</strong><p>'+esc(next?((String(next.start||'').slice(0,10)===today?'오늘 ':'')+timeText(next.start)):'새 일정이 등록되면 여기에 표시됩니다.')+'</p></div><b>일정 보기 →</b></a>';
    root.innerHTML=
      '<div class="pwa-dashboard-head"><div><small>CHUNBONG FAN HUB</small><strong>오늘의 팬허브</strong></div><a href="myhub.html">내 기록 →</a></div>'+
      liveBlock+
      '<div class="pwa-dashboard-grid">'+
        '<a href="tarot.html"><small>오늘의 타로</small><strong>'+esc(tarotLatest)+'</strong><span>카드 보러가기 →</span></a>'+
        '<a href="'+esc(challenge?.href||'minigames.html')+'"><small>오늘의 미션</small><strong>'+esc(challenge?.title||'미니게임 도전')+'</strong><span>'+esc(challenge?((challenge.completed?'완료 ✓':challenge.progress+'/'+challenge.goal+' 진행')):'도전 보기')+'</span></a>'+
        '<a href="'+esc(recentHref)+'"><small>이어보기</small><strong>'+esc(recentTitle)+'</strong><span>계속 보기 →</span></a>'+
        '<a href="myhub.html"><small>내 팬허브</small><strong>보관함 '+Number(personal?.favorites?.length||0)+' · 타로 '+Number(personal?.tarot?.length||0)+'</strong><span>기록 열기 →</span></a>'+
      '</div>';
  }

  function setupTarotSelectionDock(){
    if(!mobile.matches||body.dataset.page!=='tarot'||document.querySelector('[data-mobile-tarot-dock]'))return;
    const stage=document.getElementById('tarot-stage');
    const slots=document.getElementById('tarot-selected-slots');
    const confirm=document.getElementById('tarot-confirm-selection');
    if(!stage||!slots||!confirm)return;
    const dock=document.createElement('aside');
    dock.className='mobile-tarot-dock';
    dock.dataset.mobileTarotDock='';
    dock.hidden=true;
    dock.innerHTML='<button type="button" class="mobile-tarot-dock-summary" aria-expanded="false"><span>선택한 카드</span><strong>0 / 0</strong></button><div class="mobile-tarot-dock-cards" hidden></div><button type="button" class="mobile-tarot-dock-confirm" disabled>선택 완료</button>';
    document.body.appendChild(dock);
    const summary=dock.querySelector('.mobile-tarot-dock-summary');
    const list=dock.querySelector('.mobile-tarot-dock-cards');
    const dockConfirm=dock.querySelector('.mobile-tarot-dock-confirm');
    const sync=()=>{
      const all=[...slots.querySelectorAll('.tarot-selected-slot')];
      const filled=all.filter(node=>node.classList.contains('is-filled'));
      const selecting=!confirm.hidden;
      dock.hidden=!selecting||all.length===0;
      summary.querySelector('strong').textContent=filled.length+' / '+all.length;
      list.innerHTML=filled.length?filled.map((node,index)=>'<span><b>'+(index+1)+'</b>'+esc(node.textContent.trim())+'</span>').join(''):'<span class="is-empty">카드를 선택하면 여기에 표시됩니다.</span>';
      dockConfirm.disabled=confirm.disabled;
      dockConfirm.textContent=confirm.disabled?'카드를 '+all.length+'장 선택해 주세요':'선택 완료 · 카드 펼치기';
      body.classList.toggle('mobile-tarot-dock-visible',!dock.hidden);
    };
    summary.addEventListener('click',()=>{
      const open=summary.getAttribute('aria-expanded')!=='true';
      summary.setAttribute('aria-expanded',String(open));
      list.hidden=!open;
    });
    dockConfirm.addEventListener('click',()=>{if(!confirm.disabled)confirm.click();});
    new MutationObserver(sync).observe(slots,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    new MutationObserver(sync).observe(confirm,{attributes:true,attributeFilter:['hidden','disabled']});
    document.addEventListener('chunbong:tarot-reading',()=>{dock.hidden=true;body.classList.remove('mobile-tarot-dock-visible')});
    sync();
  }

  function coordinateFloatingUi(){
    if(!mobile.matches)return;
    const sync=()=>{
      const launcher=document.querySelector('.daily-fortune-launcher:not([hidden])');
      body.classList.toggle('has-mobile-fortune-launcher',Boolean(launcher));
    };
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    sync();
  }

  const boot=()=>{
    void renderInstalledHome();
    setupTarotSelectionDock();
    coordinateFloatingUi();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  document.addEventListener('chunbong:personal-updated',()=>{void renderInstalledHome();});
})();


/* Installed PWA compact app header. */
(()=>{
  'use strict';
  const mobile=window.matchMedia('(max-width:760px)');
  const appMode=Boolean(
    window.matchMedia('(display-mode: standalone)').matches||
    window.navigator.standalone===true||
    new URLSearchParams(location.search).get('source')==='pwa'
  );
  if(!mobile.matches||!appMode)return;
  const body=document.body,header=document.querySelector('.site-header'),brand=header?.querySelector('.brand');
  if(!header||!brand||header.dataset.pwaCompactHeader==='true')return;
  header.dataset.pwaCompactHeader='true';
  header.classList.add('pwa-compact-header');
  const labels={
    home:'홈',schedule:'방송 일정',notice:'공지',vod:'다시보기',clips:'핫클립',
    fanart:'팬아트',youtube:'유튜브',tarot:'춘봉 타로',minigames:'미니게임',
    history:'방송 이력',data:'춘봉 데이터',changelog:'업데이트',myhub:'내 팬허브'
  };
  const page=body.dataset.page||'home';
  const copy=brand.querySelector('.brand-copy');
  if(copy){
    const strong=copy.querySelector('strong'),small=copy.querySelector('small');
    if(strong)strong.textContent=labels[page]||'춘봉 팬허브';
    if(small)small.textContent='CHUNBONG FAN HUB';
  }
  const action=document.createElement('a');
  action.className='pwa-header-action';
  action.href=page==='myhub'?'index.html':'myhub.html';
  action.setAttribute('aria-label',page==='myhub'?'홈으로 이동':'내 팬허브 열기');
  action.innerHTML=page==='myhub'
    ? '<span aria-hidden="true">⌂</span><small>홈</small>'
    : '<span aria-hidden="true">CB</span><small>MY</small>';
  header.appendChild(action);
})();
