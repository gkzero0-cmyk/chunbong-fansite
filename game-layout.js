(()=>{
  'use strict';
  const game=document.body?.dataset?.game;
  if(!['chungwagame','chuncortile'].includes(game))return;

  const page=document.querySelector(game==='chungwagame'?'.chungwagame-page':'.chuncortile-page');
  const wrap=document.querySelector(game==='chungwagame'?'.cg-board-wrap':'.ct-board-wrap');
  const card=document.querySelector(game==='chungwagame'?'.cg-board-card':'.ct-board-card');
  if(!page||!wrap||!card)return;

  const desktop=window.matchMedia('(min-width: 900px)');
  const BOARD_RATIO=17/10;
  let raf=0;

  function viewportHeight(){
    return window.visualViewport?.height||window.innerHeight||document.documentElement.clientHeight||0;
  }

  function markReady(){
    document.body.dataset.gameLayoutReady='ready';
  }

  function applyFit(){
    raf=0;
    if(!desktop.matches){
      page.style.removeProperty('--game-board');
      markReady();
      return;
    }

    const wrapRect=wrap.getBoundingClientRect();
    const cardRect=card.getBoundingClientRect();
    const extraBelow=Math.max(0,cardRect.bottom-wrapRect.bottom);
    const safeBottom=12;
    const available=Math.max(0,viewportHeight()-wrapRect.top-extraBelow-safeBottom);
    if(!available){
      markReady();
      return;
    }

    const naturalWidth=wrapRect.width;
    const fittedWidth=Math.floor(available*BOARD_RATIO);
    if(fittedWidth>0&&fittedWidth<naturalWidth-1){
      page.style.setProperty('--game-board',fittedWidth+'px');
    }
    markReady();
  }

  function fitBoard(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(applyFit);
  }

  /* Run once synchronously before the heavier game runtimes execute.
     This prevents the old two-frame "large board -> smaller board" entry jump. */
  applyFit();

  window.addEventListener('resize',fitBoard,{passive:true});
  window.visualViewport?.addEventListener('resize',fitBoard,{passive:true});
  desktop.addEventListener?.('change',fitBoard);
  document.fonts?.ready?.then(fitBoard).catch(()=>{});
})();