(()=>{
  'use strict';
  const mobile=window.matchMedia('(max-width:760px)');
  const standalone=window.matchMedia('(display-mode: standalone)');
  const launchedFromPwa=new URLSearchParams(location.search).get('source')==='pwa';
  let loaded=false;
  const load=()=>{
    if(loaded||document.querySelector('script[data-mobile-site-runtime]'))return;
    loaded=true;
    const script=document.createElement('script');
    script.src='mobile-site.js?v=3';
    script.defer=true;
    script.dataset.mobileSiteRuntime='true';
    document.head.appendChild(script);
  };
  if(mobile.matches||standalone.matches||window.navigator.standalone===true||launchedFromPwa)load();
  mobile.addEventListener?.('change',event=>{if(event.matches)load()});
  standalone.addEventListener?.('change',event=>{if(event.matches)load()});
})();
