(()=>{
  'use strict';
  const mobile=window.matchMedia('(max-width:760px)');
  const standalone=window.matchMedia('(display-mode: standalone)');
  const launchedFromPwa=new URLSearchParams(location.search).get('source')==='pwa';
  const mobileLike=()=>mobile.matches||standalone.matches||window.navigator.standalone===true||launchedFromPwa;
  const addScript=(src,attr)=>{
    if(document.querySelector(`script[${attr}]`))return;
    const script=document.createElement('script');script.src=src;script.defer=true;script.setAttribute(attr,'true');document.head.appendChild(script);
  };
  const addStyle=(href,attr)=>{
    if(document.querySelector(`link[${attr}]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(attr,'true');document.head.appendChild(link);
  };
  const loadPolish=()=>{
    addScript('sitewide-polish.js?v=1','data-sitewide-polish-runtime');
    if(!mobileLike()||document.querySelector('link[data-sitewide-mobile-polish]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='sitewide-mobile-polish.css?v=1';link.dataset.sitewideMobilePolish='true';document.head.appendChild(link);
  };
  let loaded=false;
  const loadMobile=()=>{
    loadPolish();
    if(!mobileLike()||loaded||document.querySelector('script[data-mobile-site-runtime]'))return;
    loaded=true;addScript('mobile-site.js?v=3','data-mobile-site-runtime');
  };
  if(document.body?.dataset?.page==='contents'){
    addScript('official-wiki-guide.js?v=4','data-official-wiki-guide-runtime');
    addScript('content-page-enhancements.js?v=9','data-content-page-enhancements-runtime');
    addScript('chunbong-posts-runtime.js?v=1','data-chunbong-posts-runtime');
    addStyle('content-source-card-unifier.css?v=2','data-content-source-card-unifier-style');
    addScript('content-source-card-unifier.js?v=2','data-content-source-card-unifier-runtime');
  }
  loadPolish();loadMobile();
  mobile.addEventListener?.('change',event=>{if(event.matches)loadMobile()});
  standalone.addEventListener?.('change',event=>{if(event.matches)loadMobile()});
})();