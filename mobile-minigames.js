(()=>{
  'use strict';
  const body=document.body;
  const game=body?.dataset?.game;
  if(!game)return;

  const mobileQuery=window.matchMedia('(max-width: 760px)');
  const coarseQuery=window.matchMedia('(pointer: coarse)');
  const landscapeQuery=window.matchMedia('(orientation: landscape)');
  const handheldAtLoad=mobileQuery.matches||coarseQuery.matches;
  const isHandheld=()=>handheldAtLoad||mobileQuery.matches||coarseQuery.matches||
    (navigator.maxTouchPoints>0&&Math.min(window.innerWidth,window.innerHeight)<=760);
  const landscapeGames=new Set(['chungwagame','chuncortile']);
  const landscapeEnabled=landscapeGames.has(game);

  const roots={
    chuntris:document.getElementById('chuntris-game'),
    chunbak:document.getElementById('chunbak-game'),
    chungwagame:document.getElementById('chungwagame'),
    chuncortile:document.getElementById('chuncortile')
  };
  const root=roots[game];
  if(!root)return;

  let lastStatus=root.dataset.gameStatus||'';
  let boardPanned=false;
  let landscapeSession=false;
  let pendingControl=null;
  let bypassControl=false;
  let orientationPaused=false;
  let landscapeGate=null;
  let gateResume=null;
  let gateTitle=null;
  let gateCopy=null;
  let fullscreenOwned=false;
  const chungwaCountdown=document.getElementById('cg-countdown');
  const chungwaCountdownValue=chungwaCountdown?.querySelector('strong')||null;
  let countdownToken=0;
  let countdownControl=null;

  const viewportSize=()=>{
    const visual=window.visualViewport;
    return {width:visual?.width||window.innerWidth,height:visual?.height||window.innerHeight};
  };
  const isLandscape=()=>{
    const {width,height}=viewportSize();
    if(Math.abs(width-height)>2)return width>height;
    if(landscapeQuery.matches)return true;
    const orientationType=String(screen.orientation?.type||'');
    return orientationType.startsWith('landscape');
  };
  const isPortrait=()=>!isLandscape();
  const landscapeApi=()=>{
    if(game==='chungwagame')return globalThis.ChungwagameApp||null;
    if(game==='chuncortile')return globalThis.ChuncortileApp||null;
    return null;
  };

  function setViewportVars(){
    const visual=window.visualViewport;
    const width=visual?.width||window.innerWidth;
    const height=visual?.height||window.innerHeight;
    document.documentElement.style.setProperty('--mobile-landscape-width',width+'px');
    document.documentElement.style.setProperty('--mobile-landscape-height',height+'px');
  }

  function createLandscapeGate(){
    if(!landscapeEnabled||landscapeGate)return;
    landscapeGate=document.createElement('div');
    landscapeGate.className='mobile-landscape-gate';
    landscapeGate.dataset.mobileLandscapeGate='';
    landscapeGate.hidden=true;
    const gameName=game==='chungwagame'?'춘과게임':'춘컬타일';
    landscapeGate.innerHTML=`
      <section class="mobile-landscape-card" role="dialog" aria-modal="true" aria-labelledby="mobile-landscape-title">
        <div class="mobile-landscape-rotate" aria-hidden="true"><span>↻</span><b>▭</b></div>
        <p class="mobile-landscape-kicker">LANDSCAPE PLAY</p>
        <h2 id="mobile-landscape-title">휴대폰을 가로로 돌려주세요</h2>
        <p data-mobile-landscape-copy>${gameName}은 모바일 가로 화면에 맞춰 게임판과 조작 버튼을 크게 표시합니다.</p>
        <small>화면 회전 잠금이 켜져 있다면 잠금을 해제해 주세요.</small>
        <button type="button" class="mobile-landscape-resume" data-mobile-landscape-resume hidden>계속하기</button>
        <a href="minigames.html" class="mobile-landscape-exit">← 미니게임으로 돌아가기</a>
      </section>`;
    gateResume=landscapeGate.querySelector('[data-mobile-landscape-resume]');
    gateTitle=landscapeGate.querySelector('#mobile-landscape-title');
    gateCopy=landscapeGate.querySelector('[data-mobile-landscape-copy]');
    gateResume?.addEventListener('click',async()=>{
      if(gateResume.dataset.action==='rotate'){
        await requestLandscapeLock();
        setTimeout(syncLandscapeMode,80);
        return;
      }
      if(isPortrait())return;
      const api=landscapeApi();
      if(!orientationPaused||!api?.resumeGame)return;
      if(api.resumeGame()){
        orientationPaused=false;
        hideLandscapeGate();
        syncLandscapeMode();
      }
    });
    landscapeGate.querySelector('.mobile-landscape-exit')?.addEventListener('click',()=>endLandscapeSession());
    document.body.appendChild(landscapeGate);
  }

  function showLandscapeGate(mode='rotate'){
    createLandscapeGate();
    if(!landscapeGate)return;
    const gameName=game==='chungwagame'?'춘과게임':'춘컬타일';
    if(mode==='resume'){
      gateTitle.textContent='게임이 일시정지되었습니다';
      gateCopy.textContent='가로 화면으로 돌아왔습니다. 준비되면 계속하기를 눌러주세요.';
      gateResume.dataset.action='resume';
      gateResume.textContent='계속하기';
      gateResume.hidden=false;
    }else if(mode==='paused-rotate'){
      gateTitle.textContent='세로 화면으로 전환되어 일시정지했습니다';
      gateCopy.textContent='게임 기록은 그대로 유지됩니다. 휴대폰을 가로로 돌리거나 아래 버튼으로 다시 시도해 주세요.';
      gateResume.dataset.action='rotate';
      gateResume.textContent='가로모드 다시 시도';
      gateResume.hidden=false;
    }else{
      gateTitle.textContent='휴대폰을 가로로 돌려주세요';
      gateCopy.textContent=`${gameName}은 모바일 가로 화면에 맞춰 게임판과 조작 버튼을 크게 표시합니다. 자동 회전이 되지 않으면 아래 버튼을 눌러주세요.`;
      gateResume.dataset.action='rotate';
      gateResume.textContent='가로모드 실행';
      gateResume.hidden=false;
    }
    landscapeGate.hidden=false;
    body.classList.add('mobile-landscape-gate-open');
  }

  function hideLandscapeGate(){
    if(landscapeGate)landscapeGate.hidden=true;
    body.classList.remove('mobile-landscape-gate-open');
  }

  async function requestLandscapeLock(){
    try{
      if(!document.fullscreenElement&&typeof document.documentElement.requestFullscreen==='function'){
        const request=document.documentElement.requestFullscreen({navigationUI:'hide'});
        fullscreenOwned=true;
        await Promise.resolve(request).catch(()=>{fullscreenOwned=false;});
      }
    }catch(_){fullscreenOwned=false;}
    try{
      const lock=screen.orientation?.lock;
      if(typeof lock==='function')await Promise.resolve(lock.call(screen.orientation,'landscape')).catch(()=>{});
    }catch(_){}
  }

  function releaseLandscapeLock(){
    try{screen.orientation?.unlock?.();}catch(_){}
    if(fullscreenOwned&&document.fullscreenElement&&typeof document.exitFullscreen==='function'){
      Promise.resolve(document.exitFullscreen()).catch(()=>{});
    }
    fullscreenOwned=false;
  }

  function beginLandscapeSession(){
    if(!landscapeEnabled||!isHandheld())return false;
    landscapeSession=true;
    body.classList.add('mobile-landscape-game-session');
    body.dataset.mobileLandscape='active';
    setViewportVars();
    requestLandscapeLock();
    return true;
  }

  function endLandscapeSession(){
    if(!landscapeSession&&!body.classList.contains('mobile-landscape-game-session'))return;
    landscapeSession=false;
    pendingControl=null;
    orientationPaused=false;
    cancelChungwaCountdown();
    hideLandscapeGate();
    body.classList.remove(
      'mobile-landscape-game-session',
      'mobile-landscape-game-ready',
      'mobile-landscape-game-portrait',
      'mobile-landscape-orientation-paused'
    );
    delete body.dataset.mobileLandscape;
    releaseLandscapeLock();
  }

  function triggerControlNow(control){
    if(!control||!document.contains(control))return;
    bypassControl=true;
    control.click();
    queueMicrotask(()=>{bypassControl=false;});
  }

  function cancelChungwaCountdown(){
    countdownToken+=1;
    countdownControl=null;
    body.classList.remove('mobile-game-countdown');
    if(chungwaCountdown){
      chungwaCountdown.classList.add('hidden');
      chungwaCountdown.classList.remove('pop');
      delete chungwaCountdown.dataset.step;
    }
  }

  async function runChungwaCountdown(control){
    if(game!=='chungwagame'||!isHandheld()||!chungwaCountdown||!chungwaCountdownValue){
      triggerControlNow(control);
      return;
    }

    const token=++countdownToken;
    countdownControl=control;
    pendingControl=null;
    if((root.dataset.gameStatus||'')==='playing')globalThis.ChungwagameApp?.pauseGame?.(false);
    body.classList.add('mobile-game-countdown');
    hideLandscapeGate();

    /* Let the landscape viewport variables and final board footprint settle first.
       The game timer has not started yet because the original start control is still blocked. */
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(token!==countdownToken||isPortrait())return;

    chungwaCountdown.classList.remove('hidden');
    const labels=['3','2','1','START!'];
    for(const label of labels){
      if(token!==countdownToken)return;
      chungwaCountdownValue.textContent=label;
      chungwaCountdown.dataset.step=label==='START!'?'start':label;
      chungwaCountdown.classList.remove('pop');
      void chungwaCountdownValue.offsetWidth;
      chungwaCountdown.classList.add('pop');
      await new Promise(resolve=>setTimeout(resolve,label==='START!'?420:650));
    }

    if(token!==countdownToken)return;
    chungwaCountdown.classList.add('hidden');
    chungwaCountdown.classList.remove('pop');
    delete chungwaCountdown.dataset.step;
    body.classList.remove('mobile-game-countdown');
    countdownControl=null;
    triggerControlNow(control);
  }

  function pauseForOrientation(){
    if(orientationPaused)return;
    const api=landscapeApi();
    const status=root.dataset.gameStatus||'';
    if(status!=='playing'||!api?.pauseGame)return;
    if(api.pauseGame(false)){
      orientationPaused=true;
      body.classList.add('mobile-landscape-orientation-paused');
    }
  }

  function triggerPendingControl(){
    const control=pendingControl;
    pendingControl=null;
    if(!control||!document.contains(control))return;
    if(game==='chungwagame'&&isHandheld()){
      void runChungwaCountdown(control);
      return;
    }
    triggerControlNow(control);
  }

  function syncLandscapeMode(){
    if(!landscapeEnabled||!landscapeSession)return;
    setViewportVars();
    if(isPortrait()){
      if(countdownControl){
        const control=countdownControl;
        cancelChungwaCountdown();
        pendingControl=control;
      }
      body.classList.add('mobile-landscape-game-portrait');
      body.classList.remove('mobile-landscape-game-ready');
      pauseForOrientation();
      showLandscapeGate(orientationPaused?'paused-rotate':'rotate');
      return;
    }

    body.classList.remove('mobile-landscape-game-portrait');
    body.classList.add('mobile-landscape-game-ready');

    if(pendingControl){
      hideLandscapeGate();
      requestAnimationFrame(triggerPendingControl);
      return;
    }
    if(orientationPaused){
      showLandscapeGate('resume');
      return;
    }
    hideLandscapeGate();
  }

  function installLandscapeStartGuard(){
    if(!landscapeEnabled)return;
    createLandscapeGate();
    const selectors=game==='chungwagame'
      ? ['#cg-start','#cg-again','#cg-restart','#cg-pause-restart']
      : ['#ct-start','#ct-again','#ct-restart','#ct-pause-restart'];
    selectors.forEach(selector=>{
      const control=document.querySelector(selector);
      control?.addEventListener('click',event=>{
        if(bypassControl||!isHandheld())return;
        if(countdownControl){
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        beginLandscapeSession();
        if(isPortrait()){
          event.preventDefault();
          event.stopImmediatePropagation();
          pendingControl=control;
          showLandscapeGate('rotate');
          requestLandscapeLock();
          return;
        }
        if(game==='chungwagame'){
          event.preventDefault();
          event.stopImmediatePropagation();
          syncLandscapeMode();
          void runChungwaCountdown(control);
          return;
        }
        syncLandscapeMode();
      },true);
    });
    document.querySelectorAll('a[href="minigames.html"]').forEach(link=>{
      link.addEventListener('click',endLandscapeSession,{capture:true});
    });
  }

  function centerChuncortile(force=false){
    if(game!=='chuncortile'||!isHandheld()||landscapeSession)return;
    const wrap=document.getElementById('ct-board-wrap');
    if(!wrap||(!force&&boardPanned))return;
    requestAnimationFrame(()=>{
      const max=Math.max(0,wrap.scrollWidth-wrap.clientWidth);
      if(max>0)wrap.scrollLeft=Math.round(max/2);
    });
  }

  function focusGame(status){
    if(!isHandheld()||status!=='playing')return;
    body.classList.add('mobile-game-playing');
    if(landscapeEnabled){
      if(!landscapeSession)beginLandscapeSession();
      syncLandscapeMode();
      return;
    }
    requestAnimationFrame(()=>{
      const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});
      centerChuncortile(true);
    });
  }

  function sync(){
    const status=root.dataset.gameStatus||'';
    body.classList.toggle('mobile-game-playing',isHandheld()&&status==='playing');
    if(landscapeEnabled&&landscapeSession){
      if(status==='gameover'){
        endLandscapeSession();
      }else{
        syncLandscapeMode();
      }
    }
    if(status!==lastStatus){
      focusGame(status);
      lastStatus=status;
    }
  }

  if(game==='chuncortile'){
    const wrap=document.getElementById('ct-board-wrap');
    wrap?.addEventListener('pointerdown',()=>{boardPanned=true},{passive:true});
    setTimeout(()=>centerChuncortile(true),60);
  }

  installLandscapeStartGuard();

  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-game-status']});
  const resync=()=>{sync();centerChuncortile(false);};
  window.addEventListener('resize',resync,{passive:true});
  window.visualViewport?.addEventListener('resize',resync,{passive:true});
  const orientationResync=()=>setTimeout(()=>{sync();centerChuncortile(true)},80);
  window.addEventListener('orientationchange',orientationResync,{passive:true});
  landscapeQuery.addEventListener?.('change',orientationResync);
  screen.orientation?.addEventListener?.('change',orientationResync);
  document.addEventListener('fullscreenchange',orientationResync,{passive:true});
  window.addEventListener('pagehide',()=>{cancelChungwaCountdown();if(landscapeSession)releaseLandscapeLock();},{once:true});
  sync();
})();