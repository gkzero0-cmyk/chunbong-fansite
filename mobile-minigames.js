(()=>{
  'use strict';
  const body=document.body;
  const game=body?.dataset?.game;
  if(!game)return;

  const mobileQuery=window.matchMedia('(max-width: 760px)');
  const coarseQuery=window.matchMedia('(pointer: coarse)');
  const isMobile=()=>mobileQuery.matches||coarseQuery.matches;

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

  function centerChuncortile(force=false){
    if(game!=='chuncortile'||!isMobile())return;
    const wrap=document.getElementById('ct-board-wrap');
    if(!wrap||(!force&&boardPanned))return;
    requestAnimationFrame(()=>{
      const max=Math.max(0,wrap.scrollWidth-wrap.clientWidth);
      if(max>0)wrap.scrollLeft=Math.round(max/2);
    });
  }

  function focusGame(status){
    if(!isMobile()||status!=='playing')return;
    body.classList.add('mobile-game-playing');
    requestAnimationFrame(()=>{
      const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      root.scrollIntoView({block:'start',behavior:reduce?'auto':'smooth'});
      centerChuncortile(true);
    });
  }

  function sync(){
    const status=root.dataset.gameStatus||'';
    body.classList.toggle('mobile-game-playing',isMobile()&&status==='playing');
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

  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-game-status']});
  window.addEventListener('resize',()=>{sync();centerChuncortile(false)},{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{sync();centerChuncortile(true)},120),{passive:true});
  sync();
})();