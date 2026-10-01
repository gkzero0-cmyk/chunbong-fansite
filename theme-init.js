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

  function installHeaderStability(){
    const style=document.createElement('style');
    style.dataset.headerStability='1';
    style.textContent=`
      @media (min-width:1025px){
        .site-header .header-stability-reserve{display:block;flex:0 0 var(--header-stability-width,210px);width:var(--header-stability-width,210px);height:38px;pointer-events:none;transition:none!important}
      }
      @media (max-width:1024px){.site-header .header-stability-reserve{display:none!important}}
    `;
    document.head.appendChild(style);
    const dynamicSelector='.site-search-trigger,.header-myhub,.operator-quick-link,.theme-toggle,.changelog-button,[data-header-alert],[class*="header-notification"]';
    const targetWidth=()=>{
      let hinted=false;try{hinted=localStorage.getItem('chunbong:operator:access-hint:v1')==='1'}catch(_){}
      return hinted?292:224;
    };
    const sync=header=>{
      if(!header||matchMedia('(max-width:1024px)').matches)return;
      let reserve=header.querySelector('.header-stability-reserve');
      if(!reserve){
        reserve=document.createElement('span');
        reserve.className='header-stability-reserve';
        reserve.setAttribute('aria-hidden','true');
        const anchor=header.querySelector('.nav-toggle,.header-live');
        header.insertBefore(reserve,anchor||null);
      }
      const width=[...header.querySelectorAll(dynamicSelector)]
        .filter(node=>node!==reserve&&getComputedStyle(node).display!=='none')
        .reduce((sum,node)=>sum+Math.ceil(node.getBoundingClientRect().width)+8,0);
      reserve.style.setProperty('--header-stability-width',Math.max(0,targetWidth()-width)+'px');
    };
    const attach=header=>{
      if(!header||header.dataset.headerStabilityBound==='1')return;
      header.dataset.headerStabilityBound='1';
      sync(header);
      new MutationObserver(()=>requestAnimationFrame(()=>sync(header))).observe(header,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
      window.addEventListener('resize',()=>sync(header),{passive:true});
    };
    const find=()=>{
      const header=document.querySelector('.site-header');
      if(header){attach(header);return true}
      return false;
    };
    if(!find()){
      const observer=new MutationObserver(()=>{if(find())observer.disconnect()});
      observer.observe(document.documentElement,{childList:true,subtree:true});
    }
  }

  installStylesheetRecovery();
  installHeaderStability();

  let theme = 'dark';
  try {
    const stored = localStorage.getItem('chunbong-theme');
    if (stored === 'light' || stored === 'dark') theme = stored;
  } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
