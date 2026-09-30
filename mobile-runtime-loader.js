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
  loadPolish();loadMobile();
  mobile.addEventListener?.('change',event=>{if(event.matches)loadMobile()});
  standalone.addEventListener?.('change',event=>{if(event.matches)loadMobile()});
})();
