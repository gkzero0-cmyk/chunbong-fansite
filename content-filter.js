(()=>{
  'use strict';
  const page=document.body.dataset.page||'';
  if(!['vod','clips','youtube','fanart'].includes(page))return;
  const selector=page==='fanart'?'.fanart-grid':'.video-list';
  const cardSelector=page==='fanart'?'.fanart-card':'.video-list-card';
  const labels={vod:'다시보기',clips:'핫클립',youtube:'유튜브',fanart:'팬아트'};
  const normalize=value=>String(value||'').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim();

  function findRoot(){return document.querySelector(selector)}
  function createFilter(root){
    if(!root||document.querySelector('[data-content-filter]'))return null;
    const wrap=document.createElement('section');
    wrap.className='content-filter';
    wrap.dataset.contentFilter='';
    wrap.setAttribute('role','search');
    wrap.innerHTML='<label><span class="content-filter-icon" aria-hidden="true">⌕</span><input type="search" inputmode="search" autocomplete="off" placeholder="'+labels[page]+'에서 검색" aria-label="'+labels[page]+' 검색"><button type="button" data-content-filter-clear aria-label="검색어 지우기" hidden>×</button></label><small data-content-filter-count></small>';
    root.insertAdjacentElement('beforebegin',wrap);
    return wrap;
  }
  function boot(){
    const root=findRoot();if(!root)return;
    const filter=createFilter(root)||document.querySelector('[data-content-filter]');
    if(!filter)return;
    const input=filter.querySelector('input'),clear=filter.querySelector('[data-content-filter-clear]'),count=filter.querySelector('[data-content-filter-count]');
    const apply=()=>{
      const query=normalize(input.value);
      const cards=[...root.querySelectorAll(cardSelector)];
      let visible=0;
      cards.forEach(card=>{
        const match=!query||normalize(card.textContent).includes(query);
        card.hidden=!match;
        if(match)visible+=1;
      });
      clear.hidden=!query;
      count.textContent=query?visible+'개 찾음':cards.length?cards.length+'개 콘텐츠':'';
      filter.classList.toggle('has-query',Boolean(query));
    };
    input.addEventListener('input',apply);
    input.addEventListener('search',apply);
    clear.addEventListener('click',()=>{input.value='';apply();input.focus()});
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();