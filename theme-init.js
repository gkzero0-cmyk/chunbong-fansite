(() => {
  'use strict';

  function installStylesheetRecovery(){
    window.addEventListener('error',event=>{
      const link=event.target;
      if(!link||String(link.tagName||'').toUpperCase()!=='LINK')return;
      if(String(link.rel||'').toLowerCase()!=='stylesheet')return;
      if(link.dataset.styleRetry==='1')return;
      const raw=link.getAttribute('href');
      if(!raw)return;
      let url;
      try{url=new URL(raw,location.href)}catch{return}
      if(url.origin!==location.origin)return;
      link.dataset.styleRetry='1';
      url.searchParams.set('style-retry',String(Date.now()));
      link.href=url.toString();
    },true);
  }

  function installStableHeaderReserve(){
    const setup=()=>{
      const header=document.querySelector('.site-header');
      if(!header||header.querySelector('[data-header-layout-reserve]'))return;
      const reserve=document.createElement('span');
      reserve.dataset.headerLayoutReserve='true';
      reserve.setAttribute('aria-hidden','true');
      reserve.style.cssText='display:block;flex:0 0 238px;width:238px;height:1px;pointer-events:none;transition:flex-basis .12s ease,width .12s ease';
      header.appendChild(reserve);
      const baseExcluded=node=>node===reserve||node.matches?.('.brand,.main-nav,.nav-toggle,.header-live');
      const adjust=()=>{
        if(matchMedia('(max-width:1024px)').matches){reserve.style.display='none';return}
        reserve.style.display='block';
        let used=0;
        for(const child of header.children){
          if(baseExcluded(child)||child.hidden)continue;
          const style=getComputedStyle(child);
          if(style.display==='none'||style.visibility==='hidden')continue;
          const rect=child.getBoundingClientRect();
          if(rect.width>0)used+=rect.width+8;
        }
        const remaining=Math.max(0,238-used);
        reserve.style.flexBasis=remaining+'px';reserve.style.width=remaining+'px';
      };
      const observer=new MutationObserver(adjust);
      observer.observe(header,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden','class','style']});
      addEventListener('resize',adjust,{passive:true});
      requestAnimationFrame(adjust);
      setTimeout(adjust,1200);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  }

  installStylesheetRecovery();
  installStableHeaderReserve();

  let theme = 'dark';
  try {
    const stored = localStorage.getItem('chunbong-theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
