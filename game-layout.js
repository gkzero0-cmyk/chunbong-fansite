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

  function fitBoard(){
    cancelAnimationFrame(raf);
    page.style.removeProperty('--game-board');
    if(!desktop.matches)return;

    raf=requestAnimationFrame(()=>{
      const wrapRect=wrap.getBoundingClientRect();
      const cardRect=card.getBoundingClientRect();
      const extraBelow=Math.max(0,cardRect.bottom-wrapRect.bottom);
      const safeBottom=12;
      const available=Math.max(0,viewportHeight()-wrapRect.top-extraBelow-safeBottom);
      if(!available)return;

      const naturalWidth=wrapRect.width;
      const fittedWidth=Math.floor(available*BOARD_RATIO);
      if(fittedWidth>0&&fittedWidth<naturalWidth-1){
        page.style.setProperty('--game-board',fittedWidth+'px');
      }
    });
  }

  const resync=()=>fitBoard();
  window.addEventListener('resize',resync,{passive:true});
  window.visualViewport?.addEventListener('resize',resync,{passive:true});
  desktop.addEventListener?.('change',resync);
  document.fonts?.ready?.then(fitBoard).catch(()=>{});
  requestAnimationFrame(fitBoard);
  setTimeout(fitBoard,120);
  setTimeout(fitBoard,450);
})();